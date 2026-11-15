import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiscoveryState,LOST_PIXELS,pickSurpriseGame,SURPRISE_GAMES} from '../src/two/desktop-surprises.js';

const memory = initial => {
  let value = initial;
  return { getItem: () => value, setItem: (key, next) => { value = next; }, value: () => value };
};

test('discoveries persist, count each star once, and complete only after all four', () => {
  const storage = memory(), visit = createDiscoveryState(storage);
  assert.equal(visit.complete, false);
  assert.equal(visit.collect('cloud'), true);
  assert.equal(visit.collect('cloud'), false);
  assert.equal(visit.collect('unknown'), false);
  const returnVisit = createDiscoveryState(storage);
  assert.deepEqual(returnVisit.stars, ['cloud']);
  for (const id of LOST_PIXELS.slice(1)) returnVisit.collect(id);
  assert.equal(returnVisit.complete, true);
  assert.equal(createDiscoveryState(storage).complete, true);
});

test('invalid or malicious stored data cannot add stars or break the garden', () => {
  for (const raw of ['{broken', 'null', '[]', '{"stars":"cloud","garden":{}}']) {
    const state = createDiscoveryState(memory(raw));
    assert.deepEqual(state.stars, []);
    assert.equal(state.garden, 0);
  }
  const state = createDiscoveryState(memory(JSON.stringify({ stars: ['cloud','cloud','<script>','moon',null], garden: 999 })));
  assert.deepEqual(state.stars, ['cloud','moon']);
  assert.equal(state.garden, 2);
});

test('storage failures keep discovery and garden progression usable for this session', () => {
  const state = createDiscoveryState({getItem(){throw Error('blocked');},setItem(){throw Error('quota');}});
  for (const id of LOST_PIXELS) assert.equal(state.collect(id), true);
  assert.equal(state.complete, true);
  assert.equal(state.grow(), 1);
  assert.equal(state.grow(), 2);
  assert.equal(state.grow(), 2);
});

test('garden progresses from discarded seed to flower and survives a return visit', () => {
  const storage = memory(), state = createDiscoveryState(storage);
  state.grow();
  const next = createDiscoveryState(storage);
  assert.equal(next.garden, 1);
  next.grow();
  assert.equal(createDiscoveryState(storage).garden, 2);
});

test('mystery disk can reach all seven real games and avoids an immediate repeat', () => {
  const chosen = new Set(Array.from({length:7},(_,i)=>pickSurpriseGame(()=>i/7)));
  assert.deepEqual(chosen, new Set(SURPRISE_GAMES));
  for (const previous of SURPRISE_GAMES) {
    for (const value of [-1,0,.2,.5,.999,1,NaN,Infinity]) {
      const next = pickSurpriseGame(()=>value,previous);
      assert.ok(SURPRISE_GAMES.includes(next));
      assert.notEqual(next, previous);
    }
  }
});
