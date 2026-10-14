import {escapeHtml as e, paragraphs, emailHref, socialHtml, noteHref} from '../src/shared/content.js';

const node='<span class="node" aria-hidden="true"></span>';
const label=value=>`<p class="small-label">${value}</p>`;
export function lineSections(c) {
  return {
    hello:`${node}${label('Introduction')}
      <div class="intro-grid"><div class="intro-copy">
        <h1 id="hello-title">${e(c.profile.name)}</h1>
        <p class="hero-copy">${e(c.profile.headline)}</p>
        <p class="intro-description">${e(c.profile.introduction)}</p>
        <div class="hero-actions"><a class="next" href="#work">View selected work <span aria-hidden="true">↘</span></a><span class="status"><span aria-hidden="true"></span>${e(c.profile.status)}</span></div>
      </div>${c.profile.portrait?`<figure class="hero-portrait"><img src="${e(c.profile.portrait)}" width="144" height="172" alt="${e(c.profile.name)}" fetchpriority="high" /></figure>`:''}</div>
      <details class="about-details" id="about-details"><summary>More about me <span aria-hidden="true">+</span></summary><div class="detail-content">${paragraphs(c.about.paragraphs)}${c.skills.length?`<p class="tools-label">A few tools I work with</p><ul class="tags" aria-label="Skills">${c.skills.map(s=>`<li>${e(s)}</li>`).join('')}</ul>`:''}</div></details>`,
    work:`${node}${label('Selected work')}<h2 id="work-title">Ideas, made real.</h2><div class="projects-list">${c.projects.map((p,i)=>`<article class="project" aria-labelledby="project-title-${e(p.id)}">
      <div class="project-top"><span class="project-number">${String(i+1).padStart(2,'0')}</span><span>${e(p.category)}<span aria-hidden="true"> / </span>${e(p.year)}</span></div>
      <div class="project-grid${p.image?'':' project-grid-text'}"><div class="project-copy"><h3 id="project-title-${e(p.id)}">${p.url?`<a href="${e(p.url)}">${e(p.title)}</a>`:e(p.title)}</h3><p>${e(p.summary)}</p>${p.tags.length?`<ul class="tags" aria-label="Project tools">${p.tags.map(t=>`<li>${e(t)}</li>`).join('')}</ul>`:''}${p.url?`<a class="project-link" href="${e(p.url)}">Explore project <span aria-hidden="true">↗</span></a>`:''}</div>${p.image?`<figure class="project-preview"><img class="project-image" src="${e(p.image)}" alt="${e(p.title)} preview" loading="lazy" /></figure>`:''}</div>
      ${p.details?`<details class="project-details" id="project-details-${e(p.id)}"><summary>Behind the project <span aria-hidden="true">+</span></summary><div class="detail-content"><p>${e(p.details)}</p></div></details>`:''}</article>`).join('')}</div>`,
    ideas:`${node}${label('Notes & ideas')}<h2 id="ideas-title">A little thinking out loud.</h2><div class="note-list">${c.notes.map((n,i)=>`<a href="${noteHref(n)}"><span class="note-number">${String(i+1).padStart(2,'0')}</span><span><strong>${e(n.title)}</strong><small>${e(n.summary)}</small></span><span class="note-arrow" aria-hidden="true">↗</span></a>`).join('')}</div><a class="quiet-link" href="/work/now.html">What I’m working on now <span aria-hidden="true">↗</span></a>`,
    contact:`${node}${label('Contact')}<h2 id="contact-title">${e(c.contact.heading)}</h2><p class="contact-copy">${e(c.contact.message)}</p><a class="email" href="${emailHref(c.contact.email)}">${e(c.contact.email)}<span aria-hidden="true">↗</span></a>${c.contact.phone||c.contact.location?`<p class="contact-meta">${e(c.contact.phone)}${c.contact.phone&&c.contact.location?' · ':''}${e(c.contact.location)}</p>`:''}<div class="contact-links">${socialHtml(c.contact.socialLinks)}${c.contact.contactCardUrl?`<a href="${e(c.contact.contactCardUrl)}">Save contact <span aria-hidden="true">↓</span></a>`:''}${c.contact.resumeUrl?`<a href="${e(c.contact.resumeUrl)}">Download profile <span aria-hidden="true">↓</span></a>`:''}</div><div class="endnote"><p>Another way to explore.</p><a href="/1d/">1D · The essentials <span aria-hidden="true">↗</span></a><a href="/3d/">3D · The pixel world <span aria-hidden="true">↗</span></a></div>`
  };
}
