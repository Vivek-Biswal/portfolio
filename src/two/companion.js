const PORTRAIT_URL = '/2d/vivek-pixel.png';
export {createPixelPainter} from './sprite-painter.js';

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
