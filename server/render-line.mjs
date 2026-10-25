import {escapeHtml as e, paragraphs, noteHref} from '../src/shared/content.js';
import {contactRowsHtml, contactMeta, bookingNote, projectLinksHtml} from '../src/shared/contact.js';

const node='<span class="node" aria-hidden="true"></span>';
const label=value=>`<p class="small-label">${value}</p>`;
const noteFallback=c=>`<noscript><div class="line-note-fallback">${c.notes.map(n=>`<article id="note-${e(n.id)}"><h3>${e(n.title)}</h3><p>${e(n.summary)}</p><div class="detail-content">${paragraphs(n.paragraphs)}</div><a class="quiet-link" href="#ideas">Back to ideas ↑</a></article>`).join('')}<article id="now"><h3>${e(c.now.title)}</h3><p>${e(c.now.introduction)}</p>${c.now.sections.map(s=>`<h4>${e(s.heading)}</h4>${paragraphs(s.paragraphs)}`).join('')}<a class="quiet-link" href="#ideas">Back to ideas ↑</a></article></div></noscript>`;
export function lineSections(c) {
  const nameParts=c.profile.name.trim().split(/\s+/);
  const nameFirst=nameParts.shift() || '';
  const nameLast=nameParts.join(' ');
  // The glasses are a presentation variant of the bundled photo. Custom CMS
  // portraits still render directly instead of being replaced by a fixed image.
  const portrait=c.profile.portrait==='/0d/portrait.jpg'?'/0d/portrait-pixel-shades.png':c.profile.portrait;
  return {
    hello:`${node}${label('Introduction')}
      <div class="intro-grid"><div class="intro-copy">
        <h1 id="hello-title" aria-label="${e(c.profile.name)}"><span class="name-first">${e(nameFirst)}</span>${nameLast?` <span class="name-last">${e(nameLast)}</span>`:''}</h1>
        <p class="hero-copy">${e(c.profile.headline)}</p>
        <p class="intro-description">${e(c.profile.introduction)}</p>
        <div class="hero-actions"><a class="next" href="#work">View selected work <span aria-hidden="true">↘</span></a><span class="status"><span aria-hidden="true"></span>${e(c.profile.status)}</span></div>
      </div>${portrait?`<figure class="hero-portrait"><div class="portrait-frame"><img src="${e(portrait)}" width="400" height="480" alt="${e(c.profile.name)}${portrait!==c.profile.portrait?', wearing pixel sunglasses':''}" fetchpriority="high" /></div><figcaption class="portrait-note">02 / A personal perspective</figcaption></figure>`:''}</div>
      <details class="about-details" id="about-details"><summary>More about me <span aria-hidden="true">+</span></summary><div class="detail-content">${paragraphs(c.about.paragraphs)}${c.skills.length?`<p class="tools-label">A few tools I work with</p><ul class="tags" aria-label="Skills">${c.skills.map(s=>`<li>${e(s)}</li>`).join('')}</ul>`:''}</div></details>`,
    work:`${node}${label('Selected work')}<h2 id="work-title">Ideas, made real.</h2><div class="projects-list">${c.projects.map((p,i)=>`<article class="project" aria-labelledby="project-title-${e(p.id)}">
      ${p.image?`<figure class="project-preview"><img class="project-image" src="${e(p.image)}" alt="${e(p.title)} preview" loading="lazy" />${p.url?`<a class="preview-link" href="${e(p.url)}" aria-label="Explore ${e(p.title)}"><span aria-hidden="true">↗</span></a>`:''}</figure>`:''}
      <div class="project-grid"><div class="project-heading"><div class="project-top"><span class="project-number">${String(i+1).padStart(2,'0')}</span><span>${e(p.category)}<span aria-hidden="true"> / </span>${e(p.year)}</span></div><h3 id="project-title-${e(p.id)}">${p.url?`<a href="${e(p.url)}">${e(p.title)}</a>`:e(p.title)}</h3></div><div class="project-copy"><p>${e(p.summary)}</p>${p.tags.length?`<ul class="tags" aria-label="Project tools">${p.tags.map(t=>`<li>${e(t)}</li>`).join('')}</ul>`:''}${projectLinksHtml(p)}</div></div>
      ${p.details?`<details class="project-details" id="project-details-${e(p.id)}"><summary>Behind the project <span aria-hidden="true">+</span></summary><div class="detail-content"><p>${e(p.details)}</p></div></details>`:''}</article>`).join('')}</div>`,
    ideas:`${node}${label('Notes & ideas')}<h2 id="ideas-title">A little thinking out loud.</h2><div class="note-list">${c.notes.map((n,i)=>`<a href="${noteHref(n,'2d')}" data-line-note="${e(n.id)}"><span class="note-number">${String(i+1).padStart(2,'0')}</span><span><strong>${e(n.title)}</strong><small>${e(n.summary)}</small></span><span class="note-arrow" aria-hidden="true">→</span></a>`).join('')}</div><a class="quiet-link" href="/2d/#now" data-line-now>What I’m working on now <span aria-hidden="true">→</span></a>${noteFallback(c)}`,
    contact:`${node}${label('Contact')}<div class="contact-panel"><h2 id="contact-title">${e(c.contact.heading)}</h2><p class="contact-copy">${e(c.contact.message)}</p>${contactRowsHtml(c)}${bookingNote(c)}${contactMeta(c)?`<p class="contact-meta">${e(contactMeta(c))}</p>`:''}${c.contact.phone?`<p class="contact-meta">${e(c.contact.phone)}</p>`:''}<div class="contact-links">${c.contact.contactCardUrl?`<a href="${e(c.contact.contactCardUrl)}">Save contact <span aria-hidden="true">↓</span></a>`:''}${c.contact.resumeUrl?`<a href="${e(c.contact.resumeUrl)}">Download profile <span aria-hidden="true">↓</span></a>`:''}</div></div><div class="endnote"><p>Another way to explore.</p><a href="/1d/">1D · The essentials <span aria-hidden="true">↗</span></a><a href="/3d/">3D · The pixel world <span aria-hidden="true">↗</span></a></div>`
  };
}
