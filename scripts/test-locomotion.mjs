import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceGait, stepPatrol} from '../src/two/locomotion.js';

test('the same travelled distance produces the same gait at 30, 60 and 144Hz', () => {
  const phases = [30, 60, 144].map(hz => {let phase=0;for(let i=0;i<hz;i++)phase=advanceGait(phase,82/hz,100);return phase;});
  for (const phase of phases) assert.ok(Math.abs(phase-phases[0])<1e-10);
  assert.equal(advanceGait(0.37,0,100),0.37,'standing still must not advance the feet');
});

test('patrol plants its feet and pauses before changing direction', () => {
  const actor={x:99,facing:1,speed:20,phase:0,rest:0},area={min:0,max:100,height:100};
  for(let i=0;i<100&& !actor.rest;i++)stepPatrol(actor,1/60,area);
  assert.equal(actor.x,100);assert.equal(actor.speed,0);assert.equal(actor.facing,1);
  const phase=actor.phase;stepPatrol(actor,0.4,area);
  assert.equal(actor.x,100);assert.equal(actor.phase,phase);assert.equal(actor.facing,1);
  stepPatrol(actor,0.5,area);assert.equal(actor.facing,-1);
  stepPatrol(actor,1/60,area);assert.ok(actor.x<100);assert.ok(actor.speed>0);
});

test('patrol retains subpixel travel, stays inside boundaries, and eases into motion', () => {
  const actor={x:10,facing:1,speed:0,phase:0,rest:0},area={min:0,max:100,height:100};
  stepPatrol(actor,1/144,area);assert.ok(actor.x>10&&actor.x<11);assert.ok(actor.speed<95);
  for(let i=0;i<3000;i++){stepPatrol(actor,1/144,area);assert.ok(actor.x>=0&&actor.x<=100);assert.ok(actor.phase>=0&&actor.phase<1);}
});
