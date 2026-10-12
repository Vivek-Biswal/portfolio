import { drawOutside, drawRoomBackdrop, drawCabinet } from './arcade-art.js';
import { createPixelPainter, drawTopDownCharacter } from './companion.js';
import { CABINETS, ROOM, canWalk, configureRoom, findWalkPath, nearestCabinet } from './arcade-world.js';
import { createSnake, createBrickBreaker, createPong } from './arcade-games-a.js';
import { createMemoryMatch, createBlockDrop, createCoinMaze } from './arcade-games-b.js';
import { createGlitchRun } from './arcade-runner.js';

const factories = { snake: createSnake, bricks: createBrickBreaker, memory: createMemoryMatch,
  runner: createGlitchRun, pong: createPong, blocks: createBlockDrop, maze: createCoinMaze };
const keyActions = { ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left',
  ArrowRight: 'right', d: 'right', ' ': 'action', Enter: 'action', e: 'action' };
const scoreKey = id => id === 'runner' ? 'vivek-glitch-run-best' : `vivek-arcade-best-${id}`;
const scoreNumber = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;

export function mountArcade(workspace, { onActiveChange = () => {}, announce = () => {} } = {}) {
  const worldCanvas = workspace.querySelector('.world-canvas'), ctx = worldCanvas.getContext('2d');
  const characterCanvas = document.createElement('canvas');
  characterCanvas.className = 'character-canvas';
  characterCanvas.setAttribute('aria-hidden', 'true');
  workspace.querySelector('.pixel-playground').append(characterCanvas);
  const characterCtx = characterCanvas.getContext('2d');
  const world = workspace.querySelector('.arcade-world');
  const building = workspace.querySelector('.arcade-building');
  const cabinets = world.querySelector('.arcade-cabinets');
  const inputPanel = world.querySelector('.arcade-input');
  const actionButton = world.querySelector('.arcade-action');
  const roomHint = world.querySelector('.arcade-room-hint');
  const screen = world.querySelector('.arcade-screen');
  const gameCanvas = screen.querySelector('canvas');
  const stage = screen.querySelector('.arcade-game-stage');
  const result = screen.querySelector('.arcade-result');
  const continueButton = screen.querySelector('[data-arcade-continue]');
  const pauseButton = screen.querySelector('[data-arcade-pause]');
  const entryButtons = [...document.querySelectorAll('[data-arcade-enter]')];
  const surfaces = [...workspace.querySelectorAll('.window-layer, .desktop-icons')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const held = new Set(), cleanups = [], timers = new Set();
  const sessionBests = new Map();
  let mode = 'desktop', painter, frame = 0, last = 0, time = 0, disposed = false;
  let windowFocused = true;
  let pixelScale = 2;
  let palette, view = { x: 0, y: 0, scale: 1 }, previousFocus;
  let outer = { x: 80, y: 80, facing: 1 }, approachTarget;
  let player = { x: 160, y: 226, direction: 'up', moving: false }, path = [], pendingCabinet;
  let game, currentCabinet, round = 'running', score = 0, best = 0, near;
  const listen = (target, event, handler, options) => {
    target.addEventListener(event, handler, options);
    cleanups.push(() => target.removeEventListener(event, handler, options));
  };
  const later = (callback, delay) => {
    const id = setTimeout(() => { timers.delete(id); if (!disposed) callback(); }, delay); timers.add(id);
  };
  function getBest(id) {
    let value = sessionBests.get(id) || 0;
    try { value = Math.max(value, scoreNumber(localStorage.getItem(scoreKey(id)))); } catch { /* Use this visit's record. */ }
    sessionBests.set(id, value);
    return value;
  }
  function saveBest() {
    if (!currentCabinet) return;
    best = Math.max(best, score, getBest(currentCabinet.id));
    sessionBests.set(currentCabinet.id, best);
    try { localStorage.setItem(scoreKey(currentCabinet.id), String(best)); } catch { /* Session best is retained. */ }
    screen.querySelector('[data-arcade-best]').textContent = String(best);
  }
  function clearInput() {
    held.forEach(action => game?.input(action, false)); held.clear();
    ['up', 'down', 'left', 'right', 'action'].forEach(action => game?.input(action, false));
    player.moving = false;
  }
  function sync() {
    workspace.dataset.arcadeState = mode;
    workspace.classList.toggle('is-arcade', mode !== 'desktop');
    workspace.classList.toggle('is-room', mode === 'room');
    workspace.classList.toggle('is-game', mode === 'game');
    world.hidden = mode === 'desktop';
    cabinets.hidden = mode !== 'room';
    inputPanel.hidden = !['room', 'game'].includes(mode);
    screen.hidden = mode !== 'game';
    building.disabled = mode === 'approaching';
    surfaces.forEach(surface => { surface.inert = mode !== 'desktop'; });
    entryButtons.forEach(button => {
      button.setAttribute('aria-pressed', String(mode !== 'desktop'));
      if (button.classList.contains('game-toggle')) {
        button.querySelector('span').textContent = mode === 'desktop' ? 'Arcade' : 'Desktop';
        button.setAttribute('aria-label', mode === 'desktop' ? 'Visit Vivek Arcade' : 'Return to the desktop');
      }
    });
    actionButton.textContent = mode === 'game' ? 'Action ●' : near ? `Play ${near.title}` : 'Choose game';
    actionButton.disabled = mode === 'room' ? !near : mode === 'game' && ['snake', 'pong'].includes(currentCabinet.id);
    world.querySelector('[data-arcade-subtitle]').textContent = mode === 'approaching'
      ? 'Vivek is running to the entrance…' : 'Walk, explore, and find your next favourite.';
  }
  function stopGame() {
    clearInput(); saveBest(); game?.destroy(); game = undefined;
  }
  function exit({ restoreFocus = true } = {}) {
    if (mode === 'desktop') return;
    stopGame(); mode = 'desktop'; path = []; pendingCabinet = undefined; near = undefined;
    sync(); onActiveChange(false);
    outer.y = ROOM.height - 32;
    if (restoreFocus) {
      const target = previousFocus?.isConnected && previousFocus.getClientRects().length ? previousFocus : building;
      target.focus({ preventScroll: true });
    }
    announce('Back to the desktop. Your windows and game records are kept.');
    last = 0; wake();
  }
  function enterRoom({ fromGame = false } = {}) {
    if (fromGame) stopGame();
    inputPanel.inert = false;
    mode = 'room'; pendingCabinet = undefined; path = []; near = undefined;
    if (!fromGame) player = { x: ROOM.width / 2, y: ROOM.height - 26, direction: 'up', moving: false };
    clearInput(); sync(); fitRoom(); world.focus({ preventScroll: true });
    announce('Welcome to Vivek Arcade. Walk with arrows or WASD, or click a cabinet to walk there and play.');
    last = 0; wake();
  }
  function enter() {
    if (mode !== 'desktop') { exit(); return; }
    previousFocus = document.activeElement; mode = 'approaching'; onActiveChange(true); sync();
    const imageRect = building.querySelector('img').getBoundingClientRect();
    const desktopRect = workspace.getBoundingClientRect();
    approachTarget = { x: (imageRect.left + imageRect.width / 2 - desktopRect.left) / pixelScale,
      y: (imageRect.top + imageRect.height * 0.91 - desktopRect.top) / pixelScale };
    world.focus({ preventScroll: true });
    announce('Vivek is running to the arcade entrance.');
    if (motion.matches) enterRoom();
    last = 0; wake();
  }
  function syncRound() {
    result.hidden = round === 'running';
    gameCanvas.inert = round !== 'running';
    inputPanel.inert = round !== 'running';
    screen.classList.toggle('has-overlay', round !== 'running');
    pauseButton.disabled = round === 'over';
    pauseButton.textContent = round === 'paused' ? 'Resume' : 'Pause';
    pauseButton.setAttribute('aria-pressed', String(round === 'paused'));
    if (round === 'paused') {
      result.querySelector('[data-arcade-result-title]').textContent = 'Take a breather.';
      result.querySelector('[data-arcade-result-message]').textContent = 'Your game is paused. Ready when you are.';
      continueButton.textContent = 'Resume →';
    } else if (round === 'over') continueButton.textContent = 'Play again ↻';
  }
  function pause({ focus = true } = {}) {
    clearInput();
    if (mode !== 'game' || round !== 'running') return;
    round = 'paused'; game.pause(); saveBest(); syncRound();
    if (focus) continueButton.focus({ preventScroll: true });
    announce(`${currentCabinet.title} paused. Resume or return to the arcade.`);
  }
  function resume() {
    if (mode !== 'game') return;
    if (round === 'over') restart();
    else { round = 'running'; syncRound(); game.resume(); gameCanvas.focus({ preventScroll: true }); }
  }
  function restart() {
    if (!game || mode !== 'game') return;
    saveBest(); clearInput(); round = 'running'; syncRound(); game.start();
    gameCanvas.focus({ preventScroll: true }); announce(`${currentCabinet.title} restarted.`);
  }
  function launch(cabinet) {
    stopGame(); currentCabinet = cabinet; mode = 'game'; round = 'running'; score = 0; best = getBest(cabinet.id);
    gameCanvas.width = 360; gameCanvas.height = 260;
    screen.querySelector('.arcade-screen-title').textContent = cabinet.title;
    gameCanvas.setAttribute('aria-label', `${cabinet.title} game. Controls are described below.`);
    screen.querySelector('[data-arcade-score]').textContent = '0';
    screen.querySelector('[data-arcade-best]').textContent = String(best);
    game = factories[cabinet.id]({ canvas: gameCanvas,
      onScore(value) { score = scoreNumber(value); best = Math.max(best, score); screen.querySelector('[data-arcade-score]').textContent = String(score); screen.querySelector('[data-arcade-best]').textContent = String(best); },
      onEnd({ score: finalScore, message }) {
        score = scoreNumber(finalScore); round = 'over'; clearInput(); saveBest();
        result.querySelector('[data-arcade-result-title]').textContent = 'One more round?';
        result.querySelector('[data-arcade-result-message]').textContent = `${message} Score ${score} · Best ${best}.`;
        syncRound(); continueButton.focus({ preventScroll: true });
        announce(`${cabinet.title} complete. ${message} Score ${score}.`);
      },
    });
    screen.querySelector('.arcade-game-instructions').textContent = game.instructions;
    sync(); syncRound(); fitGame(); game.start(); gameCanvas.focus({ preventScroll: true });
    announce(`${cabinet.title}. ${game.instructions} Escape or P pauses.`);
  }
  function selectCabinet(cabinet) {
    if (mode !== 'room') return;
    clearInput(); pendingCabinet = cabinet;
    path = findWalkPath(player, { x: cabinet.x, y: cabinet.y });
    world.focus({ preventScroll: true });
    announce(`Walking to ${cabinet.title}.`); wake();
    if (!path.length && nearestCabinet(player)?.id === cabinet.id) launch(cabinet);
  }
  function input(action, pressed = true) {
    if (mode === 'game') {
      if (round === 'running') game.input(action, pressed);
      if (pressed) held.add(action); else held.delete(action);
      return;
    }
    if (mode !== 'room') return;
    if (action === 'action') {
      if (pressed && near) selectCabinet(near);
      else if (pressed) announce('Walk to a cabinet first, or click one to walk there.');
      return;
    }
    if (pressed) { held.add(action); path = []; pendingCabinet = undefined; }
    else held.delete(action);
    wake();
  }
  function updateHint() {
    const next = nearestCabinet(player);
    if (near?.id === next?.id) return;
    near = next;
    CABINETS.forEach(cab => cabinets.querySelector(`[data-cabinet="${cab.id}"]`).classList.toggle('is-near', cab.id === near?.id));
    actionButton.textContent = near ? `Play ${near.title}` : 'Choose game';
    actionButton.disabled = !near;
    roomHint.textContent = near ? `${near.title} · Enter / E / Choose game to play. Or click any cabinet.`
      : 'Walk with arrows / WASD, or click the floor. Enter / E at a cabinet to play.';
  }
  function movePlayer(dt) {
    let dx = 0, dy = 0;
    if (path.length) {
      const target = path[0], distance = Math.hypot(target.x - player.x, target.y - player.y);
      if (distance <= dt * 74) { player.x = target.x; player.y = target.y; path.shift(); }
      else { dx = (target.x - player.x) / distance; dy = (target.y - player.y) / distance; }
      if (!path.length && pendingCabinet) { const cabinet = pendingCabinet; pendingCabinet = undefined; launch(cabinet); return; }
    } else {
      dx = Number(held.has('right')) - Number(held.has('left'));
      dy = Number(held.has('down')) - Number(held.has('up'));
      const length = Math.hypot(dx, dy); if (length) { dx /= length; dy /= length; }
    }
    player.moving = Boolean(dx || dy || path.length);
    if (dx || dy) {
      player.direction = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up';
      const step = dt * 74;
      if (canWalk(player.x + dx * step, player.y)) player.x += dx * step;
      if (canWalk(player.x, player.y + dy * step)) player.y += dy * step;
    }
    updateHint();
    if (player.moving && player.y > ROOM.height - 21 && Math.abs(player.x - ROOM.width / 2) < 24) exit();
  }
  function fitRoom() {
    view = { scale: pixelScale, x: Math.floor((workspace.clientWidth - ROOM.width * pixelScale) / 2), y: 0 };
    CABINETS.forEach(cab => {
      const button = cabinets.querySelector('[data-cabinet="' + cab.id + '"]');
      Object.assign(button.style, { left: (view.x + (cab.x - 26) * view.scale) + 'px', top: ((cab.y - 68) * view.scale) + 'px',
        width: (52 * view.scale) + 'px', height: (66 * view.scale) + 'px' });
    });
  }
  function fitGame() {
    if (mode !== 'game') return;
    const style = getComputedStyle(stage);
    const innerHeight = stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const width = Math.max(1, Math.floor(Math.min(stage.clientWidth, Math.max(1, innerHeight) * 360 / 260)));
    gameCanvas.style.width = `${width}px`; gameCanvas.style.height = `${width * 260 / 360}px`;
  }
  function refresh() {
    const style = getComputedStyle(workspace);
    palette = { wall: style.getPropertyValue('--wall').trim(), tile: style.getPropertyValue('--tile').trim(),
      ink: '#302736', paper: '#fcf8eb', accent: style.getPropertyValue('--accent').trim() };
    draw();
  }
  function resize() {
    const fraction = { x: player.x / ROOM.width, y: player.y / ROOM.height };
    pixelScale = workspace.clientWidth >= 900 && workspace.clientHeight >= 512 ? 2 : 1;
    configureRoom(workspace.clientWidth / pixelScale, workspace.clientHeight / pixelScale);
    worldCanvas.width = workspace.clientWidth; worldCanvas.height = workspace.clientHeight;
    characterCanvas.width = worldCanvas.width; characterCanvas.height = worldCanvas.height;
    player.x = Math.round(fraction.x * ROOM.width); player.y = Math.round(fraction.y * ROOM.height);
    if (!canWalk(player.x, player.y)) { player.x = ROOM.width / 2; player.y = ROOM.height - 26; }
    path = []; pendingCabinet = undefined;
    outer.x = Math.min(ROOM.width - 30, Math.max(30, outer.x)); outer.y = ROOM.height - 32;
    ctx.imageSmoothingEnabled = false; fitRoom(); fitGame(); refresh();
    if (mode === 'room') updateHint();
  }
  function drawRoom() {
    ctx.save(); ctx.translate(view.x, view.y); ctx.scale(view.scale, view.scale);
    drawRoomBackdrop(ctx, { width: ROOM.width, height: ROOM.height, cabinets: CABINETS });
    const entities = CABINETS.map(cab => ({ y: cab.y - 5, paint: () => drawCabinet(ctx, cab, time, cab.id === near?.id) }));
    entities.push({ y: player.y, paint: () => drawTopDownCharacter(ctx, { ...player, time: motion.matches ? 0 : time, size: 40 }) });
    entities.sort((a,b) => a.y - b.y).forEach(entity => entity.paint());
    ctx.restore();
  }
  function drawOutdoor() {
    ctx.save(); ctx.scale(pixelScale, pixelScale);
    drawOutside(ctx, { width: ROOM.width, height: ROOM.height, palette, time });
    ctx.restore();
    characterCtx.save(); characterCtx.scale(pixelScale, pixelScale);
    painter?.draw(characterCtx, { x: Math.round(outer.x), y: Math.round(outer.y), height: 80,
      time: motion.matches ? 0 : time, pose: mode === 'approaching' || !motion.matches ? 'run' : 'idle', facing: outer.facing });
    characterCtx.restore();
  }
  function draw() {
    if (!palette || !ctx || disposed) return;
    characterCtx.clearRect(0, 0, characterCanvas.width, characterCanvas.height);
    ctx.imageSmoothingEnabled = false;
    if (mode === 'room' || mode === 'game') drawRoom(); else drawOutdoor();
  }
  function tick(now) {
    frame = 0;
    if (disposed || document.hidden || !windowFocused) { last = 0; return; }
    const dt = last ? Math.min(0.04, (now - last) / 1000) : 0; last = now; time += dt;
    if (mode === 'desktop' && !motion.matches) {
      const max = Math.max(60, ROOM.width * .64);
      outer.x += dt * 15 * outer.facing; if (outer.x < 38) outer.facing = 1; if (outer.x > max) outer.facing = -1;
    } else if (mode === 'approaching') {
      const dx = approachTarget.x - outer.x, dy = approachTarget.y - outer.y, distance = Math.hypot(dx, dy);
      if (distance < 2) enterRoom();
      else { const step = Math.min(distance, dt * 125); outer.x += dx / distance * step; outer.y += dy / distance * step; outer.facing = dx >= 0 ? 1 : -1; }
    } else if (mode === 'room') movePlayer(dt);
    draw();
    if (mode === 'approaching' || (mode === 'room' && (held.size || path.length || !motion.matches)) || (mode === 'desktop' && !motion.matches)) frame = requestAnimationFrame(tick);
  }
  function wake() { if (!frame && !disposed && !document.hidden && windowFocused) frame = requestAnimationFrame(tick); }

  if (!ctx) {
    entryButtons.forEach(button => { button.disabled = true; });
    building.querySelector('span').textContent = 'Arcade needs canvas support';
    return { active: false, exit() {}, refresh() {}, destroy() {} };
  }
  CABINETS.forEach(cab => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'cabinet-hotspot'; button.dataset.cabinet = cab.id;
    button.setAttribute('aria-label', `Walk to ${cab.title} and play`); button.innerHTML = `<span>${cab.title}<small>PLAY ↗</small></span>`;
    listen(button, 'click', () => selectCabinet(cab)); cabinets.append(button);
  });
  entryButtons.forEach(button => listen(button, 'click', enter));
  listen(world.querySelector('[data-arcade-exit]'), 'click', () => exit());
  world.querySelectorAll('[data-arcade-room]').forEach(button => listen(button, 'click', () => enterRoom({ fromGame: true })));
  listen(pauseButton, 'click', () => { if (round === 'paused') resume(); else pause(); });
  listen(continueButton, 'click', resume);
  listen(world.querySelector('[data-arcade-restart]'), 'click', restart);
  inputPanel.querySelectorAll('[data-input]').forEach(button => {
    listen(button, 'pointerdown', event => {
      if (event.button !== 0) return; event.preventDefault(); button.setPointerCapture(event.pointerId);
      (mode === 'game' ? gameCanvas : world).focus({ preventScroll: true }); input(button.dataset.input);
    });
    const release = () => input(button.dataset.input, false);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => listen(button, type, release));
    listen(button, 'click', event => { if (event.detail === 0) { input(button.dataset.input); later(release, 140); } });
  });
  listen(worldCanvas, 'pointerdown', event => {
    if (mode !== 'room' || event.button !== 0) return;
    const r = workspace.getBoundingClientRect();
    const target = { x: (event.clientX - r.left - view.x) / view.scale, y: (event.clientY - r.top - view.y) / view.scale };
    if (!canWalk(target.x, target.y)) return;
    clearInput(); pendingCabinet = undefined; path = findWalkPath(player, target); world.focus({ preventScroll: true }); wake();
  });
  listen(gameCanvas, 'pointerdown', event => { if (currentCabinet?.id === 'runner' && round === 'running' && event.button === 0) input('action'); });
  listen(document, 'keydown', event => {
    if (mode === 'desktop' || event.defaultPrevented) return;
    if (mode === 'game' && round !== 'running' && event.key === 'Tab') {
      const buttons = [...result.querySelectorAll('button')];
      const index = buttons.indexOf(document.activeElement);
      const next = event.shiftKey ? (index <= 0 ? buttons.length - 1 : index - 1) : (index + 1) % buttons.length;
      event.preventDefault(); buttons[next].focus(); return;
    }
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation();
      if (mode === 'game') { if (round === 'running') pause(); else enterRoom({ fromGame: true }); }
      else exit(); return;
    }
    if (!world.contains(event.target) || event.target.closest('input,textarea,select,[contenteditable]')) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (event.repeat) { if (keyActions[key]) event.preventDefault(); return; }
    if (mode === 'game' && key === 'p') { event.preventDefault(); if (round === 'paused') resume(); else pause(); return; }
    if (mode === 'game' && key === 'r') { event.preventDefault(); restart(); return; }
    if (event.target.closest('button,a')) return;
    const action = keyActions[key]; if (!action) return;
    event.preventDefault(); input(action);
  }, true);
  listen(document, 'keyup', event => { const key = event.key.length === 1 ? event.key.toLowerCase() : event.key; if (keyActions[key]) input(keyActions[key], false); });
  listen(document, 'focusin', event => {
    if (world.contains(event.target)) return;
    if (mode === 'game') pause({ focus: false });
    else { clearInput(); path = []; pendingCabinet = undefined; }
  });
  listen(window, 'blur', () => {
    windowFocused = false; pause({ focus: false }); clearInput(); path = []; pendingCabinet = undefined;
    cancelAnimationFrame(frame); frame = 0; last = 0;
  });
  listen(window, 'focus', () => { windowFocused = true; last = 0; wake(); });
  listen(document, 'visibilitychange', () => {
    last = 0; clearInput();
    if (document.hidden) { pause({ focus: false }); cancelAnimationFrame(frame); frame = 0; saveBest(); } else wake();
  });
  listen(window, 'pagehide', saveBest);
  listen(window, 'storage', event => {
    if (!currentCabinet || event.key !== scoreKey(currentCabinet.id)) return;
    const stored = scoreNumber(event.newValue); if (stored < best) saveBest(); else {
      best = stored; sessionBests.set(currentCabinet.id, best); screen.querySelector('[data-arcade-best]').textContent = String(best);
    }
  });
  listen(motion, 'change', () => { last = 0; wake(); });
  const observer = new ResizeObserver(() => { resize(); fitGame(); }); observer.observe(workspace);
  const stageObserver = new ResizeObserver(fitGame); stageObserver.observe(stage);
  resize(); sync();
  createPixelPainter().then(value => { if (!disposed) { painter = value; outer.x = ROOM.width * 0.37; draw(); wake(); } }).catch(() => {});
  wake();
  return { get active() { return mode !== 'desktop'; }, exit, refresh,
    destroy() { stopGame(); disposed = true; cancelAnimationFrame(frame); observer.disconnect(); stageObserver.disconnect(); timers.forEach(clearTimeout); cleanups.forEach(cleanup => cleanup()); characterCanvas.remove(); },
  };
}
