import test from 'node:test';
import assert from 'node:assert/strict';
import { createSnake, createBrickBreaker, createPong } from '../src/two/arcade-games-a.js';
import { createMemoryMatch, createBlockDrop, createCoinMaze } from '../src/two/arcade-games-b.js';

// The real game factories run against a deterministic animation clock and a
// recording canvas. Tests use public controls and rendered board geometry;
// there are no production-only test hooks or private state mutations.
let activeClock;

function createClock(t) {
  const originalRequest = globalThis.requestAnimationFrame;
  const originalCancel = globalThis.cancelAnimationFrame;
  let now = 0;
  let nextId = 1;
  const callbacks = new Map();
  const cleanups = [];
  globalThis.requestAnimationFrame = callback => {
    const id = nextId++;
    callbacks.set(id, callback);
    return id;
  };
  globalThis.cancelAnimationFrame = id => callbacks.delete(id);
  t.after(() => {
    try {
      cleanups.forEach(cleanup => cleanup());
      assert.equal(callbacks.size, 0, 'Fixture destruction leaked an animation callback');
    } finally {
      globalThis.requestAnimationFrame = originalRequest;
      globalThis.cancelAnimationFrame = originalCancel;
      activeClock = undefined;
    }
  });
  activeClock = {
    cleanup(callback) { cleanups.push(callback); },
    get pending() { return callbacks.size; },
    tick(frames = 1, interval = 1000 / 60) {
      for (let i = 0; i < frames; i += 1) {
        if (!callbacks.size) { now += (frames - i) * interval; return; }
        now += interval;
        const batch = [...callbacks.values()];
        callbacks.clear();
        batch.forEach(callback => callback(now));
      }
    },
  };
  return activeClock;
}

function createFixture(t, factory, random = () => 0) {
  let rectangles = [];
  let labels = [];
  const listeners = new Map();
  const scores = [];
  const endings = [];
  const target = {
    fillStyle: '', globalAlpha: 1,
    setTransform() { rectangles = []; labels = []; },
    fillRect(x, y, w, h) {
      if (x === 0 && y === 0 && w === 360 && h === 260) { rectangles = []; labels = []; }
      rectangles.push({ x, y, w, h, color: this.fillStyle, alpha: this.globalAlpha });
    },
    fillText(label, x, y) { labels.push({ label, x, y }); },
  };
  const noop = () => {};
  const context = new Proxy(target, {
    get(object, key) { return key in object ? object[key] : noop; },
    set(object, key, value) { object[key] = value; return true; },
  });
  const canvas = {
    width: 360, height: 260,
    getContext: () => context,
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 720, height: 520 }),
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(callback);
    },
    removeEventListener(type, callback) {
      listeners.get(type)?.delete(callback);
      if (!listeners.get(type)?.size) listeners.delete(type);
    },
  };
  const game = factory({ canvas, random, onScore: score => scores.push(score), onEnd: end => endings.push(end) });
  activeClock.cleanup(() => {
    game.destroy();
    assert.equal(listeners.size, 0, 'Fixture destruction leaked a canvas listener');
  });
  return {
    game, canvas, scores, endings, listeners,
    get rectangles() { return rectangles; },
    get labels() { return labels; },
    snapshot: () => JSON.stringify({ rectangles, labels }),
    pointer(x, y) {
      for (const callback of listeners.get('pointerdown') || []) {
        callback({ button: 0, clientX: 10 + x * 2, clientY: 20 + y * 2 });
      }
    },
  };
}

