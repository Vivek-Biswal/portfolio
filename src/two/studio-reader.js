import {renderStudioExperience} from './studio-reader-views.js';

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
  const view=renderStudioExperience(getContent(),{kind,selected,page,singlePage:mobile.matches});
  selected=view.selected;page=view.page;
  dialog.dataset.kind=kind;dialog.setAttribute('aria-label',view.label);
  dialog.innerHTML=`<header>${view.header}</header><div class="studio-reader-body" tabindex="0">${view.body}</div><footer>${view.footer}</footer>`;
  if(focus)dialog.querySelector('[data-close]').focus();
  else if(active)([...dialog.querySelectorAll('[data-item]')].find(b=>b.dataset.item===active)||dialog.querySelector('.studio-reader-body')).focus();
  else if(focusControl)dialog.querySelector(`[${focusControl}]`)?.focus();
  dialog.querySelector('.studio-reader-body').scrollTop=scroll;
 }
 dialog.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-close')){api.close();return;}
  if(b.hasAttribute('data-item')){selected=b.dataset.item;page=0;if(kind==='notes')onPage();render();}
  if(b.hasAttribute('data-index')){selected=null;page=0;if(kind==='notes')onPage();render();}
  if(b.hasAttribute('data-next')||b.hasAttribute('data-prev')){page+=b.hasAttribute('data-next')?stride():-stride();if(kind==='notes')onPage();render();}
  if(kind==='notes'){dialog.classList.remove('is-turning');void dialog.offsetWidth;dialog.classList.add('is-turning');}
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
