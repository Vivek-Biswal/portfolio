import {initialContent,subscribeContent} from '../shared/public-client.js';
import {renderLineProjects} from './project-content.js';

const root=document.documentElement,main=document.querySelector('#case-main');
const themeButton=document.querySelector('.theme-toggle'),motionButton=document.querySelector('#motion-toggle');
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const systemTheme=window.matchMedia('(prefers-color-scheme: dark)');
const read=key=>{try{return localStorage.getItem(key);}catch{return null;}};
const save=(key,value)=>{try{localStorage.setItem(key,value);}catch{/* Controls work without storage. */}};
let content=initialContent,markup=renderLineProjects(content);
let theme=read('vivek-2d-theme'),motion=read('vivek-2d-motion');
let explicitTheme=theme==='light'||theme==='dark';
function applyTheme(value){
  theme=value==='light'?'light':'dark';root.dataset.theme=theme;
  const dark=theme==='dark';themeButton.hidden=false;
  themeButton.setAttribute('aria-pressed',String(dark));
  themeButton.setAttribute('aria-label',`Switch to ${dark?'light':'dark'} theme`);
  themeButton.querySelector('.theme-label').textContent=dark?'Light':'Dark';
  document.querySelector('meta[name="theme-color"]').content=dark?'#141510':'#eeeee3';
}
function applyMotion(){
  const enabled=!reduced.matches&&motion!=='off';root.dataset.motion=enabled?'on':'off';
  motionButton.hidden=false;motionButton.disabled=reduced.matches;
  motionButton.setAttribute('aria-pressed',String(enabled));
  motionButton.setAttribute('aria-label',reduced.matches?'Motion disabled by your reduced-motion preference':enabled?'Pause decorative motion':'Enable decorative motion');
  motionButton.querySelector('.motion-label').textContent=enabled?'Motion on':'Motion off';
}
themeButton.addEventListener('click',()=>{explicitTheme=true;applyTheme(theme==='dark'?'light':'dark');save('vivek-2d-theme',theme);});
motionButton.addEventListener('click',()=>{motion=root.dataset.motion==='on'?'off':'on';save('vivek-2d-motion',motion);applyMotion();});
systemTheme.addEventListener('change',event=>{if(!explicitTheme)applyTheme(event.matches?'dark':'light');});
reduced.addEventListener('change',applyMotion);
applyTheme(explicitTheme?theme:'dark');applyMotion();

function selectedId(){
  if(!location.hash.startsWith('#project-'))return null;
  try{return decodeURIComponent(location.hash.slice(9));}catch{return null;}
}
function syncRoute(focus=false,animate=focus){
  const id=selectedId(),selected=content.projects.find(project=>project.id===id);
  // Replacing CMS nodes can invalidate the browser's original :target node.
  // Reapply selection by stable ID; CSS :target remains the no-script fallback.
  main.dataset.routeReady='true';
  for(const article of main.querySelectorAll('.case-study')){
    const active=Boolean(selected)&&article.dataset.projectId===selected.id;
    article.classList.toggle('is-selected',active);
    article.classList.toggle('is-entering',active&&animate);
  }
  document.title=`${selected?.title||'Selected work'} — ${content.profile.name} — 2D`;
  const description=document.querySelector('meta[name="description"]');
  description.content=selected?.summary||content.settings.description;
  const notice=main.querySelector('.case-unavailable');
  if(notice)notice.hidden=!location.hash.startsWith('#project-')||Boolean(selected);
  if(focus){
    const heading=document.getElementById(selected?`case-title-${selected.id}`:'case-index-title');
    heading?.focus({preventScroll:true});
  }
}
// Native links, history and CSS :target select the article even without JS.
window.addEventListener('hashchange',()=>syncRoute(true));
syncRoute(false,true);
subscribeContent(next=>{
  const before=content.projects.find(project=>project.id===selectedId());
  content=next;
  const nextMarkup=renderLineProjects(content);
  if(nextMarkup!==markup){
    const active=document.activeElement,inside=main.contains(active);
    const activeId=inside?active.id:null,activeHref=inside?active.getAttribute('href'):null;
    const y=window.scrollY;
    main.innerHTML=nextMarkup;markup=nextMarkup;
    syncRoute();
    const current=content.projects.find(project=>project.id===selectedId());
    if(before&&!current){
      main.querySelector('#case-index-title')?.focus();
    }else{
      const surface=main.querySelector('.case-study.is-selected')||main.querySelector('.case-catalog');
      const replacement=activeId?document.getElementById(activeId):activeHref?[...surface.querySelectorAll('a[href]')].find(link=>link.getAttribute('href')===activeHref):null;
      replacement?.focus({preventScroll:true});
      window.scrollTo({top:y,behavior:'instant'});
    }
  }
  const first=content.profile.name.trim().split(/\s+/)[0];
  const wordmark=document.querySelector('.signature');
  wordmark.replaceChildren(document.createTextNode(first.toLowerCase()));
  const dot=document.createElement('span');dot.setAttribute('aria-hidden','true');dot.textContent='.';wordmark.append(dot);
  document.querySelector('.footer>span').textContent=content.settings.copyright;
  syncRoute();
});
