const PORTRAIT_URL = '/2d/vivek-pixel.png';
const WALK_WIDTH = 48;
const WALK_HEIGHT = 80;
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

function paintHead(art, bob = 0) {
  const { rect, poly } = art;
  const p = (color, points) => poly(color, points.map(([x, y]) => [x, y + bob]));
  const r = (color, x, y, w, h) => rect(color, x, y + bob, w, h);
  p('outline', [[16,8],[31,6],[36,11],[36,21],[31,26],[24,27],[17,23],[15,17]]);
  p('skinShade', [[18,9],[31,8],[35,11],[35,21],[30,25],[24,25],[19,22],[17,17]]);
  p('skin', [[20,8],[31,9],[34,12],[34,20],[30,24],[25,24],[20,20],[19,13]]);
  p('skinLight', [[22,10],[30,10],[33,13],[32,16],[30,15],[26,16],[21,14]]);
  p('skinBright', [[23,11],[29,11],[31,13],[28,14],[23,13]]);
  r('skinLight',21,18,3,3); r('skinLight',31,18,2,2);
  p('skin', [[15,14],[18,14],[20,18],[18,21],[15,20],[14,16]]);
  r('skinShade',16,16,2,3); r('skinLight',15,15,1,3);
  p('outline', [[20,13],[23,12],[26,13],[26,14],[22,14],[20,14]]);
  p('outline', [[29,13],[33,13],[34,14],[29,14]]);
  r('white',21,15,4,2); r('white',29,15,4,2);
  r('outline',23,15,1,2); r('outline',31,15,1,2);
  r('skinShade',21,17,4,1); r('skinShade',29,17,4,1);
  r('skinShade',27,16,1,3); r('skinDeep',27,19,3,1); r('skinLight',28,17,1,2);
  p('skinDeep', [[22,20],[25,21],[30,21],[33,20],[32,23],[29,24],[25,23]]);
  p('white', [[23,20],[26,21],[30,21],[32,20],[31,23],[27,23],[24,22]]);
  r('skinLight',26,24,4,1);
  p('hairShadow', [[14,15],[12,11],[13,6],[16,3],[20,3],[24,1],[31,2],[35,5],[37,10],[35,15],[33,11],[29,9],[25,6],[21,11],[17,14],[17,18],[15,18]]);
  p('hair', [[14,10],[15,6],[20,4],[24,2],[30,3],[35,6],[35,10],[30,8],[26,5],[24,6],[20,10],[16,13],[15,16]]);
  p('hairMid', [[15,8],[17,5],[21,4],[22,5],[19,7],[16,11],[15,12]]);
  p('hairMid', [[23,3],[28,3],[33,6],[35,7],[35,9],[31,8],[27,5],[24,4]]);
  r('hairLight',24,3,4,1); r('hairLight',29,5,3,1); r('hairLight',17,6,3,1);
  r('hairMid',14,10,1,4); r('hairShadow',17,12,1,5);
}

