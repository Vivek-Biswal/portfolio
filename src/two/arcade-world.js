export const ROOM = { width: 320, height: 256 };
export const CABINETS = [
  { id: 'snake', title: 'Snake', x: 44, y: 106, color: '#8daa8b', symbol: 'S' },
  { id: 'bricks', title: 'Brick Breaker', x: 120, y: 106, color: '#c99274', symbol: 'B' },
  { id: 'memory', title: 'Memory Match', x: 196, y: 106, color: '#ae94be', symbol: 'M' },
  { id: 'runner', title: 'Glitch Run', x: 272, y: 106, color: '#90b3b9', symbol: 'G' },
  { id: 'pong', title: 'Pong', x: 82, y: 190, color: '#d5b574', symbol: 'P' },
  { id: 'blocks', title: 'Block Drop', x: 160, y: 190, color: '#a191b9', symbol: 'T' },
  { id: 'maze', title: 'Coin Maze', x: 238, y: 190, color: '#91ab9c', symbol: 'C' },
];

// Keep the same scene units while expanding the walkable room to the viewport.
// Cabinets stay on the pixel grid instead of stretching a small picture.
export function configureRoom(width, height) {
  ROOM.width = Math.max(320, Math.floor(width));
  ROOM.height = Math.max(220, Math.floor(height));
  if (ROOM.height < 300 && ROOM.width >= 600) {
    CABINETS.forEach((cab, index) => {
      cab.x = Math.round(44 + index * (ROOM.width - 88) / 6);
      cab.y = Math.round(ROOM.height * 0.64);
    });
    return;
  }
  const firstY = Math.max(ROOM.width >= 450 && ROOM.height >= 300 ? 162 : 142, Math.round(ROOM.height * 0.44));
  const secondY = Math.min(ROOM.height - 30, Math.max(firstY + 76, Math.round(ROOM.height * 0.73)));
  CABINETS.forEach((cab, index) => {
    cab.x = index < 4 ? Math.round(44 + index * (ROOM.width - 88) / 3) : Math.round(ROOM.width * (index - 3) / 4);
    cab.y = index < 4 ? firstY : secondY;
  });
}

export function canWalk(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (x < 13 || x > ROOM.width - 13 || y < 43 || y > ROOM.height - 18) return false;
  return !CABINETS.some(cab => x > cab.x - 27 && x < cab.x + 27 && y > cab.y - 68 && y < cab.y - 10);
}

export function nearestCabinet(player, radius = 34) {
  return CABINETS.map(cab => ({ cab, distance: Math.hypot(cab.x - player.x, cab.y - player.y) }))
    .filter(item => item.distance < radius).sort((a, b) => a.distance - b.distance)[0]?.cab;
}

// A small breadth-first grid prevents click-to-walk from cutting through cabinets.
export function findWalkPath(start, target) {
  if (![start.x, start.y, target.x, target.y].every(Number.isFinite)) return [];
  const cell = 6, columns = Math.ceil(ROOM.width / cell), rows = Math.ceil(ROOM.height / cell);
  const center = index => ({ x: (index % columns) * cell + cell / 2, y: Math.floor(index / columns) * cell + cell / 2 });
  const indexFor = point => {
    const x = Math.floor(point.x / cell), y = Math.floor(point.y / cell);
    return x < 0 || x >= columns || y < 0 || y >= rows ? -1 : y * columns + x;
  };
  const free = index => index >= 0 && index < columns * rows && canWalk(center(index).x, center(index).y);
  const nearest = point => {
    let best = -1, distance = Infinity;
    for (let index = 0; index < columns * rows; index += 1) {
      if (!free(index)) continue;
      const p = center(index), d = (p.x - point.x) ** 2 + (p.y - point.y) ** 2;
      if (d < distance) { distance = d; best = index; }
    }
    return best;
  };
  const source = free(indexFor(start)) ? indexFor(start) : nearest(start);
  const goal = free(indexFor(target)) ? indexFor(target) : nearest(target);
  if (source < 0 || goal < 0) return [];
  const parents = new Map([[source, -1]]), queue = [source];
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head];
    if (current === goal) break;
    const x = current % columns;
    const neighbors = [current - columns, current + columns];
    if (x > 0) neighbors.push(current - 1);
    if (x < columns - 1) neighbors.push(current + 1);
    for (const next of neighbors) {
      if (!free(next) || parents.has(next)) continue;
      parents.set(next, current); queue.push(next);
    }
  }
  if (!parents.has(goal)) return [];
  const path = [];
  for (let current = goal; current !== source; current = parents.get(current)) path.unshift(center(current));
  if (canWalk(target.x, target.y)) path.push({ ...target });
  return path;
}