function press(game, action) {
  game.input(action, true);
  game.input(action, false);
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const factories = {
  Snake: createSnake, 'Brick Breaker': createBrickBreaker, Pong: createPong,
  'Memory Match': createMemoryMatch, 'Block Drop': createBlockDrop, 'Coin Maze': createCoinMaze,
};

for (const [name, factory] of Object.entries(factories)) {
  test(`${name}: pause freezes the round, restart resets it, and destroy removes clocks and listeners`, t => {
    const clock = createClock(t);
    const fixture = createFixture(t, factory);
    const { game, scores, endings } = fixture;
    assert.ok(game.instructions.length > 20);
    assert.equal(clock.pending, 0);
    game.start();
    assert.equal(clock.pending, 1);
    assert.equal(scores.at(-1), 0);
    const initialView = fixture.snapshot();
    game.input('right', true);
    clock.tick(8);
    game.pause();
    assert.equal(clock.pending, 0);
    assert.ok(!fixture.labels.some(({ label }) => label === 'PAUSED'), 'Game drew its own pause modal behind the shared UI');
    const scoreCount = scores.length;
    const endCount = endings.length;
    const pausedView = fixture.snapshot();
    press(game, 'action');
    clock.tick(3600);
    assert.equal(scores.length, scoreCount, 'Paused game emitted score changes');
    assert.equal(endings.length, endCount, 'Paused game ended');
    assert.equal(fixture.snapshot(), pausedView, 'Paused game changed its rendered state');
    game.resume();
    game.resume();
    assert.equal(clock.pending, 1, 'Duplicate resume scheduled two clocks');
    clock.tick(1);
    assert.equal(endings.length, endCount, 'Resume applied the paused wall-clock gap');
    clock.tick(8);
    game.start();
    assert.equal(clock.pending, 1, 'Restart left a previous clock alive');
    assert.equal(scores.at(-1), 0);
    assert.equal(fixture.snapshot(), initialView, 'Restart did not restore a fresh deterministic round');
    game.start();
    assert.equal(clock.pending, 1);
    game.destroy();
    game.destroy();
    assert.equal(clock.pending, 0);
    assert.equal(fixture.listeners.size, 0);
    const destroyedScores = scores.length;
    game.resume();
    game.start();
    press(game, 'action');
    clock.tick(60);
    assert.equal(clock.pending, 0, 'Destroyed game restarted its clock');
    assert.equal(scores.length, destroyedScores, 'Destroyed game emitted callbacks');
  });
}

function snakeHead(fixture) {
  const head = fixture.rectangles.find(rectangle => rectangle.color === '#746087' && rectangle.w === 14 && rectangle.h === 14);
  assert.ok(head, 'Snake head was not drawn');
  return { x: (head.x - 3) / 20, y: (head.y - 3) / 20 };
}

function advanceSnake(clock, fixture) {
  const before = snakeHead(fixture);
  for (let frame = 0; frame < 20; frame += 1) {
    clock.tick(1);
    const after = snakeHead(fixture);
    if (fixture.endings.length || after.x !== before.x || after.y !== before.y) return after;
  }
  assert.fail('Snake did not take its next step');
}

test('Snake: all four edges wrap to the opposite side without ending the round', t => {
  const clock = createClock(t);
  const fixture = createFixture(t, createSnake);
  const cases = [
    { direction: 'right', steps: 9, expected: { x: 0, y: 6 } },
    { direction: 'up', steps: 7, expected: { x: 9, y: 12 } },
    { direction: 'down', steps: 7, expected: { x: 9, y: 0 } },
    { direction: 'left', steps: 10, expected: { x: 17, y: 5 }, setup: 'up' },
  ];
  for (const { direction, steps, expected, setup } of cases) {
    fixture.game.start();
    if (setup) {
      press(fixture.game, setup);
      advanceSnake(clock, fixture);
    }
    press(fixture.game, direction);
    for (let step = 0; step < steps; step += 1) advanceSnake(clock, fixture);
    assert.deepEqual(snakeHead(fixture), expected, `${direction} edge did not wrap`);
    assert.equal(fixture.endings.length, 0);
    assert.equal(clock.pending, 1);
  }
  assert.match(fixture.game.instructions, /opposite side/);
});

test('Snake: reversal is ignored and crossing a grown body ends exactly once without a duplicate canvas modal', t => {
  const clock = createClock(t);
  // Place three fruits immediately ahead of the starting snake. Food is chosen
  // from free cells, so the eligible-cell count decreases with each fruit.
  const foodSamples = [115.5 / 231, 115.5 / 230, 115.5 / 229];
  const fixture = createFixture(t, createSnake, () => foodSamples.shift() ?? 0);
  fixture.game.start();
  press(fixture.game, 'left'); // Reversing into the neck must have no effect.
  advanceSnake(clock, fixture);
  assert.deepEqual(snakeHead(fixture), { x: 10, y: 6 });
  advanceSnake(clock, fixture);
  advanceSnake(clock, fixture);
  assert.equal(fixture.scores.at(-1), 30);
  for (const action of ['down', 'left', 'up']) {
    press(fixture.game, action);
    advanceSnake(clock, fixture);
  }
  assert.equal(fixture.endings.length, 1);
  assert.match(fixture.endings[0].message, /own trail/);
  assert.equal(fixture.endings[0].score, 30);
  assert.equal(clock.pending, 0);
  assert.equal(fixture.labels.length, 0, 'Game drew a second result modal behind the shared UI');
  fixture.game.resume();
  clock.tick(120);
  assert.equal(fixture.endings.length, 1);
  assert.equal(clock.pending, 0);
});

function clickCard(fixture, index) {
  fixture.pointer(80 + (index % 4) * 52 + 22, 32 + Math.floor(index / 4) * 52 + 22);
}

const faceUpCards = fixture => fixture.rectangles.filter(rectangle =>
  rectangle.color === '#fffdf5' && rectangle.w === 44 && rectangle.h === 44).length;

test('Memory Match: eight matching pairs produce one win through scaled pointer controls', t => {
  const clock = createClock(t);
  const fixture = createFixture(t, createMemoryMatch);
  fixture.game.start();
  fixture.pointer(-5, -5);
  fixture.pointer(127, 40); // Between cards; a gap must not select either card.
  clock.tick(1);
  assert.equal(faceUpCards(fixture), 0);
  // With a zero-valued random source, Fisher-Yates moves index zero to the end
  // and shifts all other cards left. The test knows the shuffled pair locations.
  const deck = Array.from({ length: 16 }, (_, i) => i % 8);
  for (let i = 15; i > 0; i -= 1) [deck[i], deck[0]] = [deck[0], deck[i]];
  for (let symbol = 0; symbol < 8; symbol += 1) {
    const pair = deck.flatMap((value, index) => value === symbol ? [index] : []);
    clickCard(fixture, pair[0]);
    clickCard(fixture, pair[1]);
    clock.tick(25);
  }
  assert.equal(fixture.endings.length, 1);
  assert.match(fixture.endings[0].message, /Eight pairs found in 8 turns/);
  assert.ok(fixture.endings[0].score >= 800);
  assert.equal(clock.pending, 0);
  clickCard(fixture, 0);
  fixture.game.resume();
  assert.equal(fixture.endings.length, 1);
  assert.equal(clock.pending, 0);
});

test('Memory Match: mismatch reveal delay freezes during pause and keyboard input flips cards', t => {
  const clock = createClock(t);
  const fixture = createFixture(t, createMemoryMatch);
  fixture.game.start();
  press(fixture.game, 'action');
  press(fixture.game, 'right');
  press(fixture.game, 'action');
  clock.tick(10);
  assert.equal(faceUpCards(fixture), 2);
  fixture.game.pause();
  clock.tick(600);
  fixture.game.resume();
  assert.equal(faceUpCards(fixture), 2);
  clock.tick(1);
  assert.equal(faceUpCards(fixture), 2, 'Paused time consumed the reveal delay');
  clock.tick(60);
  assert.equal(faceUpCards(fixture), 0);
  assert.equal(fixture.scores.at(-1), 0);
  assert.equal(fixture.endings.length, 0);
});

test('Block Drop: real rotations, movement and hard drops clear two complete lines', t => {
  const clock = createClock(t);
  const fixture = createFixture(t, createBlockDrop);
  fixture.game.start();
  // A deterministic seven-piece bag begins I, Z, T, S, O, L. These placements
  // tile the bottom two rows; all commands go through the public input API.
  const placements = [
    { width: 4, turns: 0, x: 0 }, { width: 3, turns: 0, x: 3 },
    { width: 3, turns: 0, x: 0 }, { width: 3, turns: 1, x: 5 },
    { width: 2, turns: 0, x: 7 }, { width: 3, turns: 3, x: 8 },
  ];
  for (const { width, turns, x } of placements) {
    for (let i = 0; i < turns; i += 1) press(fixture.game, 'up');
    const offset = x - Math.floor((10 - width) / 2);
    for (let i = 0; i < Math.abs(offset); i += 1) press(fixture.game, offset < 0 ? 'left' : 'right');
    press(fixture.game, 'action');
    clock.tick(1);
  }
  assert.ok(fixture.labels.some(({ label }) => label === '2 LINES'));
  assert.ok(fixture.scores.at(-1) >= 300);
  assert.equal(fixture.endings.length, 0);
  fixture.game.start();
  assert.ok(fixture.labels.some(({ label }) => label === '0 LINES'));
  assert.equal(fixture.scores.at(-1), 0);
});

test('Block Drop: walls reject overflow, soft drop scores, and top-out ends only once', t => {
  const clock = createClock(t);
  const fixture = createFixture(t, createBlockDrop);
  fixture.game.start();
  for (let i = 0; i < 40; i += 1) press(fixture.game, 'left');
  fixture.game.input('down', true);
  clock.tick(60);
  fixture.game.input('down', false);
  assert.ok(fixture.scores.at(-1) > 0);
  const pieces = fixture.rectangles.filter(rectangle => rectangle.w === 10 && rectangle.h === 10 && rectangle.alpha === 1 && rectangle.x < 200);
  assert.ok(pieces.length >= 4);
  assert.ok(pieces.every(rectangle => rectangle.x >= 81 && rectangle.x + rectangle.w <= 199));
  fixture.game.start();
  for (let i = 0; i < 40 && !fixture.endings.length; i += 1) press(fixture.game, 'action');
  assert.equal(fixture.endings.length, 1);
  assert.match(fixture.endings[0].message, /stack reached the top/i);
  assert.equal(clock.pending, 0);
  const callbackCount = fixture.scores.length;
  press(fixture.game, 'action');
  fixture.game.resume();
  clock.tick(60);
  assert.equal(fixture.endings.length, 1);
  assert.equal(fixture.scores.length, callbackCount);
  fixture.game.start();
  assert.equal(fixture.scores.at(-1), 0);
  assert.equal(clock.pending, 1);
});

test('Block Drop: a quick Down tap soft-drops immediately and ignores key-repeat duplication', t => {
  createClock(t);
  const fixture = createFixture(t, createBlockDrop);
  fixture.game.start();
  fixture.game.input('down', true);
  assert.equal(fixture.scores.at(-1), 1, 'A short Down tap did not move the piece');
  fixture.game.input('down', true);
  assert.equal(fixture.scores.at(-1), 1, 'Repeated keydown bypassed the held-input cadence');
  fixture.game.input('down', false);
  press(fixture.game, 'down');
  assert.equal(fixture.scores.at(-1), 2);
});

function mazeBoard(fixture) {
  const walls = Array.from({ length: 13 }, () => Array(19).fill(true));
  for (const rectangle of fixture.rectangles) {
    if (rectangle.w !== 16 || rectangle.h !== 16) continue;
    const x = (rectangle.x - 28) / 16;
    const y = (rectangle.y - 34) / 16;
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= 19 || y < 0 || y >= 13) continue;
    walls[y][x] = rectangle.color === '#746087';
  }
  const coins = fixture.rectangles.filter(rectangle => rectangle.color === '#e8c885' && rectangle.w === 5 && rectangle.h === 7)
    .map(rectangle => ({ x: (rectangle.x - 33) / 16, y: (rectangle.y - 38) / 16 }));
  return { walls, coins };
}

