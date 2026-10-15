const sheets = new Map();
const WALK_URL = '/2d/vivek-walk-v3.png';
const POSE_URL = '/2d/vivek-walk-v2.png';
const ROOM_URL = '/2d/vivek-room-v3.png';

// Isolate the person from any tiny neighboring-frame pixels at a grid edge.
function silhouette(data, width, height) {
  const visited = new Uint8Array(width * height), queue = new Int32Array(width * height);
  let largest;
  for (let seed = 0; seed < visited.length; seed++) {
    if (visited[seed] || data[seed * 4 + 3] < 16) continue;
    let head = 0, tail = 1, left = width, right = -1, top = height, bottom = -1;
    queue[0] = seed; visited[seed] = 1;
    while (head < tail) {
      const index = queue[head++], x = index % width, y = Math.floor(index / width);
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if ((!dx && !dy) || nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const next = ny * width + nx;
        if (visited[next] || data[next * 4 + 3] < 16) continue;
        visited[next] = 1; queue[tail++] = next;
      }
    }
    if (!largest || tail > largest.count) largest = { left, right, top, bottom, count: tail };
  }
  if (!largest) throw new Error('Character sheet contains an empty pose.');
  const { left, right, top, bottom } = largest, centers = [];
  for (let y = top + Math.floor((bottom - top) * 0.03); y < top + Math.ceil((bottom - top) * 0.27); y++) {
    let start = width, end = -1;
    for (let x = left; x <= right; x++) if (data[(y * width + x) * 4 + 3] >= 128) { start = Math.min(start, x); end = Math.max(end, x); }
    if (end >= start) centers.push((start + end) / 2);
  }
  centers.sort((a, b) => a - b);
  return { left, top, width: right - left + 1, height: bottom - top + 1,
    anchorX: centers.length ? centers[Math.floor(centers.length / 2)] : (left + right) / 2 };
}

function loadSheet(url, columns, rows, standingCount) {
  if (sheets.has(url)) return sheets.get(url);
  const promise = (async () => {
    const image = new Image(); image.decoding = 'async';
    const loaded = new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Could not load character animation.')); });
    image.src = url; await loaded;
    if (image.decode) await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Character canvas is unavailable.');
    context.drawImage(image, 0, 0);
    const frames = [], overlap = Math.ceil(image.naturalWidth / columns * 0.06);
    for (let index = 0; index < columns * rows; index++) {
      const column = index % columns, row = Math.floor(index / columns);
      const x = Math.max(0, Math.floor(column * image.naturalWidth / columns) - overlap);
      const y = Math.floor(row * image.naturalHeight / rows);
      const end = Math.min(image.naturalWidth, Math.floor((column + 1) * image.naturalWidth / columns) + overlap);
      const bottom = Math.floor((row + 1) * image.naturalHeight / rows);
      const { data } = context.getImageData(x, y, end - x, bottom - y);
      const frame = silhouette(data, end - x, bottom - y);
      frames.push({ ...frame, x: x + frame.left, y: y + frame.top });
    }
    const standingHeight = Math.max(...frames.slice(0, standingCount).map(f => f.height));
    const left = Math.min(...frames.map(f => f.left - f.anchorX)), right = Math.max(...frames.map(f => f.left - f.anchorX + f.width));
    canvas.width = canvas.height = 0;
    return { image, frames, standingHeight, aspectRatio: (right - left) / standingHeight };
  })().catch(error => { sheets.delete(url); throw error; });
  sheets.set(url, promise); return promise;
}

function drawPose(context, sheet, index, { x, y, height, facing = 1 }) {
  if (![x, y, height].every(Number.isFinite) || height <= 0) return;
  const f = sheet.frames[index], scale = height / sheet.standingHeight;
  context.save(); context.imageSmoothingEnabled = false;
  context.translate(x, y); context.scale(facing < 0 ? -1 : 1, 1);
  context.drawImage(sheet.image, f.x, f.y, f.width, f.height,
    (f.left - f.anchorX) * scale, -f.height * scale, f.width * scale, f.height * scale);
  context.restore();
}

/** Whole, cached poses preserve the same identity outdoors and inside. */
export async function createPixelPainter() {
  const [walk, poses, room] = await Promise.all([
    loadSheet(WALK_URL, 4, 2, 8),
    loadSheet(POSE_URL, 5, 2, 9),
    loadSheet(ROOM_URL, 4, 2, 8),
  ]);
  const tick = time => Math.floor(Math.max(0, Number.isFinite(time) ? time : 0) * 16);
  const cycle = (phase, count) => Math.floor(((phase % 1 + 1) % 1) * count) % count;
  return {
    aspectRatio: Math.max(walk.aspectRatio, poses.aspectRatio),
    draw(context, options) {
      const step = Number.isFinite(options.phase) ? cycle(options.phase, 8) : tick(options.time) % 8;
      if (options.pose === 'run') drawPose(context, walk, step, options);
      else drawPose(context, poses, options.pose === 'jump' ? 9 : 0, options);
    },
    drawRoom(context, { direction = 'down', moving = false, time = 0, phase, ...options }) {
      if (![options.x, options.y, options.height].every(Number.isFinite) || options.height <= 0) return;
      const sideways = direction === 'left' || direction === 'right';
      const row = direction === 'up' ? 1 : 0;
      // Each row contains both alternating foot contacts, separated by a passing pose.
      const sequence = [1, 2, 3, 2], position = Number.isFinite(phase) ? cycle(phase, sequence.length) : Math.floor(tick(time) / 2) % sequence.length;
      const step = moving ? sequence[position] : 0;
      context.save(); context.fillStyle = 'rgba(12,19,25,.14)';
      context.beginPath(); context.ellipse(options.x, options.y - 1, options.height * 0.18, 2, 0, 0, Math.PI * 2); context.fill(); context.restore();
      const facing = direction === 'left' ? -1 : 1;
      if (sideways) {
        if (moving) {
          const sideStep = Number.isFinite(phase) ? cycle(phase, 8) : tick(time) % 8;
          drawPose(context, walk, sideStep, { ...options, facing });
        } else drawPose(context, room, 0, { ...options, facing: 1 });
      } else drawPose(context, room, row * 4 + step, { ...options, facing });
    },
  };
}
