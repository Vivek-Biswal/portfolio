// Browser-independent simulation. The canvas runs this at a fixed 120 Hz.
export const STEP = 1 / 120;

export function createRun({ width = 480, height = 300, best = 0, random = Math.random } = {}) {
  const run = { width, height, best: Number.isFinite(best) ? Math.max(0, Math.floor(best)) : 0, random };
  resetRun(run);
  run.phase = 'idle';
  return run;
}

export function resizeRun(run, width, height) {
  const previousScale = run.scale || 1;
  run.width = Math.max(160, width);
  run.height = Math.max(100, height);
  run.scale = Math.min(1, Math.max(0.55, run.height / 280));
  run.ground = run.height - 30;
  run.player.x = Math.max(38, Math.min(86, run.width * 0.2));
  const ratio = run.scale / previousScale;
  run.player.y *= ratio;
  run.player.velocity *= ratio;
  run.entities.forEach(entity => { entity.height *= ratio; entity.width *= ratio; entity.y *= ratio; });
}

export function resetRun(run) {
  Object.assign(run, {
    phase: 'running', time: 0, distance: 0, score: 0, sparks: 0, chain: 0, chainTime: 0,
    nextSpawn: 2, entities: [], particles: [], player: { x: 0, y: 0, velocity: 0, jumps: 0 }, scale: 1,
  });
  resizeRun(run, run.width, run.height);
  return run;
}

export function jump(run) {
  if (run.phase !== 'running' || run.player.jumps >= 2) return false;
  run.player.velocity = (run.player.jumps === 0 ? 315 : 285) * run.scale;
  run.player.jumps += 1;
  return true;
}

export function pauseRun(run) {
  if (run.phase === 'running') run.phase = 'paused';
}

export function resumeRun(run) {
  if (run.phase === 'paused') run.phase = 'running';
}

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function playerBox(run) {
  return { x: run.player.x - 8 * run.scale, y: run.ground - run.player.y - 49 * run.scale,
    width: 16 * run.scale, height: 44 * run.scale };
}

function spawn(run) {
  const { scale, random } = run;
  const height = (20 + Math.floor(random() * 13)) * scale;
  const x = run.width + 24;
  run.entities.push({ type: 'glitch', x, y: 0, width: (16 + Math.floor(random() * 9)) * scale, height });
  // A short trail rewards a well-timed jump, without requiring every pickup.
  const lift = (44 + random() * 25) * scale;
  for (let i = 0; i < 3; i += 1) {
    run.entities.push({ type: 'spark', x: x - 20 * scale + i * 29 * scale,
      y: lift + (i === 1 ? 9 * scale : 0), width: 9 * scale, height: 9 * scale });
  }
  run.nextSpawn = 1.15 + random() * 0.85;
}

export function stepRun(run, dt = STEP) {
  if (run.phase !== 'running' || !Number.isFinite(dt) || dt <= 0) return;
  // A caller cannot skip through an obstacle by supplying a huge frame delta.
  if (dt > STEP + 1e-9) {
    let remaining = Math.min(dt, 0.1);
    while (remaining > 1e-9 && run.phase === 'running') {
      const slice = Math.min(STEP, remaining);
      stepRun(run, slice);
      remaining -= slice;
    }
    return;
  }
  run.time += dt;
  const speed = (138 + Math.min(98, run.time * 1.8)) * run.scale;
  run.distance += speed * dt;
  run.player.y += run.player.velocity * dt;
  run.player.velocity -= 860 * run.scale * dt;
  if (run.player.y <= 0) Object.assign(run.player, { y: 0, velocity: 0, jumps: 0 });
  run.chainTime = Math.max(0, run.chainTime - dt);
  if (run.chainTime === 0) run.chain = 0;
  run.nextSpawn -= dt;
  if (run.nextSpawn <= 0) spawn(run);

  const player = playerBox(run);
  for (const entity of run.entities) {
    entity.x -= speed * dt;
    const box = { x: entity.x, y: run.ground - entity.y - entity.height, width: entity.width, height: entity.height };
    if (!overlaps(player, box) || entity.collected) continue;
    if (entity.type === 'glitch') {
      run.phase = 'over';
      break;
    }
    entity.collected = true;
    run.sparks += 1;
    run.chain = Math.min(3, run.chain + 1);
    run.chainTime = 2.5;
    run.particles.push({ x: entity.x, y: box.y, life: 0.45 });
  }
  run.entities = run.entities.filter(entity => entity.x > -40 && !entity.collected);
  run.particles.forEach(particle => { particle.life -= dt; particle.y -= dt * 20; });
  run.particles = run.particles.filter(particle => particle.life > 0);
  run.score = Math.floor(run.distance / (10 * run.scale)) + run.sparks * 25;
  run.best = Math.max(run.best, run.score);
}
