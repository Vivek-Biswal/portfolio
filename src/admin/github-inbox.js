import {escapeHtml as e} from '../shared/content.js';

let inbox,filter='pending';
const edits=new Map();
const date=value=>value?new Date(value).toLocaleString(): 'Not checked yet';
const filters=[['pending','Pending'],['published','Published'],['rejected','Rejected'],['unpublished','Unpublished'],['all','All repositories']];
const tags=candidate=>[...new Set([candidate.language,...candidate.topics].filter(Boolean))].slice(0,20);

function latestProject(item){
  const source=item.candidate;
  return {...item.project,title:source.name,summary:source.description||item.project.summary,
    demoUrl:source.demoUrl,repositoryUrl:source.repositoryUrl,url:source.demoUrl||source.repositoryUrl,tags:tags(source)};
}
function projectFor(item){
  const edit=edits.get(item.repositoryId);
  if(edit?.fingerprint===item.fingerprint&&edit.draftVersion===inbox.draftVersion&&edit.publishedVersion===inbox.publishedVersion)return edit.project;
  if(edit)edits.delete(item.repositoryId);
  return structuredClone(item.project);
}
function input(project,key,label,{wide=false,textarea=false,required=false,max=2048}={}){
  const id=`github-${project.githubId}-${key}`;
  return `<label class="${wide?'wide':''}" for="${id}">${label}${textarea?`<textarea id="${id}" name="${key}" data-review-field="${key}" rows="${key==='summary'?3:4}" maxlength="${max}"${required?' required':''}>${e(key==='tags'?project.tags.join('\n'):project[key])}</textarea>`:`<input id="${id}" name="${key}" data-review-field="${key}" value="${e(project[key])}" maxlength="${max}"${required?' required':''}/>`}</label>`;
}
function repositoryCard(item){
  const c=item.candidate,p=projectFor(item);
  const state=item.reviewState==='pending'?(item.published?'Update awaiting review':'Awaiting review'):item.reviewState==='rejected'?'Rejected':item.published?'Approved and published':'Unpublished';
  return `<details class="github-repository" data-repository="${item.repositoryId}"><summary><span><strong>${e(c.name)}</strong><small>${e(c.fullName)}</small></span><span class="github-badges"><span class="github-status" data-review-state="${e(item.reviewState)}">${state}</span>${!item.available?'<span class="github-status">Unavailable on GitHub</span>':''}${c.archived?'<span class="github-status">Archived</span>':''}</span></summary><div class="github-preview"><div class="github-source"><p class="eyebrow">DETECTED ON GITHUB</p><p>${e(c.description||'No repository description yet.')}</p><dl><div><dt>Technology</dt><dd>${e(tags(c).join(', ')||'Not specified')}</dd></div><div><dt>Last push</dt><dd>${e(date(c.pushedAt))}</dd></div><div><dt>Repository</dt><dd><a href="${e(c.repositoryUrl)}" target="_blank" rel="noopener noreferrer">${e(c.fullName)} ↗</a></dd></div>${c.demoUrl?`<div><dt>Live demo</dt><dd><a href="${e(c.demoUrl)}" target="_blank" rel="noopener noreferrer">${e(c.demoUrl)} ↗</a></dd></div>`:''}</dl>${item.published?'<p class="field-note">Your approved public version stays unchanged until you approve an update.</p>':''}${!item.available?'<p class="field-note">This repository is missing, private, or unavailable. It cannot be approved. An existing public entry remains under your control.</p>':''}</div><form class="github-review-form" data-review-form="${item.repositoryId}"><div class="github-edit-heading"><h3>Portfolio preview</h3><button type="button" data-github-latest="${item.repositoryId}"${!item.available?' disabled':''}>Use GitHub details</button></div><p class="field-note">Edit the title, description, links, and technologies before publishing. Only this project will be published.</p><div class="field-grid">${input(p,'title','Project title',{required:true,max:200})}${input(p,'id','Unique project ID',{required:true,max:80})}${input(p,'summary','Description',{wide:true,textarea:true,required:true,max:2000})}${input(p,'details','Additional details',{wide:true,textarea:true,max:6000})}${input(p,'demoUrl','Live demo URL')}${input(p,'url','Primary project link')}${input(p,'image','Image URL or existing asset path')}${input(p,'category','Category',{required:true,max:100})}${input(p,'year','Year',{required:true,max:20})}${input(p,'tags','Technologies / tags (one per line)',{wide:true,textarea:true,max:1200})}</div><div class="github-review-actions"><button type="submit" class="primary"${!item.available?' disabled':''}>${item.published?'Approve and publish update':'Approve and publish project'} ↗</button><button type="button" data-github-review="reject" data-id="${item.repositoryId}">Reject${item.published?' update':''}</button><button type="button" data-github-review="pending" data-id="${item.repositoryId}">Keep pending</button>${item.published?`<button type="button" class="danger-button" data-github-review="unpublish" data-id="${item.repositoryId}">Unpublish project</button>`:''}</div></form></div></details>`;
}

