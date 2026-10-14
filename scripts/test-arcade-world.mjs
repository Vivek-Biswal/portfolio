import test from 'node:test';
import assert from 'node:assert/strict';
import { CABINETS, ROOM, canWalk, configureRoom, findWalkPath, nearestCabinet } from '../src/two/arcade-world.js';

const entry = { x: 160, y: 230 };

function assertSafePath(start, target, { reachesTarget = true } = {}) {
  const path = findWalkPath(start, target);
  assert.ok(path.length, `No path from ${JSON.stringify(start)} to ${JSON.stringify(target)}`);
  let previous = start;
  for (const point of path) {
    assert.ok(canWalk(point.x, point.y), `Path node enters a wall or cabinet: ${JSON.stringify(point)}`);
    const samples = Math.max(1, Math.ceil(Math.hypot(point.x - previous.x, point.y - previous.y) / 0.5));
    for (let index = 0; index <= samples; index += 1) {
      const x = previous.x + (point.x - previous.x) * index / samples;
      const y = previous.y + (point.y - previous.y) * index / samples;
      assert.ok(canWalk(x, y), `Path segment crosses an obstacle at ${x},${y}`);
    }
    previous = point;
  }
  if (reachesTarget) assert.deepEqual(path.at(-1), target);
  return path;
}

test('every advertised cabinet has a unique game and a walkable interaction point', () => {
  assert.equal(CABINETS.length, 7);
  assert.equal(new Set(CABINETS.map(cabinet => cabinet.id)).size, 7);
  for (const cabinet of CABINETS) {
    assert.ok(canWalk(cabinet.x, cabinet.y), `${cabinet.id} interaction point is blocked`);
    assert.equal(nearestCabinet(cabinet)?.id, cabinet.id);
  }
});

test('room boundaries and cabinet bodies block movement while their fronts remain open', () => {
  for (const point of [{ x: 12, y: 220 }, { x: 308, y: 220 }, { x: 160, y: 42 }, { x: 160, y: 239 }]) {
    assert.equal(canWalk(point.x, point.y), false);
  }
  for (const cabinet of CABINETS) {
    for (const dx of [-20, 0, 20]) {
      for (const dy of [-60, -40, -20]) assert.equal(canWalk(cabinet.x + dx, cabinet.y + dy), false);
    }
    assert.equal(canWalk(cabinet.x, cabinet.y), true);
  }
});

test('every cabinet can be reached from the entrance without crossing an obstacle', () => {
  for (const cabinet of CABINETS) assertSafePath(entry, { x: cabinet.x, y: cabinet.y });
});

test('all cabinet-to-cabinet routes remain open across both rows', () => {
  for (const from of CABINETS) {
    for (const to of CABINETS) assertSafePath({ x: from.x, y: from.y }, { x: to.x, y: to.y });
  }
});

test('all sampled free floor areas are connected to the entrance', () => {
  for (let x = 15; x <= 303; x += 12) {
    for (let y = 45; y <= 237; y += 12) {
      if (canWalk(x, y)) assertSafePath(entry, { x, y });
    }
  }
});

test('arbitrary click positions do not cut corners through cabinets', () => {
  let seed = 7231;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const freePoint = () => {
    let point;
    do { point = { x: 13 + random() * 294, y: 43 + random() * 195 }; } while (!canWalk(point.x, point.y));
    return point;
  };
  for (let index = 0; index < 400; index += 1) assertSafePath(freePoint(), freePoint());
});

test('clicking a cabinet body selects an accessible destination instead of entering it', () => {
  for (const cabinet of CABINETS) {
    const target = { x: cabinet.x, y: cabinet.y - 40 };
    const path = assertSafePath(entry, target, { reachesTarget: false });
    assert.notDeepEqual(path.at(-1), target);
  }
});

test('an out-of-bounds click resolves to the closest floor cell without grid-index aliasing', () => {
  const target = { x: ROOM.width + 80, y: 100 };
  const path = assertSafePath(entry, target, { reachesTarget: false });
  assert.deepEqual(path.at(-1), { x: 303, y: 99 });
});