function paintWalker(context, step, pose) {
  const art = pixelArt(context);
  const { rect, poly } = art;
  const stride = pose === 'run' ? [-1, 0, 1, 0][step] : 0;
  const bob = pose === 'run' && step % 2 === 1 ? -1 : 0;
  const jump = pose === 'jump';
  const frontFoot = jump ? 4 : stride * 5;
  const rearFoot = jump ? -5 : -stride * 5;
  const hem = 49 + bob;

  function leg(hip, foot, rear) {
    const toe = hip + foot + (rear ? 0 : 1);
    const kneeX = hip + Math.round(foot * 0.45);
    const ankleY = jump ? (rear ? 69 : 66) : 74;
    const shade = rear ? 'pantsShade' : 'pants';
    poly('outline', [[hip-5,hem-3],[hip+5,hem-3],[kneeX+4,61],[toe+4,ankleY],[toe-5,ankleY],[kneeX-5,63]]);
    poly(shade, [[hip-4,hem-1],[hip+3,hem-1],[kneeX+3,62],[toe+3,ankleY-1],[toe-4,ankleY-1],[kneeX-4,63]]);
    poly(rear ? 'pants' : 'pantsLight', [[hip-3,hem+1],[hip,hem],[kneeX,61],[kneeX-2,64],[toe-2,ankleY-2],[toe-4,ankleY-2],[kneeX-3,61]]);
    rect('pantsShade',kneeX-2,63,4,1); rect('pantsShade',toe-3,ankleY-3,6,2);
    poly('outline', [[toe-5,ankleY-2],[toe+3,ankleY-2],[toe+5,ankleY+1],[toe+9,ankleY+2],[toe+9,ankleY+5],[toe-5,ankleY+5],[toe-6,ankleY+3]]);
    poly('shoeShade', [[toe-4,ankleY-1],[toe+2,ankleY-1],[toe+4,ankleY+2],[toe+7,ankleY+2],[toe+8,ankleY+4],[toe-4,ankleY+4]]);
    poly('shoe', [[toe-3,ankleY-1],[toe+1,ankleY-1],[toe+3,ankleY+2],[toe+6,ankleY+2],[toe+7,ankleY+3],[toe-3,ankleY+3]]);
    rect('white',toe-2,ankleY,4,1); rect('shoeShade',toe,ankleY+1,3,1);
    rect('sole',toe-4,ankleY+4,12,1);
  }
  leg(27, rearFoot, true);
  leg(20, frontFoot, false);

  // Sleeves are complete contours from shoulder to cuff; the hands overlap.
  function arm(side, swing, behind) {
    const shoulder = side === 'left' ? 15 : 33;
    const elbow = shoulder + (side === 'left' ? -4 : 3) + swing;
    const hand = elbow + (jump ? -2 : -swing);
    const handY = jump ? 42 : 52 + (behind ? -1 : 0);
    poly('outline', [[shoulder-3,28+bob],[shoulder+3,28+bob],[elbow+3,39+bob],[hand+3,handY-3+bob],[hand-3,handY-3+bob],[elbow-3,41+bob]]);
    poly(behind ? 'shirtShade' : 'shirt', [[shoulder-2,29+bob],[shoulder+2,29+bob],[elbow+2,40+bob],[hand+2,handY-4+bob],[hand-2,handY-4+bob],[elbow-2,41+bob]]);
    poly('shirtLight', [[shoulder-2,30+bob],[shoulder,30+bob],[elbow,39+bob],[elbow-2,41+bob],[hand-1,handY-5+bob],[hand-2,handY-5+bob],[elbow-2,39+bob]]);
    rect('seam',hand-2,handY-5+bob,4,1);
    poly('outline', [[hand-3,handY-4+bob],[hand+3,handY-4+bob],[hand+4,handY+3+bob],[hand+2,handY+5+bob],[hand-1,handY+5+bob],[hand-3,handY+2+bob]]);
    poly('skin', [[hand-2,handY-4+bob],[hand+2,handY-4+bob],[hand+3,handY+2+bob],[hand+1,handY+4+bob],[hand-1,handY+3+bob],[hand-2,handY+1+bob]]);
    rect('skinLight',hand-1,handY-3+bob,2,4); rect('skinShade',hand+1,handY+1+bob,1,3);
  }
  arm('right', stride * 3, true);
  poly('outline', [[19,24+bob],[29,24+bob],[29,27+bob],[34,28+bob],[36,35+bob],[33,43+bob],[34,50+bob],[31,52+bob],[17,52+bob],[14,50+bob],[15,43+bob],[12,34+bob],[14,28+bob],[20,26+bob]]);
  poly('shirt', [[18,28+bob],[22,29+bob],[29,28+bob],[33,30+bob],[33,42+bob],[32,48+bob],[30,50+bob],[18,50+bob],[16,48+bob],[17,40+bob],[15,32+bob]]);
  poly('shirtLight', [[17,30+bob],[20,31+bob],[31,30+bob],[32,32+bob],[23,33+bob],[18,32+bob],[18,41+bob],[16,44+bob]]);
  poly('shirtShade', [[30,35+bob],[32,35+bob],[31,43+bob],[33,48+bob],[30,49+bob],[22,48+bob],[20,46+bob],[29,47+bob]]);
  rect('shirtShade',17,49+bob,14,2); rect('seam',18,48+bob,5,1);
  rect('skinShade',21,22+bob,8,6); rect('skin',23,23+bob,5,5);
  poly('outline', [[19,26+bob],[23,28+bob],[29,27+bob],[31,29+bob],[29,30+bob],[23,31+bob],[19,29+bob]]);
  rect('shirtLight',23,29+bob,5,1);
  arm('left', -stride * 3, false);
  paintHead(art, bob);
}

const walkerFrames = new Map();
function walkerFrame(pose, step) {
  const key = `${pose}-${step}`;
  if (walkerFrames.has(key)) return walkerFrames.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = WALK_WIDTH; canvas.height = WALK_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) return null;
  paintWalker(context, step, pose);
  walkerFrames.set(key, canvas);
  return canvas;
}

/** Whole, cached pixel frames; x/y is the feet center and time is seconds. */
export async function createPixelPainter() {
  return {
    aspectRatio: 0.6,
    draw(context, { x, y, height, time = 0, pose = 'idle', facing = 1 }) {
      const framePose = pose === 'run' ? 'run' : pose === 'jump' ? 'jump' : 'idle';
      const step = framePose === 'run' ? Math.floor(time * 9) % 4 : 0;
      const frame = walkerFrame(framePose, step);
      if (!frame || height <= 0) return;
      const width = Math.round(height * WALK_WIDTH / WALK_HEIGHT);
      context.save(); context.imageSmoothingEnabled = false;
      context.translate(Math.round(x), Math.round(y));
      context.scale(facing < 0 ? -1 : 1, 1);
      context.drawImage(frame, -Math.round(width / 2), -Math.round(height), width, Math.round(height));
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
