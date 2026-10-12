import { createPixelPainter } from './companion.js';
import { STEP, createRun, resetRun, jump, pauseRun, resumeRun, stepRun } from './game-engine.js';

export function createGlitchRun({ canvas, onScore, onEnd, random = Math.random }) {
  const ctx = canvas.getContext('2d');
  const run = createRun({ width: canvas.width, height: canvas.height, random });
  let painter, frame = 0, last = 0, accumulator = 0, disposed = false;
  createPixelPainter().then(value => { painter = value; draw(); }).catch(() => {});
  function draw() {
    if (disposed) return;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#c7bdd9'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#b9a8c8';
    for (let i = -1; i < 10; i += 1) ctx.fillRect(i * 48 - run.distance * 0.12 % 48, run.ground - 25 - (i % 3) * 9, 42, 50);
    ctx.fillStyle = '#fcf8eb'; ctx.fillRect(0, run.ground + 2, canvas.width, 30);
    ctx.fillStyle = '#302736'; ctx.fillRect(0, run.ground, canvas.width, 2);
    for (const item of run.entities) {
      const x = Math.round(item.x), y = Math.round(run.ground - item.y - item.height);
      if (item.type === 'spark') {
        ctx.fillStyle = '#9b6437'; ctx.fillRect(x + 3, y, 3, 9); ctx.fillRect(x, y + 3, 9, 3);
      } else {
        ctx.fillStyle = '#302736'; ctx.fillRect(x, y, item.width, item.height);
        ctx.fillStyle = '#b76569'; ctx.fillRect(x + 2, y + 2, item.width - 4, item.height - 4);
        ctx.fillStyle = '#fcf8eb'; ctx.fillRect(x + 4, y + 7, 3, 3); ctx.fillRect(x + item.width - 7, y + 7, 3, 3);
      }
    }
    painter?.draw(ctx, { x: run.player.x, y: run.ground - run.player.y, height: 76 * run.scale,
      pose: run.player.y > 0 ? 'jump' : 'run', time: run.time, facing: 1 });
  }
  function tick(time) {
    frame = 0;
    if (disposed || run.phase !== 'running') return;
    accumulator += last ? Math.min(0.06, (time - last) / 1000) : 0;
    last = time;
    while (accumulator >= STEP && run.phase === 'running') { stepRun(run); accumulator -= STEP; }
    draw(); onScore(run.score);
    if (run.phase === 'over') onEnd({ score: run.score, message: `${run.sparks} sparks caught. Jump again for a new best!` });
    else frame = requestAnimationFrame(tick);
  }
  function stop() { cancelAnimationFrame(frame); frame = 0; last = 0; }
  return {
    instructions: 'Space / Action or ↑ to jump. Jump twice before landing. Catch sparks for +25.',
    start() { stop(); resetRun(run); accumulator = 0; onScore(0); draw(); frame = requestAnimationFrame(tick); },
    pause() { pauseRun(run); stop(); },
    resume() { resumeRun(run); last = 0; if (!frame && !disposed && run.phase === 'running') frame = requestAnimationFrame(tick); },
    input(action, pressed = true) { if (pressed && (action === 'up' || action === 'action')) jump(run); },
    destroy() { disposed = true; stop(); },
  };
}
