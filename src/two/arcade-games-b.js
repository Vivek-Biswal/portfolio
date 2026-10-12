const COLOR = {
  paper: '#fcf8eb', ink: '#302736', purple: '#746087', mint: '#b9cdc0',
  peach: '#e7c6ad', yellow: '#e8c885', pink: '#cd8793', white: '#fffdf5',
};

const WIDTH = 360;
const HEIGHT = 260;

function shuffle(items, random) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function text(ctx, label, x, y, size = 10, color = COLOR.ink, align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `600 ${Math.max(12, size)}px "Pixelify Sans", monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillText(label, Math.round(x), Math.round(y));
}

function backdrop(ctx) {
  ctx.fillStyle = COLOR.paper;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#f0eadc';
  for (let y = 0; y < HEIGHT; y += 16) {
    for (let x = 0; x < WIDTH; x += 16) {
      if ((x / 16 + y / 16) % 2 === 0) ctx.fillRect(x, y, 16, 16);
    }
  }
}

// All three games share one cancellable clock. Pausing freezes simulation time,
// including reveal delays and held movement; restarting creates a fresh round.
function runtime({ canvas, onScore = () => {}, onEnd = () => {} }, hooks) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This arcade game needs a 2D canvas.');
  let phase = 'ready';
  let frameId = 0;
  let previous = null;
  let score = 0;

  function draw() {
    ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    hooks.draw(ctx);
  }

  function cancel() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    previous = null;
  }

  function frame(now) {
    frameId = 0;
    if (phase !== 'running') return;
    const dt = previous === null ? 0 : Math.min(0.06, Math.max(0, (now - previous) / 1000));
    previous = now;
    hooks.update(dt);
    if (phase === 'destroyed') return;
    draw();
    if (phase === 'running') frameId = requestAnimationFrame(frame);
  }

  const game = {
    instructions: hooks.instructions,
    start() {
      if (phase === 'destroyed') return;
      cancel();
      phase = 'running';
      score = 0;
      hooks.clearInput?.();
      hooks.reset();
      onScore(score);
      draw();
      frameId = requestAnimationFrame(frame);
    },
    pause() {
      if (phase !== 'running') return;
      phase = 'paused';
      cancel();
      hooks.clearInput?.();
      draw();
    },
    resume() {
      if (phase !== 'paused') return;
      phase = 'running';
      previous = null;
      draw();
      frameId = requestAnimationFrame(frame);
    },
    destroy() {
      cancel();
      hooks.clearInput?.();
      hooks.destroy?.();
      phase = 'destroyed';
    },
    input(action, pressed = true) {
      if (phase === 'running') hooks.input?.(action, pressed);
    },
    // Internal methods are also useful to callers that display a shared HUD.
    get running() { return phase === 'running'; },
    score(value) {
      score = Math.max(0, Math.floor(value));
      onScore(score);
    },
    finish(message) {
      if (phase !== 'running') return;
      phase = 'ended';
      cancel();
      hooks.clearInput?.();
      draw();
      onEnd({ score, message });
    },
  };
  return game;
}

const SYMBOLS = [
  ['0001000', '0011100', '0111110', '1111111', '0111110', '0011100', '0001000'],
  ['0010010', '0111110', '1111111', '1111111', '0111110', '0011100', '0001000'],
  ['0011100', '0100000', '1100000', '1100000', '1100000', '0110010', '0011100'],
  ['0001110', '0011100', '0111000', '0011110', '0001100', '0011000', '0110000'],
  ['0000000', '0011100', '0100010', '1111111', '1011101', '1111111', '0100010'],
  ['0001000', '0011100', '0111110', '1111111', '0111110', '0010100', '0010100'],
  ['0000110', '0001100', '0011000', '0111000', '1111100', '1111000', '0110000'],
  ['0100010', '0111110', '1101011', '1111111', '1111111', '0100010', '0100010'],
];
const SYMBOL_COLORS = [COLOR.yellow, COLOR.pink, COLOR.purple, '#bd774a', COLOR.purple, '#668570', '#668570', '#b4776a'];

function drawSymbol(ctx, index, x, y, pixel = 4) {
  ctx.fillStyle = SYMBOL_COLORS[index];
  SYMBOLS[index].forEach((row, yy) => {
    [...row].forEach((bit, xx) => {
      if (bit === '1') ctx.fillRect(x + xx * pixel, y + yy * pixel, pixel, pixel);
    });
  });
}

export function createMemoryMatch(options) {
  const { canvas, random = Math.random } = options;
  const SIZE = 44;
  const GAP = 8;
  const LEFT = 80;
  const TOP = 32;
  let cards = [];
  let selected = 0;
  let revealed = [];
  let matches = 0;
  let moves = 0;
  let elapsed = 0;
  let revealDelay = 0;
  const held = new Set();
  let game;

  function flip(index) {
    if (!game.running || revealDelay > 0 || cards[index].matched || revealed.includes(index)) return;
    selected = index;
    revealed.push(index);
    if (revealed.length === 2) {
      moves += 1;
      revealDelay = cards[revealed[0]].symbol === cards[revealed[1]].symbol ? 0.35 : 0.85;
    }
  }

  const pointer = event => {
    if (!game.running || (event.button !== undefined && event.button !== 0)) return;
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left) * WIDTH / bounds.width - LEFT;
    const y = (event.clientY - bounds.top) * HEIGHT / bounds.height - TOP;
    if (x < 0 || y < 0) return;
    const col = Math.floor(x / (SIZE + GAP));
    const row = Math.floor(y / (SIZE + GAP));
    if (col >= 4 || row >= 4 || x % (SIZE + GAP) >= SIZE || y % (SIZE + GAP) >= SIZE) return;
    flip(row * 4 + col);
  };
  canvas.addEventListener('pointerdown', pointer);

  game = runtime(options, {
    instructions: 'Find eight matching pairs. Click a card, or use arrows to select and Space / Enter to flip.',
    reset() {
      cards = shuffle(Array.from({ length: 16 }, (_, i) => ({ symbol: i % 8, matched: false })), random);
      selected = 0;
      revealed = [];
      matches = 0;
      moves = 0;
      elapsed = 0;
      revealDelay = 0;
    },
    clearInput() { held.clear(); },
    destroy() { canvas.removeEventListener('pointerdown', pointer); },
    input(action, pressed) {
      if (!pressed) { held.delete(action); return; }
      if (held.has(action)) return;
      held.add(action);
      if (action === 'left') selected = Math.floor(selected / 4) * 4 + (selected + 3) % 4;
      if (action === 'right') selected = Math.floor(selected / 4) * 4 + (selected + 1) % 4;
      if (action === 'up') selected = (selected + 12) % 16;
      if (action === 'down') selected = (selected + 4) % 16;
      if (action === 'action' || action === 'secondary') flip(selected);
    },
    update(dt) {
      elapsed += dt;
      if (revealDelay <= 0) return;
      revealDelay -= dt;
      if (revealDelay > 0) return;
      if (cards[revealed[0]].symbol === cards[revealed[1]].symbol) {
        revealed.forEach(index => { cards[index].matched = true; });
        matches += 1;
        game.score(matches * 100);
      }
      revealed = [];
      if (matches === 8) {
        game.score(800 + Math.max(0, 32 - moves) * 10 + Math.max(0, 120 - Math.floor(elapsed)));
        game.finish(`Eight pairs found in ${moves} turns. A sharp memory!`);
      }
    },
    draw(ctx) {
      backdrop(ctx);
      text(ctx, 'MEMORY MATCH', 14, 10, 11);
      text(ctx, `${matches}/8 PAIRS`, 346, 10, 10, COLOR.purple, 'right');
      cards.forEach((card, index) => {
        const x = LEFT + (index % 4) * (SIZE + GAP);
        const y = TOP + Math.floor(index / 4) * (SIZE + GAP);
        const faceUp = card.matched || revealed.includes(index);
        ctx.fillStyle = COLOR.ink;
        ctx.fillRect(x + 3, y + 3, SIZE, SIZE);
        ctx.fillStyle = card.matched ? COLOR.mint : faceUp ? COLOR.white : COLOR.purple;
        ctx.fillRect(x, y, SIZE, SIZE);
        ctx.strokeStyle = COLOR.ink;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, SIZE - 2, SIZE - 2);
        if (faceUp) drawSymbol(ctx, card.symbol, x + 8, y + 8);
        else {
          ctx.fillStyle = '#9681a5';
          for (let yy = 8; yy < SIZE - 4; yy += 8) {
            for (let xx = 8; xx < SIZE - 4; xx += 8) ctx.fillRect(x + xx, y + yy, 4, 4);
          }
          text(ctx, '?', x + SIZE / 2, y + 13, 18, COLOR.paper, 'center');
        }
        if (index === selected) {
          // Filled integer-coordinate edges keep the focus ring crisp at scale.
          ctx.fillStyle = COLOR.yellow;
          ctx.fillRect(x - 4, y - 4, SIZE + 8, 2);
          ctx.fillRect(x - 4, y + SIZE + 2, SIZE + 8, 2);
          ctx.fillRect(x - 4, y - 2, 2, SIZE + 4);
          ctx.fillRect(x + SIZE + 2, y - 2, 2, SIZE + 4);
        }
      });
      text(ctx, `${String(moves).padStart(2, '0')} TURNS`, WIDTH / 2, 244, 10, COLOR.purple, 'center');
    },
  });
  return game;
}

const SHAPES = [
  [[1, 1, 1, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 1], [1, 1, 0]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 1, 0], [0, 1, 1]],
];
const BLOCK_COLORS = ['#91bec2', '#9581b5', '#cf9369', COLOR.yellow, '#91b499', '#bb89b2', '#cd8793'];

function rotate(matrix) {
  return matrix[0].map((_, x) => matrix.map(row => row[x]).reverse());
}

export function createBlockDrop(options) {
  const { random = Math.random } = options;
  const COLS = 10;
  const ROWS = 18;
  const CELL = 12;
  const LEFT = 80;
  const TOP = 30;
  let board = [];
  let bag = [];
  let next = 0;
  let piece;
  let points = 0;
  let lines = 0;
  let fallTime = 0;
  let repeatTime = 0;
  let repeatDirection = '';
  let flash = 0;
  const held = new Set();
  let game;

  function takePiece() {
    if (!bag.length) bag = shuffle([0, 1, 2, 3, 4, 5, 6], random);
    return bag.pop();
  }

  function fits(matrix, x, y) {
    return matrix.every((row, yy) => row.every((value, xx) => !value || (
      x + xx >= 0 && x + xx < COLS && y + yy < ROWS &&
      (y + yy < 0 || board[y + yy][x + xx] === 0)
    )));
  }

  function spawn() {
    const kind = next;
    next = takePiece();
    const matrix = SHAPES[kind].map(row => [...row]);
    piece = { kind, matrix, x: Math.floor((COLS - matrix[0].length) / 2), y: 0 };
    fallTime = 0;
    if (!fits(matrix, piece.x, piece.y)) game.finish(`${lines} lines cleared. The stack reached the top!`);
  }

  function move(direction) {
    if (fits(piece.matrix, piece.x + direction, piece.y)) piece.x += direction;
  }

  function turn() {
    const rotated = rotate(piece.matrix);
    for (const offset of [0, -1, 1, -2, 2]) {
      if (!fits(rotated, piece.x + offset, piece.y)) continue;
      piece.matrix = rotated;
      piece.x += offset;
      return;
    }
  }

  function lock() {
    let aboveCeiling = false;
    piece.matrix.forEach((row, yy) => row.forEach((value, xx) => {
      if (!value) return;
      if (piece.y + yy < 0) aboveCeiling = true;
      else board[piece.y + yy][piece.x + xx] = piece.kind + 1;
    }));
    if (aboveCeiling) { game.finish('The stack reached the top. Try a new arrangement!'); return; }
    const remaining = board.filter(row => row.some(value => value === 0));
    const removed = ROWS - remaining.length;
    if (removed) {
      points += [0, 100, 300, 500, 800][removed] * (1 + Math.floor(lines / 8));
      lines += removed;
      flash = 0.16;
      board = [...Array.from({ length: removed }, () => Array(COLS).fill(0)), ...remaining];
      game.score(points);
    }
    spawn();
  }

  function drop(soft = false) {
    if (fits(piece.matrix, piece.x, piece.y + 1)) {
      piece.y += 1;
      if (soft) { points += 1; game.score(points); }
    } else lock();
  }

  function hardDrop() {
    let distance = 0;
    while (fits(piece.matrix, piece.x, piece.y + 1)) { piece.y += 1; distance += 1; }
    points += distance * 2;
    game.score(points);
    lock();
  }

  function block(ctx, x, y, kind, size = CELL) {
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(Math.round(x), Math.round(y), size, size);
    ctx.fillStyle = BLOCK_COLORS[kind];
    ctx.fillRect(Math.round(x) + 1, Math.round(y) + 1, size - 2, size - 2);
    ctx.fillStyle = 'rgba(255,255,255,.32)';
    ctx.fillRect(Math.round(x) + 2, Math.round(y) + 2, size - 4, 2);
  }

  game = runtime(options, {
    instructions: 'Left / right move. Up rotates. Down soft-drops one row; hold to fall faster. Space / Enter hard-drops. Fill a row to clear it.',
    reset() {
      board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
      bag = [];
      next = takePiece();
      points = 0;
      lines = 0;
      repeatTime = 0;
      flash = 0;
      spawn();
    },
    clearInput() { held.clear(); repeatDirection = ''; repeatTime = 0; },
    input(action, pressed) {
      if (!pressed) { held.delete(action); return; }
      if (held.has(action)) return;
      held.add(action);
      if (action === 'left' || action === 'right') {
        move(action === 'left' ? -1 : 1);
        repeatDirection = action;
        repeatTime = -0.18;
      }
      if (action === 'up') turn();
      if (action === 'down') { fallTime = 0; drop(true); }
      if (action === 'action' || action === 'secondary') hardDrop();
    },
    update(dt) {
      flash = Math.max(0, flash - dt);
      const direction = held.has('left') === held.has('right') ? '' : held.has('left') ? 'left' : 'right';
      if (direction) {
        if (repeatDirection !== direction) { repeatDirection = direction; repeatTime = -0.18; }
        repeatTime += dt;
        while (repeatTime >= 0.07) {
          move(direction === 'left' ? -1 : 1);
          repeatTime -= 0.07;
        }
      } else { repeatDirection = ''; repeatTime = 0; }
      fallTime += dt;
      const interval = held.has('down') ? 0.055 : Math.max(0.095, 0.72 - Math.floor(lines / 8) * 0.06);
      if (fallTime >= interval) {
        fallTime %= interval;
        drop(held.has('down'));
      }
    },
    draw(ctx) {
      backdrop(ctx);
      text(ctx, 'BLOCK DROP', 14, 10, 11);
      text(ctx, `${lines} LINES`, 346, 10, 10, COLOR.purple, 'right');
      ctx.fillStyle = COLOR.ink;
      ctx.fillRect(LEFT - 4, TOP - 4, COLS * CELL + 8, ROWS * CELL + 8);
      ctx.fillStyle = flash ? '#66506b' : '#443949';
      ctx.fillRect(LEFT, TOP, COLS * CELL, ROWS * CELL);
      ctx.fillStyle = '#514556';
      for (let x = 1; x < COLS; x += 1) {
        ctx.fillRect(LEFT + x * CELL, TOP, 1, ROWS * CELL);
      }
      for (let y = 1; y < ROWS; y += 1) {
        ctx.fillRect(LEFT, TOP + y * CELL, COLS * CELL, 1);
      }
      board.forEach((row, y) => row.forEach((value, x) => {
        if (value) block(ctx, LEFT + x * CELL, TOP + y * CELL, value - 1);
      }));
      if (piece) {
        let ghostY = piece.y;
        while (fits(piece.matrix, piece.x, ghostY + 1)) ghostY += 1;
        ctx.globalAlpha = 0.25;
        piece.matrix.forEach((row, yy) => row.forEach((value, xx) => {
          if (value && ghostY + yy >= 0) block(ctx, LEFT + (piece.x + xx) * CELL, TOP + (ghostY + yy) * CELL, piece.kind);
        }));
        ctx.globalAlpha = 1;
        piece.matrix.forEach((row, yy) => row.forEach((value, xx) => {
          if (value && piece.y + yy >= 0) block(ctx, LEFT + (piece.x + xx) * CELL, TOP + (piece.y + yy) * CELL, piece.kind);
        }));
      }
      text(ctx, 'NEXT', 222, 37, 10, COLOR.purple);
      SHAPES[next].forEach((row, y) => row.forEach((value, x) => {
        if (value) block(ctx, 226 + x * 12, 57 + y * 12, next);
      }));
      text(ctx, 'LEVEL', 222, 103, 9, COLOR.purple);
      text(ctx, String(1 + Math.floor(lines / 8)).padStart(2, '0'), 222, 119, 18);
      text(ctx, 'UP = ROTATE', 222, 173, 8);
      text(ctx, 'SPACE = DROP', 222, 190, 8);
      text(ctx, 'FILL A ROW.', 222, 224, 8, COLOR.purple);
    },
  });
  return game;
}

const DIRECTIONS = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
  left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};

export function createCoinMaze(options) {
  const { random = Math.random } = options;
  const COLS = 19;
  const ROWS = 13;
  const CELL = 16;
  const LEFT = 28;
  const TOP = 34;
  let maze = [];
  let coins = new Set();
  let player;
  let patrols = [];
  let lives = 3;
  let points = 0;
  let remaining = 120;
  let elapsed = 0;
  let invulnerable = 0;
  let preferred = '';
  let queued = '';
  const held = new Set();
  let game;

  const key = (x, y) => `${x},${y}`;
  const open = (x, y) => x >= 0 && x < COLS && y >= 0 && y < ROWS && maze[y][x] === 0;
  const position = actor => ({
    x: actor.fromX + (actor.x - actor.fromX) * actor.progress,
    y: actor.fromY + (actor.y - actor.fromY) * actor.progress,
  });

  function buildMaze() {
    maze = Array.from({ length: ROWS }, () => Array(COLS).fill(1));
    maze[1][1] = 0;
    const stack = [{ x: 1, y: 1 }];
    while (stack.length) {
      const current = stack[stack.length - 1];
      const candidates = shuffle(Object.values(DIRECTIONS).map(direction => ({
        x: current.x + direction.x * 2, y: current.y + direction.y * 2,
      })).filter(cell => cell.x > 0 && cell.x < COLS - 1 && cell.y > 0 && cell.y < ROWS - 1 && maze[cell.y][cell.x]), random);
      if (!candidates.length) { stack.pop(); continue; }
      const nextCell = candidates[0];
      maze[(current.y + nextCell.y) / 2][(current.x + nextCell.x) / 2] = 0;
      maze[nextCell.y][nextCell.x] = 0;
      stack.push(nextCell);
    }
    const cells = [];
    maze.forEach((row, y) => row.forEach((wall, x) => {
      if (!wall && (x !== 1 || y !== 1)) cells.push({ x, y });
    }));
    shuffle(cells, random);
    coins = new Set(cells.slice(0, 28).map(cell => key(cell.x, cell.y)));
    const distantCells = cells.filter(cell => cell.x + cell.y > 13);
    patrols = distantCells.slice(0, 3).map((cell, i) => ({
      ...cell, fromX: cell.x, fromY: cell.y, progress: 1, wait: 1.2 + i * 0.45,
      previous: '', steps: 0, color: [COLOR.pink, COLOR.purple, '#bc835b'][i],
    }));
  }

  function startMove(actor, x, y) {
    actor.fromX = actor.x;
    actor.fromY = actor.y;
    actor.x = x;
    actor.y = y;
    actor.progress = 0;
  }

  function collect() {
    if (!coins.delete(key(player.x, player.y))) return;
    points += 10;
    game.score(points);
    if (!coins.size) {
      game.score(points + Math.ceil(remaining) * 2 + lives * 50);
      game.finish('Every coin collected. You escaped the maze!');
    }
  }

  function chaseStep(patrol) {
    const visited = new Set([key(patrol.x, patrol.y)]);
    const queue = [{ x: patrol.x, y: patrol.y, first: null }];
    for (let i = 0; i < queue.length; i += 1) {
      const current = queue[i];
      if (current.x === player.x && current.y === player.y) return current.first;
      for (const direction of Object.values(DIRECTIONS)) {
        const cell = { x: current.x + direction.x, y: current.y + direction.y };
        const cellKey = key(cell.x, cell.y);
        if (!open(cell.x, cell.y) || visited.has(cellKey)) continue;
        visited.add(cellKey);
        queue.push({ ...cell, first: current.first || cell });
      }
    }
    return null;
  }

  function movePatrol(patrol) {
    let candidates = Object.values(DIRECTIONS).map(direction => ({
      x: patrol.x + direction.x, y: patrol.y + direction.y,
    })).filter(cell => open(cell.x, cell.y));
    if (candidates.length > 1) candidates = candidates.filter(cell => key(cell.x, cell.y) !== patrol.previous);
    let target = null;
    patrol.steps += 1;
    if (patrol.steps % 3 === 0 && Math.abs(patrol.x - player.x) + Math.abs(patrol.y - player.y) < 8) target = chaseStep(patrol);
    if (!target) target = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
    if (!target) return;
    patrol.previous = key(patrol.x, patrol.y);
    startMove(patrol, target.x, target.y);
  }

  function movePlayer() {
    const order = [...new Set([queued, preferred, ...held])].filter(Boolean);
    for (const action of order) {
      if (action !== queued && !held.has(action)) continue;
      const direction = DIRECTIONS[action];
      if (!direction || !open(player.x + direction.x, player.y + direction.y)) continue;
      queued = '';
      startMove(player, player.x + direction.x, player.y + direction.y);
      return;
    }
    queued = '';
  }

  function drawHero(ctx) {
    const p = position(player);
    const x = Math.round(LEFT + p.x * CELL + CELL / 2);
    const y = Math.round(TOP + p.y * CELL + CELL / 2);
    if (invulnerable > 0 && Math.floor(elapsed * 9) % 2) ctx.globalAlpha = 0.35;
    ctx.fillStyle = 'rgba(48,39,54,.20)'; ctx.fillRect(x - 5, y + 4, 11, 3);
    const stride = player.progress < 1 ? Math.floor(elapsed * 20) % 2 : 0;
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(x - 3, y - 7, 6, 3);
    ctx.fillRect(x - 3, y - 1, 6, 6);
    ctx.fillRect(x - 3, y + 5, 2, 2 + stride);
    ctx.fillRect(x + 1, y + 5, 2, 3 - stride);
    ctx.fillStyle = '#c78652';
    ctx.fillRect(x - 3, y - 4, 6, 4);
    ctx.fillRect(x - 4, y, 1, 4);
    ctx.fillRect(x + 3, y, 1, 4);
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(x - 2, y - 3, 1, 1);
    ctx.fillRect(x + 1, y - 3, 1, 1);
    ctx.fillStyle = COLOR.paper;
    ctx.fillRect(x - 1, y - 1, 2, 1);
    ctx.globalAlpha = 1;
  }

  game = runtime(options, {
    instructions: 'Arrows / WASD move. Collect all 28 coins before 2:00. Avoid the three slow patrols. You have three hearts; each round has a new maze.',
    reset() {
      buildMaze();
      player = { x: 1, y: 1, fromX: 1, fromY: 1, progress: 1 };
      lives = 3;
      points = 0;
      remaining = 120;
      elapsed = 0;
      invulnerable = 2;
    },
    clearInput() { held.clear(); preferred = ''; queued = ''; },
    input(action, pressed) {
      if (!DIRECTIONS[action]) return;
      if (pressed) {
        if (!held.has(action)) queued = action;
        held.add(action);
        preferred = action;
      } else held.delete(action);
    },
    update(dt) {
      elapsed += dt;
      remaining = Math.max(0, remaining - dt);
      invulnerable = Math.max(0, invulnerable - dt);
      if (remaining <= 0) { game.finish(`${28 - coins.size}/28 coins collected. Time ran out!`); return; }
      player.progress = Math.min(1, player.progress + dt / 0.13);
      if (player.progress === 1) {
        collect();
        if (!game.running) return;
        movePlayer();
      }
      for (const patrol of patrols) {
        if (patrol.wait > 0) patrol.wait -= dt;
        else {
          patrol.progress = Math.min(1, patrol.progress + dt / 0.43);
          if (patrol.progress === 1) movePatrol(patrol);
        }
      }
      if (invulnerable > 0) return;
      const p = position(player);
      for (const patrol of patrols) {
        const enemy = position(patrol);
        if (Math.hypot(enemy.x - p.x, enemy.y - p.y) >= 0.62) continue;
        lives -= 1;
        if (!lives) { game.finish(`${28 - coins.size}/28 coins found. The patrol caught you!`); return; }
        player = { x: 1, y: 1, fromX: 1, fromY: 1, progress: 1 };
        invulnerable = 2.8;
        queued = '';
        break;
      }
    },
    draw(ctx) {
      backdrop(ctx);
      text(ctx, 'COIN MAZE', 14, 10, 11);
      text(ctx, `${28 - coins.size}/28`, 137, 10, 10, COLOR.purple);
      text(ctx, `${'♥'.repeat(lives)}${'·'.repeat(3 - lives)}`, 228, 10, 11, COLOR.pink);
      const seconds = Math.ceil(remaining);
      text(ctx, `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`, 346, 10, 10, remaining < 20 ? '#a34756' : COLOR.ink, 'right');
      ctx.fillStyle = COLOR.ink;
      ctx.fillRect(LEFT - 2, TOP - 2, COLS * CELL + 4, ROWS * CELL + 4);
      maze.forEach((row, y) => row.forEach((wall, x) => {
        const xx = LEFT + x * CELL;
        const yy = TOP + y * CELL;
        ctx.fillStyle = wall ? COLOR.purple : COLOR.paper;
        ctx.fillRect(xx, yy, CELL, CELL);
        if (wall) {
          ctx.fillStyle = '#93809f'; ctx.fillRect(xx, yy, CELL, 2);
          ctx.fillStyle = '#62516f'; ctx.fillRect(xx, yy + CELL - 2, CELL, 2);
        } else if ((x + y) % 2 === 0) {
          ctx.fillStyle = '#ebe5d7'; ctx.fillRect(xx + 2, yy + 2, 2, 2);
        }
        if (coins.has(key(x, y))) {
          ctx.fillStyle = '#b08c43'; ctx.fillRect(xx + 6, yy + 5, 5, 7);
          ctx.fillStyle = COLOR.yellow; ctx.fillRect(xx + 5, yy + 4, 5, 7);
          ctx.fillStyle = COLOR.white; ctx.fillRect(xx + 6, yy + 5, 1, 3);
        }
      }));
      patrols.forEach(patrol => {
        const p = position(patrol);
        const x = Math.round(LEFT + p.x * CELL + 3);
        const y = Math.round(TOP + p.y * CELL + 3);
        ctx.fillStyle = COLOR.ink; ctx.fillRect(x, y, 11, 10);
        ctx.fillStyle = patrol.color; ctx.fillRect(x + 1, y - 1, 9, 9);
        ctx.fillRect(x, y + 2, 11, 6);
        ctx.fillStyle = COLOR.paper;
        ctx.fillRect(x + 2, y + 2, 2, 3); ctx.fillRect(x + 7, y + 2, 2, 3);
        ctx.fillStyle = COLOR.ink;
        ctx.fillRect(x + 3, y + 3, 1, 2); ctx.fillRect(x + 8, y + 3, 1, 2);
        ctx.fillRect(x + 3, y + 8, 1, 2); ctx.fillRect(x + 7, y + 8, 1, 2);
      });
      drawHero(ctx);
      text(ctx, '28 COINS. THREE HEARTS. ONE WAY OUT.', WIDTH / 2, 248, 8, COLOR.purple, 'center');
    },
  });
  return game;
}
