const PORTRAIT_URL = '/2d/vivek-pixel.png';
const WALK_SHEET_URL = '/2d/vivek-walk-sheet.png';
const WALK_COLUMNS = 3;
const WALK_ROWS = 2;
const palette = {
  outline: '#17191f', hair: '#17191d', hairShadow: '#101215', hairMid: '#2c3037', hairLight: '#444851',
  skin: '#d78c55', skinLight: '#eca66a', skinBright: '#f7b97d', skinShade: '#ad623a', skinDeep: '#79412d',
  shirt: '#26292e', shirtLight: '#363a40', shirtShade: '#1c1e23', seam: '#46484e',
  pants: '#424650', pantsLight: '#535964', pantsShade: '#30343d', shoe: '#f4eedf', shoeShade: '#cabfa8', sole: '#dfd6c3',
  white: '#fff9ee',
};

// Every contour is rasterized as complete horizontal pixel runs. Frames contain
// a whole person, so a moving knee or elbow never exposes a cutout seam.
function pixelArt(context) {
  const rect = (color, x, y, width, height) => {
    context.fillStyle = palette[color] || color;
    context.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
  };
  const poly = (color, points) => {
    const bottom = Math.max(...points.map(point => point[1]));
    const top = Math.min(...points.map(point => point[1]));
    for (let y = Math.floor(top); y < bottom; y++) {
      const cuts = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i], b = points[(i + 1) % points.length];
        if ((a[1] <= y + 0.5 && b[1] > y + 0.5) || (b[1] <= y + 0.5 && a[1] > y + 0.5)) {
          cuts.push(a[0] + (y + 0.5 - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
        }
      }
      cuts.sort((a, b) => a - b);
      for (let i = 0; i + 1 < cuts.length; i += 2) {
        const left = Math.ceil(cuts[i] - 0.5), right = Math.ceil(cuts[i + 1] - 0.5);
        rect(color, left, y, right - left, 1);
      }
    }
  };
  return { rect, poly };
}

const walkerFrames = new Map();
let spriteSheetPromise;

/** Decode and measure once. Complete poses share one scale; align the head
 * within each cell so asymmetric arm swings cannot shift the whole person. */
function loadWalkerSheet() {
  if (spriteSheetPromise) return spriteSheetPromise;
  spriteSheetPromise = (async () => {
    const image = new Image();
    image.decoding = 'async';
    const loaded = new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Could not load the walking character.'));
    });
    image.src = WALK_SHEET_URL;
    await loaded;
    if (typeof image.decode === 'function') await image.decode();
    const cellWidth = image.naturalWidth / WALK_COLUMNS;
    const cellHeight = image.naturalHeight / WALK_ROWS;
    if (!Number.isInteger(cellWidth) || !Number.isInteger(cellHeight) || cellWidth <= 0 || cellHeight <= 0) {
      throw new Error('Walking character sheet must contain six equal cells.');
    }
    const measuringCanvas = document.createElement('canvas');
    measuringCanvas.width = image.naturalWidth;
    measuringCanvas.height = image.naturalHeight;
    const measuringContext = measuringCanvas.getContext('2d', { willReadFrequently: true });
    if (!measuringContext) throw new Error('Walking character canvas is unavailable.');
    measuringContext.drawImage(image, 0, 0);
    const frames = [];
    for (let index = 0; index < WALK_COLUMNS * WALK_ROWS; index++) {
      const cellX = (index % WALK_COLUMNS) * cellWidth;
      const cellY = Math.floor(index / WALK_COLUMNS) * cellHeight;
      const { data } = measuringContext.getImageData(cellX, cellY, cellWidth, cellHeight);
      let left = cellWidth, top = cellHeight, right = -1, bottom = -1;
      for (let y = 0; y < cellHeight; y++) {
        for (let x = 0; x < cellWidth; x++) {
          if (data[(y * cellWidth + x) * 4 + 3] < 16) continue;
          left = Math.min(left, x); right = Math.max(right, x);
          top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
      }
      if (right < left || bottom < top) throw new Error('Walking character sheet has an empty pose.');
      const height = bottom - top + 1;
      const headCenters = [];
      for (let y = top + Math.floor(height * 0.03); y < top + Math.ceil(height * 0.27); y++) {
        let headLeft = cellWidth, headRight = -1;
        for (let x = left; x <= right; x++) {
          if (data[(y * cellWidth + x) * 4 + 3] < 128) continue;
          headLeft = Math.min(headLeft, x); headRight = Math.max(headRight, x);
        }
        if (headRight >= headLeft) headCenters.push((headLeft + headRight) / 2);
      }
      headCenters.sort((a, b) => a - b);
      const anchorX = headCenters.length ? headCenters[Math.floor(headCenters.length / 2)] : (left + right) / 2;
      frames.push({ cellX, cellY, left, top, right, bottom, anchorX, width: right - left + 1, height });
    }
    // A jump may be crouched. Size it like the standing poses rather than
    // enlarging it to occupy the idle character's full height.
    const standingHeight = Math.max(...frames.slice(0, 5).map(frame => frame.height));
    const minLeft = Math.min(...frames.map(frame => frame.left - frame.anchorX));
    const maxRight = Math.max(...frames.map(frame => frame.right - frame.anchorX));
    measuringCanvas.width = measuringCanvas.height = 0;
    return { image, frames, standingHeight, aspectRatio: (maxRight - minLeft + 1) / standingHeight };
  })().catch(error => {
    spriteSheetPromise = undefined;
    throw error;
  });
  return spriteSheetPromise;
}

