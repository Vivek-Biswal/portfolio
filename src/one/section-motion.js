import {gsap} from 'gsap';
import {letterScatter} from './kinetic-math.js';

/** Called inside the journey's matchMedia context so every tween is reversible. */
export function mountSectionMotion({mobile,refresh}){
 const query=selector=>[...document.querySelectorAll(selector)],cleanups=[],rests=[];
 const listen=(target,event,handler,options)=>{target.addEventListener(event,handler,options);cleanups.push(()=>target.removeEventListener(event,handler,options));};
 const track=(element,vars,start='top 94%',end='top 42%')=>gsap.from(element,{...vars,scrollTrigger:{trigger:element,start,end,scrub:.85,invalidateOnRefresh:true}});

 query('.hero-satellite').forEach((element,i)=>{
  gsap.to(element,{xPercent:i?-25:30,yPercent:i?-85:65,rotation:i?35:-38,ease:'none',scrollTrigger:{trigger:element.closest('.hero-stage'),start:'top top',end:'bottom top',scrub:1.4}});
 });
 const skills=query('.skill-chip');
 if(skills.length)gsap.from(skills,{x:i=>letterScatter(i+60,{mobile}).x*.4,y:i=>Math.abs(letterScatter(i+60,{mobile}).y)*.55+30,rotation:i=>(i%2?1:-1)*(mobile?9:22),scale:.72,opacity:.08,stagger:{amount:.35,from:'center'},ease:'back.out(1.2)',scrollTrigger:{trigger:skills[0].closest('.skill-orbit'),start:'top 96%',end:'center 65%',scrub:.8,invalidateOnRefresh:true}});

 query('.project-preview').forEach((preview,i)=>{
  gsap.fromTo(preview,{clipPath:mobile?'inset(6% 4% 6% 4% round 30px)':'inset(12% 10% 12% 10% round 80px)',y:mobile?25:55,rotation:i%2?-2:2,scale:.94},{clipPath:'inset(0% 0% 0% 0% round 0px)',y:0,rotation:0,scale:1,ease:'power2.out',scrollTrigger:{trigger:preview,start:'top 94%',end:'top 26%',scrub:1,invalidateOnRefresh:true}});
  const number=preview.querySelector('.project-ghost-index');
  if(number)gsap.fromTo(number,{yPercent:18,xPercent:i%2?-10:10},{yPercent:-16,xPercent:i%2?10:-10,ease:'none',scrollTrigger:{trigger:preview,start:'top bottom',end:'bottom top',scrub:1.1}});
 });
 for(const trackElement of query('.project-ticker-track, .contact-ticker-track')){
  const contact=trackElement.classList.contains('contact-ticker-track');
  gsap.fromTo(trackElement,{xPercent:contact?-18:0},{xPercent:contact?0:-24,ease:'none',scrollTrigger:{trigger:trackElement.parentElement,start:'top bottom',end:'bottom top',scrub:1.2,invalidateOnRefresh:true}});
 }
 query('.project-copy').forEach(copy=>{
  track(copy,{y:mobile?22:48,opacity:.15,ease:'power2.out'});
  const tags=copy.querySelectorAll('.tags li');
  if(tags.length)gsap.from(tags,{y:24,rotation:i=>i%2?9:-9,opacity:.1,stagger:.07,ease:'back.out(1.5)',scrollTrigger:{trigger:copy,start:'top 92%',end:'bottom 78%',scrub:.65}});
 });
 query('.note-list > a').forEach((note,i)=>{
  const direction=i%2?1:-1;
  track(note,{x:direction*(mobile?25:90),y:mobile?20:50,rotation:direction*(mobile?3:8),scale:.95,opacity:.18,ease:'power2.out'},'top 99%','top 66%');
 });
 query('.contact-channel').forEach((channel,i)=>track(channel,{x:(mobile?25:70)*(i%2?1:-1),y:25,opacity:.15,rotation:i%2?2:-2,ease:'power2.out'},'top 98%','top 76%'));
 const orbit=document.querySelector('.contact-orbit');
 if(orbit)gsap.to(orbit,{rotation:240,ease:'none',scrollTrigger:{trigger:'#contact',start:'top bottom',end:'bottom bottom',scrub:1.3}});

 // CSS handles static layouts. Desktop pointer effects never capture movement
 // or change destinations; focus and touch still use ordinary native links.
 if(!mobile&&matchMedia('(hover: hover) and (pointer: fine)').matches){
  query('.project-preview, .portrait-frame').forEach(surface=>{
   gsap.set(surface,{transformPerspective:1000});
   const x=gsap.quickTo(surface,'rotationX',{duration:.65,ease:'power3.out'}),y=gsap.quickTo(surface,'rotationY',{duration:.65,ease:'power3.out'});
   const rest=()=>{x(0);y(0);};rests.push(rest);
   listen(surface,'pointermove',event=>{
    if(event.pointerType==='touch'||document.hidden||document.querySelector('dialog[open]'))return;
    const bounds=surface.getBoundingClientRect();
    if(!bounds.width||!bounds.height)return;
    const px=gsap.utils.clamp(-.5,.5,(event.clientX-bounds.left)/bounds.width-.5),py=gsap.utils.clamp(-.5,.5,(event.clientY-bounds.top)/bounds.height-.5);
    x(-py*7);y(px*9);
   },{passive:true});
   listen(surface,'pointerleave',rest);listen(surface,'focusin',rest);
  });
  query('.next > span, .preview-link > span, .note-arrow, .channel-arrow').forEach(arrow=>{
   const target=arrow.closest('a');if(!target)return;
   const x=gsap.quickTo(arrow,'x',{duration:.4,ease:'power3.out'}),y=gsap.quickTo(arrow,'y',{duration:.4,ease:'power3.out'});
   const rest=()=>{x(0);y(0);};rests.push(rest);
   listen(target,'pointermove',event=>{
    if(event.pointerType==='touch')return;
    const r=target.getBoundingClientRect();if(!r.width||!r.height)return;
    x(gsap.utils.clamp(-9,9,(event.clientX-r.left-r.width/2)*.09));
    y(gsap.utils.clamp(-7,7,(event.clientY-r.top-r.height/2)*.09));
   },{passive:true});listen(target,'pointerleave',rest);listen(target,'blur',rest);
  });
 }

 // Start on the real native disclosure event. Animation never controls the
 // open state, focus, height or availability of the underlying content.
 const detailTweens=new Map();
 query('.about-details, .project-details').forEach(details=>{
  const blocks=details.querySelectorAll('.detail-content > *');
  const animation=gsap.fromTo(blocks,{opacity:0,y:16},{opacity:1,y:0,duration:.45,stagger:.035,ease:'power2.out',clearProps:'transform,opacity',paused:true,immediateRender:false});
  detailTweens.set(details,animation);
 });
 const detail=event=>{
  const animation=detailTweens.get(event.target);if(!animation)return;
  if(event.target.open)animation.restart();else animation.progress(1).pause();
  refresh();
 };
 listen(document,'toggle',detail,true);
 const restAll=()=>rests.forEach(rest=>rest());
 listen(window,'blur',restAll);listen(document,'visibilitychange',restAll);
 return ()=>{cleanups.reverse().forEach(cleanup=>cleanup());detailTweens.forEach(tween=>tween.kill());};
}
