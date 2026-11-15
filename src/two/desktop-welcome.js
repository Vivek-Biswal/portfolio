/** The small readme behaves like a desktop window without sharing app state. */
export function mountDesktopWelcome(workspace) {
  const panel=workspace.querySelector('.desktop-welcome');
  const bar=panel.querySelector('.welcome-titlebar');
  const close=panel.querySelector('[data-welcome-close]');
  const open=workspace.querySelector('[data-welcome-open]');
  const cleanups=[];
  let drag=null,position=null;
  const listen=(target,type,fn)=>{target.addEventListener(type,fn);cleanups.push(()=>target.removeEventListener(type,fn));};
  bar.tabIndex=0;bar.setAttribute('aria-label','Readme window. Use arrow keys to move.');
  function place(x,y){
    position={x:Math.max(6,Math.min(x,workspace.clientWidth-panel.offsetWidth-6)),y:Math.max(6,Math.min(y,workspace.clientHeight-panel.offsetHeight-76))};
    panel.style.left=position.x+'px';panel.style.top=position.y+'px';
  }
  function sync(){open.setAttribute('aria-expanded',String(!panel.hidden));}
  listen(close,'click',()=>{panel.hidden=true;drag=null;sync();open.focus({preventScroll:true});});
  listen(open,'click',()=>{panel.hidden=false;if(position)place(position.x,position.y);sync();bar.focus({preventScroll:true});});
  listen(bar,'pointerdown',event=>{
    if(event.button!==0||event.target.closest('button'))return;
    const rect=panel.getBoundingClientRect(),base=workspace.getBoundingClientRect();
    drag={x:event.clientX-rect.left,y:event.clientY-rect.top,left:base.left,top:base.top};
    bar.focus({preventScroll:true});bar.setPointerCapture(event.pointerId);event.preventDefault();
  });
  listen(bar,'pointermove',event=>{if(drag)place(event.clientX-drag.x-drag.left,event.clientY-drag.y-drag.top);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(bar,type,()=>{drag=null;});
  listen(bar,'keydown',event=>{
    if(event.target!==bar)return;
    const step=event.shiftKey?24:8,moves={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};
    if(!moves[event.key])return;
    event.preventDefault();event.stopPropagation();
    const rect=panel.getBoundingClientRect(),base=workspace.getBoundingClientRect(),[dx,dy]=moves[event.key];
    place(rect.left-base.left+dx,rect.top-base.top+dy);
  });
  listen(window,'blur',()=>{drag=null;});
  const resize=new ResizeObserver(()=>{
    // Let the mobile/desktop stylesheet compose a fresh layout after resizing.
    position=null;drag=null;panel.style.removeProperty('left');panel.style.removeProperty('top');
  });
  resize.observe(workspace);sync();
  return ()=>{resize.disconnect();cleanups.forEach(fn=>fn());};
}
