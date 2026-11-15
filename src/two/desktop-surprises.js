const STORAGE_KEY = 'vivek-os-surprises-v1';
export const LOST_PIXELS = ['cloud', 'window', 'garden', 'moon'];
export const SURPRISE_GAMES = ['snake', 'bricks', 'memory', 'runner', 'pong', 'blocks', 'maze'];

/** Storage is optional: a private browsing session gets the same discoveries. */
export function createDiscoveryState(storage) {
  let saved;
  try { saved = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null'); } catch { /* Start a new local collection. */ }
  const stars = new Set(Array.isArray(saved?.stars) ? saved.stars.filter(id => LOST_PIXELS.includes(id)) : []);
  let garden = Number.isInteger(saved?.garden) ? Math.max(0, Math.min(2, saved.garden)) : 0;
  const persist = () => {
    try { storage?.setItem(STORAGE_KEY, JSON.stringify({ stars: [...stars], garden })); } catch { /* Keep the discoveries for this visit. */ }
  };
  return {
    get stars() { return [...stars]; },
    get garden() { return garden; },
    get complete() { return stars.size === LOST_PIXELS.length; },
    collect(id) {
      if (!LOST_PIXELS.includes(id) || stars.has(id)) return false;
      stars.add(id); persist(); return true;
    },
    grow() { garden = Math.min(2, garden + 1); persist(); return garden; },
  };
}

export function pickSurpriseGame(random = Math.random, previous) {
  const options = SURPRISE_GAMES.filter(id => id !== previous);
  const value = Number(random());
  const index = Number.isFinite(value) ? Math.min(options.length - 1, Math.max(0, Math.floor(value * options.length))) : 0;
  return options[index];
}

const star = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 1h4v6h3v3h6v4h-6v3h-3v6h-4v-6H7v-3H1v-4h6V7h3z" fill="currentColor"/><path d="M10 8h4v8h-4zM8 10h8v4H8z" fill="#fffbe2"/></svg>';
const cat = '<svg viewBox="0 0 64 52" aria-hidden="true"><path fill="#4b394e" d="M10 8h8v8h5v-4h16v4h5V8h9v31h-6v7H16v-7h-6zM47 37h10V22h5v20h-5v5H45z"/><path fill="#e8b388" d="M15 14h4v9h7v-6h11v6h9v-9h3v22h-5v5H19v-5h-4z"/><path fill="#f9ddaf" d="M20 28h22v10H20z"/><path class="surprise-cat-eyes" fill="#403444" d="M21 24h4v5h-4zm16 0h4v5h-4z"/><path fill="#a7696e" d="M29 30h5v4h-5z"/><path fill="#f9ddaf" d="M20 42h8v5h-8zm17 0h8v5h-8z"/></svg>';
const bin = '<svg viewBox="0 0 40 44" aria-hidden="true"><path fill="#463d50" d="M6 11h28v4H6zm4 4h20v26H10zM15 6h10v5H15z"/><path fill="#abb7af" d="M13 17h14v20H13z"/><path fill="#f4f0db" d="M15 19h3v15h-3zm7 0h3v15h-3z"/></svg>';
const plant = '<svg viewBox="0 0 40 44" aria-hidden="true"><path fill="#8e6158" d="M8 27h24v5H8zm4 5h16v10H12z"/><path fill="#7c9765" d="M18 11h4v17h-4zM7 12h10v4h5v6h-8v-5H7zm15-6h11v7h-6v6h-5z"/><path class="surprise-flower" fill="#d891a1" d="M15 2h10v5h5v8h-5v5H15v-5h-5V7h5z"/><path class="surprise-flower" fill="#f6d783" d="M17 7h6v7h-6z"/></svg>';
const disk = '<svg viewBox="0 0 40 42" aria-hidden="true"><path fill="#4b3b58" d="M4 2h27l5 5v33H4z"/><path fill="#b7a1ce" d="M8 6h24v30H8z"/><path fill="#f8edda" d="M11 6h17v11H11zM11 25h18v11H11z"/><path fill="#514257" d="M22 7h4v8h-4z"/><path fill="#bd8094" d="M17 20h7v3h-7z"/></svg>';

export function mountDesktopSurprises(workspace, { announce = () => {}, playGame = () => false, arcadeEnabled = () => true } = {}) {
  const doc = workspace.ownerDocument;
  const win = doc.defaultView;
  let storage;
  try { storage = win.localStorage; } catch { /* Storage can be unavailable independently of the page. */ }
  const state = createDiscoveryState(storage);
  const compact = win.matchMedia('(max-width: 760px), (orientation: landscape) and (max-height: 560px)');
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const root = doc.createElement('section');
  root.className = 'desktop-surprises';
  root.setAttribute('aria-label', 'Desktop sidequests');
  root.innerHTML = `<aside class="surprise-window" id="desktop-sidequests" aria-labelledby="sidequest-title"><header><span aria-hidden="true">✦</span><h2 id="sidequest-title">sidequests.exe</h2><button type="button" data-surprise-dismiss aria-label="Close sidequests">×</button></header><div class="surprise-copy"><p class="surprise-eyebrow">A LITTLE CURIOSITY GOES A LONG WAY</p><p class="surprise-heading">Nothing here is<br>just decoration.</p><p class="surprise-progress"><span>Lost pixels</span><strong data-discovery-count></strong></p><div class="surprise-progress-track" role="progressbar" aria-label="Lost pixels collected" aria-valuemin="0" aria-valuemax="4" aria-valuenow="0"><i></i></div><p class="surprise-message" role="status" aria-live="polite">Four little pixels wandered off. Can you find them?</p><button type="button" class="surprise-clue" data-surprise-clue>A tiny hint <span aria-hidden="true">↗</span></button><p class="surprise-badge" hidden>★ CURIOSITY BADGE<br><span>A good eye. An open mind.</span></p></div></aside><div class="surprise-stars" aria-label="Lost pixels">${LOST_PIXELS.map((id, i) => `<button type="button" class="surprise-star surprise-star-${id}" data-surprise-star="${id}" aria-label="Collect lost pixel ${i + 1}">${star}<span class="sr-only">Collect pixel ${i + 1}</span></button>`).join('')}</div><div class="surprise-toys"><button type="button" class="surprise-cat" data-surprise-cat aria-label="Pet the desktop cat">${cat}<span>psst. over here.</span></button><button type="button" class="surprise-bin" data-surprise-bin aria-label="Peek in the recycle bin"><span class="surprise-bin-icon">${bin}</span><span class="surprise-plant-icon">${plant}</span><span data-bin-caption>Recycle bin</span></button><button type="button" class="surprise-disk" data-surprise-game aria-label="Play a mystery arcade game">${disk}<span>Mystery disk</span></button></div><p class="surprise-bubble" role="status" aria-live="polite" hidden></p><div class="surprise-confetti" aria-hidden="true"></div>`;
  workspace.append(root);
  const panel = root.querySelector('.surprise-window');
  const message = root.querySelector('.surprise-message');
  const bubble = root.querySelector('.surprise-bubble');
  const confetti = root.querySelector('.surprise-confetti');
  const cleanups = [], timers = new Set();
  let open = !compact.matches, blocked = false, disposed = false, opener = null, petCount = 0, previousGame, bubbleTimer;
  const listen = (target, type, fn, options) => {
    target.addEventListener(type, fn, options);
    cleanups.push(() => target.removeEventListener(type, fn, options));
  };
  const later = (fn, ms) => {
    const id = win.setTimeout(() => { timers.delete(id); if (!disposed) fn(); }, ms);
    timers.add(id); return id;
  };
  function clearEffects() {
    timers.forEach(id => win.clearTimeout(id)); timers.clear(); bubbleTimer = null;
    bubble.hidden = true; root.classList.remove('is-purring'); confetti.replaceChildren();
  }
  function returnFocus() {
    // The desktop panel starts open, so it may never have had an opener.
    const target = [opener, ...doc.querySelectorAll('[data-surprise-toggle]')].find(button =>
      button?.isConnected && !button.disabled && !button.closest('[hidden],[inert]') && button.getClientRects().length,
    );
    target?.focus({ preventScroll: true });
  }
  function setOpen(value, trigger, restore = true) {
    open = Boolean(value && !blocked);
    if (open && trigger) opener = trigger;
    root.classList.toggle('is-open', open);
    panel.hidden = !open;
    root.setAttribute('role', compact.matches && open ? 'dialog' : 'region');
    if (compact.matches && open) {
      root.setAttribute('aria-labelledby', 'sidequest-title');
    } else {
      root.removeAttribute('aria-modal'); root.removeAttribute('aria-labelledby');
    }
    doc.querySelectorAll('[data-surprise-toggle]').forEach(button => {
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-controls', 'desktop-sidequests');
    });
    if (open && trigger) panel.querySelector('[data-surprise-dismiss]').focus({ preventScroll: true });
    else if (!open && restore) returnFocus();
  }
  function speak(text) {
    bubble.textContent = text; bubble.hidden = false; announce(text);
    if (bubbleTimer) { win.clearTimeout(bubbleTimer); timers.delete(bubbleTimer); }
    bubbleTimer = later(() => { bubble.hidden = true; root.classList.remove('is-purring'); }, 3800);
  }
  function render() {
    const count = state.stars.length;
    root.querySelector('[data-discovery-count]').textContent = `${count} / 4`;
    const progress = root.querySelector('[role="progressbar"]');
    progress.setAttribute('aria-valuenow', String(count));
    progress.querySelector('i').style.width = `${count * 25}%`;
    root.querySelectorAll('[data-surprise-star]').forEach(button => {
      const found = state.stars.includes(button.dataset.surpriseStar);
      button.classList.toggle('is-found', found);
      button.disabled = found;
      button.setAttribute('aria-label', `${found ? 'Collected' : 'Collect'} lost pixel ${LOST_PIXELS.indexOf(button.dataset.surpriseStar) + 1}`);
    });
    root.querySelector('.surprise-badge').hidden = !state.complete;
    if (state.complete) message.textContent = 'All four found. Your curiosity badge is yours to keep.';
    root.dataset.garden = String(state.garden);
    root.querySelector('[data-bin-caption]').textContent = state.garden ? state.garden === 2 ? 'A second chance' : 'Water me?' : 'Recycle bin';
    root.querySelector('[data-surprise-bin]').setAttribute('aria-label', state.garden ? state.garden === 2 ? 'Visit the recycled flower' : 'Water the recycled seed' : 'Peek in the recycle bin');
    doc.querySelectorAll('[data-surprise-game]').forEach(button => { button.disabled = blocked || !arcadeEnabled(); });
  }
  function celebrate() {
    if (reduced.matches) return;
    confetti.innerHTML = Array.from({ length: 16 }, (_, index) => `<i style="--piece:${index};--drift:${(index % 5 - 2) * 28}px"></i>`).join('');
    later(() => confetti.replaceChildren(), 1500);
  }
  function refresh() {
    const next = workspace.classList.contains('is-studio') || workspace.classList.contains('is-arcade');
    if (next !== blocked) {
      blocked = next;
      if (blocked) { clearEffects(); setOpen(false, null, false); }
    }
    root.inert = blocked;
    root.hidden = blocked;
    doc.querySelectorAll('[data-surprise-toggle],[data-surprise-bin]').forEach(button => { button.disabled = blocked; });
    render();
  }
  listen(doc, 'click', event => {
    const target = event.target.closest?.('[data-surprise-toggle],[data-surprise-dismiss],[data-surprise-star],[data-surprise-cat],[data-surprise-bin],[data-surprise-game],[data-surprise-clue]');
    if (!target || blocked || disposed || target.disabled) return;
    if (target.matches('[data-surprise-toggle]')) { setOpen(!open, target); return; }
    if (target.matches('[data-surprise-dismiss]')) { setOpen(false); return; }
    if (target.matches('[data-surprise-star]')) {
      if (!state.collect(target.dataset.surpriseStar)) return;
      render();
      const text = state.complete ? 'All four pixels found. Curiosity badge unlocked!' : `Found one. ${4 - state.stars.length} little pixels still out there.`;
      message.textContent = text; speak(text);
      if (state.complete) celebrate();
      if (compact.matches) panel.querySelector('[data-surprise-clue]').focus({ preventScroll: true });
      else returnFocus();
      return;
    }
    if (target.matches('[data-surprise-clue]')) {
      const missing = LOST_PIXELS.find(id => !state.stars.includes(id));
      const clues = compact.matches
        ? { cloud: 'The four little sparkles below are waiting for a tap.', window: 'A pixel can hide in plain sight. Try another sparkle.', garden: 'Two down. Two tiny treasures to go.', moon: 'One last sparkle. You have a good eye.' }
        : { cloud: 'Look above the little studio. Something bright is out of place.', window: 'A little sparkle escaped beside your welcome window.', garden: 'Look near the walking path. Not every flower is a flower.', moon: 'One is hiding close to the sidequest window itself.' };
      message.textContent = missing ? clues[missing] : 'You found them all. Try the cat, the bin, or that mystery disk.';
      return;
    }
    if (target.matches('[data-surprise-cat]')) {
      const lines = ['Purrr. You passed the vibe check.', 'I supervise all important naps.', 'A tiny cat. A very big opinion.', 'Try the recycle bin. I heard something growing.'];
      root.classList.add('is-purring'); speak(lines[petCount++ % lines.length]); return;
    }
    if (target.matches('[data-surprise-bin]')) {
      const before = state.garden; state.grow(); render();
      speak(before === 0 ? 'Not every discarded idea is gone. You found a seed!' : before === 1 ? 'A little care. A whole new beginning.' : 'Some ideas just need a second chance.');
      if (compact.matches && !open) setOpen(true, target);
      return;
    }
    if (target.matches('[data-surprise-game]') && arcadeEnabled()) {
      const chosen = pickSurpriseGame(Math.random, previousGame); previousGame = chosen;
      setOpen(false, null, false); clearEffects();
      const recover = () => {
        // Mobile hides the whole sidequest surface when it closes. Reopen it
        // before announcing a failed launch so the message and focus stay usable.
        setOpen(true, target);
        speak('The disk needs another try. Your games are still in the studio.');
      };
      try {
        if (playGame(chosen) === false) recover();
      } catch { recover(); }
    }
  });
  listen(doc, 'keydown', event => {
    if (!open || blocked || event.defaultPrevented || !root.contains(event.target)) return;
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return; }
  });
  listen(compact, 'change', () => {
    const hadFocus = root.contains(doc.activeElement);
    clearEffects(); setOpen(!compact.matches, null, hadFocus);
  });
  listen(reduced, 'change', clearEffects);
  listen(win, 'blur', clearEffects);
  listen(doc, 'visibilitychange', () => { if (doc.hidden) clearEffects(); });
  const observer = new win.MutationObserver(refresh);
  observer.observe(workspace, { attributes: true, attributeFilter: ['class'] });
  setOpen(open, null, false); refresh();
  return {
    refresh,
    destroy() { disposed = true; clearEffects(); observer.disconnect(); cleanups.forEach(cleanup => cleanup()); root.remove(); },
  };
}
