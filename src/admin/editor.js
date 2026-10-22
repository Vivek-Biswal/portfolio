import {api} from './api.js';
import {escapeHtml as e} from '../shared/content.js';
import {renderGithubInbox} from './github-inbox.js';
import './github-inbox.css';
const nav=document.getElementById('editor-nav'),panel=document.getElementById('editor-section'),status=document.getElementById('editor-status');
const sections={profile:['Profile','Your name, introduction and portraits.'],about:['About','The same About content in every world.'],contact:['Contact','Your inbox, social links, and meeting booking page.'],skills:['Skills','One list, presented in each world’s own style.'],projects:['Projects','Add, edit and reorder the work you want to show.'],github:['GitHub inbox','Review public repositories and updates. Only your approval publishes a project.'],notes:['Notes','Your ideas, shared between the website and desktop app.'],now:['Now','What you are working on, in your own words.'],settings:['Website','Metadata and the pixel-world introduction.'],media:['Media library','Upload images or PDFs. Files stay private until a published page references them.'],history:['Revision history','Restore a previous publication without losing its history.']};
let content,expectedVersion,active='profile',dirty=false,working=false;
nav.innerHTML=Object.entries(sections).map(([key,[label]])=>`<button type="button" data-section="${key}">${e(label)}</button>`).join('');
const get=path=>path.split('.').reduce((value,key)=>value?.[key],content);
function set(path,value){const keys=path.split('.');const last=keys.pop();const target=keys.reduce((v,k)=>v[k],content);target[last]=value;}
function message(text){status.textContent=text;}
function controls(){document.getElementById('save').disabled=working||!dirty||!content;document.getElementById('publish').disabled=working||!content;document.getElementById('draft-state').textContent=dirty?'UNSAVED CHANGES':'SAVED DRAFT';}
function changed(){dirty=true;controls();}
function field(path,label,kind='text',wide=false,note='') {
  const value=get(path);const id='field-'+path.replaceAll('.','-');
  const common=`id="${id}" data-path="${path}" data-kind="${kind}"`;
  const markup=kind==='checkbox'?`<input ${common} type="checkbox"${value?' checked':''}/>`:
    kind==='textarea'||kind==='paragraphs'||kind==='list'?`<textarea ${common} rows="${kind==='paragraphs'?6:3}">${e(Array.isArray(value)?value.join(kind==='paragraphs'?'\n\n':'\n'):value)}</textarea>`:
    `<input ${common} type="${kind==='email'?'email':kind==='number'?'number':'text'}" value="${e(value)}"${kind==='number'?' min="15" max="120" step="15"':` maxlength="${kind==='email'?254:kind==='url'?2048:4000}"`}/>`;
  return `<label class="${wide?'wide ':''}${kind==='checkbox'?'check-label':''}" for="${id}">${e(label)}${markup}${note?`<span class="field-note">${e(note)}</span>`:''}</label>`;
}
function cardActions(key,index){return `<div class="card-actions"><button type="button" data-move="${key}:${index}:-1">Move up ↑</button><button type="button" data-move="${key}:${index}:1">Move down ↓</button><button class="danger-button" type="button" data-remove="${key}:${index}">Remove from draft</button></div>`;}
function arrays(key){
  const items=get(key);
  return items.map((item,i)=>`<article class="editor-card"><h3>${e(item.title||item.heading||item.label||`Entry ${i+1}`)}</h3><div class="field-grid">${key==='projects'?field(`${key}.${i}.id`,'Unique ID')+field(`${key}.${i}.title`,'Title')+field(`${key}.${i}.summary`,'Summary','textarea',true)+field(`${key}.${i}.details`,'Details','textarea',true)+field(`${key}.${i}.url`,'Project link','url')+field(`${key}.${i}.repositoryUrl`,'Repository URL','url')+field(`${key}.${i}.demoUrl`,'Live demo URL','url')+field(`${key}.${i}.image`,'Image URL','url')+field(`${key}.${i}.category`,'Category')+field(`${key}.${i}.year`,'Year')+field(`${key}.${i}.tags`,'Tags','list',true,'One tag per line.'):
    key==='notes'?field(`${key}.${i}.id`,'Unique ID')+field(`${key}.${i}.title`,'Title')+field(`${key}.${i}.summary`,'Summary','textarea',true)+field(`${key}.${i}.paragraphs`,'Note','paragraphs',true,'Separate paragraphs with a blank line.'):
    key==='now.sections'?field(`${key}.${i}.heading`,'Heading','text',true)+field(`${key}.${i}.paragraphs`,'Content','paragraphs',true,'Separate paragraphs with a blank line.'):
    field(`${key}.${i}.label`,'Label')+field(`${key}.${i}.url`,'HTTPS link','url')}</div>${cardActions(key,i)}</article>`).join('')+`<button class="add-button" type="button" data-add="${key}">+ Add ${key==='projects'?'project':key==='notes'?'note':key==='now.sections'?'section':'social link'}</button>`;
}
async function render(){
  nav.querySelectorAll('button').forEach(button=>button.setAttribute('aria-current',button.dataset.section===active?'page':'false'));
  const [title,description]=sections[active];panel.innerHTML=`<h2>${title}</h2><p class="section-description">${description}</p>`;
  if(active==='media'){await renderMedia();return;}
  if(active==='history'){await renderHistory();return;}
  if(active==='github'){await renderGithubInbox({panel,api,message,isDirty:()=>dirty,isActive:()=>active==='github',onBusy:value=>{working=value;nav.inert=value;panel.inert=value;controls();},onContentChanged:loadDraft});return;}
  let body='';
  if(active==='profile')body=`<div class="editor-card field-grid">${field('profile.name','Your name')}${field('profile.status','Current status')}${field('profile.headline','Headline','textarea',true)}${field('profile.introduction','Introduction','textarea',true)}${field('profile.portrait','Portrait URL','url')}${field('profile.dottedPortrait','Dotted portrait URL','url')}${field('profile.pixelPortrait','Pixel portrait URL','url')}${field('profile.portraitCaption','Portrait caption')}</div>`;
  if(active==='about')body=`<div class="editor-card">${field('about.paragraphs','About you','paragraphs',true,'Separate paragraphs with a blank line. HTML is displayed as text.')}</div>`;
  if(active==='contact')body=`<div class="editor-card field-grid">${field('contact.email','Email','email')}${field('contact.phone','Phone (optional)')}${field('contact.location','Location (optional)')}${field('contact.heading','Contact heading')}${field('contact.message','Message','textarea',true)}${field('contact.resumeUrl','Resume / profile URL','url')}${field('contact.contactCardUrl','Contact card URL','url')}</div><h3>Meeting scheduling</h3><div class="editor-card field-grid">${field('contact.booking.url','Public booking page','url',true,'Paste a Cal.com event or Google Calendar appointment booking link. A Google Meet room link is not a booking page.')}${field('contact.booking.label','Button label')}${field('contact.booking.durationMinutes','Meeting length (minutes)','number')}${field('contact.booking.timezone','Your timezone','text',true,'For example: Asia/Kolkata. The scheduling provider handles availability, Meet links, confirmations, cancellation, and rescheduling.')}<p class="field-note wide">Set up a free booking page in Google Calendar → Create → Appointment schedule → Google Meet. Add a required meeting-purpose field, set your hours, and copy its public booking link. Until this link is saved and published, visitors can arrange a meeting by email.</p></div><h3>Social links</h3>${arrays('contact.socialLinks')}`;
  if(active==='skills')body=`<div class="editor-card">${field('skills','Skills','list',true,'One skill per line.')}</div>`;
  if(active==='projects'||active==='notes')body=arrays(active);
  if(active==='now')body=`<div class="editor-card field-grid">${field('now.title','Page title','text',true)}${field('now.introduction','Introduction','textarea',true)}</div>${arrays('now.sections')}`;
  if(active==='settings')body=`<div class="editor-card field-grid">${field('settings.siteTitle','Browser title','text',true)}${field('settings.description','Search description','textarea',true)}${field('settings.copyright','Footer credit','text',true)}${field('settings.pixelTitle','Pixel world heading','textarea',true)}${field('settings.pixelSubtitle','Pixel world introduction','textarea',true)}<label>Default wallpaper<select data-path="settings.defaultWallpaper"><option value="lavender"${get('settings.defaultWallpaper')==='lavender'?' selected':''}>Lavender</option><option value="mint"${get('settings.defaultWallpaper')==='mint'?' selected':''}>Mint</option><option value="peach"${get('settings.defaultWallpaper')==='peach'?' selected':''}>Peach</option></select></label>${field('settings.arcadeEnabled','Show the arcade building','checkbox')}</div>`;
  panel.insertAdjacentHTML('beforeend',body);
}
panel.addEventListener('input',event=>{
  const target=event.target;if(!target.dataset.path)return;
  let value=target.type==='checkbox'?target.checked:target.value;
  if(target.dataset.kind==='paragraphs')value=value.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
  if(target.dataset.kind==='list')value=value.split('\n').map(s=>s.trim()).filter(Boolean);
  if(target.dataset.kind==='number')value=Number(value);
  set(target.dataset.path,value);changed();
});
panel.addEventListener('change',event=>{if(event.target.matches('select[data-path]')){set(event.target.dataset.path,event.target.value);changed();}});
nav.addEventListener('click',event=>{const button=event.target.closest('[data-section]');if(!button)return;active=button.dataset.section;render().catch(error=>message(error.message));});
panel.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.add){const key=button.dataset.add,id=crypto.randomUUID().slice(0,8);const item=key==='projects'?{id:'project-'+id,title:'New project',summary:'',details:'',url:'',image:'',category:'Personal project',year:String(new Date().getFullYear()),tags:[]}:key==='notes'?{id:'note-'+id,title:'New note',summary:'',paragraphs:['']}:key==='now.sections'?{heading:'New section',paragraphs:['']}:{label:'',url:''};get(key).push(item);changed();render();}
  if(button.dataset.remove){const [key,index]=button.dataset.remove.split(':');get(key).splice(Number(index),1);changed();render();}
  if(button.dataset.move){const [key,index,direction]=button.dataset.move.split(':');const items=get(key),i=Number(index),next=i+Number(direction);if(next>=0&&next<items.length){[items[i],items[next]]=[items[next],items[i]];changed();render();}}
  if(button.dataset.restore){if(dirty){message('Save or reload your unsaved draft before restoring a publication.');return;}working=true;controls();try{await api('restore','POST',{revisionId:button.dataset.restore,expectedVersion});await loadDraft();message('Previous publication restored across all three worlds.');await render();}catch(error){message(error.message);}finally{working=false;controls();}}
  if(button.dataset.copy){try{await navigator.clipboard.writeText(button.dataset.copy);message('URL copied. Paste it into an image or document field.');}catch{message(button.dataset.copy);}}
});
function describe(error){return error.issues?.length?error.issues.map(i=>`${i.field}: ${i.message}`).join(' · '):error.message;}
async function save(){const result=await api('draft','PUT',{content,expectedVersion});content=result.content;expectedVersion=result.version;dirty=false;controls();message('Draft saved. The public worlds have not changed.');}
document.getElementById('save').addEventListener('click',async()=>{working=true;controls();try{await save();}catch(error){message(describe(error));}finally{working=false;controls();}});
document.getElementById('publish').addEventListener('click',async()=>{
  working=true;controls();try{if(dirty)await save();const dialog=document.getElementById('publish-dialog');dialog.returnValue='cancel';dialog.showModal();await new Promise(resolve=>dialog.addEventListener('close',resolve,{once:true}));if(dialog.returnValue==='publish'){await api('publish','POST',{expectedVersion});message('Published. Every world now uses this content; open interactive worlds refresh within 30 seconds.');}}
  catch(error){message(describe(error));}finally{working=false;controls();}
});
document.getElementById('logout').addEventListener('click',async()=>{working=true;controls();try{await api('logout','POST');dirty=false;location.assign('/admin/login/');}catch(error){message(error.message);working=false;controls();}});
async function renderHistory(){const result=await api('revisions');if(active!=='history')return;panel.insertAdjacentHTML('beforeend',`<div class="revision-list">${result.items.map(item=>`<article class="revision-card"><div><strong>Publication ${item.version}</strong><p>${e(new Date(item.publishedAt).toLocaleString())}</p></div><button type="button" data-restore="${e(item.id)}">Restore this version</button></article>`).join('')||'<p>No publications yet.</p>'}</div>`);}
async function renderMedia(){const config=await api('config');if(active!=='media')return;if(!config.mediaEnabled){panel.insertAdjacentHTML('beforeend','<div class="editor-card"><h2>Image URLs are ready to use.</h2><p>Paste an HTTPS image URL or an existing asset path into Profile or Projects. File uploads need a Firebase Storage bucket before they can be enabled.</p></div>');return;}const result=await api('media-list');if(active!=='media')return;panel.insertAdjacentHTML('beforeend',`<div class="editor-card"><label>Upload an image or PDF<input id="upload-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"/></label><p class="field-note">Maximum 2 MB. Uploads remain private until referenced by published content.</p><button id="upload" type="button">Upload file ↗</button></div><div class="media-list">${result.items.map(item=>`<article class="media-card">${item.type.startsWith('image/')?`<img src="${e(item.url)}" alt="${e(item.name)}"/>`:'<strong>PDF document</strong>'}<p>${e(item.name)}</p><p>${item.published?'Published':'Private draft asset'}</p><button type="button" data-copy="${e(item.url)}">Copy URL</button></article>`).join('')}</div>`);document.getElementById('upload').addEventListener('click',upload);}
async function upload(){const file=document.getElementById('upload-file').files[0];if(!file){message('Choose a file first.');return;}if(file.size>2_000_000){message('Choose a file smaller than 2 MB.');return;}working=true;controls();try{const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});const result=await api('media-upload','POST',{name:file.name,type:file.type,data});message(`Uploaded ${result.name}. Copy its URL into the relevant content field.`);await render();}catch(error){message(error.message);}finally{working=false;controls();}}
async function loadDraft(){const result=await api('draft');content=result.content;content.contact.booking||={url:'',label:'Book a conversation',durationMinutes:30,timezone:'Asia/Kolkata'};content.projects.forEach(project=>{project.repositoryUrl??='';project.demoUrl??='';});expectedVersion=result.version;dirty=false;}
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
async function start(){try{const session=await api('session');document.getElementById('admin-identity').textContent=session.user.email+' · '+session.user.role;await loadDraft();await render();message('Your saved draft is ready. Publishing updates all three worlds.');controls();}catch(error){if(error.status===401||error.status===403){location.replace('/admin/login/');return;}message(error.message);}}
start();
