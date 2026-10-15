import test from 'node:test';
import assert from 'node:assert/strict';
import { mountArcade } from '../src/two/arcade.js';
import { CABINETS, ROOM } from '../src/two/arcade-world.js';

class Hub {
  listeners = new Map();
  addEventListener(type, callback) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(callback); }
  removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
  emit(type, values = {}) {
    const event = { target: this, button: 0, detail: 1, defaultPrevented: false, immediatePropagationStopped: false, preventDefault() { this.defaultPrevented = true; }, stopImmediatePropagation() { this.immediatePropagationStopped = true; }, ...values };
    for (const callback of this.listeners.get(type) || []) { callback(event); if (event.immediatePropagationStopped) break; }
    return event;
  }
}

async function fixture(t, { width = 320, height = 256, reducedMotion = false } = {}) {
  const originalGlobals = new Map();
  const originalRoom = { ...ROOM }, originalCabinets = CABINETS.map(cab => ({ ...cab }));
  const install = (name, value) => { originalGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { configurable: true, writable: true, value }); };
  const noop = () => {};
  const draws = [];
  const doc = new Hub(), win = new Hub(), motion = new Hub(); motion.matches = reducedMotion;
  class Element extends Hub {
    constructor(kind = 'div') {
      super(); this.kind = kind; this.dataset = {}; this.style = { setProperty: noop }; this.children = []; this.map = new Map(); this.attributes = {}; this.clientWidth = width; this.clientHeight = height; this.textContent = ''; this.isConnected = true;
      this.classNames = new Set(); this.classList = { add: name => this.classNames.add(name), remove: name => this.classNames.delete(name), toggle: (name, value) => value ? this.classNames.add(name) : this.classNames.delete(name), contains: name => this.classNames.has(name) };
    }
    append(child) { child.parent = this; this.children.push(child); }
    querySelector(selector) {
      if (selector.startsWith('[data-cabinet=')) return this.children.find(child => child.dataset.cabinet === selector.match(/"([^"]+)"/)[1]);
      if (!this.map.has(selector)) { const child = new Element(selector.includes('canvas') ? 'canvas' : selector.includes('button') ? 'button' : 'div'); this.map.set(selector, child); this.append(child); }
      return this.map.get(selector);
    }
    querySelectorAll(selector) {
      if (selector === '[data-input]') return this.children.filter(child => child.dataset.input);
      if (selector === '[data-walk]') return this.children.filter(child => child.dataset.walk);
      if (selector === 'button') return this.children.filter(child => child.kind === 'button');
      return [];
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    getAttribute(name) { return this.attributes[name]; }
    getContext() {
      if (this.context) return this.context;
      let anchor = { x: 0, y: 0 }; const stack = [];
      const context = {
        save() { stack.push(anchor); }, restore() { anchor = stack.pop() || { x: 0, y: 0 }; },
        translate(x, y) { anchor = { x, y }; },
        drawImage: (...args) => { if (args.length === 9 && args[0]?.src) draws.push({ canvas: this, ...anchor, source: args[0].src, crop: args.slice(1, 5) }); },
        // Synthetic opaque poses let the real painter render; its last
        // translate exposes actual position without production test hooks.
        getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(w * h * 4).fill(255) }; },
      };
      this.context = new Proxy(context, { get: (target, key) => key in target ? target[key] : noop });
      return this.context;
    }
    getBoundingClientRect() { return this.rect || { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }; }
    getClientRects() { return [{}]; }
    contains(target) { return target === this || this.children.some(child => child.contains(target)); }
    closest(selector) {
      const matches = selector.split(',').some(part => {
        const value = part.trim();
        return value === this.kind || (value.startsWith('.') && this.classNames.has(value.slice(1))) || (value === '[contenteditable]' && this.contentEditable);
      });
      return matches ? this : this.parent?.closest(selector) || null;
    }
    focus() { doc.activeElement = this; doc.emit('focusin', { target: this }); }
    setPointerCapture() {}
    remove() { this.isConnected = false; }
  }
  const workspace = new Element(), world = workspace.querySelector('.arcade-world'), building = workspace.querySelector('.arcade-building');
  const worldCanvas = workspace.querySelector('.world-canvas'), controls = workspace.querySelector('.outdoor-controls');
  for (const direction of ['up', 'down', 'left', 'right']) { const button = new Element('button'); button.dataset.walk = direction; controls.append(button); }
  const screen = world.querySelector('.arcade-screen'), result = screen.querySelector('.arcade-result');
  const panel = world.querySelector('.arcade-input'), action = world.querySelector('.arcade-action'); action.kind = 'button'; action.dataset.input = 'action'; panel.append(action);
  for (const direction of ['up', 'down', 'left', 'right']) { const button = new Element('button'); button.dataset.input = direction; panel.append(button); }
  const continueButton = screen.querySelector('[data-arcade-continue]'); continueButton.kind = 'button'; result.append(continueButton); result.append(new Element('button'));
  building.kind = 'button'; building.querySelector('img').rect = { left: 200, top: 130, width: 80, height: 80 };
  doc.body = new Element('body'); doc.body.append(workspace);
  doc.createElement = kind => new Element(kind); doc.querySelectorAll = () => [building]; doc.hidden = false; doc.activeElement = workspace;
  let now = 0, next = 1; const frames = new Map(), observers = [];
  install('document', doc); install('window', win); install('matchMedia', () => motion);
  install('Image', class { naturalWidth = 40; naturalHeight = 20; set src(value) { this.url = value; queueMicrotask(() => this.onload?.()); } get src() { return this.url; } async decode() {} });
  install('getComputedStyle', () => ({ paddingTop: '0', paddingBottom: '0', getPropertyValue: () => '#e4e4df' }));
  install('requestAnimationFrame', callback => { const id = next++; frames.set(id, callback); return id; }); install('cancelAnimationFrame', id => frames.delete(id));
  install('ResizeObserver', class { constructor(callback) { this.callback = callback; observers.push(this); } observe() {} disconnect() {} });
  install('localStorage', { getItem: () => null, setItem: noop });
  const arcade = mountArcade(workspace);
  t.after(() => { arcade.destroy(); assert.equal(frames.size, 0, 'Destroy must stop every animation loop'); Object.assign(ROOM, originalRoom); CABINETS.forEach((cab, index) => Object.assign(cab, originalCabinets[index])); for (const [name, descriptor] of originalGlobals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; } });
  for (let index = 0; index < 12; index++) await Promise.resolve();
  const characterCanvas = workspace.querySelector('.pixel-playground').children.find(child => child.className === 'character-canvas');
  const tick = (count, interval = 1000 / 60) => { for (let index = 0; index < count; index++) { now += interval; const batch = [...frames.values()]; frames.clear(); for (const callback of batch) callback(now); } };
  const key = (type, value, code = value, target = doc.activeElement) => doc.emit(type, { key: value, code, target });
  const actor = () => draws.findLast(draw => draw.canvas === (workspace.dataset.arcadeState === 'desktop' ? characterCanvas : worldCanvas));
  tick(1);
  assert.ok(actor(), 'Fixture must observe a rendered character');
  return { arcade, workspace, world, worldCanvas, building, controls, action, screen, panel, doc, win, tick, key, actor, createElement: kind => new Element(kind), get pendingFrames() { return frames.size; }, resize(newWidth, newHeight) { workspace.clientWidth = newWidth; workspace.clientHeight = newHeight; observers[0].callback(); } };
}

