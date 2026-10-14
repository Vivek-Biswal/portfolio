import './content-sync.js';
// Native links and details remain usable if this small enhancement cannot run.
const root = document.documentElement;
const themeButton = document.querySelector('.theme-toggle');
const themeLabel = document.querySelector('.theme-label');
const themeMeta = document.querySelector('meta[name="theme-color"]');
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
let savedTheme = null;
try { savedTheme = localStorage.getItem('vivek-1d-theme'); } catch { /* Storage may be disabled. */ }
let explicitTheme = savedTheme === 'light' || savedTheme === 'dark';

function setTheme(theme) {
  const dark = theme === 'dark';
  root.dataset.theme = dark ? 'dark' : 'light';
  themeButton.setAttribute('aria-pressed', String(dark));
  themeButton.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
  themeLabel.textContent = dark ? 'Light' : 'Dark';
  themeMeta.setAttribute('content', dark ? '#1d1b22' : '#f7f5f0');
}
setTheme(explicitTheme ? savedTheme : systemTheme.matches ? 'dark' : 'light');
themeButton.hidden = false;
themeButton.addEventListener('click', () => {
  const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  explicitTheme = true;
  setTheme(theme);
  try { localStorage.setItem('vivek-1d-theme', theme); } catch { /* The toggle still works. */ }
});
systemTheme.addEventListener('change', event => {
  if (!explicitTheme) setTheme(event.matches ? 'dark' : 'light');
});

const stops = [...document.querySelectorAll('.stop')];
const links = [...document.querySelectorAll('.waypoints > a')];
const progress = document.querySelector('.progress-fill');
const position = document.querySelector('.position');
const messages = ['You are at the beginning.', 'An idea takes shape.', 'A few thoughts along the way.', 'Let’s keep talking.'];
let pending = false;

function updateJourney() {
  pending = false;
  // Choose the last stop that has crossed the reading line; handles direct hashes too.
  const anchorOffset = Number.parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
  const readingLine = Math.max(anchorOffset + 1, Math.min(window.innerHeight * 0.35, 220));
  let active = 0;
  stops.forEach((stop, index) => { if (stop.getBoundingClientRect().top <= readingLine) active = index; });
  const maxScroll = root.scrollHeight - window.innerHeight;
  const amount = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 1;
  if (amount >= 0.995) active = stops.length - 1;
  stops.forEach((stop, index) => stop.classList.toggle('is-active', index === active));
  links.forEach((link, index) => {
    if (index === active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  progress.style.width = `${amount * 100}%`;
  position.textContent = messages[active];
}
function scheduleUpdate() {
  if (!pending) { pending = true; window.requestAnimationFrame(updateJourney); }
}
document.body.classList.add('is-tracking');
window.addEventListener('scroll', scheduleUpdate, { passive: true });
window.addEventListener('resize', scheduleUpdate);
window.addEventListener('hashchange', scheduleUpdate);
// Toggle does not bubble. Capture it so details inserted by CMS updates are tracked too.
document.addEventListener('toggle', event => {
  if (event.target instanceof HTMLDetailsElement) scheduleUpdate();
}, true);
document.addEventListener('portfolio:content-updated', scheduleUpdate);
window.addEventListener('load', scheduleUpdate, { once: true });
updateJourney();
