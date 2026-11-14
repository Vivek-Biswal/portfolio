import { escapeHtml as e, emailHref } from '../src/shared/content.js';
import {lineSections} from './render-line.mjs';
import {essentialsIntro,essentialsSections,essentialsArticle} from './render-essentials.mjs';
const section=(html,id,body)=>html.replace(new RegExp(`(<section[^>]*\\bid="${id}"[^>]*>)[\\s\\S]*?</section>`),(_,start)=>start+body+'</section>');
export function renderPublic(template,page,c) {
  let html=template.replace(/<script type="application\/json" id="portfolio-content">[\s\S]*?<\/script>/g,'');
  const first=c.profile.name.split(' ')[0];
  html=html.replace(/<title>[\s\S]*?<\/title>/,()=>`<title>${e(c.settings.siteTitle)}${['index','1d'].includes(page)?' — 1D':page==='2d'?' — 2D':page==='3d'?' — 3D':''}</title>`);
  html=html.replace(/<meta name="description" content="[^"]*"\s*\/?>/,()=>`<meta name="description" content="${e(c.settings.description)}" />`);
  html=html.replace(/<a[^>]*class="wordmark"[^>]*>[\s\S]*?<\/a>/,()=>`<a class="wordmark" href="/" aria-label="${e(c.profile.name)}, homepage">${e(c.profile.name)}</a>`);
  html=html.replace(/(<a[^>]*class="signature"[^>]*>)[\s\S]*?<\/a>/,(_,start)=>start+e(first.toLowerCase())+'<span aria-hidden="true">.</span></a>');
  html=html.replace(/(<footer class="footer"><span>)[\s\S]*?<\/span>/,(_,start)=>start+e(c.settings.copyright)+'</span>');
  html=html.replace(/vivekbiswal\.(?:dev|com)(@|%40)gmail\.com/g,(_,separator)=>separator==='%40'?e(encodeURIComponent(c.contact.email)):e(c.contact.email));
  html=html.replace(/© 2026 Vivek Biswal[^<]*/g,()=>e(c.settings.copyright));
  html=html.replace(/(<p\b[^>]*\bdata-copyright[^>]*>)[\s\S]*?<\/p>/,(_,start)=>start+e(c.settings.copyright)+'</p>');
  html=html.replace(/(<p\b[^>]*\bdata-footer-contact[^>]*>)[\s\S]*?<\/p>/,(_,start)=>start+e(c.profile.name)+` · <a href="${emailHref(c.contact.email)}">${e(c.contact.email)}</a></p>`);
  if(page==='index'||page==='1d') {
    html=html.replace(/(<section class="intro"[^>]*>)[\s\S]*?<\/section>/,(_,start)=>start+essentialsIntro(c)+'</section>');
    for(const [id,body] of Object.entries(essentialsSections(c)))html=section(html,id,body);
  }
  if(page==='2d') {
    for(const [id,body] of Object.entries(lineSections(c)))html=section(html,id,body);
  }
  if(page==='3d') {
    html=html.replace(/(<a class="os-logo"[^>]*>)[\s\S]*?<\/a>/,(_,start)=>start+e(first)+'<span>OS</span><small>v.03</small></a>');
    html=html.replace(/<div class="desktop-intro">[\s\S]*?<\/div>/,`<div class="desktop-intro"><p class="intro-kicker">${e(c.profile.name.toUpperCase())} · WORLD 03</p><h1>${e(c.settings.pixelTitle).replaceAll('\n','<br />')}</h1><p>${e(c.settings.pixelSubtitle).replaceAll('\n','<br />')}</p><button type="button" class="pixel-button" data-open="about">Meet the person behind the pixels ↗</button></div>`);
  }
  if(['project','notes','now'].includes(page)) {
    html=html.replace(/<main[^>]*>[\s\S]*?<\/main>/,()=>`<main class="page reading-page" id="main" tabindex="-1">${essentialsArticle(c,page)}</main>`);
  }
  if(page==='2d'||page==='3d') {
    const payload=JSON.stringify(c).replaceAll('<','\\u003c').replaceAll('>','\\u003e').replaceAll('&','\\u0026');
    html=html.replace('</head>',`<script type="application/json" id="portfolio-content">${payload}</script></head>`);
  }
  return html;
}
