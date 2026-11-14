import {escapeHtml as e, paragraphs} from '../shared/content.js';
import {projectLinks} from '../shared/contact.js';

export const lineProjectHref=project=>`/2d/work/#project-${encodeURIComponent(project.id)}`;
const number=value=>String(value).padStart(2,'0');

// Legacy portfolio readers belong to 1D. Keep real website/demo/source actions,
// while every 2D project entrance leads to its own case study.
export function projectDestinations(project){
  return projectLinks(project).filter(link=>link.kind!=='project'||!/^\/work(?:\/|[?#]|$)/.test(link.url))
    .map(link=>({...link,label:link.kind==='project'?'Visit website':link.label}));
}
function actions(links){
  return links.map(link=>`<a class="project-action" href="${e(link.url)}"${/^https?:/.test(link.url)?' target="_blank" rel="noopener noreferrer"':''}>${e(link.label)} <span aria-hidden="true">↗</span></a>`).join('');
}
export function lineProjectActions(project){
  return `<div class="project-actions">${actions([{label:'Explore project',url:lineProjectHref(project)},...projectDestinations(project)])}</div>`;
}
export function renderLineProjects(content){
  const projects=content.projects;
  return `<div class="case-catalog" id="projects-index"><p class="case-eyebrow">02 / SELECTED WORK</p><h1 id="case-index-title" tabindex="-1">Made to be<br><em>explored.</em></h1><p class="case-intro">A closer look at the ideas, the details, and the work.</p><p class="case-unavailable" role="status" hidden>This project is no longer available. Explore another below.</p><div class="case-index">${projects.map((p,i)=>`<a href="${lineProjectHref(p)}"><span class="case-index-number">${number(i+1)}</span><span><strong>${e(p.title)}</strong><small>${e(p.category)} · ${e(p.year)}</small></span><b aria-hidden="true">↗</b></a>`).join('')||'<p class="case-empty">Something new is taking shape. Come back soon.</p>'}</div><a class="case-back" href="/2d/#work">← Back to the 2D world</a></div>
  ${projects.map((p,i)=>{
    const destinations=projectDestinations(p),next=projects.length>1?projects[(i+1)%projects.length]:null;
    const details=p.details.trim().split(/\n\s*\n|\n/).filter(Boolean);
    return `<article class="case-study" id="project-${e(p.id)}" data-project-id="${e(p.id)}" aria-labelledby="case-title-${e(p.id)}">
      <div class="case-topline"><a class="case-back" href="/2d/#work">← Back to work</a><span>PROJECT ${number(i+1)} / ${number(projects.length)}</span></div>
      <header class="case-heading"><p class="case-eyebrow">${e(p.category)} <span aria-hidden="true">/</span> ${e(p.year)}</p><h1 id="case-title-${e(p.id)}" tabindex="-1">${e(p.title)}</h1><p class="case-intro">${e(p.summary)}</p><span class="case-heading-mark" aria-hidden="true">↘</span></header>
      <figure class="case-cover"><span class="case-cover-number" aria-hidden="true">${number(i+1)}</span>${p.image?`<img src="${e(p.image)}" alt="${e(p.title)} — project preview" loading="lazy" />`:'<span class="case-cover-placeholder" aria-hidden="true">An idea.<br><em>Made real.</em></span>'}<figcaption><span>${e(p.title)}</span><span>THE WORK / ${number(i+1)}</span></figcaption></figure>
      <div class="case-story"><aside><span class="case-eyebrow">BEHIND THE PROJECT</span><p>A little closer<br><em>to the idea.</em></p><dl><div><dt>Created by</dt><dd>${e(content.profile.name)}</dd></div><div><dt>Category</dt><dd>${e(p.category)}</dd></div><div><dt>Year</dt><dd>${e(p.year)}</dd></div></dl></aside><div class="case-story-copy"><h2>The details.</h2><div class="case-prose">${details.length?paragraphs(details):'<p>More details will be shared here soon.</p>'}</div>${p.tags.length?`<div class="case-tools"><h2>Made with.</h2><ul>${p.tags.map((tag,j)=>`<li><span aria-hidden="true">${number(j+1)}</span>${e(tag)}</li>`).join('')}</ul></div>`:''}${destinations.length?`<div class="case-destinations"><h2>Take a look.</h2><div class="project-actions">${actions(destinations)}</div></div>`:''}</div></div>
      <div class="case-signoff"><p>Have something<br><em>in mind?</em></p><a href="/2d/#contact">Let’s talk <span aria-hidden="true">↗</span></a></div>
      <nav class="case-next" aria-label="More projects"><a class="case-back" href="/2d/#work">← All work</a>${next?`<a class="case-next-project" href="${lineProjectHref(next)}"><small>UP NEXT / ${number((i+1)%projects.length+1)}</small><strong>${e(next.title)}</strong><span aria-hidden="true">↗</span></a>`:'<a class="case-next-project" href="/2d/#ideas"><small>KEEP EXPLORING</small><strong>A few thoughts.<br>More possibilities.</strong><span aria-hidden="true">↗</span></a>'}</nav>
    </article>`;
  }).join('')}`;
}
