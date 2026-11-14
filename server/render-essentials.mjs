import {escapeHtml as e, paragraphs, noteHref} from '../src/shared/content.js';
import {contactRowsHtml, contactMeta, bookingNote, projectLinksHtml} from '../src/shared/contact.js';
import {signatureHtml} from '../src/shared/signature.js';

const number=value=>String(value).padStart(2,'0');
const sectionTitle=(index,title,id)=>`<h2 class="folio-heading" id="${id}"><span class="folio-number" aria-hidden="true">${number(index)} /</span><span>${e(title)}</span></h2>`;
const skills=items=>items.length?`<h3 class="tools-label">A few familiar tools</h3><ul class="inline-list" aria-label="Project technologies">${items.map(item=>`<li>${e(item)}</li>`).join('')}</ul>`:'';
const foldLabel=(closed,open)=>`<span class="when-closed">${closed}</span><span class="when-open">${open}</span>`;
const inkLoop='<svg class="ink-loop" viewBox="0 0 100 70" fill="none" aria-hidden="true"><path pathLength="1" d="M4 52C45 7 82 2 88 22S45 64 35 44 61 10 73 29 80 68 97 48" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const helloLetters='<span class="letter-hello" role="img" aria-label="Hello."><span aria-hidden="true">H</span><span aria-hidden="true">e</span><span aria-hidden="true">l</span><span aria-hidden="true">l</span><span aria-hidden="true">o</span><span class="hello-stop" aria-hidden="true">.</span></span>';
const envelopeFlap='<svg class="letter-flap" viewBox="0 0 800 210" preserveAspectRatio="none" aria-hidden="true"><path d="M0 1H800L400 203Z"/></svg>';

export function essentialsIntro(c){
  const first=c.profile.name.trim().split(/\s+/)[0];
  return `<div class="intro-copy"><p class="eyebrow">A small space. An open mind.</p>
    <h1 id="intro-title">Hello,<br>I'm <span class="ink-name">${e(first)}<span class="full-stop">.</span></span></h1>
    <p class="lead intro-motto">A little work.<br><em>A little wonder.</em></p>
    <details class="hello-context quiet-fold"><summary>${foldLabel('Behind the hello','A little less')}<span class="fold-glyph" aria-hidden="true">+</span></summary><div class="quiet-fold-body"><p>${e(c.profile.headline)}</p><p>${e(c.profile.introduction)}</p></div></details>
    <p class="intro-links"><a href="#work">Take a look <span aria-hidden="true">↘</span></a><a href="#contact">Leave a hello <span aria-hidden="true">↘</span></a></p></div>
    <figure class="portrait"><details class="portrait-print"><summary aria-label="Turn the portrait over: a small note from ${e(c.profile.name)}">
      <span class="portrait-photo"><span class="print-mark" aria-hidden="true">FIG. 01 <span>THE HUMAN</span></span><img src="${e(c.profile.dottedPortrait||c.profile.portrait)}" width="1254" height="1254" alt="${e(c.profile.name)}" fetchpriority="high" /></span>
      <span class="portrait-toggle"><span class="turn-front">Turn over <b aria-hidden="true">↗</b></span><span class="turn-back">Turn back <b aria-hidden="true">↶</b></span></span>
    </summary><div class="portrait-reverse"><span class="eyebrow">A NOTE ON THE BACK</span><p>Still me.<br><em>Just the other side.</em></p><span class="reverse-rule" aria-hidden="true"></span><div class="portrait-signoff"><span class="portrait-status">${e(c.profile.status)}</span><span class="reverse-signature">${signatureHtml(c.profile.name)}</span></div></div></details>
    <figcaption>${e(c.profile.portraitCaption)}</figcaption></figure>`;
}

