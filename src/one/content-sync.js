import { subscribeContent } from '../shared/public-client.js';
import { renderPublic } from '../../server/render-public.mjs';

function focusedReplacement(target, source) {
  const active = document.activeElement;
  if (active === target || !target.contains(active)) return null;
  if (active.id) {
    const replacement = [...source.querySelectorAll('[id]')].find(element => element.id === active.id);
    if (replacement) return replacement;
  }
  if (active.tagName === 'SUMMARY' && active.parentElement?.id) {
    const detail = [...source.querySelectorAll('details[id]')].find(element => element.id === active.parentElement.id);
    if (detail) return detail.querySelector('summary');
  }
  if (active.tagName === 'A') {
    const href = active.getAttribute('href');
    const matching = [...source.querySelectorAll('a[href]')].filter(element => element.getAttribute('href') === href);
    return matching.find(element => element.textContent === active.textContent) || matching[0] || source;
  }
  return source;
}

function replaceContent(target, source) {
  // Stable detail IDs let readers keep their place while the shared content refreshes.
  const detailStates = new Map([...target.querySelectorAll('details[id]')].map(detail => [detail.id, detail.open]));
  for (const detail of source.querySelectorAll('details[id]')) {
    if (detailStates.has(detail.id)) detail.open = detailStates.get(detail.id);
  }
  if (target.innerHTML === source.innerHTML) return;
  const replacement = focusedReplacement(target, source);
  // Moving the parsed nodes keeps the replacement reference intact for focus restoration.
  target.replaceChildren(...source.childNodes);
  if (replacement) {
    const destination = replacement === source ? target : replacement;
    const previousTabIndex = destination.getAttribute('tabindex');
    if (destination === target) destination.setAttribute('tabindex', '-1');
    destination.focus({ preventScroll: true });
    if (destination === target) {
      if (previousTabIndex === null) destination.removeAttribute('tabindex');
      else destination.setAttribute('tabindex', previousTabIndex);
    }
  }
}

subscribeContent(content=>{
  const next=new DOMParser().parseFromString(renderPublic(document.documentElement.outerHTML,'2d',content),'text/html');
  for(const id of ['hello','work','ideas','contact']) {
    const target=document.getElementById(id),source=next.getElementById(id);
    if(target&&source)replaceContent(target,source);
  }
  document.title=next.title;
  for(const selector of ['.signature','.footer','meta[name="description"]']) {
    const target=document.querySelector(selector),source=next.querySelector(selector);
    if(target&&source) {
      if(target.tagName==='META')target.setAttribute('content',source.getAttribute('content'));
      else replaceContent(target,source);
    }
  }
  document.dispatchEvent(new CustomEvent('portfolio:content-updated',{detail:{content}}));
});
