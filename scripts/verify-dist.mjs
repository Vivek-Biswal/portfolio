import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const pages = {'index.html':'index', '1d/index.html':'1d', '2d/index.html':'2d', '3d/index.html':'3d',
  'work/dimensional-portfolio.html':'project', 'work/now.html':'now', 'work/notes.html':'notes'};
const routes = Object.keys(pages);
const serverOnly = process.env.VERCEL === '1' || process.argv.includes('--server-only');
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
const rewrites = vercel.rewrites;
const expectedRewrites = {
  '/':'/api/portfolio?action=public&page=index',
  '/1d/':'/api/portfolio?action=public&page=1d',
  '/2d/':'/api/portfolio?action=public&page=2d',
  '/3d/':'/api/portfolio?action=public&page=3d',
  ...Object.fromEntries(Object.entries(pages).map(([file, key])=>['/'+file, '/api/portfolio?action=public&page='+key])),
  '/0d/vivek-biswal.txt':'/api/portfolio?action=profile',
  '/0d/vivek-biswal.vcf':'/api/portfolio?action=contact-card',
};
if (serverOnly) {
  assert.equal(vercel.functions?.['api/portfolio.js']?.includeFiles, 'server/generated/**', 'Hosted portfolio function must bundle the CMS templates');
  for (const [source, destination] of Object.entries(expectedRewrites)) {
    assert.ok(rewrites.some(rule=>rule.source===source && rule.destination===destination), `Hosted CMS route ${source} must rewrite to ${destination}`);
  }
  for (const route of [...routes, '0d/vivek-biswal.txt', '0d/vivek-biswal.vcf']) {
    assert.ok(!existsSync(join('dist', route)), `${route} would shadow the hosted CMS rewrite`);
  }
}
const pageHtml = route => readFileSync(serverOnly ? join('server/generated', pages[route]+'.html') : join('dist', route), 'utf8');
function verifyUrl(url, source) {
  const clean = url.split(/[?#]/)[0];
  if (!clean.startsWith('/') || clean.startsWith('//')) return;
  if (clean === '/api/portfolio') {
    assert.ok(existsSync('api/portfolio.js'), `${source} references a missing portfolio API function`);
    return;
  }
  if (serverOnly && Object.hasOwn(expectedRewrites, clean)) return;
  const target = clean.endsWith('/') ? `${clean}index.html` : clean;
  assert.ok(existsSync(join('dist', target)), `${source} references missing ${clean}`);
}
for (const route of routes) {
  assert.ok(existsSync(join('server/generated', pages[route]+'.html')), `${route} has no packaged server template`);
  const html = pageHtml(route);
  for (const [, url] of html.matchAll(/(?:src|href)="([^"\s]+)"/g)) verifyUrl(url, route);
}
for (const route of ['index.html', '1d/index.html']) {
  assert.ok(!/<script\b/i.test(pageHtml(route)), '1D essentials must stay script-free');
}
assert.ok(pageHtml('2d/index.html').includes('class="journey"'), '2D must serve the guided line');
assert.ok(pageHtml('3d/index.html').includes('class="workspace"'), '3D must serve the pixel desktop');
assert.ok(!existsSync('dist/archive/character-world/index.html'), 'Archived character entry must not be published');
for (const route of routes) {
  const html = pageHtml(route);
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
for (const [file, html] of [
  ['admin/login/index.html', readFileSync('dist/admin/login/index.html', 'utf8')],
  ['server/generated/admin.html', readFileSync('server/generated/admin.html', 'utf8')],
]) {
  for (const [, url] of html.matchAll(/(?:src|href)="([^"\s]+)"/g)) verifyUrl(url, file);
}
if (serverOnly) {
  assert.ok(rewrites.some(rule=>rule.source==='/admin/' && rule.destination==='/api/portfolio?action=admin-page'), 'Hosted dashboard must use the protected server route');
}
for(const route of routes) {
  const html=pageHtml(route);
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
console.log(`Verified three public worlds, seven ${serverOnly?'server-rendered':'static'} pages, script-free 1D, local assets, protected dashboard, excluded character scene and dependency lockfile${serverOnly?', and unshadowed CMS rewrites':''}.`);
