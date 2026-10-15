/** One complete gait follows a body-sized stride, independent of frame rate. */
export function advanceGait(phase, distance, height) {
  if (![phase, distance, height].every(Number.isFinite) || height <= 0 || distance <= 0) return Number.isFinite(phase) ? phase : 0;
  return (phase + distance / (height * 0.68)) % 1;
}

/** Ease into a patrol, plant both feet at the end, then turn after a pause. */
export function stepPatrol(actor, dt, { min, max, height }) {
  if (![dt, min, max, height].every(Number.isFinite) || dt <= 0 || max <= min || height <= 0) { actor.speed = 0; return; }
  actor.x = Math.max(min, Math.min(max, actor.x));
  if (actor.rest > 0) {
    actor.rest = Math.max(0, actor.rest - dt); actor.speed = 0;
    if (!actor.rest) actor.facing *= -1;
    return;
  }
  const edge = actor.facing < 0 ? min : max, remaining = Math.abs(edge - actor.x);
  const acceleration = height * 3.2, cruise = height * 0.95;
  const target = Math.min(cruise, Math.sqrt(2 * acceleration * remaining));
  const speed = actor.speed || 0;
  actor.speed = speed + Math.max(-acceleration * dt, Math.min(acceleration * dt, target - speed));
  const distance = Math.min(remaining, actor.speed * dt);
  actor.x += actor.facing * distance;
  actor.phase = advanceGait(actor.phase || 0, distance, height);
  if (remaining - distance < 0.1) { actor.x = edge; actor.speed = 0; actor.rest = 0.85; }
}
