// Original pixel scenery, drawn on one consistent grid. UI text stays in HTML.
const C = { ink: '#26372f', dark: '#25332f', wood: '#c5ab84', floor: '#ede5d1', green: '#829b78', cream: '#fff9e8' };
function box(ctx, color, x, y, w, h) { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); }
function plant(ctx, x, y, size = 1) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(size, size);
  box(ctx, '#283c3330', -11, 1, 24, 4); box(ctx, '#9f7757', -7, -10, 14, 12); box(ctx, '#d6b792', -9, -12, 18, 4);
  box(ctx, '#607c59', -2, -29, 4, 18); box(ctx, '#81956a', -9, -25, 10, 7); box(ctx, '#526e51', 2, -32, 10, 8);
  box(ctx, '#a0b181', -6, -38, 8, 11); box(ctx, '#769269', -14, -33, 9, 8); box(ctx, '#a0b181', 5, -24, 9, 6);
  ctx.restore();
}
function tree(ctx, x, y, size) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(size, size);
  box(ctx, '#26372f13', -25, -1, 52, 6); box(ctx, '#987b60', -4, -38, 8, 40); box(ctx, '#b39773', -4, -35, 3, 33);
  box(ctx, '#7d957c', -25, -57, 51, 24); box(ctx, '#7d957c', -17, -75, 34, 25); box(ctx, '#7d957c', -8, -83, 16, 12);
  box(ctx, '#9bab8b', -21, -60, 39, 16); box(ctx, '#9bab8b', -13, -73, 28, 20);
  box(ctx, '#b4bc98', -10, -72, 14, 7); box(ctx, '#b4bc98', -19, -57, 12, 5); box(ctx, '#65816d', 6, -41, 14, 6);
  ctx.restore();
}
export function drawOutside(ctx, { width, height, palette, time }) {
  const ground = height - 32;
  box(ctx, palette.wall, 0, 0, width, height);
  // A quiet layered garden, with space above it for the portfolio introduction.
  box(ctx, '#ffffff22', 0, 0, width, height * .55);
  for (let i = 0; i < 5; i++) {
    const x = Math.round((width * .17 + i * width * .25 + Math.sin(time * .045 + i) * 3) % (width + 100)) - 40;
    const y = Math.round(height * .17 + (i % 3) * 22);
    box(ctx, '#fffdf43d', x, y + 6, 50, 8); box(ctx, '#fffdf43d', x + 12, y, 24, 6);
  }
  box(ctx, '#acb5a6', 0, ground - 40, width, 45);
  for (let x = -10; x < width; x += 52) {
    box(ctx, '#bdc4ae', x, ground - 52 - (x % 3) * 4, 48, 28); box(ctx, '#bdc4ae', x + 8, ground - 60 - (x % 3) * 4, 31, 10);
  }
  box(ctx, '#ced2b8', 0, ground - 23, width, 25);
  for (let x = 8; x < width; x += 18) {
    box(ctx, '#9eaf91', x, ground - 8 - (x % 11), 2, 4);
    if (x % 3 === 0) { box(ctx, '#f0d7a2', x + 4, ground - 13, 3, 3); box(ctx, '#8c9f7a', x + 5, ground - 10, 1, 4); }
  }
  tree(ctx, 28, ground - 5, 1.1); if (width > 400) tree(ctx, width * .52, ground - 23, .65);
  tree(ctx, width - 20, ground - 12, .95);
  box(ctx, '#82937e', 0, ground, width, 2); box(ctx, '#f4eedb', 0, ground + 2, width, 30);
  box(ctx, '#fff9e8', 0, ground + 4, width, 2);
  for (let x = -24; x < width; x += 30) { box(ctx, '#d8cfb8', x, ground + 18, 29, 1); box(ctx, '#d8cfb8', x + 18, ground + 3, 1, 15); }
}
export function drawCabinet(ctx, cab, time, selected) {
  const x = cab.x - 23, y = cab.y - 67, accent = cab.color;
  box(ctx, '#26372f20', x + 3, y + 61, 48, 6);
  box(ctx, C.ink, x, y + 3, 46, 60); box(ctx, '#b8b19b', x + 3, y + 5, 40, 56);
  box(ctx, accent, x + 3, y + 5, 4, 53); box(ctx, '#fff9e8', x + 8, y + 4, 30, 3);
  box(ctx, C.ink, x - 1, y, 48, 12); box(ctx, accent, x + 2, y + 2, 42, 7);
  box(ctx, '#fff9e8', x + 7, y + 4, 32, 2); box(ctx, '#ffffff66', x + 7, y + 6, 20, 1);
  box(ctx, C.dark, x + 6, y + 14, 34, 27); box(ctx, '#465e51', x + 8, y + 16, 30, 23);
  box(ctx, '#192a25', x + 9, y + 17, 28, 21);
  const screen = (color, sx, sy, w, h) => box(ctx, color, x + 9 + sx, y + 17 + sy, w, h);
  switch (cab.id) {
    case 'snake': screen('#aac77d', 4, 5, 13, 3); screen('#aac77d', 4, 7, 3, 7); screen('#aac77d', 6, 12, 12, 3); screen('#e9b586', 22, 4, 3, 3); break;
    case 'bricks': for (let i = 0; i < 12; i++) screen(i < 4 ? '#dcad85' : '#e6c88e', 2 + i % 4 * 6, 2 + Math.floor(i / 4) * 4, 5, 3); screen('#f0ead1', 10, 18, 9, 2); screen('#f0ead1', 17, 14, 2, 2); break;
    case 'memory': for (let i = 0; i < 6; i++) { screen(i === 0 || i === 4 ? '#dba993' : '#ad98bb', 3 + i % 3 * 8, 3 + Math.floor(i / 3) * 9, 6, 7); screen('#fff7de', 5 + i % 3 * 8, 5 + Math.floor(i / 3) * 9, 2, 3); } break;
    case 'runner': screen('#abc3ba', 0, 17, 28, 2); screen('#dcc19c', 5, 6, 4, 4); screen('#b5a3c3', 4, 10, 6, 7); screen('#b88074', 21, 12, 3, 5); break;
    case 'pong': screen('#d8e3c0', 2, 4, 2, 9); screen('#d8e3c0', 24, 10, 2, 9); screen('#f0d299', 13 + Math.round(Math.sin(time) * 4), 9, 2, 2); for (let i = 0; i < 5; i++) screen('#85988b', 13, i * 5, 1, 2); break;
    case 'blocks': [[0, 3], [1, 3], [2, 3], [3, 3], [1, 2], [2, 2], [3, 2], [3, 1], [1, 0], [2, 0]].forEach(([a,b],i) => screen(['#b8a2c6','#caa58a','#a9c29b'][i%3], 5 + a * 4, 3 + b * 4, 3, 3)); break;
    case 'maze': screen('#a2b590', 3, 3, 22, 2); screen('#a2b590', 3, 3, 2, 15); screen('#a2b590', 3, 16, 22, 2); screen('#a2b590', 23, 6, 2, 10); screen('#a2b590', 9, 8, 10, 2); screen('#a2b590', 9, 8, 2, 5); screen('#f0d299', 16, 12, 2, 2); break;
  }
  box(ctx, '#fff9e817', x + 9, y + 17, 28, 3);
  box(ctx, C.ink, x + 4, y + 43, 38, 8); box(ctx, '#dfd8c3', x + 5, y + 43, 36, 5);
  box(ctx, C.dark, x + 12, y + 41, 2, 6); box(ctx, '#b9837a', x + 10, y + 40, 5, 3);
  box(ctx, '#9b736a', x + 28, y + 44, 3, 2); box(ctx, '#b89c62', x + 34, y + 44, 3, 2);
  box(ctx, accent, x + 7, y + 52, 32, 7); box(ctx, C.ink, x + 20, y + 53, 7, 3);
  box(ctx, '#d8d1bc', x + 21, y + 54, 5, 1); box(ctx, C.ink, x + 4, y + 61, 8, 3); box(ctx, C.ink, x + 34, y + 61, 8, 3);
  if (selected) { box(ctx, '#ead7a4', x + 1, y + 69, 44, 2); box(ctx, '#ead7a4', x + 11, y + 72, 24, 1); }
}
export function drawRoomBackdrop(ctx, { width, height, cabinets }) {
  box(ctx, '#eae1cd', 0, 0, width, height);
  // Fine board seams keep the large floor calm and consistent with the sprite grid.
  for (let y = 38; y < height; y += 18) {
    box(ctx, y % 36 ? '#e4dac3' : '#e8dfca', 0, y, width, 18);
    box(ctx, '#d8cbb2', 0, y + 17, width, 1);
    for (let x = (y % 36 ? 24 : 0); x < width; x += 72) box(ctx, '#d8cbb2', x, y, 1, 17);
  }
  box(ctx, '#70836f', 0, 0, width, 38); box(ctx, '#a9b6a0', 4, 4, width - 8, 26);
  box(ctx, '#d1dac6', 4, 5, width - 8, 1); box(ctx, '#4c6657', 0, 31, width, 8); box(ctx, '#e1dac3', 0, 39, width, 3);
  box(ctx, '#879480', 0, 0, 5, height); box(ctx, '#879480', width - 5, 0, 5, height);
  box(ctx, '#c4bca3', 5, 43, 5, height - 43); box(ctx, '#c4bca3', width - 10, 43, 5, height - 43);
  const upper = cabinets[0].y, lower = cabinets[4].y;
  for (const [row, y] of [[0,upper],[1,lower]]) {
    const selected = cabinets.slice(row === 0 ? 0 : 4, row === 0 ? 4 : 7);
    const left = selected[0].x - 34, right = selected.at(-1).x + 34;
    box(ctx, '#b9bda330', left - 8, y - 79, right - left + 16, 92);
    box(ctx, '#c5b596', left - 4, y - 75, right - left + 8, 3);
    box(ctx, '#f9f1dc', left - 4, y - 74, right - left + 8, 1);
  }
  // Inlaid runner leads visitors naturally from the entrance to the cabinets.
  const rugW = Math.min(150, width * .26), rugX = Math.round((width - rugW) / 2), rugY = Math.max(lower + 8, height - 65);
  box(ctx, '#9ca28b', rugX, rugY, rugW, height - rugY - 9); box(ctx, '#bfbea0', rugX + 3, rugY + 3, rugW - 6, height - rugY - 15);
  box(ctx, '#82917a', rugX + 7, rugY + 7, rugW - 14, 1);
  plant(ctx, 22, Math.min(upper - 60, 82), .8); plant(ctx, width - 22, Math.min(upper - 60, 82), .8);
  plant(ctx, 21, height - 18, .8); plant(ctx, width - 21, height - 18, .8);
  box(ctx, '#506653', width / 2 - 25, height - 10, 50, 10); box(ctx, '#cbd0b5', width / 2 - 22, height - 8, 44, 2);
}