function projects(c,expanded=false){
  if(!expanded)return c.projects.map((p,i)=>{
    // The structured project is already here; don't send 1D readers to a second
    // portfolio page. Real demos and source repositories keep their destinations.
    const links=projectLinksHtml({...p,url:/^\/work(?:\/|$)/.test(p.url||'')?'':p.url});
    return `<details class="inline-project" id="project-${e(p.id)}"><summary class="entry-summary"><span class="entry-number" aria-hidden="true">${number(i+1)}</span><span class="entry-copy"><strong>${e(p.title)}</strong><span class="entry-meta">${e([p.category,p.year].filter(Boolean).join(' · '))}</span><span class="entry-action">${foldLabel('View project','Close project')}</span></span><span class="entry-toggle" aria-hidden="true">+</span></summary><div class="inline-body project-body"><p class="proof-summary">${e(p.summary)}</p>${p.image?`<img class="project-image" src="${e(p.image)}" alt="${e(p.title)}" loading="lazy" />`:''}${p.details?`<p>${e(p.details)}</p>`:''}${p.tags.length?`<ul class="project-tags" aria-label="Project tools">${p.tags.map(tag=>`<li>${e(tag)}</li>`).join('')}</ul>`:''}${links}</div></details>`;
  }).join('')||'<p class="empty-message">A blank page. Something will find its way here.</p>';
  return c.projects.map((p,i)=>`<article class="project"><div class="project-heading"><span class="project-index" aria-hidden="true">${number(i+1)}</span><h3>${p.url?`<a href="${e(p.url)}">${e(p.title)}</a>`:e(p.title)}</h3><span class="small project-meta">${e([p.category,p.year].filter(Boolean).join(' · '))}</span></div>
    <details class="project-proof"${expanded?' open':''}><summary>${foldLabel('Unfold the work','Fold it away')}<span class="paper-corner" aria-hidden="true">↗</span></summary><div class="project-proof-body"><p class="proof-summary">${e(p.summary)}</p>${p.image?`<img class="project-image" src="${e(p.image)}" alt="${e(p.title)}" loading="lazy" />`:''}${p.details?`<p>${e(p.details)}</p>`:''}${p.tags.length?`<ul class="project-tags" aria-label="Project tools">${p.tags.map(tag=>`<li>${e(tag)}</li>`).join('')}</ul>`:''}</div></details>${projectLinksHtml(p)}</article>`).join('')||'<p class="empty-message">A blank page. Something will find its way here.</p>';
}

function inlineNotes(c){
  if(!c.notes.length)return '<p class="empty-message">No notes yet. Leaving a page open for the next idea.</p>';
  return `<ol class="inline-notes">${c.notes.map((n,i)=>`<li><details class="inline-note" id="note-${e(n.id)}"><summary class="entry-summary"><span class="entry-number" aria-hidden="true">${number(i+1)}</span><span class="entry-copy"><strong>${e(n.title)}</strong><span class="entry-description">${e(n.summary)}</span><span class="entry-action">${foldLabel('Read note','Close note')}</span></span><span class="entry-toggle" aria-hidden="true">+</span></summary><div class="inline-body note-body">${paragraphs(n.paragraphs)}<span class="note-end" aria-hidden="true">—</span></div></details></li>`).join('')}</ol>`;
}

function currentWork(c){
  return `<details class="desk-fold" id="now"><summary class="entry-summary"><span class="status-dot" aria-hidden="true"></span><span class="entry-copy"><strong>Still on my desk</strong><span class="entry-action">${foldLabel('A look at what’s next','Close desk notes')}</span></span><span class="entry-toggle" aria-hidden="true">+</span></summary><div class="inline-body desk-body"><h3>${e(c.now.title)}</h3><p class="desk-introduction">${e(c.now.introduction)}</p>${c.now.sections.map(s=>`<article class="desk-entry"><h4>${e(s.heading)}</h4>${paragraphs(s.paragraphs)}</article>`).join('')}</div></details>`;
}

function readingList(c,local=false){
  return c.notes.length?`<ol class="reading-list">${c.notes.map((n,i)=>`<li><a href="${local?'#'+encodeURIComponent(n.id):noteHref(n)}"><span class="reading-number" aria-hidden="true">${number(i+1)}</span><span class="reading-copy"><strong>${e(n.title)}</strong><span>${e(n.summary)}</span></span><span class="reading-arrow" aria-hidden="true">↗</span></a></li>`).join('')}</ol>`:'<p class="empty-message">No notes yet. Leaving a page open for the next idea.</p>';
}

