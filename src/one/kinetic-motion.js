import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {letterScatter,textSegments,motionIsEnabled,fittedNameSize} from './kinetic-math.js';
import {mountSectionMotion} from './section-motion.js';

gsap.registerPlugin(ScrollTrigger);

function splitGlyphs(element){
 const original=element.innerHTML,label=element.getAttribute('aria-label');
 const spoken=element.cloneNode(true);spoken.querySelectorAll('br').forEach(br=>br.replaceWith(document.createTextNode(' ')));
 const text=spoken.textContent||'',isHeading=/^H[1-6]$/.test(element.tagName)||element.getAttribute('role')==='heading';
 const labelledHeading=element.parentElement?.closest('h1[aria-label],h2[aria-label],h3[aria-label],h4[aria-label],h5[aria-label],h6[aria-label],[role="heading"][aria-label]');
 const hidden=element.getAttribute('aria-hidden');
 // Heading labels provide one accessible name. Generic paragraphs instead need
 // real text: aria-label alone is not consistently announced on a <p>.
 if(isHeading&&!label)element.setAttribute('aria-label',text.trim());
 const chars=[],walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT),nodes=[];let wordIndex=0;
 while(walker.nextNode())nodes.push(walker.currentNode);
 // Preserve authored line breaks, emphasis and spans instead of flattening a
 // heading's structure when a designer intentionally sets separate lines.
 for(const node of nodes){
  const fragment=document.createDocumentFragment();
  for(const word of node.textContent.split(/(\s+)/)){
   if(!word)continue;
   if(/^\s+$/.test(word)){const space=document.createElement('span');space.setAttribute('aria-hidden','true');space.textContent=word;fragment.append(space);continue;}
   const wrapper=document.createElement('span');wrapper.className='kinetic-word';wrapper.dataset.word=String(wordIndex++);wrapper.setAttribute('aria-hidden','true');
   for(const letter of textSegments(word)){
    const span=document.createElement('span');span.className='kinetic-char';span.textContent=letter;wrapper.append(span);chars.push(span);
   }
   fragment.append(wrapper);
  }
  node.replaceWith(fragment);
 }
 let accessible=null;
 if(!isHeading&&!labelledHeading){accessible=document.createElement('span');accessible.className='sr-only';accessible.textContent=label||text.trim();element.append(accessible);}
 return {chars,restore(){
  // Restore the original DOM only for this exact element. Detached CMS nodes do
  // not overwrite newly rendered content or its fresh labels.
  if(chars.length&&!element.contains(chars[0])){
   if(isHeading&&label===null&&element.getAttribute('aria-label')===text.trim())element.removeAttribute('aria-label');
   return;
  }
  element.innerHTML=original;
  if(label===null)element.removeAttribute('aria-label');else element.setAttribute('aria-label',label);
  if(hidden===null)element.removeAttribute('aria-hidden');else element.setAttribute('aria-hidden',hidden);
 }};
}

