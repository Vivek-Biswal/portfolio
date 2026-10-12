import { apps } from './content.js';
import { mountCompanion } from './companion.js';
import { mountArcade } from './arcade.js';
import './companion.css';
import './arcade.css';
import './typography.css';

const layer = document.querySelector('.window-layer');
const tasks = document.querySelector('.tasks');
const startButton = document.querySelector('.start-button');
const startMenu = document.querySelector('.start-menu');
const status = document.querySelector('#desktop-status');
const smallScreen = window.matchMedia('(max-width: 760px)');
const windows = new Map();
let topOrder = 10;
let activeId = null;
let game;
let preference = { wallpaper: 'lavender', scanlines: false };
try {
  const saved = JSON.parse(localStorage.getItem('vivek-2d-display') || 'null');
  if (saved && ['lavender', 'peach', 'mint'].includes(saved.wallpaper)) preference.wallpaper = saved.wallpaper;
  if (saved && typeof saved.scanlines === 'boolean') preference.scanlines = saved.scanlines;
} catch { /* Defaults work even when storage is blocked. */ }

const icon = name => `<svg aria-hidden="true"><use href="#icon-${name}"/></svg>`;
function announce(message) { status.textContent = message; }
function setStart(open) {
  startMenu.hidden = !open;
  startButton.setAttribute('aria-expanded', String(open));
}
function syncSettings() {
  document.body.dataset.wallpaper = preference.wallpaper;
  document.body.classList.toggle('has-scanlines', preference.scanlines);
  document.querySelectorAll('button[data-wallpaper]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.wallpaper === preference.wallpaper)));
  document.querySelectorAll('[data-scanlines]').forEach(input => { input.checked = preference.scanlines; });
  game?.refresh();
}
function saveSettings() {
  syncSettings();
  try { localStorage.setItem('vivek-2d-display', JSON.stringify(preference)); } catch { /* Display changes remain active for this session. */ }
}
function clampPosition(state) {
  const availableX = Math.max(0, layer.clientWidth - state.element.offsetWidth - 8);
  const availableY = Math.max(0, layer.clientHeight - state.element.offsetHeight - 8);
  state.x = Math.min(availableX, Math.max(8, state.x));
  state.y = Math.min(availableY, Math.max(8, state.y));
  state.element.style.left = `${state.x}px`;
  state.element.style.top = `${state.y}px`;
}
function placeWindow(state) {
  if (state.maximized || smallScreen.matches) {
    state.element.style.left = smallScreen.matches ? '12px' : '14px';
    state.element.style.top = smallScreen.matches ? '4px' : '14px';
  } else clampPosition(state);
}
function activate(id, focus = false) {
  const state = windows.get(id);
  if (!state) return;
  if (game?.active) game.exit({ restoreFocus: false });
  activeId = id;
  state.minimized = false;
  state.element.hidden = false;
  state.element.style.zIndex = String(++topOrder);
  windows.forEach((item, key) => {
    const active = key === id && !item.minimized;
    item.element.dataset.active = String(active);
    item.task.setAttribute('aria-pressed', String(active));
    item.task.setAttribute('aria-label', `${active ? 'Minimize' : item.minimized ? 'Restore' : 'Show'} ${apps[key].title}`);
  });
  placeWindow(state);
  if (focus) state.element.focus({ preventScroll: true });
}
function activateNext() {
  const next = [...windows.values()].filter(item => !item.minimized).sort((a,b) => Number(b.element.style.zIndex) - Number(a.element.style.zIndex))[0];
  activeId = null;
  if (next) activate(next.id, true);
}
function closeWindow(id) {
  const state = windows.get(id);
  if (!state) return;
  state.resizeObserver?.disconnect();
  state.cleanupCompanion?.();
  state.element.remove(); state.task.remove(); windows.delete(id);
  announce(`${apps[id].title} closed.`);
  if (activeId === id) activateNext();
  if (!activeId) {
    const visibleOpener = state.opener?.isConnected && state.opener.getClientRects().length > 0 && !state.opener.closest('[hidden]');
    (visibleOpener ? state.opener : document.querySelector(`.desktop-icon[data-open="${id}"]`) || startButton).focus();
  }
}
function minimize(id) {
  const state = windows.get(id);
  state.minimized = true;
  state.element.hidden = true;
  state.element.dataset.active = 'false';
  state.task.setAttribute('aria-pressed', 'false');
  state.task.setAttribute('aria-label', `Restore ${apps[id].title}`);
  if (activeId === id) activateNext();
  if (!activeId) state.task.focus();
  announce(`${apps[id].title} minimized. Restore it from the taskbar.`);
}
function maximize(id) {
  const state = windows.get(id);
  state.maximized = !state.maximized;
  state.element.classList.toggle('is-maximized', state.maximized);
  const button = state.element.querySelector('[data-action="maximize"]');
  button.setAttribute('aria-label', `${state.maximized ? 'Restore' : 'Maximize'} ${apps[id].title} window`);
  button.setAttribute('aria-pressed', String(state.maximized));
  placeWindow(state);
}
function enableMovement(state, titlebar) {
  let drag = null;
  titlebar.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button') || state.maximized || smallScreen.matches) return;
    activate(state.id);
    drag = { x: event.clientX - state.x, y: event.clientY - state.y };
    titlebar.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  titlebar.addEventListener('pointermove', event => {
    if (!drag) return;
    state.x = event.clientX - drag.x; state.y = event.clientY - drag.y;
    clampPosition(state);
  });
  const stopDrag = () => { drag = null; };
  titlebar.addEventListener('pointerup', stopDrag);
  titlebar.addEventListener('pointercancel', stopDrag);
  titlebar.addEventListener('lostpointercapture', stopDrag);
  titlebar.addEventListener('keydown', event => {
    if (event.target !== titlebar || state.maximized || smallScreen.matches) return;
    const moves = { ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1] };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    const step = event.shiftKey ? 24 : 8;
    state.x += move[0] * step; state.y += move[1] * step;
    clampPosition(state);
  });
}
function openApp(id, opener = null) {
  if (!apps[id]) return;
  if (game?.active) game.exit({ restoreFocus: false });
  setStart(false);
  if (windows.has(id)) { activate(id, true); return; }
  const app = apps[id];
  const element = document.createElement('section');
  element.className = 'app-window'; element.dataset.app = id; element.tabIndex = -1;
  element.setAttribute('role','dialog'); element.setAttribute('aria-labelledby',`title-${id}`);
  element.innerHTML = `<header class="window-titlebar" tabindex="0" aria-label="${app.title} title bar. Use arrow keys to move the window.">${icon(app.icon)}<h2 id="title-${id}"></h2><div class="window-controls"><button data-action="minimize" aria-label="Minimize ${app.title} window">_</button><button data-action="maximize" aria-label="Maximize ${app.title} window" aria-pressed="false">□</button><button data-action="close" aria-label="Close ${app.title} window">×</button></div></header><div class="window-body">${app.html}</div><footer class="window-footer"><span>VivekOS / ${id}</span><span>2D · A personal experiment</span></footer>`;
  element.querySelector('h2').textContent = app.title;
  const task = document.createElement('button');
  task.className = 'task-button'; task.innerHTML = `${icon(app.icon)}<span></span>`;
  task.querySelector('span').textContent = app.title;
  task.setAttribute('aria-controls',`window-${id}`); element.id = `window-${id}`;
  const count = windows.size;
  const state = { id, element, task, opener, minimized:false, maximized:false, x:Math.max(155,(layer.clientWidth-610)/2)+count*24, y:Math.max(24,(layer.clientHeight-400)/3)+count*22 };
  windows.set(id,state); layer.append(element); tasks.append(task);
  if (id === 'about') state.cleanupCompanion = mountCompanion(element);
  if (typeof ResizeObserver !== 'undefined') {
    state.resizeObserver = new ResizeObserver(() => { if (!state.minimized) placeWindow(state); });
    state.resizeObserver.observe(element);
  }
  element.addEventListener('pointerdown', () => activate(id));
  element.addEventListener('focusin', () => { if (activeId !== id) activate(id); });
  element.querySelector('[data-action="close"]').addEventListener('click',()=>closeWindow(id));
  element.querySelector('[data-action="minimize"]').addEventListener('click',()=>minimize(id));
  element.querySelector('[data-action="maximize"]').addEventListener('click',()=>maximize(id));
  task.addEventListener('click',()=> {
    if (game?.active) { game.exit({ restoreFocus: false }); activate(id,true); return; }
    if (activeId === id && !state.minimized) minimize(id);
    else activate(id,true);
  });
  enableMovement(state,element.querySelector('.window-titlebar'));
  activate(id,true); syncSettings(); announce(`${app.title} opened.`);
}