const neighborSteps = [
  { x: 1, y: 0, action: 'right' }, { x: -1, y: 0, action: 'left' },
  { x: 0, y: 1, action: 'down' }, { x: 0, y: -1, action: 'up' },
];

function accessibleCells(walls) {
  const visited = new Set(['1,1']);
  const queue = [{ x: 1, y: 1, path: [] }];
  for (let i = 0; i < queue.length; i += 1) {
    for (const step of neighborSteps) {
      const x = queue[i].x + step.x;
      const y = queue[i].y + step.y;
      const key = `${x},${y}`;
      if (x < 0 || x >= 19 || y < 0 || y >= 13 || walls[y][x] || visited.has(key)) continue;
      visited.add(key);
      queue.push({ x, y, path: [...queue[i].path, step.action] });
    }
  }
  return { visited, queue };
}

test('Coin Maze: all 28 coins are reachable across 24 fresh randomized rounds', t => {
  const clock = createClock(t);
  const fixture = createFixture(t, createCoinMaze, seededRandom(41));
  const layouts = new Set();
  for (let round = 0; round < 24; round += 1) {
    fixture.game.start();
    const { walls, coins } = mazeBoard(fixture);
    const { visited } = accessibleCells(walls);
    assert.equal(coins.length, 28);
    assert.equal(new Set(coins.map(cell => `${cell.x},${cell.y}`)).size, 28);
    assert.ok(coins.every(cell => visited.has(`${cell.x},${cell.y}`)));
    assert.equal(visited.size, 107, 'Part of the perfect maze is inaccessible');
    assert.ok(walls[0].every(Boolean) && walls[12].every(Boolean));
    assert.ok(walls.every(row => row[0] && row[18]));
    layouts.add(JSON.stringify(walls));
    assert.equal(clock.pending, 1);
  }
  assert.ok(layouts.size > 20, 'Restart reused the same layout');
});

