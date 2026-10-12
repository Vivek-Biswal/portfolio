import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STEP, createRun, resetRun, resizeRun, jump, pauseRun, resumeRun, stepRun,
} from '../src/two/game-engine.js';

function random(seed = 53) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 2 ** 32;
  };
}

function ready(options = {}) {
  const run = createRun({ random: random(), ...options });
  resetRun(run);
  return run;
}

function advance(run, seconds) {
  for (let count = 0; count < Math.round(seconds / STEP); count += 1) stepRun(run);
}

function snapshot(run) {
  const { random: ignored, ...state } = run;
  void ignored;
  return structuredClone(state);
}

function hurdle(run) {
  run.nextSpawn = 10000;
  run.entities.push({ type: 'glitch', x: run.player.x + 40, y: 0, width: 18 * run.scale, height: 24 * run.scale });
}

test('a ground-level glitch ends a run; a timely jump clears that same glitch', () => {
  const walking = ready();
  hurdle(walking);
  advance(walking, 1);
  assert.equal(walking.phase, 'over', 'walking directly into a hurdle must lose');
  const ended = snapshot(walking);
  advance(walking, 1);
  assert.deepEqual(snapshot(walking), ended, 'a finished run must not keep progressing');

  const jumping = ready();
  hurdle(jumping);
  assert.equal(jump(jumping), true);
  advance(jumping, 1);
  assert.equal(jumping.phase, 'running', 'the same hurdle must be jumpable');
  assert.equal(jumping.player.y, 0, 'the successful jump returns to the ground');
  assert.ok(jumping.distance > walking.distance);
});

test('only two jumps are accepted before landing, then jumping becomes available again', () => {
  const run = ready();
  run.nextSpawn = 10000;
  assert.equal(jump(run), true);
  advance(run, 0.15);
  assert.ok(run.player.y > 0);
  assert.equal(jump(run), true);
  assert.equal(jump(run), false);
  assert.equal(run.player.jumps, 2);
  advance(run, 1.5);
  assert.equal(run.player.y, 0);
  assert.equal(run.player.velocity, 0);
  assert.equal(run.player.jumps, 0);
  assert.equal(jump(run), true);
});

test('touching a spark awards one pickup and its points exactly once', () => {
  const run = ready();
  const control = ready();
  run.nextSpawn = control.nextSpawn = 10000;
  run.entities.push({ type: 'spark', x: run.player.x, y: 40 * run.scale, width: 9 * run.scale, height: 9 * run.scale });
  stepRun(run);
  stepRun(control);
  assert.equal(run.sparks, 1);
  assert.equal(run.score - control.score, 25);
  assert.equal(run.entities.length, 0, 'a collected spark is removed');
  advance(run, 0.5);
  advance(control, 0.5);
  assert.equal(run.sparks, 1, 'remaining in the pickup area cannot score it repeatedly');
  assert.equal(run.score - control.score, 25);
});

test('pause freezes physics, score, hazards and particles, and resume continues the run', () => {
  const run = ready();
  jump(run);
  advance(run, 0.2);
  run.particles.push({ x: 120, y: 70, life: 0.3 });
  pauseRun(run);
  const paused = snapshot(run);
  assert.equal(jump(run), false);
  advance(run, 4);
  stepRun(run, 200);
  assert.deepEqual(snapshot(run), paused);
  resumeRun(run);
  stepRun(run);
  assert.equal(run.phase, 'running');
  assert.ok(run.time > paused.time);
  assert.notEqual(run.player.y, paused.player.y);
});

test('restart clears hazards, time, score, jumps and speed progression while retaining best', () => {
  const run = ready({ best: 150 });
  run.nextSpawn = 10000;
  advance(run, 15);
  jump(run);
  run.entities.push({ type: 'glitch', x: 400, y: 0, width: 18, height: 24 });
  run.particles.push({ x: 50, y: 60, life: 0.4 });
  const savedBest = run.best;
  assert.ok(savedBest >= 150);
  resetRun(run);
  assert.equal(run.best, savedBest);
  assert.equal(run.phase, 'running');
  for (const key of ['time', 'distance', 'score', 'sparks', 'chain', 'chainTime']) assert.equal(run[key], 0, key);
  assert.deepEqual(run.entities, []);
  assert.deepEqual(run.particles, []);
  assert.equal(run.player.y, 0);
  assert.equal(run.player.velocity, 0);
  assert.equal(run.player.jumps, 0);
  const fresh = ready({ best: savedBest });
  stepRun(run);
  stepRun(fresh);
  assert.equal(run.distance, fresh.distance, 'restart must also restore initial running speed');
});

test('stored best is normalized and retained as a finite nonnegative score', () => {
  for (const value of [NaN, Infinity, -Infinity, -10, 0, 91.8]) {
    const run = ready({ best: value });
    assert.ok(Number.isFinite(run.best));
    assert.ok(Number.isInteger(run.best) && run.best >= 0);
    if (value === 91.8) assert.equal(run.best, 91);
    const before = run.best;
    advance(run, 0.5);
    assert.ok(run.best >= before);
    resetRun(run);
    assert.ok(Number.isFinite(run.best) && run.best >= before);
  }
});

test('tiny viewport resizing preserves a finite, playable run and does not refill air jumps', () => {
  const run = ready();
  jump(run);
  stepRun(run);
  const previousJumps = run.player.jumps;
  resizeRun(run, 1, 1);
  assert.ok(run.width >= 160 && run.height >= 100);
  assert.ok(run.player.x > 0 && run.player.x < run.width);
  assert.ok(run.ground > 0 && run.ground < run.height);
  assert.equal(run.player.jumps, previousJumps, 'resizing cannot grant an extra midair jump');
  run.nextSpawn = 10000;
  advance(run, 1.2);
  for (const value of [run.time, run.distance, run.score, run.best, run.scale, run.player.x, run.player.y, run.player.velocity]) {
    assert.ok(Number.isFinite(value));
  }
  assert.equal(run.phase, 'running');
  assert.equal(run.player.y, 0);
});

test('invalid deltas do nothing and a giant frame cannot tunnel through a close hurdle', () => {
  const run = ready();
  const original = snapshot(run);
  for (const dt of [0, -1, NaN, Infinity]) stepRun(run, dt);
  assert.deepEqual(snapshot(run), original);
  run.entities.push({ type: 'glitch', x: run.player.x + 12, y: 0, width: 18, height: 24 });
  stepRun(run, 60);
  assert.equal(run.phase, 'over');
  assert.ok(run.time <= 0.1 + 1e-9, 'long frames must be capped before advancing simulation');
});

test('fixed simulation steps produce identical gameplay under 30, 60 and 144 Hz rendering', () => {
  function playWithFrames(hz) {
    const run = ready();
    let accumulator = 0;
    let steps = 0;
    for (let frame = 0; frame < hz * 4; frame += 1) {
      accumulator += 1 / hz;
      while (accumulator + 1e-12 >= STEP) {
        // Input is scheduled against simulation time, as it is during gameplay.
        if (steps === 345 || steps === 384) jump(run);
        stepRun(run);
        accumulator -= STEP;
        steps += 1;
      }
    }
    assert.equal(steps, 480);
    return snapshot(run);
  }
  const baseline = playWithFrames(60);
  assert.deepEqual(playWithFrames(30), baseline);
  assert.deepEqual(playWithFrames(144), baseline);
});
