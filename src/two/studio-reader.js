import {escapeHtml as e} from '../shared/content.js';
import {contactRowsHtml,bookingNote,contactMeta,projectLinksHtml} from '../shared/contact.js';
import {paginateParagraphs} from './studio-interaction.js';

/** HTML stays selectable and accessible; the scene supplies the physical prop. */
export function createStudioReader(host,{getContent,onClose,onPage=()=>{}}){
 const dialog=document.createElement('dialog');dialog.className='studio-reader';host.append(dialog);
 let kind,selected=null,page=0,previousFocus,disposed=false;
 const mobile=matchMedia('(max-width: 700px)');
 const stride=()=>mobile.matches?1:2;
 function render(focus=false){
  if(!kind)return;
  const active=document.activeElement?.dataset?.item;
  const focusControl=['data-close','data-index','data-next','data-prev'].find(key=>document.activeElement?.hasAttribute?.(key));
  const scroll=dialog.querySelector('.studio-reader-body')?.scrollTop||0;
  const c=getContent();let body='',label='',footer='';
  if(kind==='notes'){
   label='The notebook';const note=c.notes.find(n=>n.id===selected);if(!note)selected=null;
   const pages=note?paginateParagraphs([note.summary,...note.paragraphs]):Array.from({length:Math.max(1,Math.ceil(c.notes.length/5))},(_,i)=>c.notes.slice(i*5,i*5+5));
   page=Math.min(page,Math.max(0,pages.length-1));page-=page%stride();
   body=`<div class="studio-book-spread">${pages.slice(page,page+stride()).map((paragraphs,i)=>`<article class="studio-paper"><small>${note?'FIELD NOTES':'CONTENTS'} · ${page+i+1} / ${pages.length}</small><h2>${e(note?.title||'A little thinking out loud.')}</h2>${note?paragraphs.map(p=>`<p>${e(p)}</p>`).join(''):paragraphs.map(n=>`<button class="studio-note-entry" data-item="${e(n.id)}"><strong>${e(n.title)}</strong><span>${e(n.summary)}</span><span aria-hidden="true">↗</span></button>`).join('')||'<p>A fresh notebook. Published ideas will appear here.</p>'}</article>`).join('')}</div>`;
   footer=`${note?'<button data-index>← Contents</button>':'<span></span>'}<nav aria-label="Book pages"><button data-prev ${page===0?'disabled':''}>← Previous</button><span aria-live="polite">${page+1}–${Math.min(page+stride(),pages.length)} / ${pages.length}</span><button data-next ${page+stride()>=pages.length?'disabled':''}>Next →</button></nav>`;
  }else if(kind==='projects'){
   label='Work / Studio desktop';const project=c.projects.find(p=>p.id===selected);if(!project)selected=null;
   body=project?`<article class="studio-project-detail"><button data-index>← All projects</button><h2>${e(project.title)}</h2>${project.image?`<img src="${e(project.image)}" alt="${e(project.title)}"/>`:''}<p class="studio-lead">${e(project.summary)}</p><p>${e(project.details||'')}</p><ul class="studio-tags">${project.tags.map(t=>`<li>${e(t)}</li>`).join('')}</ul>${projectLinksHtml(project)}</article>`:`<div class="studio-project-grid">${c.projects.map(p=>`<button data-item="${e(p.id)}">${p.image?`<img src="${e(p.image)}" alt="" loading="lazy"/>`:''}<strong>${e(p.title)}</strong><span>${e(p.summary)}</span><small>Open project ↗</small></button>`).join('')||'<p>New projects will appear on this desktop.</p>'}</div>`;
  }else{
   label='A good conversation';body=`<article class="studio-contact-card"><small>SAY HELLO</small><h2>${e(c.contact.heading)}</h2><p>${e(c.contact.message)}</p>${contactRowsHtml(c)}${bookingNote(c)}<p>${e(contactMeta(c))}</p>${c.contact.phone?`<p>${e(c.contact.phone)}</p>`:''}<div class="studio-links">${c.contact.contactCardUrl?`<a href="${e(c.contact.contactCardUrl)}">Save contact</a>`:''}${c.contact.resumeUrl?`<a href="${e(c.contact.resumeUrl)}">Download profile</a>`:''}</div></article>`;
  }
  dialog.dataset.kind=kind;dialog.setAttribute('aria-label',label);
  dialog.innerHTML=`<header><span>${label}</span><button data-close aria-label="Close ${label}">Close ×</button></header><div class="studio-reader-body" tabindex="0">${body}</div>${footer?`<footer>${footer}</footer>`:''}`;
  if(focus)dialog.querySelector('[data-close]').focus();
  else if(active)([...dialog.querySelectorAll('[data-item]')].find(b=>b.dataset.item===active)||dialog.querySelector('.studio-reader-body')).focus();
  else if(focusControl)dialog.querySelector(`[${focusControl}]`)?.focus();
  dialog.querySelector('.studio-reader-body').scrollTop=scroll;
 }
 dialog.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-close')){api.close();return;}
  if(b.hasAttribute('data-item')){selected=b.dataset.item;page=0;onPage();render();}
  if(b.hasAttribute('data-index')){selected=null;page=0;onPage();render();}
  if(b.hasAttribute('data-next')||b.hasAttribute('data-prev')){page+=b.hasAttribute('data-next')?stride():-stride();onPage();render();}
  dialog.classList.remove('is-turning');void dialog.offsetWidth;dialog.classList.add('is-turning');
  dialog.querySelector('.studio-reader-body').scrollTop=0;
  dialog.querySelector('.studio-reader-body')?.focus();
 });
 dialog.addEventListener('cancel',event=>{event.preventDefault();api.close();});
 const change=()=>render();mobile.addEventListener('change',change);
 const api={
  get open(){return dialog.open;},
  show(type){if(disposed)return;kind=type;selected=null;page=0;previousFocus=document.activeElement;render();dialog.showModal();dialog.querySelector('[data-close]').focus();},
  refresh(){if(dialog.open)render();},
  close(silent=false){if(!dialog.open)return;dialog.close();kind=null;previousFocus?.focus({preventScroll:true});if(!silent)onClose();},
  destroy(){disposed=true;api.close(true);mobile.removeEventListener('change',change);dialog.remove();},
 };return api;
}