function mazeTimer(fixture) {
  const timer = fixture.labels.find(({ label }) => /^\d+:\d{2}$/.test(label));
  assert.ok(timer, 'Maze timer was not drawn');
  const [minutes, seconds] = timer.label.split(':').map(Number);
  return minutes * 60 + seconds;
}

test('Coin Maze: movement collects a reachable coin and paused time does not consume the countdown', t => {
  const clock = createClock(t);
  const fixture = createFixture(t, createCoinMaze);
  fixture.game.start();
  const { walls, coins } = mazeBoard(fixture);
  const coinKeys = new Set(coins.map(cell => `${cell.x},${cell.y}`));
  const target = accessibleCells(walls).queue.find(cell => coinKeys.has(`${cell.x},${cell.y}`));
  assert.ok(target?.path.length);
  for (const action of target.path) {
    fixture.game.input(action, true);
    clock.tick(1);
    fixture.game.input(action, false);
    clock.tick(9);
  }
  assert.ok(fixture.scores.at(-1) >= 10);
  clock.tick(70);
  const beforePause = mazeTimer(fixture);
  assert.ok(beforePause < 120);
  fixture.game.pause();
  clock.tick(6000);
  assert.equal(fixture.endings.length, 0);
  fixture.game.resume();
  assert.equal(mazeTimer(fixture), beforePause);
  clock.tick(1);
  assert.equal(mazeTimer(fixture), beforePause);
  clock.tick(70);
  assert.ok(mazeTimer(fixture) < beforePause);
  assert.ok(mazeTimer(fixture) >= beforePause - 2, 'Resume applied the time spent paused');
});

test('Coin Maze: patrol collisions consume three lives, end once, and restart creates a fresh round', t => {
  const clock = createClock(t);
  const fixture = createFixture(t, createCoinMaze);
  fixture.game.start();
  clock.tick(8000);
  assert.equal(fixture.endings.length, 1);
  assert.match(fixture.endings[0].message, /patrol caught you/);
  assert.equal(clock.pending, 0);
  fixture.game.resume();
  press(fixture.game, 'right');
  clock.tick(120);
  assert.equal(fixture.endings.length, 1);
  assert.equal(clock.pending, 0);
  fixture.game.start();
  assert.equal(fixture.scores.at(-1), 0);
  assert.equal(mazeTimer(fixture), 120);
  assert.ok(fixture.labels.some(({ label }) => label === '♥♥♥'));
  assert.equal(clock.pending, 1);
});
