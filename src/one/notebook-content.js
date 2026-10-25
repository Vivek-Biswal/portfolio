import {escapeHtml as e, paragraphs, noteHref} from '../shared/content.js';

export function renderLineNotebook(content, selection) {
  const index=selection?.kind==='note'?content.notes.findIndex(note=>note.id===selection.id):-1;
  if(selection?.kind!=='now'&&index<0)return null;
  const now=selection.kind==='now';
  const note=now?content.now:content.notes[index];
  const total=content.notes.length;
  const copy=now?[note.introduction,...note.sections.flatMap(section=>section.paragraphs)]:note.paragraphs;
  const minutes=Math.max(1,Math.ceil(copy.join(' ').split(/\s+/).filter(Boolean).length/200));
  const number=String(index+1).padStart(2,'0');
  const previous=index>0?content.notes[index-1]:null;
  const next=index>=0&&index<total-1?content.notes[index+1]:null;
  return `<header class="notebook-toolbar"><p id="notebook-label">${e(content.profile.name.split(' ')[0])}’s notebook<span>02 / Notes & ideas</span></p><button type="button" class="notebook-close" data-notebook-close aria-label="Close notebook"><span aria-hidden="true">×</span><span>Close</span></button></header><div class="notebook-layout"><nav class="notebook-index" aria-label="Notebook contents"><p class="small-label">A few things on my mind</p>${content.notes.map((item,i)=>`<a href="${noteHref(item,'2d')}" data-line-note="${e(item.id)}"${!now&&i===index?' aria-current="page"':''}><span>${String(i+1).padStart(2,'0')}</span><span>${e(item.title)}</span></a>`).join('')}<a class="notebook-now" href="/2d/#now" data-line-now${now?' aria-current="page"':''}><span aria-hidden="true">↗</span><span>What I’m working on now</span></a><p class="notebook-colophon">Same thoughts.<br/>A different perspective.</p></nav><div class="notebook-page" data-notebook-page><article><p class="notebook-meta">${now?'An update from my desk':`Note ${number} / ${String(total).padStart(2,'0')}`}<span>${minutes} min read</span></p><h1 id="notebook-title" tabindex="-1">${e(note.title)}</h1><p class="notebook-lede">${e(now?note.introduction:note.summary)}</p><div class="notebook-prose">${now?note.sections.map(section=>`<h2>${e(section.heading)}</h2>${paragraphs(section.paragraphs)}`).join(''):paragraphs(note.paragraphs)}</div></article><nav class="notebook-pagination" aria-label="More notes"><button type="button" data-notebook-close>← Back to ideas</button>${next?`<a href="${noteHref(next,'2d')}" data-line-note="${e(next.id)}"><small>Up next</small><span>${e(next.title)} <span aria-hidden="true">→</span></span></a>`:previous?`<a href="${noteHref(previous,'2d')}" data-line-note="${e(previous.id)}"><small>Previous note</small><span>${e(previous.title)} <span aria-hidden="true">←</span></span></a>`:''}</nav></div></div>`;
}
