import {escapeHtml as e} from '../shared/content.js';
import {contactRowsHtml,bookingNote,contactMeta,projectLinksHtml} from '../shared/contact.js';
import {paginateParagraphs} from './studio-interaction.js';

const close=(label)=>`<button data-close aria-label="${e(label)}">${e(label)} <span aria-hidden="true">×</span></button>`;
const dots='<span class="studio-window-lights" aria-hidden="true"><i></i><i></i><i></i></span>';

export function renderStudioExperience(c,{kind,selected=null,page=0,singlePage=false}){
 let body='',header='',footer='',label='';
 if(kind==='notes'){
  label='Ideas and notes — open book';
  const note=c.notes.find(n=>n.id===selected);selected=note?.id||null;
  const pages=note?paginateParagraphs([note.summary,...note.paragraphs]):Array.from({length:Math.max(1,Math.ceil(c.notes.length/5))},(_,i)=>c.notes.slice(i*5,i*5+5));
  const stride=singlePage?1:2;
  page=Math.max(0,Math.min(page,pages.length-1));page-=page%stride;
  const end=Math.min(page+stride,pages.length),range=end===page+1?String(end):`${page+1}–${end}`;
  header=`<span class="studio-book-title">Vivek’s notebook <small>Ideas, observations & experiments</small></span>${close('Close book')}`;
  const visible=pages.slice(page,end).map((paragraphs,i)=>`<article class="studio-paper">
   <div class="studio-page-heading"><span>${note?'FIELD NOTES':'TABLE OF CONTENTS'}</span><span>VOL. 01</span></div>
   <h2>${e(note?.title||'A little thinking out loud.')}</h2>
   ${note?paragraphs.map(p=>`<p>${e(p)}</p>`).join(''):paragraphs.map((n,j)=>`<button class="studio-note-entry" data-item="${e(n.id)}"><span class="studio-entry-number">${String((page+i)*5+j+1).padStart(2,'0')}</span><span><strong>${e(n.title)}</strong><span class="studio-entry-summary">${e(n.summary)}</span></span><span aria-hidden="true">↗</span></button>`).join('')||'<p class="studio-empty">A fresh notebook. Published ideas will appear here.</p>'}
   <div class="studio-page-number">${String(page+i+1).padStart(2,'0')}</div></article>`);
  if(!singlePage&&visible.length===1)visible.push('<article class="studio-paper studio-endpaper" aria-label="Notebook endpaper"><span aria-hidden="true">V.</span><p>Until the next idea.</p></article>');
  body=`<div class="studio-book-spread">${visible.join('')}</div>`;
  footer=`${note?'<button data-index>← Contents</button>':`<span class="studio-book-count">${c.notes.length} ${c.notes.length===1?'note':'notes'}</span>`}<nav aria-label="Book pages"><button data-prev ${page===0?'disabled':''} aria-label="Previous pages">←</button><span aria-live="polite">${range} / ${pages.length}</span><button data-next ${end>=pages.length?'disabled':''} aria-label="Next pages">→</button></nav>`;
 }else if(kind==='projects'){
  label='Projects — studio computer';const project=c.projects.find(p=>p.id===selected);selected=project?.id||null;
  header=`<span class="studio-os-brand">VivekOS <span>Studio desktop</span></span>${close('Leave desktop')}`;
  const files=project?`<article class="studio-project-detail"><span class="studio-file-type">PROJECT FILE</span><h2>${e(project.title)}</h2>${project.image?`<img src="${e(project.image)}" alt="${e(project.title)}"/>`:''}<p class="studio-lead">${e(project.summary)}</p><p>${e(project.details||'')}</p><ul class="studio-tags">${project.tags.map(t=>`<li>${e(t)}</li>`).join('')}</ul>${projectLinksHtml(project)}</article>`:`<div class="studio-project-grid">${c.projects.map((p,i)=>`<button data-item="${e(p.id)}">${p.image?`<img src="${e(p.image)}" alt="" loading="lazy"/>`:`<span class="studio-file-preview" aria-hidden="true"><span class="studio-folder-shape"></span><small>${String(i+1).padStart(2,'0')}</small></span>`}<strong>${e(p.title)}</strong><span>${e(p.summary)}</span><small>Open project ↗</small></button>`).join('')||'<p class="studio-empty">The folder is ready. Published projects will appear here.</p>'}</div>`;
  body=`<div class="studio-desktop-wallpaper"><div class="studio-finder"><div class="studio-finder-bar">${dots}<span>Projects</span><small>${c.projects.length} files</small></div><div class="studio-finder-layout"><aside class="studio-finder-sidebar"><small>WORKSPACE</small><button data-index ${!project?'aria-current="page"':''}><span aria-hidden="true">▤</span> All projects</button><p>Made with curiosity.</p></aside><section class="studio-finder-content"><div class="studio-breadcrumb">Studio <span>/</span> Projects${project?` <span>/</span> ${e(project.title)}`:''}</div>${files}</section></div></div></div>`;
  footer='<span class="studio-monitor-brand">VIVEK · STUDIO DISPLAY</span><span class="studio-power-light" aria-hidden="true"></span>';
 }else{
  label='Say hello — internet phone';
  header=`<span class="studio-phone-brand">Vivek <small>Internet phone</small></span>${close('Put down')}`;
  body=`<div class="studio-browser-bar"><span aria-hidden="true">◎</span><span>Vivek / say hello</span><span aria-hidden="true">↗</span></div><article class="studio-contact-card"><div class="studio-contact-avatar" aria-hidden="true">V.</div><small>A CONVERSATION STARTS HERE</small><h2>${e(c.contact.heading)}</h2><p>${e(c.contact.message)}</p><div class="studio-contact-label">CHOOSE A WAY TO CONNECT</div>${contactRowsHtml(c)}${bookingNote(c)}<p class="studio-contact-meta">${e(contactMeta(c))}</p>${c.contact.phone?`<p>${e(c.contact.phone)}</p>`:''}<div class="studio-links">${c.contact.contactCardUrl?`<a href="${e(c.contact.contactCardUrl)}">Save contact ↗</a>`:''}${c.contact.resumeUrl?`<a href="${e(c.contact.resumeUrl)}">Download profile ↗</a>`:''}</div></article>`;
  footer='<span class="studio-phone-home" aria-hidden="true"></span>';
 }
 return {label,body,header,footer,selected,page};
}
