import { drawOutside, drawRoomBackdrop, drawCabinet } from './arcade-art.js';
import { createPixelPainter } from './companion.js';
import { CABINETS, ROOM, canWalk, configureRoom, nearestCabinet } from './arcade-world.js';
import { createSnake, createBrickBreaker, createPong } from './arcade-games-a.js';
import { createMemoryMatch, createBlockDrop, createCoinMaze } from './arcade-games-b.js';
import { createGlitchRun } from './arcade-runner.js';
import { advanceGait } from './locomotion.js';

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
  const outdoorControls = workspace.querySelector('.outdoor-controls');
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
  const held = new Set(), inputSources = new Map(), cleanups = [], timers = new Set();
  const sessionBests = new Map();
  let mode = 'desktop', painter, frame = 0, last = 0, time = 0, disposed = false;
  let windowFocused = true;
  let pixelScale = 2;
  let palette, view = { x: 0, y: 0, scale: 1 }, previousFocus;
  let outer = { x: 80, y: 80, facing: 1, phase: 0, moving: false, direction: 'right' };
  let player = { x: 160, y: 226, direction: 'down', moving: false, phase: 0 };
  let game, currentCabinet, round = 'running', score = 0, best = 0, near;
  const outdoorHeight = () => (workspace.clientWidth <= 760
    ? workspace.clientHeight <= 300 ? Math.min(108, Math.max(80, workspace.clientHeight * 0.5 - 4)) : Math.min(152, Math.max(108, workspace.clientHeight * 0.27))
    : Math.min(204, Math.max(144, workspace.clientHeight * 0.28))) / pixelScale;
  const roomCharacterHeight = () => Math.max(52, 64 / pixelScale);
  const outdoorGround = () => workspace.clientWidth <= 760 || workspace.clientHeight <= 520 ? 72 / pixelScale : 32;
  const outdoorMargin = () => Math.ceil(outdoorHeight() * (painter?.aspectRatio || 0.57) / 2) + 8;
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
    inputSources.clear();
    ['up', 'down', 'left', 'right', 'action'].forEach(action => game?.input(action, false));
    player.moving = false; outer.moving = false;
    outdoorControls?.querySelectorAll('[data-walk]').forEach(button => button.classList.remove('is-held'));
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
    outdoorControls.hidden = mode !== 'desktop';
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
    world.querySelector('[data-arcade-subtitle]').textContent = 'Take your time. Find your next favourite.';
  }
  function stopGame() {
    clearInput(); saveBest(); game?.destroy(); game = undefined;
  }
  function exit({ restoreFocus = true } = {}) {
    if (mode === 'desktop') return;
    stopGame(); mode = 'desktop'; near = undefined;
    sync(); onActiveChange(false);
    outer.y = ROOM.height - outdoorGround();
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
    mode = 'room'; near = undefined;
    if (!fromGame) player = { x: ROOM.width / 2, y: ROOM.height - 26, direction: 'down', moving: false, phase: 0 };
    clearInput(); sync(); fitRoom(); world.focus({ preventScroll: true });
    announce('Welcome to Vivek Arcade. Hold arrows or WASD to walk. Release to stop. Click a cabinet to play.');
    last = 0; wake();
  }
  function enter() {
    if (mode !== 'desktop') { exit(); return; }
    previousFocus = document.activeElement; onActiveChange(true); enterRoom();
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
    clearInput(); launch(cabinet);
  }
  function input(action, pressed = true, source = action) {
    if (mode === 'game' && round !== 'running') return;
    const sources = inputSources.get(action) || new Set();
    const wasHeld = sources.size > 0;
    if (pressed) sources.add(source); else sources.delete(source);
    if (sources.size) { inputSources.set(action, sources); held.add(action); }
    else { inputSources.delete(action); held.delete(action); }
    // Equivalent keys and touch controls can be held together. Release an
    // action only after its last input source lets go.
    if (wasHeld === (sources.size > 0)) return;
    if (mode === 'game') { game.input(action, sources.size > 0); return; }
    if (mode === 'desktop') {
      outdoorControls.querySelectorAll('[data-walk]').forEach(button => button.classList.toggle('is-held', held.has(button.dataset.walk)));
      if (action === 'action') return;
      if (!pressed && !['up', 'down', 'left', 'right'].some(direction => held.has(direction))) outer.moving = false;
      wake(); return;
    }
    if (action === 'action') {
      if (pressed && near) selectCabinet(near);
      else if (pressed) announce('Walk to a cabinet first, or click one to play.');
      return;
    }
    if (!pressed && !['up', 'down', 'left', 'right'].some(direction => held.has(direction))) player.moving = false;
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
      : 'Hold arrows / WASD to walk. Release to stop. Click a cabinet, or press Enter / E nearby.';
  }
  function movePlayer(dt) {
    const startX = player.x, startY = player.y;
    let dx = Number(held.has('right')) - Number(held.has('left'));
    let dy = Number(held.has('down')) - Number(held.has('up'));
    const length = Math.hypot(dx, dy); if (length) { dx /= length; dy /= length; }
    if (dx || dy) {
      const step = dt * 44;
      if (canWalk(player.x + dx * step, player.y)) player.x += dx * step;
      if (canWalk(player.x, player.y + dy * step)) player.y += dy * step;
    }
    const movedX = player.x - startX, movedY = player.y - startY, distance = Math.hypot(movedX, movedY);
    player.moving = distance > 0.001;
    if (player.moving) {
      const horizontal = ['left', 'right'].includes(player.direction);
      if (Math.abs(movedX) > Math.abs(movedY) * 1.15 || (horizontal && Math.abs(movedX) >= Math.abs(movedY) * 0.87)) player.direction = movedX >= 0 ? 'right' : 'left';
      else player.direction = movedY >= 0 ? 'down' : 'up';
      player.phase = advanceGait(player.phase, distance, roomCharacterHeight());
    }
    updateHint();
    if (player.moving && player.y > ROOM.height - 21 && Math.abs(player.x - ROOM.width / 2) < 24) exit();
  }
  function moveOutdoor(dt) {
    let dx = Number(held.has('right')) - Number(held.has('left'));
    let dy = Number(held.has('down')) - Number(held.has('up'));
    const length = Math.hypot(dx, dy); if (length) { dx /= length; dy /= length; }
    const startX = outer.x, startY = outer.y, step = dt * outdoorHeight() * 0.48, margin = outdoorMargin();
    outer.x = Math.max(margin, Math.min(ROOM.width - margin, outer.x + dx * step));
    const ground = ROOM.height - outdoorGround();
    outer.y = Math.max(ground - 20, Math.min(ground + 4, outer.y + dy * step));
    const distance = Math.hypot(outer.x - startX, outer.y - startY);
    outer.moving = distance > 0.001;
    if (outer.moving) {
      if (dx) { outer.facing = dx < 0 ? -1 : 1; outer.direction = dx < 0 ? 'left' : 'right'; }
      else if (dy) outer.direction = dy < 0 ? 'up' : 'down';
      outer.phase = advanceGait(outer.phase, distance, outdoorHeight());
    }
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
    const compact = workspace.clientHeight <= 520;
    const short = workspace.clientHeight <= 400;
    const smallLandscape = workspace.clientWidth > 430 && workspace.clientWidth <= 700 && workspace.clientHeight <= 240;
    configureRoom(workspace.clientWidth / pixelScale, workspace.clientHeight / pixelScale, {
      top: (smallLandscape ? 56 : compact ? workspace.clientWidth < 600 ? 96 : 100 : 140) / pixelScale,
      bottom: (smallLandscape ? 56 : short ? 64 : workspace.clientWidth <= 760 ? 130 : 96) / pixelScale,
      characterHeight: roomCharacterHeight(),
    });
    const resolution = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    worldCanvas.width = Math.round(workspace.clientWidth * resolution); worldCanvas.height = Math.round(workspace.clientHeight * resolution);
    characterCanvas.width = worldCanvas.width; characterCanvas.height = worldCanvas.height;
    ctx.setTransform(resolution, 0, 0, resolution, 0, 0); characterCtx.setTransform(resolution, 0, 0, resolution, 0, 0);
    player.x = Math.round(fraction.x * ROOM.width); player.y = Math.round(fraction.y * ROOM.height);
    if (!canWalk(player.x, player.y)) { player.x = ROOM.width / 2; player.y = ROOM.height - 26; }
    const margin = outdoorMargin();
    outer.x = Math.min(ROOM.width - margin, Math.max(margin, outer.x)); outer.y = ROOM.height - outdoorGround();
    ctx.imageSmoothingEnabled = false; fitRoom(); fitGame(); refresh();
    if (mode === 'room') updateHint();
  }
  function drawRoom() {
    ctx.save(); ctx.translate(view.x, view.y); ctx.scale(view.scale, view.scale);
    drawRoomBackdrop(ctx, { width: ROOM.width, height: ROOM.height, cabinets: CABINETS });
    const entities = CABINETS.map(cab => ({ y: cab.y - 5, paint: () => drawCabinet(ctx, cab, time, cab.id === near?.id) }));
    entities.push({ y: player.y, paint: () => painter?.drawRoom(ctx, { ...player,
      moving: player.moving && !motion.matches, phase: motion.matches ? 0 : player.phase,
      time: motion.matches ? 0 : time, height: roomCharacterHeight() }) });
    entities.sort((a,b) => a.y - b.y).forEach(entity => entity.paint());
    ctx.restore();
  }
  function drawOutdoor() {
    ctx.save(); ctx.scale(pixelScale, pixelScale);
    drawOutside(ctx, { width: ROOM.width, height: ROOM.height, palette, time, groundOffset: outdoorGround() });
    ctx.restore();
    characterCtx.save(); characterCtx.scale(pixelScale, pixelScale);
    const moving = outer.moving && !motion.matches;
    if (['up', 'down'].includes(outer.direction)) painter?.drawRoom(characterCtx, { x: outer.x, y: outer.y,
      height: outdoorHeight(), phase: outer.phase, moving, direction: outer.direction });
    else painter?.draw(characterCtx, { x: outer.x, y: outer.y, height: outdoorHeight(), phase: outer.phase,
      pose: moving ? 'run' : 'idle', facing: outer.facing });
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
    if (mode === 'desktop') moveOutdoor(dt);
    else if (mode === 'room') movePlayer(dt);
    draw();
    // A transition inside this tick may already have scheduled the next frame.
    // Go through wake() so entering or exiting never creates duplicate loops.
    if ((mode === 'room' && (held.size || !motion.matches)) || (mode === 'desktop' && held.size)) wake();
    else last = 0;
  }
  function wake() { if (!frame && !disposed && !document.hidden && windowFocused) frame = requestAnimationFrame(tick); }

  if (!ctx || !characterCtx) {
    entryButtons.forEach(button => { button.disabled = true; });
    building.querySelector('span').textContent = 'Arcade needs canvas support';
    return { active: false, exit() {}, refresh() {}, destroy() {} };
  }
  CABINETS.forEach(cab => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'cabinet-hotspot'; button.dataset.cabinet = cab.id;
    button.setAttribute('aria-label', `Play ${cab.title}`); button.innerHTML = `<span>${cab.title}<small>PLAY ↗</small></span>`;
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
      (mode === 'game' ? gameCanvas : world).focus({ preventScroll: true }); input(button.dataset.input, true, `pointer:${event.pointerId}`);
    });
    const release = event => input(button.dataset.input, false, `pointer:${event.pointerId}`);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => listen(button, type, release));
    listen(button, 'click', event => {
      if (event.detail === 0) {
        const source = Symbol('control activation');
        input(button.dataset.input, true, source);
        later(() => input(button.dataset.input, false, source), 140);
      }
    });
  });
  outdoorControls.querySelectorAll('[data-walk]').forEach(button => {
    listen(button, 'pointerdown', event => {
      if (mode !== 'desktop' || event.button !== 0) return;
      event.preventDefault(); button.setPointerCapture(event.pointerId); workspace.focus({ preventScroll: true });
      input(button.dataset.walk, true, `pointer:${event.pointerId}`);
    });
    const release = event => input(button.dataset.walk, false, `pointer:${event.pointerId}`);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => listen(button, type, release));
    listen(button, 'click', event => {
      if (event.detail !== 0 || mode !== 'desktop') return;
      workspace.focus({ preventScroll: true });
      const source = Symbol('walk control activation'); input(button.dataset.walk, true, source);
      later(() => input(button.dataset.walk, false, source), 160);
    });
  });
  listen(gameCanvas, 'pointerdown', event => {
    if (currentCabinet?.id === 'runner' && round === 'running' && event.button === 0) {
      input('action', true, 'canvas tap'); input('action', false, 'canvas tap');
    }
  });
  listen(document, 'keydown', event => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (mode === 'game' && round !== 'running' && event.key === 'Tab') {
      const buttons = [...result.querySelectorAll('button')];
      const index = buttons.indexOf(document.activeElement);
      const next = event.shiftKey ? (index <= 0 ? buttons.length - 1 : index - 1) : (index + 1) % buttons.length;
      event.preventDefault(); buttons[next].focus(); return;
    }
    if (event.key === 'Escape' && mode !== 'desktop') {
      event.preventDefault(); event.stopImmediatePropagation();
      if (mode === 'game') { if (round === 'running') pause(); else enterRoom({ fromGame: true }); }
      else exit(); return;
    }
    if (event.target.closest('input,textarea,select,[contenteditable]')) return;
    if (mode === 'desktop') {
      if (!(workspace.contains(event.target) || event.target === document.body)
        || event.target.closest('.app-window,.start-menu,.desktop-icons')) return;
    } else if (!world.contains(event.target)) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (event.repeat) { if (keyActions[key]) event.preventDefault(); return; }
    if (mode === 'game' && key === 'p') { event.preventDefault(); if (round === 'paused') resume(); else pause(); return; }
    if (mode === 'game' && key === 'r') { event.preventDefault(); restart(); return; }
    if (event.target.closest('button,a')) return;
    const action = keyActions[key]; if (!action) return;
    if (mode === 'desktop' && action === 'action') return;
    event.preventDefault(); input(action, true, `key:${event.code || key}`);
  }, true);
  listen(document, 'keyup', event => { const key = event.key.length === 1 ? event.key.toLowerCase() : event.key; if (keyActions[key]) input(keyActions[key], false, `key:${event.code || key}`); });
  listen(document, 'focusin', event => {
    if (world.contains(event.target)) return;
    if (mode === 'game') pause({ focus: false });
    else { clearInput(); draw(); }
  });
  listen(window, 'blur', () => {
    windowFocused = false; pause({ focus: false }); clearInput(); draw();
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
  createPixelPainter().then(value => { if (!disposed) { painter = value; if (mode === 'desktop') outer.x = ROOM.width * 0.37; draw(); wake(); } }).catch(() => {});
  wake();
  return { get active() { return mode !== 'desktop'; }, exit, refresh,
    destroy() { stopGame(); disposed = true; cancelAnimationFrame(frame); observer.disconnect(); stageObserver.disconnect(); timers.forEach(clearTimeout); cleanups.forEach(cleanup => cleanup()); characterCanvas.remove(); },
  };
}