test('nonfinite coordinates cannot enter the room or poison a movement path', () => {
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.equal(canWalk(value, 100), false);
    assert.equal(canWalk(160, value), false);
    assert.deepEqual(findWalkPath(entry, { x: value, y: 100 }), []);
    assert.deepEqual(findWalkPath({ x: value, y: 100 }, entry), []);
  }
});

test('nearby interaction obeys its radius and does not select a distant cabinet', () => {
  assert.equal(nearestCabinet(entry), undefined);
  assert.equal(nearestCabinet({ x: 44, y: 139.9 })?.id, 'snake');
  assert.equal(nearestCabinet({ x: 44, y: 140 }), undefined);
});

test('expanded desktop, portrait and landscape rooms keep every cabinet reachable', () => {
  const originalRoom = { ...ROOM };
  const original = CABINETS.map(cab => ({ ...cab }));
  try {
    for (const [width, height] of [[768, 390], [640, 300], [375, 692], [812, 256], [738, 221], [320, 256]]) {
      configureRoom(width, height);
      assert.equal(ROOM.width, width);
      assert.equal(ROOM.height, height);
      const entrance = { x: width / 2, y: height - 26 };
      assert.ok(canWalk(entrance.x, entrance.y));
      for (const cab of CABINETS) assertSafePath(entrance, { x: cab.x, y: cab.y });
      assert.equal(canWalk(width - 12, height / 2), false);
    }
  } finally {
    Object.assign(ROOM, originalRoom);
    CABINETS.forEach((cab, index) => Object.assign(cab, original[index]));
  }
});

test('responsive cabinet layouts reserve the header and controls without blocking routes', () => {
  const originalRoom = { ...ROOM };
  const original = CABINETS.map(cab => ({ ...cab }));
  try {
    for (const [width, height, top, bottom] of [[760, 356, 70, 48], [450, 256, 50, 32], [640, 300, 100, 64], [375, 692, 140, 130], [600, 450, 100, 64]]) {
      configureRoom(width, height, { top, bottom });
      const entrance = { x: width / 2, y: height - 26 };
      for (const cabinet of CABINETS) {
        assert.ok(cabinet.y - 92 >= top, `${cabinet.id} overlaps the header or instruction band`);
        assert.ok(cabinet.y <= height - bottom, `${cabinet.id} overlaps the controls`);
        assertSafePath(entrance, { x: cabinet.x, y: cabinet.y });
      }
      if (width === 450 || width === 640) assert.equal(new Set(CABINETS.map(cab => cab.y)).size, 1, 'Compact rooms use one accessible row');
    }
  } finally {
    Object.assign(ROOM, originalRoom);
    CABINETS.forEach((cab, index) => Object.assign(cab, original[index]));
  }
});

test('detailed character bounds protect the full sprite while preserving every cabinet route', () => {
  const originalRoom = { ...ROOM }, originalCabinets = CABINETS.map(cab => ({ ...cab }));
  try {
    for (const [width, height, top, bottom, characterHeight] of [[760, 356, 70, 48, 52], [320, 456, 96, 130, 64], [375, 692, 140, 130, 64], [812, 256, 100, 64, 64], [450, 256, 50, 48, 52], [320, 220, 96, 64, 64]]) {
      configureRoom(width, height, { top, bottom, characterHeight });
      const halfWidth = characterHeight * 0.3;
      assert.equal(canWalk(ROOM.footBounds.left - 0.1, height - 26), false, 'Left edge cannot clip the sprite');
      assert.equal(canWalk(ROOM.footBounds.right + 0.1, height - 26), false, 'Right edge cannot clip the sprite');
      assert.equal(canWalk(width / 2, ROOM.footBounds.top - 0.1), false, 'The head cannot enter the header band');
      for (const cabinet of CABINETS) {
        const path = assertSafePath({ x: width / 2, y: height - 26 }, { x: cabinet.x, y: cabinet.y });
        for (const point of path) {
          assert.ok(point.x - halfWidth >= 2 && point.x + halfWidth <= width - 2);
          assert.ok(point.y - characterHeight >= top + 2);
        }
      }
    }
  } finally {
    Object.assign(ROOM, originalRoom);
    CABINETS.forEach((cab, index) => Object.assign(cab, originalCabinets[index]));
  }
});