/** Complete reference-quality poses; x/y is the feet center, time is seconds. */
export async function createPixelPainter() {
  const sheet = await loadWalkerSheet();
  return {
    aspectRatio: sheet.aspectRatio,
    draw(context, { x, y, height, time = 0, pose = 'idle', facing = 1 }) {
      if (!Number.isFinite(height) || height <= 0 || !Number.isFinite(x) || !Number.isFinite(y)) return;
      const tick = Number.isFinite(time) ? Math.floor(Math.max(0, time) * 9) : 0;
      const index = pose === 'run' ? 1 + tick % 4 : pose === 'jump' ? 5 : 0;
      const frame = sheet.frames[index];
      const scale = height / sheet.standingHeight;
      context.save();
      context.imageSmoothingEnabled = false;
      context.translate(Math.round(x), Math.round(y));
      context.scale(facing < 0 ? -1 : 1, 1);
      context.drawImage(sheet.image,
        frame.cellX + frame.left, frame.cellY + frame.top, frame.width, frame.height,
        (frame.left - frame.anchorX) * scale, -frame.height * scale,
        frame.width * scale, frame.height * scale);
      context.restore();
    },
  };
}

/** Four-direction, 24×40 explorer with the same silhouette and proportions. */
export function drawTopDownCharacter(context, { x, y, time = 0, direction = 'down', moving = false, size = 40 }) {
  const step = moving ? Math.floor(time * 9) % 4 : 0;
  const key = `room-${direction}-${moving ? step : "idle"}`;
  let frame = walkerFrames.get(key);
  if (!frame) {
    frame = document.createElement('canvas'); frame.width = 24; frame.height = 40;
    const frameContext = frame.getContext('2d'); if (!frameContext) return;
    const { rect, poly } = pixelArt(frameContext);
    const stride = moving ? [-1, 0, 1, 0][step] : 0;
    const bob = moving && step % 2 === 1 ? -1 : 0;
    const side = direction === 'left' || direction === 'right';
    const leg = (x, offset, rear) => {
      rect('outline',x-1,26,6,11+offset); rect(rear ? 'pantsShade':'pants',x,26,4,10+offset);
      rect('pantsLight',x,28,1,7+offset);
      rect('outline',x-1,35+offset,7,4); rect('shoe',x,35+offset,5,2); rect('sole',x,37+offset,5,1);
      rect('shoeShade',x+2,35+offset,2,1);
    };
    if (side) {
      if (direction === 'left') { frameContext.translate(24, 0); frameContext.scale(-1, 1); }
      leg(8,-stride,true); leg(12,stride,false);
      poly('outline',[[8,16+bob],[15,16+bob],[18,21+bob],[17,28+bob],[8,28+bob],[6,23+bob]]);
      rect('shirt',8,18+bob,8,9); rect('shirtLight',8,20+bob,2,5); rect('shirtShade',9,26+bob,7,2);
      rect('outline',11+stride,20+bob,5,11); rect('shirt',12+stride,21+bob,3,7);
      rect('skin',12+stride,27+bob,3,3); rect('skinLight',12+stride,27+bob,1,2);
      poly('outline',[[8,3+bob],[15,3+bob],[18,6+bob],[18,9+bob],[20,10+bob],[20,12+bob],[18,12+bob],[18,15+bob],[15,17+bob],[11,16+bob],[8,12+bob]]);
      poly('skin',[[12,6+bob],[16,6+bob],[17,9+bob],[19,10+bob],[19,11+bob],[17,11+bob],[17,14+bob],[15,16+bob],[12,15+bob],[10,10+bob]]);
      rect('skinLight',14,7+bob,3,3); rect('skinShade',12,15+bob,3,3);
      rect('outline',15,9+bob,2,1); rect('white',16,10+bob,1,1); rect('outline',17,10+bob,1,1);
      rect('skinDeep',15,13+bob,3,1); rect('white',16,13+bob,2,1);
      poly('hair',[[7,7+bob],[8,4+bob],[11,2+bob],[16,3+bob],[18,5+bob],[18,7+bob],[16,7+bob],[14,5+bob],[12,7+bob],[11,10+bob],[11,14+bob],[8,12+bob]]);
      rect('hairMid',10,4+bob,4,1); rect('hairLight',11,3+bob,3,1); rect('hairMid',8,6+bob,2,4);
      rect('skin',10,10+bob,2,3); rect('skinShade',11,11+bob,1,1);
    } else {
      leg(7,stride,false); leg(13,-stride,true);
      poly('outline',[[8,16+bob],[16,16+bob],[19,19+bob],[20,25+bob],[17,28+bob],[7,28+bob],[4,24+bob],[5,20+bob]]);
      rect('shirt',7,19+bob,10,8); rect('shirtLight',8,20+bob,7,1); rect('shirtShade',8,26+bob,8,2);
      for (const [ax, swing] of [[4,-stride],[17,stride]]) {
        rect('outline',ax,20+bob+swing,4,11); rect('shirt',ax+1,20+bob+swing,2,8);
        rect('skin',ax+1,27+bob+swing,2,3); rect('skinLight',ax+1,27+bob+swing,1,2);
      }
      rect('skinShade',10,15+bob,5,3); rect('skin',11,16+bob,3,2);
      poly('outline',[[7,4+bob],[15,3+bob],[18,6+bob],[18,13+bob],[15,17+bob],[10,17+bob],[6,13+bob],[6,7+bob]]);
      poly('skin',[[8,6+bob],[15,5+bob],[17,8+bob],[17,12+bob],[14,16+bob],[11,16+bob],[7,12+bob],[7,8+bob]]);
      rect('skinLight',9,7+bob,6,5); rect('skinShade',7,11+bob,1,3);
      if (direction !== 'up') {
        rect('outline',8,9+bob,3,1); rect('outline',14,9+bob,3,1);
        rect('white',9,10+bob,2,1); rect('white',14,10+bob,2,1);
        rect('outline',10,10+bob,1,1); rect('outline',15,10+bob,1,1);
        rect('skinShade',12,11+bob,1,2); rect('skinDeep',10,13+bob,5,1);
        rect('white',10,13+bob,4,1); rect('skinLight',11,15+bob,3,1);
      }
      poly('hair',[[6,10+bob],[5,7+bob],[6,4+bob],[9,2+bob],[12,2+bob],[14,1+bob],[18,4+bob],[19,7+bob],[17,9+bob],[15,6+bob],[12,4+bob],[9,7+bob],[7,9+bob],[7,12+bob],[6,12+bob]]);
      rect('hairMid',7,5+bob,3,1); rect('hairLight',9,3+bob,3,1); rect('hairMid',13,3+bob,3,1); rect('hairMid',15,4+bob,2,1);
      if (direction === 'up') {
        poly('hair',[[6,7+bob],[17,6+bob],[18,12+bob],[16,15+bob],[9,15+bob],[6,12+bob]]);
        rect('hairMid',8,7+bob,7,2); rect('hairMid',8,10+bob,2,3); rect('hairShadow',10,14+bob,6,1);
        rect('shirtLight',9,20+bob,6,1); rect('shirtShade',8,24+bob,8,1);
      }
    }
    walkerFrames.set(key, frame);
  }
  context.save(); context.imageSmoothingEnabled = false;
  const width = Math.round(size * 24 / 40);
  context.fillStyle = 'rgba(12,19,25,.18)'; context.fillRect(Math.round(x)-Math.round(width*.4),Math.round(y)-1,Math.round(width*.8),2);
  context.drawImage(frame,Math.round(x-width/2),Math.round(y-size),width,Math.round(size));
  context.restore();
}

