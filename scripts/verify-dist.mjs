import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const routes = ['index.html', '1d/index.html', '2d/index.html', '3d/index.html',
  'work/dimensional-portfolio.html', 'work/now.html', 'work/notes.html'];
function verifyUrl(url, source) {
  const clean = url.split(/[?#]/)[0];
  if (!clean.startsWith('/') || clean.startsWith('//')) return;
  const target = clean.endsWith('/') ? `${clean}index.html` : clean;
  assert.ok(existsSync(join('dist', target)), `${source} references missing ${clean}`);
}
for (const route of routes) {
  const html = readFileSync(join('dist', route), 'utf8');
  for (const [, url] of html.matchAll(/(?:src|href)="([^"\s]+)"/g)) verifyUrl(url, route);
}
for (const route of ['index.html', '1d/index.html']) {
  assert.ok(!/<script\b/i.test(readFileSync(`dist/${route}`, 'utf8')), '1D essentials must stay script-free');
}
assert.ok(readFileSync('dist/2d/index.html', 'utf8').includes('class="journey"'), '2D must serve the guided line');
assert.ok(readFileSync('dist/3d/index.html', 'utf8').includes('class="workspace"'), '3D must serve the pixel desktop');
assert.ok(!existsSync('dist/archive/character-world/index.html'), 'Archived character entry must not be published');
for (const route of routes) {
  const html = readFileSync(`dist/${route}`, 'utf8');
  assert.ok(!/\b0D\b|character-led|3D experiment|3D prototype/.test(html), `${route} promotes a retired world`);
}
for (const file of readdirSync('dist/assets')) {
  if (!/\.(js|css)$/.test(file)) continue;
  const source = readFileSync(join('dist/assets', file), 'utf8');
  for (const [url] of source.matchAll(/\/(?:images|models|draco|0d|2d|fonts)\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp|svg|hdr|glb|enc|wasm|vcf|txt|ttf|woff2?)/g)) verifyUrl(url, file);
  assert.ok(!source.includes('gsap-trial'), `${file} contains a trial plugin`);
  assert.ok(!source.includes('character.glb'), `${file} bundles the retired character scene`);
}
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
assert.ok(existsSync('dist/admin/login/index.html'), 'Hidden login page must be built');
assert.ok(!existsSync('dist/admin/dashboard/index.html'), 'Dashboard HTML must never be published as a static file');
assert.ok(existsSync('server/generated/admin.html'), 'Protected dashboard template must be packaged for the server');
for(const route of routes) {
  const html=readFileSync(join('dist',route),'utf8');
  assert.ok(!/href="\/admin/.test(html), 'Public pages must not link to admin');
  assert.ok(!html.includes('BEGIN PRIVATE KEY'), 'Private credentials must never appear in public HTML');
}
for(const file of readdirSync('dist/assets')) {
  if(file.endsWith('.js'))assert.ok(!readFileSync(join('dist/assets',file),'utf8').includes('BEGIN PRIVATE KEY'), 'Private credentials must never appear in browser bundles');
}
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
assert.deepEqual(pkg.dependencies, lock.packages[''].dependencies, 'Lockfile dependencies differ');
assert.deepEqual(pkg.devDependencies, lock.packages[''].devDependencies, 'Lockfile devDependencies differ');
assert.ok(!pkg.dependencies['gsap-trial'], 'Remove trial animation plugins before deployment');
console.log('Verified three public worlds, seven pages, preserved script-free 1D, local assets, excluded character scene and dependency lockfile.');
