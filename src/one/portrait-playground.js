const compositions=['portrait','play','signed'];
const names={portrait:'Portrait',play:'Play',signed:'Signed'};

/** Events are delegated: the CMS can replace the hero without stale handlers. */
export function mountPortraitPlayground(doc=document,win=window){
  let selection='portrait',pointerFrame=0,inkFrame=0,inkTimer=0,stage=null,disposed=false;
  const reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
  const fine=win.matchMedia('(hover: hover) and (pointer: fine)');
  const canAnimate=()=>!reduced.matches&&doc.documentElement.dataset.motion==='on'&&!doc.hidden;
  const find=()=>doc.querySelector('.portrait-playground');
  // Native radios work before this enhancement loads; keep that choice on mount.
  const initial=find()?.querySelector('input[name="portrait-composition"]:checked')?.value;
  if(compositions.includes(initial))selection=initial;
  function stopInk(){
    win.cancelAnimationFrame(inkFrame);win.clearTimeout(inkTimer);inkFrame=0;inkTimer=0;
    stage?.classList.remove('is-signing');
  }
  function rest(){
    win.cancelAnimationFrame(pointerFrame);pointerFrame=0;
    stage?.style.removeProperty('--tilt-x');stage?.style.removeProperty('--tilt-y');
  }
  function sign(){
    stopInk();
    if(!stage||!canAnimate())return;
    const target=stage;
    inkFrame=win.requestAnimationFrame(()=>{
      inkFrame=0;
      if(disposed||target!==stage||!target.isConnected||!canAnimate())return;
      target.classList.add('is-signing');
      inkTimer=win.setTimeout(()=>{target.classList.remove('is-signing');inkTimer=0;},1900);
    });
  }
  function select(value,announce=false){
    if(!compositions.includes(value)||!stage)return;
    selection=value;stage.dataset.composition=value;
    for(const radio of stage.querySelectorAll('input[name="portrait-composition"]'))radio.checked=radio.value===value;
    if(announce){
      const status=stage.querySelector('.playground-announcement');
      if(status)status.textContent=`${names[value]} composition selected.`;
      sign();
    }
  }
  function rebuild(){
    stopInk();rest();stage=find();
    if(!stage)return;
    select(selection);
    const button=stage.querySelector('#portrait-remix');if(button)button.hidden=false;
  }
  function change(event){
    const radio=event.target;
    if(radio?.matches?.('input[name="portrait-composition"]')&&stage?.contains(radio))select(radio.value,true);
  }
  function click(event){
    const button=event.target?.closest?.('#portrait-remix');
    if(button&&stage?.contains(button))select(compositions[(compositions.indexOf(selection)+1)%compositions.length],true);
  }
  function pointer(event){
    if(!stage||event.pointerType==='touch'||!fine.matches||!canAnimate()||doc.querySelector('dialog[open]'))return;
    const canvas=event.target?.closest?.('.playground-canvas');
    if(!canvas||!stage.contains(canvas)){rest();return;}
    const {clientX,clientY}=event;
    win.cancelAnimationFrame(pointerFrame);
    pointerFrame=win.requestAnimationFrame(()=>{
      pointerFrame=0;
      if(!stage?.contains(canvas)||!canAnimate())return;
      const box=canvas.getBoundingClientRect();if(!box.width||!box.height)return;
      const x=Math.max(-.5,Math.min(.5,(clientX-box.left)/box.width-.5));
      const y=Math.max(-.5,Math.min(.5,(clientY-box.top)/box.height-.5));
      stage.style.setProperty('--tilt-x',`${(x*7).toFixed(2)}deg`);
      stage.style.setProperty('--tilt-y',`${(-y*6).toFixed(2)}deg`);
    });
  }
  const inactive=()=>{rest();stopInk();};
  const preference=()=>{if(!canAnimate())inactive();};
  const observer=new win.MutationObserver(preference);
  observer.observe(doc.documentElement,{attributes:true,attributeFilter:['data-motion']});
  doc.addEventListener('change',change);doc.addEventListener('click',click);
  doc.addEventListener('pointermove',pointer,{passive:true});
  doc.addEventListener('pointerleave',rest);doc.addEventListener('visibilitychange',inactive);
  doc.addEventListener('portfolio:content-updated',rebuild);
  win.addEventListener('blur',inactive);reduced.addEventListener('change',preference);
  rebuild();
  return {destroy(){
    disposed=true;inactive();observer.disconnect();
    doc.removeEventListener('change',change);doc.removeEventListener('click',click);
    doc.removeEventListener('pointermove',pointer);doc.removeEventListener('pointerleave',rest);
    doc.removeEventListener('visibilitychange',inactive);doc.removeEventListener('portfolio:content-updated',rebuild);
    win.removeEventListener('blur',inactive);reduced.removeEventListener('change',preference);
    const button=stage?.querySelector('#portrait-remix');if(button)button.hidden=true;
    stage=null;
  }};
}
