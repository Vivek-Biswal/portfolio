import { escapeHtml as e, paragraphs, emailHref, noteHref } from '../src/shared/content.js';
import {contactRowsHtml, contactMeta, bookingNote, projectLinksHtml} from '../src/shared/contact.js';
import {lineSections} from './render-line.mjs';
const section=(html,id,body)=>html.replace(new RegExp(`(<section[^>]*\\bid="${id}"[^>]*>)[\\s\\S]*?</section>`),(_,start)=>start+body+'</section>');
const heading=(tag,id,value)=>`<${tag} id="${id}">${e(value)}</${tag}>`;
const contactBody=c=>`${heading('h2','contact-title','04. '+c.contact.heading)}<p>${e(c.contact.message)}</p>${contactRowsHtml(c)}${bookingNote(c)}${contactMeta(c)?`<p class="contact-meta">${e(contactMeta(c))}</p>`:''}${c.contact.phone?`<p class="contact-meta">${e(c.contact.phone)}</p>`:''}<p class="intro-links">${c.contact.contactCardUrl?`<a href="${e(c.contact.contactCardUrl)}">Save my contact</a>`:''}${c.contact.contactCardUrl&&c.contact.resumeUrl?' <span aria-hidden="true">·</span> ':''}${c.contact.resumeUrl?`<a href="${e(c.contact.resumeUrl)}">Download my profile</a>`:''}</p>`;
const projectBody=c=>c.projects.map(p=>`<article class="project"><div class="project-heading"><h3>${p.url?`<a href="${e(p.url)}">${e(p.title)}</a>`:e(p.title)}</h3><span class="small">${e(p.category)} · ${e(p.year)}</span></div><p>${e(p.summary)}</p>${p.image?`<img class="project-image" src="${e(p.image)}" alt="${e(p.title)}" loading="lazy" />`:""}${p.details?`<p class="small">${e(p.details)}</p>`:''}${projectLinksHtml(p)}</article>`).join('');
export function renderPublic(template,page,c) {
  let html=template.replace(/<script type="application\/json" id="portfolio-content">[\s\S]*?<\/script>/g,'');
  const first=c.profile.name.split(' ')[0];
  html=html.replace(/<title>[\s\S]*?<\/title>/,`<title>${e(c.settings.siteTitle)}${['index','1d'].includes(page)?' — 1D':page==='2d'?' — 2D':page==='3d'?' — 3D':''}</title>`);
  html=html.replace(/<meta name="description" content="[^"]*"\s*\/?>/,`<meta name="description" content="${e(c.settings.description)}" />`);
  html=html.replace(/(<a[^>]*class="wordmark"[^>]*>)[\s\S]*?<\/a>/,(_,start)=>start+e(c.profile.name)+'</a>');
  html=html.replace(/(<a[^>]*class="signature"[^>]*>)[\s\S]*?<\/a>/,(_,start)=>start+e(first.toLowerCase())+'<span aria-hidden="true">.</span></a>');
  html=html.replace(/(<footer class="footer"><span>)[\s\S]*?<\/span>/,(_,start)=>start+e(c.settings.copyright)+'</span>');
  html=html.replace(/vivekbiswal\.(?:dev|com)(@|%40)gmail\.com/g,(_,separator)=>separator==='%40'?e(encodeURIComponent(c.contact.email)):e(c.contact.email));
  html=html.replace(/© 2026 Vivek Biswal[^<]*/g,e(c.settings.copyright));
  if(page==='index'||page==='1d') {
    html=html.replace(/(<section class="intro"[^>]*>)[\s\S]*?<\/section>/,(_,start)=>start+`<div><p class="eyebrow">A personal corner of the internet.</p>${heading('h1','intro-title',`Hello, I’m ${first}.`)}<p class="lead">${e(c.profile.headline)}</p><p>${e(c.profile.introduction)}</p><p class="intro-links"><a href="#work">Explore my work</a> <span aria-hidden="true">·</span> <a href="${emailHref(c.contact.email)}">Say hello</a></p></div><figure class="portrait"><img src="${e(c.profile.dottedPortrait||c.profile.portrait)}" width="1254" height="1254" alt="${e(c.profile.name)}" fetchpriority="high" /><figcaption>${e(c.profile.portraitCaption)}</figcaption></figure></section>`);
    html=section(html,'about',`${heading('h2','about-title','01. About')}${paragraphs(c.about.paragraphs)}<h3>Tools in this project</h3><ul class="inline-list">${c.skills.map(s=>`<li>${e(s)}</li>`).join('')}</ul>`);
    html=section(html,'work',heading('h2','work-title','02. Selected work')+projectBody(c));
    html=section(html,'notes',`${heading('h2','notes-title','03. Notes & ideas')}<ul class="reading-list">${c.notes.map(n=>`<li><a href="${noteHref(n)}">${e(n.title)}</a> <span class="small">— ${e(n.summary)}</span></li>`).join('')}</ul><p><a href="/work/now.html">What I’m working on now →</a></p>`);
    html=section(html,'contact',contactBody(c));
  }
  if(page==='2d') {
    for(const [id,body] of Object.entries(lineSections(c)))html=section(html,id,body);
  }
  if(page==='3d') {
    html=html.replace(/(<a class="os-logo"[^>]*>)[\s\S]*?<\/a>/,(_,start)=>start+e(first)+'<span>OS</span><small>v.03</small></a>');
    html=html.replace(/<div class="desktop-intro">[\s\S]*?<\/div>/,`<div class="desktop-intro"><p class="intro-kicker">${e(c.profile.name.toUpperCase())} · WORLD 03</p><h1>${e(c.settings.pixelTitle).replaceAll('\n','<br />')}</h1><p>${e(c.settings.pixelSubtitle).replaceAll('\n','<br />')}</p><button type="button" class="pixel-button" data-open="about">Meet the person behind the pixels ↗</button></div>`);
  }
  if(['project','notes','now'].includes(page)) {
    const body=page==='notes'?`<p class="eyebrow">Design notes</p><h1>One portfolio. A few ways in.</h1>${c.notes.map(n=>`<section id="${e(n.id)}"><h2>${e(n.title)}</h2><p class="lead">${e(n.summary)}</p>${paragraphs(n.paragraphs)}</section>`).join('')}`:
      page==='now'?`<p class="eyebrow">Now</p><h1>${e(c.now.title)}</h1><p class="lead">${e(c.now.introduction)}</p>${c.now.sections.map(s=>`<section><h2>${e(s.heading)}</h2>${paragraphs(s.paragraphs)}</section>`).join('')}`:
      `<p class="eyebrow">Selected work</p><h1>Things I’m building.</h1>${projectBody(c)}<section><h2>Explore the worlds</h2><p><a href="/1d/">1D · The essentials</a> · <a href="/2d/">2D · Along a line</a> · <a href="/3d/">3D · Pixel desktop</a></p><p>${e(c.profile.introduction)}</p></section>`;
    html=html.replace(/(<main[^>]*>)[\s\S]*?<\/main>/,(_,start)=>start+body+'<p><a href="/">← Back to the portfolio</a></p></main>');
  }
  if(page==='2d'||page==='3d') {
    const payload=JSON.stringify(c).replaceAll('<','\\u003c').replaceAll('>','\\u003e').replaceAll('&','\\u0026');
    html=html.replace('</head>',`<script type="application/json" id="portfolio-content">${payload}</script></head>`);
  }
  return html;
}
