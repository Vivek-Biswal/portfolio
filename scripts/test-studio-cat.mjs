import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatController} from '../src/two/studio-cat.js';
import {canStand} from '../src/two/studio-world.js';

function seeded(seed = 123) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}
function run(cat, seconds, player, hz = 60) {
  for (let i = 0; i < seconds * hz; i++) {
    cat.update(1 / hz, player);
    assert.ok(canStand(cat.state.x, cat.state.z, .2), 'cat remains on walkable floor');
  }
}

test('an exactly overlapping player triggers an escape instead of a zero vector', () => {
  const cat = createCatController({x:2, z:2.8}, seeded());
  run(cat, 1, {x:2, z:2.8});
  assert.ok(Math.hypot(cat.state.x - 2, cat.state.z - 2.8) > .6);
  assert.equal(cat.state.fleeing, true);
});

test('a frightened cat escapes along a wall without entering the wall or planter', () => {
  const cat = createCatController({x:-7.35, z:3.5}, seeded(74));
  const start = {...cat.state};
  assert.ok(canStand(cat.state.x,cat.state.z,.2));
  run(cat, 5, {x:-6.6, z:3.5});
  assert.ok(Math.hypot(cat.state.x - start.x, cat.state.z - start.z) > 1);
  assert.ok(Math.hypot(cat.state.x + 6.6, cat.state.z - 3.5) > 1.8);
});

test('corner escape finds a free direction and recovers from the flee state', () => {
  const cat = createCatController({x:-6.4, z:-4.4}, seeded(2));
  run(cat, 4, {x:-5.7, z:-4.1});
  assert.ok(Math.hypot(cat.state.x + 6.4, cat.state.z + 4.4) > 1);
  run(cat, 3, {x:0, z:20});
  assert.equal(cat.state.fleeing, false);
});

test('roaming has both resting and moving phases and stays clear of desks', () => {
  const cat = createCatController({x:2, z:2.8}, seeded(6));
  const modes = new Set(), samples = [];
  for (let i = 0; i < 1800; i++) {
    cat.update(1 / 30, {x:20, z:20});
    modes.add(cat.state.mode);
    if (i % 60 === 0) samples.push([cat.state.x, cat.state.z]);
    assert.ok(canStand(cat.state.x, cat.state.z, .2));
    assert.ok(Number.isFinite(cat.state.heading));
  }
  assert.ok(modes.has('rest')); assert.ok(modes.has('roam'));
  assert.ok(samples.some(([x,z]) => Math.hypot(x - 2, z - 2.8) > 1));
});

test('bad deltas and missing player data do not corrupt cat state', () => {
  const cat = createCatController(undefined, seeded());
  const initial = {...cat.state};
  for (const dt of [NaN, Infinity, -1, 0]) cat.update(dt, {x:0,z:0});
  cat.update(1, undefined);
  assert.deepEqual(cat.state, initial);
  cat.update(100, {x:20,z:20});
  assert.ok(canStand(cat.state.x, cat.state.z, .2));
});

test('the same seeded simulation repeats exactly', () => {
  const a = createCatController(undefined, seeded(9)), b = createCatController(undefined, seeded(9));
  run(a, 20, {x:20,z:20}); run(b, 20, {x:20,z:20});
  assert.deepEqual(a.state, b.state);
});