/** Motion is an enhancement over native scrolling, links, headings and details. */
export function mountKineticJourney(){
 const root=document.documentElement,button=document.querySelector('#motion-toggle'),label=button?.querySelector('.motion-label');
 let saved=null,media=null,frame=0,disposed=false,fitContainer=null,lastFitWidth=-1;
 const nameRows=new Map();
 function fitNames(){
  for(const [row,record] of nameRows)if(!row.isConnected){restoreSize(row,record);nameRows.delete(row);}
  const container=document.querySelector('.intro-copy');if(!container)return;
  const available=container.clientWidth;if(!available)return;
  for(const row of container.querySelectorAll('#hello-title .name-first, #hello-title .name-last')){
   if(!nameRows.has(row))nameRows.set(row,{value:row.style.getPropertyValue('font-size'),priority:row.style.getPropertyPriority('font-size')});
   const record=nameRows.get(row),clone=row.cloneNode(true);
   clone.removeAttribute('id');clone.setAttribute('aria-hidden','true');
   if(record.value)clone.style.setProperty('font-size',record.value,record.priority);else clone.style.removeProperty('font-size');
   Object.assign(clone.style,{position:'fixed',left:'-100000px',top:'0',width:'max-content',maxWidth:'none',height:'auto',opacity:'0',pointerEvents:'none',transform:'none'});
   clone.querySelectorAll('*').forEach(child=>{child.style.transform='none';});
   row.parentElement.append(clone);
   const base=parseFloat(getComputedStyle(clone).fontSize),natural=clone.getBoundingClientRect().width;
   clone.remove();
   const size=fittedNameSize(base,natural,available*.985);
   if(size<base-.1){const next=`${size.toFixed(3)}px`;if(row.style.fontSize!==next)row.style.fontSize=next;}else restoreSize(row,record);
  }
 }
 function restoreSize(row,record){if(record.value){if(row.style.getPropertyValue('font-size')!==record.value)row.style.setProperty('font-size',record.value,record.priority);}else if(row.style.getPropertyValue('font-size'))row.style.removeProperty('font-size');}
 const fitObserver=typeof ResizeObserver==='function'?new ResizeObserver(entries=>{
  const entry=entries.find(item=>item.target===fitContainer);if(!entry)return;
  // Letter fitting can change the column's height. Only width changes schedule
  // another measurement, preventing a ResizeObserver height-feedback loop.
  const width=entry.contentRect.width;if(Math.abs(width-lastFitWidth)<.25)return;lastFitWidth=width;refresh();
 }):null;
 function watchNames(){const next=document.querySelector('.intro-copy');if(next===fitContainer)return;if(fitContainer)fitObserver?.unobserve(fitContainer);fitContainer=next;lastFitWidth=-1;if(next)fitObserver?.observe(next);}
 try{saved=localStorage.getItem('vivek-2d-motion');}catch{/* The control still works without storage. */}

 function refresh(){
  if(disposed||frame)return;
  frame=requestAnimationFrame(()=>{frame=0;if(!disposed){fitNames();ScrollTrigger.refresh();}});
 }
 function rebuild(){
  if(disposed)return;
  media?.revert();media=gsap.matchMedia();
  watchNames();fitNames();
  media.add({mobile:'(max-width: 800px)',desktop:'(min-width: 801px)',reduced:'(prefers-reduced-motion: reduce)'},context=>{
   const {mobile,reduced}=context.conditions,enabled=motionIsEnabled(saved,reduced);
   document.body.classList.toggle('motion-enabled',enabled);root.dataset.motion=enabled?'on':'off';
   if(button){button.hidden=false;button.disabled=reduced;button.setAttribute('aria-pressed',String(enabled));button.setAttribute('aria-label',reduced?'Motion disabled by your reduced-motion preference':enabled?'Pause decorative motion':'Enable decorative motion');button.title=reduced?'Follows your device’s reduced-motion preference':'';}
   if(label)label.textContent=enabled?'Motion on':'Motion off';
   if(!enabled)return ()=>document.body.classList.remove('motion-enabled');

   const restorers=[],imageListeners=[],query=selector=>[...document.querySelectorAll(selector)];
   const split=selector=>query(selector).flatMap(element=>{const item=splitGlyphs(element);restorers.push(item.restore);return item.chars;});
   const hero=document.querySelector('.hero-stage'),heroChars=split('#hello-title .name-first, #hello-title .name-last');
   if(hero&&heroChars.length){
    gsap.to(heroChars,{x:i=>letterScatter(i,{mobile}).x,y:i=>letterScatter(i,{mobile}).y-50,rotation:i=>letterScatter(i,{mobile}).rotation,scale:i=>letterScatter(i,{mobile}).scale,opacity:.12,stagger:{amount:.12,from:'center'},ease:'none',scrollTrigger:{trigger:hero,start:'top top',end:'bottom top',scrub:mobile?.6:1.05,invalidateOnRefresh:true}});
   }
   const portrait=document.querySelector('.hero-portrait');
   if(hero&&portrait)gsap.to(portrait,{yPercent:mobile?-8:-19,rotation:mobile?3:8,scale:.92,ease:'none',scrollTrigger:{trigger:hero,start:'top top',end:'bottom top',scrub:1}});

   // The statement assembles from a repeatable cloud, then stays readable.
   for(const phrase of query('[data-kinetic-phrase]')){
    const item=splitGlyphs(phrase);restorers.push(item.restore);
    gsap.from(item.chars,{x:i=>letterScatter(i+11,{mobile,strength:1.6}).x,y:i=>letterScatter(i+11,{mobile,strength:1.4}).y,rotation:i=>letterScatter(i+11,{mobile}).rotation,scale:i=>letterScatter(i+11,{mobile}).scale,opacity:.08,stagger:{amount:.3,from:'center'},ease:'power2.out',scrollTrigger:{trigger:phrase.closest('.motion-intro')||phrase,start:'top 85%',end:'center 55%',scrub:1,invalidateOnRefresh:true}});
   }
   for(const title of query('#work-title, #ideas-title, #contact-title')){
    const item=splitGlyphs(title);restorers.push(item.restore);
    gsap.from(item.chars,{yPercent:mobile?45:85,rotation:i=>(i%2?1:-1)*6,opacity:.15,stagger:.025,ease:'power2.out',scrollTrigger:{trigger:title,start:'top 93%',end:'top 58%',scrub:.7,invalidateOnRefresh:true}});
   }
   // Text-only spans preserve the identity of the real project/note links.
   // Longer CMS titles use the same entrance as a block to limit DOM overhead.
   for(const title of query('.project-title-text, .note-card-title')){
    let targets=[title];
    if(textSegments(title.textContent).length<=120){const item=splitGlyphs(title);restorers.push(item.restore);targets=item.chars;}
    gsap.from(targets,{yPercent:60,rotation:i=>i%3===0?-9:4,opacity:.1,stagger:{amount:.25,from:'start'},ease:'power3.out',scrollTrigger:{trigger:title.closest('.project-heading')||title.closest('a'),start:'top 94%',end:'top 64%',scrub:.6,invalidateOnRefresh:true}});
   }

   query('.letter-cloud span').forEach((glyph,i)=>{
    const section=glyph.closest('.motion-intro')||glyph.parentElement;
    const scatter=letterScatter(i+31,{mobile,strength:1.2});
    gsap.fromTo(glyph,{x:scatter.x*.25,y:120+scatter.y,rotation:scatter.rotation-20,scale:.4,opacity:0},{x:-scatter.x,y:-140+scatter.y,rotation:scatter.rotation+40,scale:1.2,opacity:.8,ease:'none',scrollTrigger:{trigger:section,start:'top bottom',end:'bottom top',scrub:.8,invalidateOnRefresh:true}});
   });
   for(const ribbon of query('.scroll-ribbon')){
    const track=ribbon.querySelector('.ribbon-track');if(!track)continue;
    gsap.fromTo(track,{xPercent:0},{xPercent:mobile?-15:-23,ease:'none',scrollTrigger:{trigger:ribbon,start:'top bottom',end:'bottom top',scrub:1,invalidateOnRefresh:true}});
   }
   query('[data-reveal]').forEach(element=>{
    gsap.from(element,{y:mobile?24:50,opacity:.22,ease:'power2.out',scrollTrigger:{trigger:element,start:'top 96%',end:'top 72%',scrub:.65,invalidateOnRefresh:true}});
   });
   query('.project .project-preview img').forEach(image=>{
    gsap.fromTo(image,{scale:1.12,yPercent:-3},{scale:1,yPercent:3,ease:'none',scrollTrigger:{trigger:image.closest('.project-preview'),start:'top bottom',end:'bottom top',scrub:.8,invalidateOnRefresh:true}});
   });
   query('.ideas-graphic svg, .contact-spark svg, .hero-orbit svg').forEach(symbol=>{
    gsap.to(symbol,{rotation:195,ease:'none',scrollTrigger:{trigger:symbol.closest('.stop')||symbol,start:'top bottom',end:'bottom top',scrub:1.2}});
   });

   // Pointer motion has no render loop. quickTo sleeps after the last pointer
   // event, while ScrollTrigger only reads scroll positions when they change.
   const pointerTweens=query('.ambient-orb').map((orb,i)=>{
    gsap.to(orb,{scale:i?1.3:.75,opacity:i?.22:.4,ease:'none',scrollTrigger:{trigger:document.querySelector('.journey')||document.body,start:'top top',end:'bottom bottom',scrub:1.5,invalidateOnRefresh:true}});
    return {x:gsap.quickTo(orb,'x',{duration:1.5,ease:'power2.out'}),y:gsap.quickTo(orb,'y',{duration:1.5,ease:'power2.out'}),amount:(i?32:48)*(mobile?.5:1)};
   });
   const pointer=event=>{if(event.pointerType==='touch'||document.hidden||document.querySelector('dialog[open]'))return;const x=event.clientX/innerWidth-.5,y=event.clientY/innerHeight-.5;pointerTweens.forEach(tween=>{tween.x(x*tween.amount);tween.y(y*tween.amount);});};
   const rest=()=>pointerTweens.forEach(tween=>{tween.x(0);tween.y(0);});
   window.addEventListener('pointermove',pointer,{passive:true});window.addEventListener('blur',rest);document.addEventListener('visibilitychange',rest);
   const disposeSections=mountSectionMotion({mobile,refresh});
   for(const image of query('.journey img'))if(!image.complete){image.addEventListener('load',refresh,{once:true});imageListeners.push(image);}
   refresh();
   return ()=>{
    disposeSections();
    window.removeEventListener('pointermove',pointer);window.removeEventListener('blur',rest);document.removeEventListener('visibilitychange',rest);
    imageListeners.forEach(image=>image.removeEventListener('load',refresh));restorers.reverse().forEach(restore=>restore());document.body.classList.remove('motion-enabled');
   };
  });
 }
 const toggle=()=>{saved=root.dataset.motion==='on'?'off':'on';try{localStorage.setItem('vivek-2d-motion',saved);}catch{}rebuild();};
 button?.addEventListener('click',toggle);
 document.addEventListener('portfolio:content-updated',rebuild);
 const detail=event=>{if(event.target instanceof HTMLDetailsElement)refresh();};document.addEventListener('toggle',detail,true);
 window.addEventListener('load',refresh,{once:true});document.fonts?.ready.then(refresh);
 rebuild();
 return {refresh,destroy(){disposed=true;cancelAnimationFrame(frame);media?.revert();fitObserver?.disconnect();nameRows.forEach((record,row)=>restoreSize(row,record));nameRows.clear();button?.removeEventListener('click',toggle);document.removeEventListener('portfolio:content-updated',rebuild);document.removeEventListener('toggle',detail,true);window.removeEventListener('load',refresh);delete root.dataset.motion;}};
}
