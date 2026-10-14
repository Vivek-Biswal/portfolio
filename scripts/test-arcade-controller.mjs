import test from 'node:test';
import assert from 'node:assert/strict';
import { mountArcade } from '../src/two/arcade.js';
import { CABINETS, ROOM } from '../src/two/arcade-world.js';

class Hub {
  listeners = new Map();
  addEventListener(type, callback) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(callback); }
  removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
  emit(type, values = {}) {
    const event = { target: this, button: 0, detail: 1, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopImmediatePropagation() {}, ...values };
    for (const callback of this.listeners.get(type) || []) callback(event);
  }
}

function fixture(t, { width = 320, height = 256, reducedMotion = false } = {}) {
  const originalGlobals = new Map();
  const originalRoom = { ...ROOM }, originalCabinets = CABINETS.map(cab => ({ ...cab }));
  const install = (name, value) => { originalGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { configurable: true, writable: true, value }); };
  const noop = () => {};
  const context = new Proxy({}, { get: (target, key) => key in target ? target[key] : noop });
  const doc = new Hub(), win = new Hub(), motion = new Hub(); motion.matches = reducedMotion;
  class Element extends Hub {
    constructor(kind = 'div') { super(); this.kind = kind; this.dataset = {}; this.style = {}; this.children = []; this.map = new Map(); this.attributes = {}; this.clientWidth = width; this.clientHeight = height; this.textContent = ''; this.isConnected = true; this.classList = { toggle: noop, contains: () => false }; }
    append(child) { child.parent = this; this.children.push(child); }
    querySelector(selector) {
      if (selector.startsWith('[data-cabinet=')) return this.children.find(child => child.dataset.cabinet === selector.match(/"([^"]+)"/)[1]);
      if (!this.map.has(selector)) { const child = new Element(selector.includes('canvas') ? 'canvas' : selector.includes('button') ? 'button' : 'div'); this.map.set(selector, child); this.append(child); }
      return this.map.get(selector);
    }
    querySelectorAll(selector) { if (selector === '[data-input]') return this.children.filter(child => child.dataset.input); if (selector === 'button') return this.children.filter(child => child.kind === 'button'); return []; }
    setAttribute(name, value) { this.attributes[name] = value; }
    getAttribute(name) { return this.attributes[name]; }
    getContext() { return context; }
    getBoundingClientRect() { return this.rect || { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }; }
    getClientRects() { return [{}]; }
    contains(target) { return target === this || this.children.some(child => child.contains(target)); }
    closest(selector) { return selector === 'button,a' && this.kind === 'button' ? this : null; }
    focus() { doc.activeElement = this; doc.emit('focusin', { target: this }); }
    setPointerCapture() {}
    remove() { this.isConnected = false; }
  }
  const workspace = new Element(), world = workspace.querySelector('.arcade-world'), building = workspace.querySelector('.arcade-building');
  const screen = world.querySelector('.arcade-screen'), result = screen.querySelector('.arcade-result');
  const panel = world.querySelector('.arcade-input'), action = world.querySelector('.arcade-action'); action.kind = 'button'; action.dataset.input = 'action'; panel.append(action);
  for (const direction of ['up', 'down', 'left', 'right']) { const button = new Element('button'); button.dataset.input = direction; panel.append(button); }
  const continueButton = screen.querySelector('[data-arcade-continue]'); continueButton.kind = 'button'; result.append(continueButton); result.append(new Element('button'));
  building.kind = 'button'; building.querySelector('img').rect = { left: 200, top: 130, width: 80, height: 80 };
  doc.createElement = kind => new Element(kind); doc.querySelectorAll = () => [building]; doc.hidden = false; doc.activeElement = building;
  let now = 0, next = 1; const frames = new Map(), observers = [];
  install('document', doc); install('window', win); install('matchMedia', () => motion);
  install('getComputedStyle', () => ({ paddingTop: '0', paddingBottom: '0', getPropertyValue: () => '#e4e4df' }));
  install('requestAnimationFrame', callback => { const id = next++; frames.set(id, callback); return id; }); install('cancelAnimationFrame', id => frames.delete(id));
  install('ResizeObserver', class { constructor(callback) { this.callback = callback; observers.push(this); } observe() {} disconnect() {} });
  install('localStorage', { getItem: () => null, setItem: noop });
  const arcade = mountArcade(workspace);
  t.after(() => { arcade.destroy(); assert.equal(frames.size, 0, 'Destroy must stop every animation loop'); Object.assign(ROOM, originalRoom); CABINETS.forEach((cab, index) => Object.assign(cab, originalCabinets[index])); for (const [name, descriptor] of originalGlobals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; } });
  const tick = (count, interval = 1000 / 60) => { for (let index = 0; index < count; index++) { now += interval; const batch = [...frames.values()]; frames.clear(); for (const callback of batch) callback(now); } };
  const key = (type, value, code = value) => doc.emit(type, { key: value, code, target: world });
  return { arcade, workspace, world, building, action, screen, panel, doc, win, tick, key, get pendingFrames() { return frames.size; }, resize(newWidth, newHeight) { workspace.clientWidth = newWidth; workspace.clientHeight = newHeight; observers[0].callback(); } };
}