export function essentialsSections(c){
  return {
    about:sectionTitle(1,'A few words.','about-title')+`<div class="section-body about-body">${inkLoop}<p class="about-essence">Curious by nature.<br><em>Careful by choice.</em></p>${c.about.paragraphs.length||c.skills.length?`<details class="about-fold quiet-fold"><summary>${foldLabel('Between the lines','Back to the essentials')}<span class="fold-glyph" aria-hidden="true">+</span></summary><div class="quiet-fold-body margin-note">${paragraphs(c.about.paragraphs)}${skills(c.skills)}</div></details>`:''}</div>`,
    work:sectionTitle(2,'Things made.','work-title')+`<div class="section-body">${projects(c)}</div>`,
    notes:sectionTitle(3,'Loose thoughts.','notes-title')+`<div class="section-body notes-body">${inlineNotes(c)}${currentWork(c)}</div>`,
    contact:sectionTitle(4,'Leave a line.','contact-title')+`<div class="section-body contact-body"><details class="contact-letter"><summary><span class="letter-face">${envelopeFlap}<span class="letter-to">TO ${e(c.profile.name.toUpperCase())}</span>${helloLetters}<span class="letter-postmark" aria-hidden="true">↗</span><span class="letter-caption" aria-hidden="true">Good things start here.</span></span><span class="letter-toggle">${foldLabel('Open a line','Fold the letter')}<span aria-hidden="true">↗</span></span></summary><div class="letter-inside"><h3>${e(c.contact.heading)}</h3><p class="contact-introduction">${e(c.contact.message)}</p>${contactRowsHtml(c)}${bookingNote(c)}${contactMeta(c)?`<p class="contact-meta">${e(contactMeta(c))}</p>`:''}${c.contact.phone?`<p class="contact-meta">${e(c.contact.phone)}</p>`:''}<p class="intro-links">${c.contact.contactCardUrl?`<a href="${e(c.contact.contactCardUrl)}">Save contact <span aria-hidden="true">↓</span></a>`:''}${c.contact.resumeUrl?`<a href="${e(c.contact.resumeUrl)}">Download profile <span aria-hidden="true">↓</span></a>`:''}</p><div class="letter-signoff"><span>A conversation, then who knows.</span>${signatureHtml(c.profile.name)}</div></div></details><details class="small-print"><summary>The small print <span aria-hidden="true">*</span></summary><p>No fine print.<br>Just glad you stopped by.</p></details></div>`,
  };
}

export function essentialsArticle(c,page){
  const back='<a class="back-link" href="/1d/">← Back to the essentials</a>';
  const body=page==='notes'?`<header class="reader-heading"><p class="eyebrow">THE QUIET EDITION / NOTEBOOK</p><h1>Notes,<br><em>in the margins.</em></h1><p class="lead">A little thinking out loud.</p></header><nav class="reader-index" aria-label="Notes in this notebook">${readingList(c,true)}</nav>${c.notes.map((n,i)=>`<section class="essay-section" id="${e(n.id)}"><p class="eyebrow">NOTE ${number(i+1)} / ${number(c.notes.length)}</p><h2>${e(n.title)}</h2><p class="lead">${e(n.summary)}</p>${paragraphs(n.paragraphs)}</section>`).join('')}`:
    page==='now'?`<header class="reader-heading"><p class="eyebrow">THE QUIET EDITION / FROM MY DESK</p><h1>${e(c.now.title)}</h1><p class="lead">${e(c.now.introduction)}</p></header>${c.now.sections.map(s=>`<section class="essay-section"><h2>${e(s.heading)}</h2>${paragraphs(s.paragraphs)}</section>`).join('')}`:
    `<header class="reader-heading"><p class="eyebrow">THE QUIET EDITION / SELECTED WORK</p><h1>Things<br><em>made with care.</em></h1></header>${projects(c,true)}<section class="essay-section"><h2>One portfolio. A few ways in.</h2><p>${e(c.profile.introduction)}</p><p class="reader-worlds"><a href="/1d/">1D · The essentials</a><a href="/2d/">2D · The creative playground</a><a href="/3d/">3D · Pixel desktop</a></p></section>`;
  return back+body+`<div class="reader-end"><span aria-hidden="true">— Fin.</span>${back}</div>`;
}
