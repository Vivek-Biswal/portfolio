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
assert.ok(!/<script\b/i.test(readFileSync('dist/index.html', 'utf8')), '0D must stay script-free');
for (const file of readdirSync('dist/assets')) {
  if (!/\.(js|css)$/.test(file)) continue;
  const source = readFileSync(join('dist/assets', file), 'utf8');
  for (const [url] of source.matchAll(/\/(?:images|models|draco|0d|2d)\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp|svg|hdr|glb|enc|wasm|vcf|txt|ttf|woff2?)/g)) verifyUrl(url, file);
  assert.ok(!source.includes('gsap-trial'), `${file} contains a trial plugin`);
}
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
assert.deepEqual(pkg.dependencies, lock.packages[''].dependencies, 'Lockfile dependencies differ');
assert.deepEqual(pkg.devDependencies, lock.packages[''].devDependencies, 'Lockfile devDependencies differ');
assert.ok(!pkg.dependencies['gsap-trial'], 'Remove trial animation plugins before deployment');
console.log('Verified seven production pages, local asset references, script-free 0D and dependency lockfile.');
