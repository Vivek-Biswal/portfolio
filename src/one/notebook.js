import {initialContent} from '../shared/public-client.js';
import {renderLineNotebook} from './notebook-content.js';
import './notebook.css';

let content=initialContent,selection=null,opener=null,returnHash='#ideas',ownedEntry=false,pendingFocus=null;
const notebook=document.createElement('dialog');
notebook.className='line-notebook';
notebook.setAttribute('aria-labelledby','notebook-title');
notebook.setAttribute('aria-describedby','notebook-label');
document.body.append(notebook);

function fromHash(){
  const hash=location.hash.slice(1);
  if(hash==='now')return {kind:'now'};
  if(!hash.startsWith('note-'))return null;
  try{return {kind:'note',id:decodeURIComponent(hash.slice(5))};}catch{return null;}
}
const same=(a,b)=>a?.kind===b?.kind&&a?.id===b?.id;
const focusFallback=()=>document.querySelector('.waypoints a[href="#ideas"]')||document.querySelector('#ideas .quiet-link');
function paint({refresh=false}={}){
  const html=renderLineNotebook(content,selection);
  if(!html)return false;
  const page=notebook.querySelector('[data-notebook-page]');
  const scroll=page?.scrollTop||0;
  const focused=document.activeElement;
  const href=notebook.contains(focused)&&focused.tagName==='A'?focused.getAttribute('href'):null;
  const closeFocused=notebook.contains(focused)&&focused.hasAttribute('data-notebook-close');
  notebook.innerHTML=html;
  if(!notebook.open)notebook.showModal();
  if(refresh){
    notebook.querySelector('[data-notebook-page]').scrollTop=scroll;
    const replacement=href?[...notebook.querySelectorAll('a[href]')].find(link=>link.getAttribute('href')===href):closeFocused?notebook.querySelector('[data-notebook-close]'):null;
    (replacement||notebook.querySelector('#notebook-title')).focus({preventScroll:true});
  }else{
    notebook.querySelector('[data-notebook-page]').scrollTop=0;
    notebook.querySelector('#notebook-title').focus({preventScroll:true});
  }
  return true;
}
function restoreFocus({defer=false}={}){
  const id=selection?.kind==='note'?selection.id:null;
  selection=null;
  const destination=(opener?.isConnected?opener:id?[...document.querySelectorAll('#ideas [data-line-note]')].find(link=>link.dataset.lineNote===id):null)||focusFallback();
  if(defer)pendingFocus=destination;
  else destination?.focus({preventScroll:true});
  opener=null;
}
function syncRoute(){
  const next=fromHash();
  if(!next){
    if(notebook.open||selection){if(notebook.open)notebook.close();restoreFocus();}
    if(pendingFocus){const destination=pendingFocus;pendingFocus=null;requestAnimationFrame(()=>(destination.isConnected?destination:focusFallback())?.focus({preventScroll:true}));}
    ownedEntry=false;return;
  }
  const changed=!same(selection,next);selection=next;
  if(paint({refresh:!changed}))return;
  // A removed CMS note must not strand a reader behind an empty modal.
  history.replaceState(null,'',location.pathname+location.search+'#ideas');
  if(notebook.open)notebook.close();restoreFocus();ownedEntry=false;
}
function open(next,link){
  const wasOpen=notebook.open;
  const hash=next.kind==='now'?'#now':'#note-'+encodeURIComponent(next.id);
  if(!wasOpen){opener=link;returnHash=location.hash&&!fromHash()?location.hash:'#ideas';ownedEntry=true;}
  const method=wasOpen?'replaceState':'pushState';
  history[method]({...history.state,lineNotebook:true},'',location.pathname+location.search+hash);
  syncRoute();
}
function close(){
  if(!notebook.open)return;
  notebook.close();restoreFocus({defer:ownedEntry});
  if(ownedEntry){ownedEntry=false;history.back();}
  else history.replaceState(null,'',location.pathname+location.search+returnHash);
}
document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const link=event.target.closest('a[data-line-note],a[data-line-now]');
  if(link){event.preventDefault();open(link.hasAttribute('data-line-now')?{kind:'now'}:{kind:'note',id:link.dataset.lineNote},link);return;}
  if(event.target.closest('[data-notebook-close]'))close();
});
notebook.addEventListener('cancel',event=>{event.preventDefault();close();});
notebook.addEventListener('click',event=>{if(event.target===notebook){const rect=notebook.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)close();}});
window.addEventListener('hashchange',syncRoute);
window.addEventListener('popstate',syncRoute);
document.addEventListener('portfolio:content-updated',event=>{
  if(!event.detail?.content)return;
  content=event.detail.content;
  if(notebook.open)syncRoute();
});
syncRoute();
