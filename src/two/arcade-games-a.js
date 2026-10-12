// Small, original arcade games. The station owns focus, controls, and visibility.
const palette = {
  cream: '#fcf8eb', ink: '#302736', purple: '#746087', mint: '#b9cdc0',
  peach: '#e7c6ad', yellow: '#e8c885', soft: '#eee5d8', white: '#ffffff',
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function text(ctx, label, x, y, color = palette.ink, size = 11, align = 'center') {
  ctx.fillStyle = color;
  ctx.font = `600 ${Math.max(12, size)}px "Pixelify Sans", monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(label, Math.round(x), Math.round(y));
}

function createSession({ canvas, onScore = () => {}, onEnd = () => {} }, createGame) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This arcade game needs a 2D canvas.');
  ctx.imageSmoothingEnabled = false;
  let running = false;
  let ended = false;
  let destroyed = false;
  let frameId = 0;
  let lastTime = null;
  const held = new Set();
  let game;
  const services = {
    canvas, ctx, held,
    score: onScore,
    finish(score, message) {
      if (ended || destroyed) return;
      ended = true;
      running = false;
      cancelAnimationFrame(frameId);
      held.clear();
      game.draw();
      onEnd({ score, message });
    },
  };
  game = createGame(services);

  function frame(timestamp) {
    if (!running || destroyed) return;
    const dt = lastTime === null ? 0 : Math.min(0.05, Math.max(0, (timestamp - lastTime) / 1000));
    lastTime = timestamp;
    game.update(dt);
    game.draw();
    if (running) frameId = requestAnimationFrame(frame);
  }

  return {
    instructions: game.instructions,
    start() {
      if (destroyed) return;
      cancelAnimationFrame(frameId);
      running = false;
      ended = false;
      lastTime = null;
      held.clear();
      game.reset();
      onScore(0);
      game.draw();
      running = true;
      frameId = requestAnimationFrame(frame);
    },
    pause() {
      running = false;
      lastTime = null;
      held.clear();
      cancelAnimationFrame(frameId);
    },
    resume() {
      if (running || ended || destroyed) return;
      lastTime = null;
      running = true;
      frameId = requestAnimationFrame(frame);
    },
    input(action, pressed = true) {
      if (!running || ended || destroyed) return;
      const wasHeld = held.has(action);
      if (pressed) held.add(action);
      else held.delete(action);
      game.input?.(action, pressed, wasHeld);
    },
    destroy() {
      destroyed = true;
      running = false;
      held.clear();
      cancelAnimationFrame(frameId);
    },
  };
}

export function createSnake({ canvas, onScore, onEnd, random = Math.random }) {
  return createSession({ canvas, onScore, onEnd }, ({ ctx, canvas: board, score: emit, finish }) => {
    const cell = 20;
    const columns = Math.floor(board.width / cell);
    const rows = Math.floor(board.height / cell);
    const offsetX = Math.floor((board.width - columns * cell) / 2);
    const offsetY = Math.floor((board.height - rows * cell) / 2);
    const directions = {
      up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
      left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
    };
    let snake = [];
    let direction = directions.right;
    let pending = null;
    let food = null;
    let score = 0;
    let elapsed = 0;
    let finished = false;

    function placeFood() {
      const free = [];
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < columns; x += 1) {
          if (!snake.some(part => part.x === x && part.y === y)) free.push({ x, y });
        }
      }
      if (!free.length) {
        finished = true;
        finish(score, 'Perfect! You filled the whole garden.');
        return null;
      }
      return free[clamp(Math.floor(random() * free.length), 0, free.length - 1)];
    }

    function tick() {
      if (pending) direction = pending;
      pending = null;
      // The garden is continuous: crossing any edge re-enters at its opposite.
      const head = {
        x: (snake[0].x + direction.x + columns) % columns,
        y: (snake[0].y + direction.y + rows) % rows,
      };
      const eats = food && head.x === food.x && head.y === food.y;
      // Moving into the current tail is legal if the tail moves away this turn.
      const body = eats ? snake : snake.slice(0, -1);
      if (body.some(part => part.x === head.x && part.y === head.y)) {
        finished = true;
        finish(score, 'You crossed your own trail. Try a new route!');
        return;
      }
      snake.unshift(head);
      if (eats) {
        score += 10;
        emit(score);
        food = placeFood();
      } else snake.pop();
    }

    return {
      instructions: 'Arrows or WASD to turn. Eat golden fruit and avoid your own trail. Cross any edge to appear on the opposite side.',
      reset() {
        const x = Math.floor(columns / 2);
        const y = Math.floor(rows / 2);
        snake = [{ x, y }, { x: x - 1, y }, { x: x - 2, y }];
        direction = directions.right;
        pending = null;
        score = 0;
        elapsed = 0;
        finished = false;
        food = placeFood();
      },
      input(action, pressed) {
        const next = directions[action];
        if (!pressed || !next || pending) return;
        if (next.x === -direction.x && next.y === -direction.y) return;
        if (next.x === direction.x && next.y === direction.y) return;
        pending = next;
      },
      update(dt) {
        elapsed += dt;
        const interval = Math.max(0.075, 0.16 - score * 0.0004);
        while (elapsed >= interval && !finished) {
          elapsed -= interval;
          tick();
        }
      },
      draw() {
        ctx.fillStyle = palette.cream;
        ctx.fillRect(0, 0, board.width, board.height);
        for (let y = 0; y < rows; y += 1) {
          for (let x = 0; x < columns; x += 1) {
            ctx.fillStyle = (x + y) % 2 ? '#edf0df' : '#e5ead6';
            ctx.fillRect(offsetX + x * cell, offsetY + y * cell, cell, cell);
          }
        }
        // Subtle matching marks on opposite edges communicate wrap-around.
        ctx.fillStyle = '#a1b79c';
        for (let x = cell / 2; x < columns * cell; x += cell * 3) {
          ctx.fillRect(offsetX + x - 3, offsetY, 6, 2);
          ctx.fillRect(offsetX + x - 3, offsetY + rows * cell - 2, 6, 2);
        }
        for (let y = cell / 2; y < rows * cell; y += cell * 3) {
          ctx.fillRect(offsetX, offsetY + y - 3, 2, 6);
          ctx.fillRect(offsetX + columns * cell - 2, offsetY + y - 3, 2, 6);
        }
        if (food) {
          const x = offsetX + food.x * cell;
          const y = offsetY + food.y * cell;
          ctx.fillStyle = palette.ink;
          ctx.fillRect(x + 6, y + 7, 10, 10);
          ctx.fillStyle = palette.yellow;
          ctx.fillRect(x + 5, y + 6, 10, 10);
          ctx.fillStyle = palette.purple;
          ctx.fillRect(x + 10, y + 3, 3, 5);
          ctx.fillStyle = palette.cream;
          ctx.fillRect(x + 7, y + 8, 3, 3);
        }
        snake.forEach((part, index) => {
          const x = offsetX + part.x * cell;
          const y = offsetY + part.y * cell;
          ctx.fillStyle = palette.ink;
          ctx.fillRect(x + 1, y + 1, 18, 18);
          ctx.fillStyle = index === 0 ? palette.purple : '#9a80a8';
          ctx.fillRect(x + 3, y + 3, 14, 14);
          ctx.fillStyle = '#bba3c2';
          ctx.fillRect(x + 4, y + 4, 10, 3);
          if (index === 0) {
            ctx.fillStyle = palette.cream;
            if (direction.x) {
              const eyeX = direction.x > 0 ? x + 12 : x + 4;
              ctx.fillRect(eyeX, y + 4, 4, 4);
              ctx.fillRect(eyeX, y + 12, 4, 4);
              ctx.fillStyle = palette.ink;
              ctx.fillRect(eyeX + (direction.x > 0 ? 2 : 0), y + 5, 2, 2);
              ctx.fillRect(eyeX + (direction.x > 0 ? 2 : 0), y + 13, 2, 2);
            } else {
              const eyeY = direction.y > 0 ? y + 12 : y + 4;
              ctx.fillRect(x + 4, eyeY, 4, 4);
              ctx.fillRect(x + 12, eyeY, 4, 4);
              ctx.fillStyle = palette.ink;
              ctx.fillRect(x + 5, eyeY + (direction.y > 0 ? 2 : 0), 2, 2);
              ctx.fillRect(x + 13, eyeY + (direction.y > 0 ? 2 : 0), 2, 2);
            }
          }
        });
      },
    };
  });
}

export function createBrickBreaker({ canvas, onScore, onEnd }) {
  return createSession({ canvas, onScore, onEnd }, ({ ctx, canvas: board, held, score: emit, finish }) => {
    const width = board.width;
    const height = board.height;
    const paddleWidth = 64;
    const paddleHeight = 9;
    const paddleY = height - 22;
    const radius = 4;
    let paddleX = 0;
    let ball = { x: 0, y: 0, vx: 0, vy: 0 };
    let bricks = [];
    let launched = false;
    let score = 0;
    let lives = 3;
    let finished = false;

    function prepareBall() {
      launched = false;
      ball = { x: paddleX + paddleWidth / 2, y: paddleY - radius - 2, vx: 65, vy: -160 };
    }

    function move(dt) {
      paddleX = clamp(paddleX + ((held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0)) * 230 * dt, 4, width - paddleWidth - 4);
      if (!launched) {
        ball.x = paddleX + paddleWidth / 2;
        return;
      }
      const oldX = ball.x;
      const oldY = ball.y;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (ball.x - radius < 2) { ball.x = 2 + radius; ball.vx = Math.abs(ball.vx); }
      if (ball.x + radius > width - 2) { ball.x = width - 2 - radius; ball.vx = -Math.abs(ball.vx); }
      if (ball.y - radius < 26) { ball.y = 26 + radius; ball.vy = Math.abs(ball.vy); }
      if (ball.vy > 0 && oldY + radius <= paddleY + 1 && ball.y + radius >= paddleY &&
          ball.x + radius >= paddleX && ball.x - radius <= paddleX + paddleWidth) {
        const offset = clamp((ball.x - (paddleX + paddleWidth / 2)) / (paddleWidth / 2), -1, 1);
        const speed = Math.min(245, Math.hypot(ball.vx, ball.vy) + 3);
        const angle = offset * Math.PI / 3;
        ball.vx = Math.sin(angle) * speed;
        ball.vy = -Math.cos(angle) * speed;
        ball.y = paddleY - radius;
      }
      for (const brick of bricks) {
        if (!brick.hp) continue;
        const nearX = clamp(ball.x, brick.x, brick.x + brick.w);
        const nearY = clamp(ball.y, brick.y, brick.y + brick.h);
        if ((ball.x - nearX) ** 2 + (ball.y - nearY) ** 2 > radius ** 2) continue;
        if (oldY + radius <= brick.y) { ball.y = brick.y - radius; ball.vy = -Math.abs(ball.vy); }
        else if (oldY - radius >= brick.y + brick.h) { ball.y = brick.y + brick.h + radius; ball.vy = Math.abs(ball.vy); }
        else if (oldX < brick.x) { ball.x = brick.x - radius; ball.vx = -Math.abs(ball.vx); }
        else { ball.x = brick.x + brick.w + radius; ball.vx = Math.abs(ball.vx); }
        brick.hp -= 1;
        score += brick.hp ? 5 : 10;
        emit(score);
        if (bricks.every(item => !item.hp)) {
          finished = true;
          finish(score, 'All bricks cleared! Nice aim.');
        }
        break;
      }
      if (ball.y - radius > height && !finished) {
        lives -= 1;
        if (lives <= 0) {
          finished = true;
          finish(score, 'Out of balls! Another round?');
        } else prepareBall();
      }
    }

    return {
      instructions: 'Left/right or A/D to move. Space or Action launches the ball. Aim with the edge of your paddle. Three lives.',
      reset() {
        paddleX = (width - paddleWidth) / 2;
        score = 0;
        lives = 3;
        finished = false;
        const columns = 6;
        const gap = 4;
        const brickWidth = Math.floor((width - 28 - gap * (columns - 1)) / columns);
        bricks = [];
        for (let row = 0; row < 4; row += 1) {
          for (let column = 0; column < columns; column += 1) {
            bricks.push({ x: 14 + column * (brickWidth + gap), y: 42 + row * 20, w: brickWidth, h: 15, hp: row === 0 ? 2 : 1, row });
          }
        }
        prepareBall();
      },
      input(action, pressed, wasHeld) {
        if (action === 'action' && pressed && !wasHeld && !launched) launched = true;
      },
      update(dt) {
        // Short substeps keep the ball from tunnelling through thin bricks.
        let remaining = dt;
        while (remaining > 0 && !finished) {
          const step = Math.min(0.008, remaining);
          move(step);
          remaining -= step;
        }
      },
      draw() {
        ctx.fillStyle = palette.cream;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = palette.soft;
        for (let y = 32; y < height; y += 12) for (let x = 8; x < width; x += 12) ctx.fillRect(x, y, 1, 1);
        text(ctx, `BALLS ${'●'.repeat(lives)}`, 12, 14, palette.purple, 10, 'left');
        text(ctx, 'BREAK THE PATTERN', width - 12, 14, palette.purple, 10, 'right');
        ctx.fillStyle = palette.ink;
        ctx.fillRect(0, 25, width, 2);
        const colors = [palette.purple, palette.peach, palette.mint, palette.yellow];
        for (const brick of bricks) {
          if (!brick.hp) continue;
          ctx.fillStyle = palette.ink;
          ctx.fillRect(brick.x + 2, brick.y + 2, brick.w, brick.h);
          ctx.fillStyle = colors[brick.row];
          ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
          ctx.fillStyle = 'rgba(255,255,255,.45)';
          ctx.fillRect(brick.x + 2, brick.y + 2, brick.w - 4, 3);
          if (brick.hp > 1) {
            ctx.fillStyle = palette.cream;
            ctx.fillRect(brick.x + brick.w / 2 - 2, brick.y + 7, 4, 4);
          }
        }
        ctx.fillStyle = palette.ink;
        ctx.fillRect(Math.round(paddleX) + 2, paddleY + 2, paddleWidth, paddleHeight);
        ctx.fillStyle = palette.purple;
        ctx.fillRect(Math.round(paddleX), paddleY, paddleWidth, paddleHeight);
        ctx.fillStyle = palette.peach;
        ctx.fillRect(Math.round(paddleX) + 3, paddleY + 2, paddleWidth - 6, 2);
        ctx.fillStyle = palette.ink;
        ctx.fillRect(Math.round(ball.x) - radius + 1, Math.round(ball.y) - radius + 1, radius * 2, radius * 2);
        ctx.fillStyle = palette.yellow;
        ctx.fillRect(Math.round(ball.x) - radius, Math.round(ball.y) - radius, radius * 2, radius * 2);
        ctx.fillStyle = palette.white;
        ctx.fillRect(Math.round(ball.x) - 2, Math.round(ball.y) - 2, 2, 2);
        if (!launched && !finished) {
          text(ctx, 'SPACE / ACTION TO LAUNCH', width / 2, height - 63, palette.purple, 11);
          text(ctx, 'Move first to line up your shot.', width / 2, height - 44, palette.ink, 9);
        }
      },
    };
  });
}

export function createPong({ canvas, onScore, onEnd, random = Math.random }) {
  return createSession({ canvas, onScore, onEnd }, ({ ctx, canvas: board, held, score: emit, finish }) => {
    const width = board.width;
    const height = board.height;
    const paddleHeight = 48;
    const paddleWidth = 8;
    const leftX = 15;
    const rightX = width - 15 - paddleWidth;
    const top = 30;
    const bottom = height - 10;
    const radius = 4;
    let playerY = 0;
    let computerY = 0;
    let playerPoints = 0;
    let computerPoints = 0;
    let ball = { x: 0, y: 0, vx: 0, vy: 0 };
    let serveDelay = 0;
    let clock = 0;
    let finished = false;

    function serve(direction) {
      ball = {
        x: width / 2, y: (top + bottom) / 2,
        vx: direction * 160, vy: (random() - 0.5) * 105,
      };
      serveDelay = 0.65;
    }

    function point(forPlayer) {
      if (forPlayer) playerPoints += 1;
      else computerPoints += 1;
      emit(playerPoints * 100);
      if (playerPoints >= 7 || computerPoints >= 7) {
        finished = true;
        finish(playerPoints * 100, playerPoints >= 7 ? 'You beat the cabinet! Seven points well earned.' : 'The cabinet wins this time. Try again!');
      } else serve(forPlayer ? 1 : -1);
    }

    function move(dt) {
      clock += dt;
      const movement = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
      playerY = clamp(playerY + movement * 240 * dt, top, bottom - paddleHeight);
      // The cabinet follows with a small, visible delay, so angled shots can beat it.
      const target = ball.vx > 0 ? ball.y - paddleHeight / 2 + Math.sin(clock * 2.5) * 16 : (top + bottom - paddleHeight) / 2;
      computerY = clamp(computerY + clamp(target - computerY, -132 * dt, 132 * dt), top, bottom - paddleHeight);
      if (serveDelay > 0) {
        serveDelay = Math.max(0, serveDelay - dt);
        return;
      }
      const oldX = ball.x;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (ball.y - radius < top) { ball.y = top + radius; ball.vy = Math.abs(ball.vy); }
      if (ball.y + radius > bottom) { ball.y = bottom - radius; ball.vy = -Math.abs(ball.vy); }
      const hitPlayer = ball.vx < 0 && oldX - radius >= leftX + paddleWidth &&
        ball.x - radius <= leftX + paddleWidth && ball.y + radius >= playerY && ball.y - radius <= playerY + paddleHeight;
      const hitComputer = ball.vx > 0 && oldX + radius <= rightX &&
        ball.x + radius >= rightX && ball.y + radius >= computerY && ball.y - radius <= computerY + paddleHeight;
      if (hitPlayer || hitComputer) {
        const paddleY = hitPlayer ? playerY : computerY;
        const offset = clamp((ball.y - (paddleY + paddleHeight / 2)) / (paddleHeight / 2), -1, 1);
        const speed = Math.min(310, Math.hypot(ball.vx, ball.vy) + 10);
        const angle = offset * Math.PI / 3;
        ball.vx = (hitPlayer ? 1 : -1) * Math.cos(angle) * speed;
        ball.vy = Math.sin(angle) * speed + (hitPlayer ? movement * 16 : 0);
        ball.x = hitPlayer ? leftX + paddleWidth + radius : rightX - radius;
      }
      if (ball.x < -radius) point(false);
      else if (ball.x > width + radius) point(true);
    }

    return {
      instructions: 'Up/down or W/S to move your left paddle. Beat the cabinet to seven points. Edge hits send sharper angles.',
      reset() {
        playerY = (top + bottom - paddleHeight) / 2;
        computerY = playerY;
        playerPoints = 0;
        computerPoints = 0;
        clock = 0;
        finished = false;
        serve(-1);
      },
      update(dt) {
        let remaining = dt;
        while (remaining > 0 && !finished) {
          const step = Math.min(0.008, remaining);
          move(step);
          remaining -= step;
        }
      },
      draw() {
        ctx.fillStyle = palette.cream;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = palette.mint;
        ctx.fillRect(2, top, width - 4, bottom - top);
        ctx.fillStyle = '#dbe4d5';
        ctx.fillRect(2, top, (width - 4) / 2, bottom - top);
        ctx.fillStyle = palette.cream;
        for (let y = top + 4; y < bottom; y += 14) ctx.fillRect(width / 2 - 1, y, 2, 7);
        text(ctx, `YOU  ${playerPoints}`, width / 4, 14, palette.purple, 12);
        text(ctx, `CABINET  ${computerPoints}`, width * 3 / 4, 14, palette.purple, 12);
        ctx.fillStyle = palette.ink;
        ctx.fillRect(0, top - 2, width, 2);
        ctx.fillRect(0, bottom, width, 2);
        ctx.fillRect(leftX + 2, Math.round(playerY) + 2, paddleWidth, paddleHeight);
        ctx.fillRect(rightX + 2, Math.round(computerY) + 2, paddleWidth, paddleHeight);
        ctx.fillStyle = palette.purple;
        ctx.fillRect(leftX, Math.round(playerY), paddleWidth, paddleHeight);
        ctx.fillStyle = palette.peach;
        ctx.fillRect(rightX, Math.round(computerY), paddleWidth, paddleHeight);
        ctx.fillStyle = palette.cream;
        ctx.fillRect(leftX + 1, Math.round(playerY) + 3, 2, paddleHeight - 6);
        ctx.fillRect(rightX + 1, Math.round(computerY) + 3, 2, paddleHeight - 6);
        ctx.fillStyle = palette.ink;
        ctx.fillRect(Math.round(ball.x) - radius + 1, Math.round(ball.y) - radius + 1, radius * 2, radius * 2);
        ctx.fillStyle = palette.yellow;
        ctx.fillRect(Math.round(ball.x) - radius, Math.round(ball.y) - radius, radius * 2, radius * 2);
        if (serveDelay > 0 && !finished) text(ctx, 'READY?', width / 2, bottom - 15, palette.ink, 10);
      },
    };
  });
}