/** Keep the approved portrait intact. A tiny greeting and a gentle whole-body
 * lift bring it to life without bending or cutting the original artwork. */
export function mountCompanion(container) {
  const button = container.matches?.('[data-avatar]') ? container : container.querySelector('[data-avatar]');
  if (!button) return () => {};
  const portrait = button.querySelector('img');
  if (portrait && !portrait.getAttribute('src')) portrait.src = PORTRAIT_URL;
  const greeting = document.createElement('span');
  greeting.className = 'companion-greeting'; greeting.textContent = 'Hey there!'; greeting.setAttribute('aria-hidden','true');
  button.append(greeting); button.classList.add('pixel-companion-ready');
  let timer = 0;
  const greet = () => {
    button.classList.add('is-greeting'); window.clearTimeout(timer);
    timer = window.setTimeout(() => button.classList.remove('is-greeting'),2200);
  };
  button.addEventListener('click',greet);
  let paused = false;
  const visibility = () => button.classList.toggle('is-suspended',paused || document.hidden);
  document.addEventListener('visibilitychange',visibility);
  const cleanup = () => {
    window.clearTimeout(timer); button.removeEventListener('click',greet);
    document.removeEventListener('visibilitychange',visibility);
    greeting.remove(); button.classList.remove('pixel-companion-ready','is-greeting','is-suspended');
  };
  cleanup.setPaused = value => { paused = Boolean(value); visibility(); };
  return cleanup;
}