export async function renderGithubInbox({panel,api,message,isDirty,isActive,onBusy,onContentChanged}){
  const mount=document.createElement('div');mount.className='github-inbox';mount.textContent='Loading your GitHub inbox…';panel.append(mount);
  let busy=false;
  function paint(openId){
    if(!isActive()||!mount.isConnected)return;
    const items=inbox.items.filter(item=>filter==='all'||filter==='published'&&item.published||['pending','rejected','unpublished'].includes(filter)&&item.reviewState===filter);
    mount.innerHTML=`<div class="github-toolbar editor-card"><div><h3><a href="https://github.com/${encodeURIComponent(inbox.owner)}" target="_blank" rel="noopener noreferrer">${e(inbox.owner)} ↗</a></h3><p>Public repositories only. Discovery never publishes a project.</p><p class="field-note">Last checked: ${e(date(inbox.lastSyncAt))}. ${inbox.cronReady?'A private daily scan is configured.':'Daily scans need the server’s private scheduling secret. Manual checks are available.'}</p>${inbox.refreshAvailableAt>Date.now()?`<p class="field-note">Manual refresh available after ${e(date(inbox.refreshAvailableAt))}.</p>`:''}${inbox.lastSyncError?`<p role="status">${e(inbox.lastSyncError)}</p>`:''}${inbox.summary.truncated?'<p role="status">This inbox is limited to 500 repositories. Some sources may not have been checked.</p>':''}</div><button type="button" data-github-sync${busy||inbox.syncInProgress?' disabled':''}>${busy?'Checking…':'Check GitHub now'}</button></div><nav class="github-filters" aria-label="Repository review filter">${filters.map(([key,label])=>`<button type="button" data-github-filter="${key}" aria-pressed="${filter===key}">${label}${key==='pending'?` · ${inbox.summary.pending}`:key==='published'?` · ${inbox.summary.published}`:''}</button>`).join('')}</nav><div class="github-repositories">${items.length?items.map(repositoryCard).join(''):`<div class="editor-card github-empty"><h3>${inbox.items.length?'Nothing in this view.':'Your next project starts here.'}</h3><p>${inbox.items.length?'Choose another filter to review your repositories.':'Check GitHub to discover your existing public repositories. They will appear here for review.'}</p></div>`}</div>`;
    if(openId)mount.querySelector(`[data-repository="${openId}"]`)?.setAttribute('open','');
  }
  async function action(task,success,{contentChange=false,repositoryId}={}){
    if(busy)return;
    if(contentChange&&isDirty()){message('Save your unsaved draft before reviewing a GitHub publication. Your other draft changes will stay unpublished.');return;}
    busy=true;onBusy(true);mount.setAttribute('aria-busy','true');mount.querySelectorAll('button').forEach(button=>button.disabled=true);
    try{inbox=await task();if(contentChange)await onContentChanged();if(repositoryId)edits.delete(repositoryId);message(success);paint(repositoryId);}
    catch(error){message(error.message);if(error.status===409){inbox=await api('github-inbox').catch(()=>inbox);paint(repositoryId);}}
    finally{busy=false;onBusy(false);mount.removeAttribute('aria-busy');paint(repositoryId);}
  }
  async function review(item,decision){
    const contentChange=['approve','unpublish'].includes(decision);
    const project=projectFor(item);
    await action(()=>api('github-review','POST',{repositoryId:item.repositoryId,expectedFingerprint:item.fingerprint,expectedVersion:item.version,decision,...(contentChange?{expectedDraftVersion:inbox.draftVersion,expectedPublishedVersion:inbox.publishedVersion}:{}),...(decision==='approve'?{project}:{})}),decision==='approve'?'Approved. This project is now published across all three worlds.':decision==='unpublish'?'Project unpublished. Its GitHub repository is unchanged.':decision==='reject'?'Suggestion rejected. The approved public version, if any, is unchanged.':'Kept pending. Nothing was published.',{contentChange,repositoryId:item.repositoryId});
  }
  mount.addEventListener('input',event=>{
    const key=event.target.dataset.reviewField,details=event.target.closest('[data-repository]');if(!key||!details)return;
    const item=inbox.items.find(item=>item.repositoryId===Number(details.dataset.repository));if(!item)return;
    const project=projectFor(item);project[key]=key==='tags'?event.target.value.split('\n').map(value=>value.trim()).filter(Boolean):event.target.value;
    edits.set(item.repositoryId,{fingerprint:item.fingerprint,draftVersion:inbox.draftVersion,publishedVersion:inbox.publishedVersion,project});
  });
  mount.addEventListener('submit',event=>{
    const form=event.target.closest('[data-review-form]');if(!form)return;event.preventDefault();
    if(!form.reportValidity())return;
    const item=inbox.items.find(item=>item.repositoryId===Number(form.dataset.reviewForm));if(item)review(item,'approve');
  });
  mount.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||busy)return;
    if(button.dataset.githubFilter){filter=button.dataset.githubFilter;paint();return;}
    if(button.hasAttribute('data-github-sync')){
      if(inbox.refreshAvailableAt>Date.now()){message(`Wait until ${date(inbox.refreshAvailableAt)} before checking GitHub again.`);return;}
      action(()=>api('github-sync','POST',{}),'GitHub checked. New repositories and updates are waiting for your review.');return;
    }
    if(button.dataset.githubLatest){const item=inbox.items.find(item=>item.repositoryId===Number(button.dataset.githubLatest));if(item){edits.set(item.repositoryId,{fingerprint:item.fingerprint,draftVersion:inbox.draftVersion,publishedVersion:inbox.publishedVersion,project:latestProject(item)});paint(item.repositoryId);}return;}
    if(button.dataset.githubReview){const item=inbox.items.find(item=>item.repositoryId===Number(button.dataset.id));if(item)review(item,button.dataset.githubReview);}
  });
  try{inbox=await api('github-inbox');paint();}catch(error){if(isActive())mount.textContent=error.message;message(error.message);}
}
