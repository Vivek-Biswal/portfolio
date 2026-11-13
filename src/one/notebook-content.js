import {escapeHtml as e, paragraphs, noteHref} from '../shared/content.js';
import {noteArtwork,notePalette} from './note-art.js';

export function renderLineNotebook(content, selection) {
  const index=selection?.kind==='note'?content.notes.findIndex(note=>note.id===selection.id):-1;
  if(selection?.kind!=='now'&&index<0)return null;
  const now=selection.kind==='now',note=now?content.now:content.notes[index];
  const total=content.notes.length,artId=now?'current-work':note.id;
  const palette=notePalette(artId);
  const copy=now?[note.introduction,...note.sections.flatMap(section=>section.paragraphs)]:note.paragraphs;
  const minutes=Math.max(1,Math.ceil(copy.join(' ').split(/\s+/).filter(Boolean).length/200));
  const number=String(index+1).padStart(2,'0');
  const previous=index>0?content.notes[index-1]:null;
  const next=now?content.notes[0]:index<total-1?content.notes[index+1]:null;
  const adjacent=next||previous;
  const prose=now?note.sections.map(section=>`<h2>${e(section.heading)}</h2>${paragraphs(section.paragraphs)}`).join(''):paragraphs(note.paragraphs);
  return `<header class="notebook-toolbar">
    <p id="notebook-label" class="notebook-brand">offscript<span aria-hidden="true">.</span><small>NOTES FROM ${e(content.profile.name.toUpperCase())}</small></p>
    <span class="notebook-edition" aria-hidden="true">A LITTLE THINKING<br>OUTSIDE THE LINES. ↗</span>
    <button type="button" class="notebook-close" data-notebook-close aria-label="Close notebook"><span>Back to ideas</span><span aria-hidden="true">×</span></button>
  </header>
  <div class="notebook-layout">
    <nav class="notebook-index" aria-label="Notebook contents"><p class="small-label">THE INDEX <span aria-hidden="true">↳</span></p><div class="notebook-index-links">${content.notes.map((item,i)=>`<a href="${noteHref(item,'2d')}" data-line-note="${e(item.id)}"${!now&&i===index?' aria-current="page"':''}><span>${String(i+1).padStart(2,'0')}</span><span>${e(item.title)}</span><span class="notebook-index-arrow" aria-hidden="true">↗</span></a>`).join('')}<a class="notebook-now" href="/2d/#now" data-line-now${now?' aria-current="page"':''}><span aria-hidden="true">↗</span><span>What I’m working on now</span></a></div></nav>
    <div class="notebook-page" data-notebook-page style="--edition-paper:${palette.paper};--edition-ink:${palette.ink};--edition-accent:${palette.accent}">
      <article>
        <div class="notebook-cover">
          <div class="notebook-cover-copy"><p class="notebook-meta"><span>${now?'FROM MY DESK':`FIELD NOTE ${number} / ${String(total).padStart(2,'0')}`}</span><span>${minutes} MIN READ</span></p><h1 id="notebook-title" tabindex="-1">${e(note.title)}</h1><p class="notebook-lede">${e(now?note.introduction:note.summary)}</p><span class="notebook-cover-foot" aria-hidden="true"><span>THOUGHTS IN MOTION.</span><span>READ ON ↓</span></span></div>
          <div class="notebook-cover-art" aria-hidden="true"><span class="notebook-cover-number">${now?'↗':number}</span>${noteArtwork(artId,{className:'notebook-cover-svg'})}<span class="notebook-art-label">AN OPEN MIND / AN OPEN PAGE</span></div>
        </div>
        <div class="notebook-reading-sheet"><aside class="notebook-margin" aria-label="Author"><span class="notebook-margin-label">THE NOTE</span><p>By ${e(content.profile.name)}</p><span class="notebook-margin-doodle" aria-hidden="true">&amp;</span></aside><div class="notebook-prose">${prose}<span class="notebook-end-mark" aria-hidden="true">✳</span></div></div>
      </article>
      <nav class="notebook-pagination" aria-label="More notes"><button type="button" data-notebook-close><span aria-hidden="true">↖</span> Back to all ideas</button>${adjacent?`<a class="notebook-next-card" href="${noteHref(adjacent,'2d')}" data-line-note="${e(adjacent.id)}"><span class="notebook-next-art" aria-hidden="true">${noteArtwork(adjacent.id,{className:'notebook-next-svg'})}</span><span class="notebook-next-copy"><small>${next?'TURN THE PAGE':'ANOTHER PERSPECTIVE'}</small><strong>${e(adjacent.title)}</strong></span><span class="notebook-next-arrow" aria-hidden="true">↗</span></a>`:'<span class="notebook-signoff">More thoughts, soon.</span>'}</nav>
    </div>
  </div>`;
}