test('entering and exiting during an animation tick retain one movement loop', t => {
  const f = fixture(t);
  f.building.emit('click'); f.tick(180);
  assert.equal(f.workspace.dataset.arcadeState, 'room');
  assert.equal(f.pendingFrames, 1, 'Entering the room must not fork its animation loop');
  f.key('keydown', 'ArrowDown'); f.tick(30);
  assert.equal(f.workspace.dataset.arcadeState, 'desktop');
  assert.equal(f.pendingFrames, 1);
});

test('releasing D preserves a simultaneously held right-arrow movement', t => {
  const f = fixture(t, { reducedMotion: true });
  f.building.emit('click'); f.tick(1);
  assert.equal(f.action.textContent, 'Play Block Drop');
  f.key('keydown', 'ArrowRight'); f.key('keydown', 'd', 'KeyD');
  f.key('keyup', 'd', 'KeyD'); f.tick(65);
  assert.equal(f.action.textContent, 'Play Coin Maze', 'The other held key must keep moving toward the right cabinet');
  f.key('keyup', 'ArrowRight'); f.tick(1);
  assert.equal(f.pendingFrames, 0, 'Reduced-motion room stops drawing once movement ends');
});

test('a viewport resize replans an in-flight cabinet walk and still launches the chosen game', t => {
  const f = fixture(t, { reducedMotion: true });
  f.building.emit('click'); f.tick(1);
  const snake = f.world.querySelector('.arcade-cabinets').children.find(button => button.dataset.cabinet === 'snake');
  snake.emit('click'); f.tick(12); f.resize(640, 300); f.tick(300);
  assert.equal(f.workspace.dataset.arcadeState, 'game');
  assert.equal(f.screen.querySelector('.arcade-screen-title').textContent, 'Snake');
});

test('an approach follows the building entrance after a viewport resize', t => {
  const f = fixture(t);
  f.building.emit('click'); f.tick(6);
  f.building.querySelector('img').rect = { left: 550, top: 100, width: 80, height: 80 };
  f.resize(640, 300); f.tick(90);
  assert.equal(f.workspace.dataset.arcadeState, 'approaching', 'The character must not enter at the old building position');
  f.tick(240);
  assert.equal(f.workspace.dataset.arcadeState, 'room');
  assert.equal(f.pendingFrames, 1);
});

test('window blur releases held movement and pauses an active game', t => {
  const f = fixture(t, { reducedMotion: true });
  f.building.emit('click'); f.tick(1); f.key('keydown', 'ArrowRight'); f.win.emit('blur');
  assert.equal(f.pendingFrames, 0);
  f.win.emit('focus'); f.tick(65);
  assert.equal(f.action.textContent, 'Play Block Drop');
  f.key('keydown', 'Enter'); f.tick(30);
  assert.equal(f.workspace.dataset.arcadeState, 'game');
  f.win.emit('blur');
  assert.equal(f.screen.querySelector('[data-arcade-pause]').textContent, 'Resume');
  assert.equal(f.pendingFrames, 0, 'Neither the room nor the game may keep running in the background');
});
