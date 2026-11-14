import {escapeHtml as e} from '../shared/content.js';
import {signatureHtml} from '../shared/signature.js';

const spark='<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 6v88M6 50h88M19 19l62 62M19 81l62-62" fill="none" stroke="currentColor" stroke-width="16"/></svg>';

/** Native radios keep the poster remixable even before JavaScript loads. */
export function portraitPlaygroundHtml(name,portrait){
  if(!portrait)return '';
  return `<div class="portrait-playground" data-composition="portrait">
    <div class="playground-heading"><span><i aria-hidden="true"></i> A LITTLE OFF-CENTRE.</span><span>PERSONAL EDITION / 02</span></div>
    <div class="playground-canvas" id="portrait-artwork">
      <div class="playground-grid" aria-hidden="true"></div>
      <div class="portrait-drift">
        <span class="poster-orbit orbit-back" aria-hidden="true"></span><span class="poster-orbit orbit-front" aria-hidden="true"></span>
        <div class="poster-words" aria-hidden="true"><span class="words-portrait">HUMAN<br><em>after all.</em></span><span class="words-play">a little<br><em>offbeat.</em></span><span class="words-signed">Still<br><em>me.</em></span></div>
        <div class="poster-paper paper-lime" aria-hidden="true"><span>NOT EVERYTHING<br>NEEDS A STRAIGHT LINE.</span></div>
        <div class="poster-paper paper-lilac" aria-hidden="true"><span>MAKE<br>SOMETHING<br><b>unexpected.</b></span></div>
        <figure class="remix-photo"><div class="remix-image"><img src="${e(portrait)}" width="400" height="480" alt="${e(name)}" fetchpriority="high" /></div><figcaption><span>${e(name)}</span><span aria-hidden="true">ONE OF ONE ↗</span></figcaption></figure>
        <span class="poster-spark" aria-hidden="true">${spark}</span>
        <span class="poster-stamp" aria-hidden="true">STAY<br><em>curious.</em><b>↗</b></span>
        <div class="poster-autograph"><span>THE ORIGINAL.</span>${signatureHtml(name)}<small>A PERSONAL MARK</small></div>
        <span class="poster-doodle" aria-hidden="true"><svg viewBox="0 0 250 170" fill="none"><path d="M8 122C48 152 104 28 160 48S176 154 126 117 199 60 235 21M208 25l28-7-7 27" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      </div>
      <span class="canvas-coordinate" aria-hidden="true">NO PERFECT ANGLES.<br>JUST A POINT OF VIEW.</span>
    </div>
    <div class="playground-controls"><fieldset class="composition-options"><legend>Change the mood</legend>${[['portrait','Portrait'],['play','Play'],['signed','Signed']].map(([value,title],index)=>`<label><input type="radio" name="portrait-composition" id="portrait-mode-${value}" value="${value}"${index===0?' checked':''} aria-controls="portrait-artwork" /><span><small aria-hidden="true">0${index+1}</small>${title}</span></label>`).join('')}</fieldset><button type="button" class="portrait-remix" id="portrait-remix" aria-controls="portrait-artwork" hidden><span>Remix</span><b aria-hidden="true">↻</b></button></div>
    <p class="playground-announcement sr-only" role="status" aria-live="polite" aria-atomic="true"></p>
  </div>`;
}