test('the outdoor character stays still until a direction is held and stops on release', async t => {
  const f = await fixture(t);
  const start = f.actor(); f.tick(180);
  assert.equal(f.actor().x, start.x, 'An idle visit must not start an automatic patrol');
  f.key('keydown', 'd', 'KeyD'); f.tick(31);
  const walking = f.actor();
  assert.ok(walking.x - start.x > 18 && walking.x - start.x < 32, 'Half a second should be a measured walk rather than a run');
  f.key('keyup', 'd', 'KeyD'); f.tick(1);
  const stopped = f.actor(); f.tick(120);
  assert.equal(f.actor().x, stopped.x, 'Releasing a direction must stop without coasting');
  assert.deepEqual(f.actor().crop, start.crop, 'The released character returns to its idle pose');
});

test('building and cabinet clicks open their destination without starting an automatic walk', async t => {
  const f = await fixture(t);
  f.building.emit('click');
  assert.equal(f.workspace.dataset.arcadeState, 'room', 'The building opens immediately');
  f.tick(1); const start = f.actor(); f.tick(180);
  assert.deepEqual([f.actor().x, f.actor().y], [start.x, start.y], 'The room character waits for directional input');
  const snake = f.world.querySelector('.arcade-cabinets').children.find(button => button.dataset.cabinet === 'snake');
  snake.emit('click');
  assert.equal(f.workspace.dataset.arcadeState, 'game', 'A selected game opens without an autonomous route');
  assert.equal(f.screen.querySelector('.arcade-screen-title').textContent, 'Snake');
});

test('clicking the arcade floor does not move the character', async t => {
  const f = await fixture(t);
  f.building.emit('click'); f.tick(1); const start = f.actor();
  f.worldCanvas.emit('pointerdown', { clientX: start.x + 40, clientY: start.y - 20, pointerId: 1 });
  f.tick(120);
  assert.deepEqual([f.actor().x, f.actor().y], [start.x, start.y]);
});