document.addEventListener('click', async event => {
  if (!startMenu.contains(event.target) && !startButton.contains(event.target)) setStart(false);
  const opener = event.target.closest('[data-open]');
  if (opener) { openApp(opener.dataset.open,opener); return; }
  const wallpaper = event.target.closest('button[data-wallpaper]');
  if (wallpaper) { preference.wallpaper = wallpaper.dataset.wallpaper; saveSettings(); return; }
  if (event.target.closest('[data-reset-desktop]')) {
    [...windows.keys()].forEach(closeWindow);
    openApp('about',document.querySelector('[data-open="about"]'));
    announce('Desktop windows reset. Display preferences kept.'); return;
  }
  const avatar = event.target.closest('[data-avatar]');
  if (avatar) {
    const bubble = avatar.closest('.window-body').querySelector('[data-speech]');
    const lines = ['Hey! Welcome to my little world.', 'One click. A new idea.', 'Curiosity looks good on you.', 'Try a different dimension next!'];
    const next = (Number(avatar.dataset.greeting || 0) + 1) % lines.length;
    avatar.dataset.greeting = String(next); bubble.textContent = lines[next]; bubble.setAttribute('role','status'); return;
  }
  const copy = event.target.closest('[data-copy-email]');
  if (copy) {
    const message = copy.closest('.window-body').querySelector('[data-copy-status]');
    try { await navigator.clipboard.writeText('vivekbiswal.dev@gmail.com'); message.textContent = 'Email copied. Say hello when you’re ready.'; }
    catch { message.textContent = 'Please copy the address above, or click it to open your email app.'; }
  }
});
document.addEventListener('change', event => {
  if (event.target.matches('[data-scanlines]')) { preference.scanlines = event.target.checked; saveSettings(); }
});
startButton.addEventListener('click',()=> {
  if (game?.active) game.exit({ restoreFocus: false });
  const open = startMenu.hidden; setStart(open);
  if (open) startMenu.querySelector('button').focus();
});
document.addEventListener('keydown',event=> {
  if (event.defaultPrevented || game?.active) return;
  if (event.key !== 'Escape') return;
  if (!startMenu.hidden) { setStart(false); startButton.focus(); }
  else if (activeId && layer.contains(document.activeElement)) closeWindow(activeId);
});
window.addEventListener('resize',()=>windows.forEach(placeWindow));
function updateClock() {
  const now = new Date();
  const clock = document.querySelector('.clock');
  clock.textContent = new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hour12:false}).format(now);
  clock.dateTime = now.toISOString();
  clock.title = new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'full'}).format(now) + ' · India Standard Time';
}
syncSettings(); updateClock(); setInterval(updateClock,30000);
game = mountArcade(document.querySelector('.workspace'), {
  onActiveChange: active => {
    if (active) setStart(false);
    windows.forEach(state => state.cleanupCompanion?.setPaused?.(active));
  },
  announce,
});
