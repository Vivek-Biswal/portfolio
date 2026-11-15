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
export function drawOutside(ctx, { width, height, palette, groundOffset = 32 }) {
  const ground = height - groundOffset;
  const sky = palette.wall || '#e5e2ed';
  ctx.save();
  box(ctx, sky, 0, 0, width, height);
  // A hand-placed pixel wallpaper, not a second animation loop. Keep the wide
  // middle quiet for desktop windows and make the lower garden explorable.
  for (let x = 10; x < width; x += 24) {
    for (let y = 12; y < ground - 36; y += 24) {
      box(ctx, '#ffffff24', x, y, 1, 1);
    }
  }
  const cloud = (x, y, size = 1) => {
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(size, size);
    box(ctx, '#ffffff4d', 2, 15, 59, 3);
    box(ctx, '#fffdf4b3', 0, 9, 62, 6); box(ctx, '#fffdf4b3', 8, 4, 44, 6);
    box(ctx, '#fffdf4b3', 18, 0, 22, 6); box(ctx, '#ffffff8c', 20, 1, 14, 2);
    ctx.restore();
  };
  cloud(width * .20, height * .13, .7);
  cloud(width * .53, height * .08, .9);
  cloud(width * .85, height * .25, .6);

  // Distant stair-step hills and scattered miniature houses sit below app content.
  const relief = Math.min(58, height * .16);
  for (let x = -16, i = 0; x < width + 20; x += 24, i++) {
    const top = ground - relief - [4, 9, 18, 24, 18, 10, 6, 12, 19, 12][i % 10];
    box(ctx, '#b7b3cd38', x, top, 25, ground - top);
    box(ctx, '#ffffff20', x, top, 25, 2);
  }
  for (const x of [width * .06, width * .57, width * .94]) {
    const y = ground - relief * .62;
    box(ctx, '#a7a2bb50', x, y, 18, 24);
    box(ctx, '#a7a2bb50', x + 4, y - 4, 10, 4);
    box(ctx, '#f6f1d166', x + 4, y + 6, 3, 4); box(ctx, '#f6f1d166', x + 11, y + 6, 3, 4);
  }
  for (let x = -20, i = 0; x < width + 20; x += 28, i++) {
    const top = ground - 21 - [0, 7, 3, 10, 8, 2][i % 6];
    box(ctx, '#b3bea0', x, top, 29, ground - top);
    box(ctx, '#c6ceb4', x + 4, top - 4, 21, 6);
  }
  box(ctx, '#c8d0ad', 0, ground - 16, width, 18);
  for (let x = 11; x < width; x += 29) {
    box(ctx, '#91a581', x, ground - 10, 2, 5); box(ctx, '#a3b58f', x + 3, ground - 7, 2, 3);
    if (Math.floor(x / 29) % 3 === 0) {
      box(ctx, '#77916e', x + 12, ground - 13, 1, 7);
      box(ctx, '#faf2cb', x + 10, ground - 16, 5, 3); box(ctx, '#d8aa7b', x + 12, ground - 16, 1, 2);
    }
  }
  // A tiny pond and mushrooms reward looking closely, without obstructing walking.
  if (width > 450) {
    const pondX = width * .14;
    box(ctx, '#a3b38b', pondX - 4, ground - 20, 42, 13);
    box(ctx, '#83aaa8', pondX, ground - 19, 34, 9); box(ctx, '#a6ccbf', pondX + 5, ground - 18, 21, 3);
    box(ctx, '#e1ecce', pondX + 9, ground - 16, 9, 1); box(ctx, '#6e9074', pondX + 26, ground - 13, 5, 2);
  }
  for (const x of [width * .28, width * .56, width * .965]) {
    box(ctx, '#eee2c3', x + 3, ground - 10, 3, 7);
    box(ctx, '#ba858b', x, ground - 13, 9, 4); box(ctx, '#ba858b', x + 2, ground - 15, 5, 2);
    box(ctx, '#f8e9cb', x + 2, ground - 12, 2, 1); box(ctx, '#f8e9cb', x + 6, ground - 13, 1, 1);
  }
  // Ground y is the exact locomotion baseline shared with the studio doorway.
  box(ctx, '#7c9274', 0, ground, width, 2);
  box(ctx, '#fff6df', 0, ground + 2, width, groundOffset);
  box(ctx, '#dbd4bc', 0, ground + 5, width, 1);
  for (let x = -9, i = 0; x < width; x += 24, i++) {
    box(ctx, '#e6ddc5', x, ground + 6, 1, Math.min(14, groundOffset - 6));
    box(ctx, '#e6ddc5', x, ground + 19, 24, 1);
    if (i % 4 === 0) box(ctx, '#eee6d0', x + 8, ground + 10, 5, 1);
  }
  ctx.restore();
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
  const rows = [...new Set(cabinets.map(cab => cab.y))].sort((a, b) => a - b);
  const upper = rows[0] ?? 106, lower = rows.at(-1) ?? upper;
  // Derive rails from the actual layout: short screens use one cabinet row.
  for (const y of rows) {
    const selected = cabinets.filter(cab => cab.y === y).sort((a, b) => a.x - b.x);
    const left = Math.max(10, selected[0].x - 38), right = Math.min(width - 10, selected.at(-1).x + 38);
    box(ctx, '#b9bda330', left - 4, y - 79, right - left + 8, 92);
    box(ctx, '#c5b596', left, y - 75, right - left, 3);
    box(ctx, '#f9f1dc', left, y - 74, right - left, 1);
  }
  // Inlaid runner leads visitors naturally from the entrance to the cabinets.
  const rugW = Math.min(150, width * .26), rugX = Math.round((width - rugW) / 2), rugY = Math.max(lower + 8, height - 65);
  box(ctx, '#9ca28b', rugX, rugY, rugW, height - rugY - 9); box(ctx, '#bfbea0', rugX + 3, rugY + 3, rugW - 6, height - rugY - 15);
  box(ctx, '#82917a', rugX + 7, rugY + 7, rugW - 14, 1);
  plant(ctx, 22, Math.min(upper - 60, 82), .8); plant(ctx, width - 22, Math.min(upper - 60, 82), .8);
  plant(ctx, 21, height - 18, .8); plant(ctx, width - 21, height - 18, .8);
  box(ctx, '#506653', width / 2 - 25, height - 10, 50, 10); box(ctx, '#cbd0b5', width / 2 - 22, height - 8, 44, 2);
}