test('outdoor touch controls keep independent holds and release on pointer cancellation', async t => {
  const f = await fixture(t);
  const right = f.controls.children.find(button => button.dataset.walk === 'right');
  const start = f.actor().x;
  right.emit('pointerdown', { pointerId: 11 }); right.emit('pointerdown', { pointerId: 12 });
  right.emit('pointerup', { pointerId: 11 }); f.tick(20);
  assert.ok(f.actor().x > start, 'The other finger still owns its directional hold');
  right.emit('pointercancel', { pointerId: 12 }); f.tick(1);
  const stopped = f.actor().x; f.tick(60);
  assert.equal(f.actor().x, stopped, 'Cancelling the final pointer stops movement');
});

test('releasing D preserves a held right-arrow movement at the slower room speed', async t => {
  const f = await fixture(t, { reducedMotion: true });
  f.building.emit('click'); f.tick(1); const start = f.actor().x;
  f.key('keydown', 'ArrowRight'); f.key('keydown', 'd', 'KeyD');
  f.key('keyup', 'd', 'KeyD'); f.tick(31);
  const displacement = f.actor().x - start;
  assert.ok(displacement > 20 && displacement < 24, 'The remaining hold walks about 22 scene units in half a second');
  f.key('keyup', 'ArrowRight'); f.tick(1); const stopped = f.actor().x; f.tick(60);
  assert.equal(f.actor().x, stopped);
  assert.equal(f.pendingFrames, 0, 'Reduced-motion room stops drawing once movement ends');
});

test('desktop movement ignores typing and controls inside an open app window', async t => {
  const f = await fixture(t); const start = f.actor().x;
  const editor = f.createElement('input'); f.workspace.append(editor); editor.focus();
  const typing = f.key('keydown', 'd', 'KeyD'); f.tick(30);
  assert.equal(f.actor().x, start); assert.equal(typing.defaultPrevented, false);
  const app = f.createElement(); app.classList.add('app-window'); app.classList.add('os-window');
  f.workspace.querySelector('.window-layer').append(app); app.focus();
  f.key('keydown', 'ArrowRight'); f.tick(30);
  assert.equal(f.actor().x, start, 'An app window must not steer the desktop character');
});

test('desktop Escape reaches the app window handler without being consumed by the arcade', async t => {
  const f = await fixture(t);
  const app = f.createElement(); app.classList.add('app-window');
  f.workspace.querySelector('.window-layer').append(app); app.focus();
  let received = 0;
  f.doc.addEventListener('keydown', event => { if (event.key === 'Escape' && !event.defaultPrevented) received++; });
  const escape = f.key('keydown', 'Escape');
  assert.equal(escape.defaultPrevented, false, 'An app must retain its native Escape action');
  assert.equal(escape.immediatePropagationStopped, false);
  assert.equal(received, 1, 'A subsequent About-window handler receives Escape');
  assert.equal(f.workspace.dataset.arcadeState, 'desktop');
});

test('Ctrl, Meta, and Alt WASD shortcuts do not steer the character or prevent browser actions', async t => {
  const f = await fixture(t);
  for (const scene of ['desktop', 'room']) {
    if (scene === 'room') { f.building.emit('click'); f.tick(1); }
    for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) for (const letter of ['w', 'a', 's', 'd']) {
      const start = f.actor();
      const shortcut = f.doc.emit('keydown', { key: letter, code: `Key${letter.toUpperCase()}`, target: f.doc.activeElement, [modifier]: true });
      f.tick(12);
      assert.deepEqual([f.actor().x, f.actor().y], [start.x, start.y], `${scene}: ${modifier}+${letter} must not move`);
      assert.equal(shortcut.defaultPrevented, false, `${modifier}+${letter} must remain available to the browser`);
      f.key('keyup', letter, `Key${letter.toUpperCase()}`);
    }
  }
});

test('window blur releases held movement and pauses an active game', async t => {
  const f = await fixture(t, { reducedMotion: true });
  f.key('keydown', 'ArrowRight'); f.tick(10); f.win.emit('blur');
  assert.equal(f.pendingFrames, 0);
  const stopped = f.actor().x; f.win.emit('focus'); f.tick(60);
  assert.equal(f.actor().x, stopped, 'Returning to the tab must not restore the old hold');
  f.building.emit('click'); f.tick(1);
  const blocks = f.world.querySelector('.arcade-cabinets').children.find(button => button.dataset.cabinet === 'blocks'); blocks.emit('click'); f.tick(30);
  assert.equal(f.workspace.dataset.arcadeState, 'game');
  f.win.emit('blur');
  assert.equal(f.screen.querySelector('[data-arcade-pause]').textContent, 'Resume');
  assert.equal(f.pendingFrames, 0, 'Neither the room nor the game may keep running in the background');
});
