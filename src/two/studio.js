import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {loadStudioPixelAvatar} from './studio-pixel-avatar.js';
import {configureRoomCamera,roomFocusPose} from './studio-camera.js';
import {createInteractionController} from './studio-interaction.js';
import {ANCHORS,alignmentPath} from './studio-anchors.js';
import {createStudioProps,isAnimatedStudioMesh} from './studio-props.js';
import {createStudioReader} from './studio-reader.js';
import {getContent} from './content.js';
import {TARGETS, moveWithCollision, nearestTarget, movementVector, floorHeight} from './studio-world.js';
import {cutawaySides,wallGroup} from './studio-cutaway.js';
import {addStudioEnvironment} from './studio-environment.js';
import {createCatController} from './studio-cat.js';
import {createStudioCat} from './studio-cat-model.js';
import './studio.css';

/** A lazy loaded room; readers and games remain owned by the existing desktop. */
export async function mountStudio(workspace,{openApp,playGame,onExit,announce}) {
  const host=document.createElement('section');host.className='studio';host.setAttribute('aria-label','Open studio');
  host.innerHTML=`<header class="studio-header"><div class="studio-toolbar"><select data-area aria-label="Focus room area"><option value="">Room view</option><option value="projects">Projects</option><option value="notes">Ideas</option><option value="arcade">Arcade</option><option value="contact">Contact</option></select><button data-help aria-expanded="false" aria-controls="studio-help">? Help</button><button data-view aria-label="Reset view">↺ View</button><button data-leave aria-label="Outside">Outside ↗</button></div></header><p class="studio-status" role="status">Opening the doors…</p><nav class="studio-labels" aria-label="Studio destinations"></nav><div class="studio-controls"><div class="studio-dpad" role="group" aria-label="Walk"><button data-dir="up" aria-label="Walk forward">↑</button><button data-dir="left" aria-label="Walk left">←</button><button data-dir="down" aria-label="Walk backward">↓</button><button data-dir="right" aria-label="Walk right">→</button></div><div class="studio-interact" hidden><button class="studio-action" disabled></button></div></div><div class="studio-sequence" hidden><span role="status"></span><button data-skip>Skip animation</button><button data-cancel>Cancel ×</button></div><aside class="studio-help" id="studio-help" hidden><strong>Make yourself at home.</strong><p>Hold WASD or arrows to walk. Release to stop. On touch screens, hold the direction buttons.</p><p>Drag to orbit. Right-drag or Shift-drag to pan. Scroll over an area to zoom toward it. On touch screens, use two fingers to pan and pinch to zoom. Choose an area above for a closer view. Click an object to highlight it, walk close, then press E to use it.</p><p>Escape closes an experience. Skip animation goes directly to its content.</p><button data-help-close>Got it</button><button data-fallback>Open accessible desktop</button></aside>`;
  workspace.append(host);workspace.classList.add('is-studio');
  const status=host.querySelector('.studio-status'),action=host.querySelector('.studio-action');
  let renderer,disposed=false,ready=false,visible=true,reading=false,contextLost=false,frame=0,last=0,near,selected,avatar,interaction,props,reader,sequence=null,saved=null,propAmount=0,locomoting=false,viewTween=null;
  const held=new Map(),listeners=[];
  const listen=(el,type,fn,options)=>{el.addEventListener(type,fn,options);listeners.push(()=>el.removeEventListener(type,fn,options));};
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e9b78e');scene.fog=new THREE.Fog('#b5a0aa',35,78);
  const camera=new THREE.PerspectiveCamera(40,1,.1,120);
  const player={x:0,z:2.8};
  let controls;
  const walls=Object.fromEntries(['N','S','E','W'].map(side=>{const group=new THREE.Group();scene.add(group);return [side,{group,opacity:1,materials:[]}];}));
  let hiddenSides=['E','S'];
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  function disposeScene(){const materials=new Set();scene.traverse(o=>{o.geometry?.dispose();(o.material?Array.isArray(o.material)?o.material:[o.material]:[]).forEach(m=>materials.add(m));});materials.forEach(m=>m.dispose());}
  function clear(){held.clear();host.querySelectorAll('.is-held').forEach(b=>b.classList.remove('is-held'));}
  function reset(){viewTween=null;host.querySelector('[data-area]').value='';if(controls)controls.enabled=!interaction?.busy;const portrait=host.clientWidth/host.clientHeight<.8;camera.position.set(10,portrait?18:11,portrait?18:20);controls.target.set(0,portrait?.8:1.4,0);controls.update();}
  function leave(){viewTween=null;reader?.close(true);interaction?.reset();clear();visible=false;host.hidden=true;workspace.classList.remove('is-studio');cancelAnimationFrame(frame);frame=0;onExit();}
  listen(host.querySelector('[data-leave]'),'click',leave);
  requestAnimationFrame(()=>host.classList.add('is-ready'));
  try {
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<760?1:1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
    renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Studio view. Use arrows or WASD to walk, E to interact.');host.prepend(renderer.domElement);
    listen(renderer.domElement,'webglcontextlost',event=>{
      event.preventDefault();contextLost=true;clear();cancelAnimationFrame(frame);frame=0;
      status.hidden=false;status.textContent='The view is paused while your graphics connection recovers. You can still return outside.';
    });
    listen(renderer.domElement,'webglcontextrestored',()=>{
      contextLost=false;renderer.shadowMap.needsUpdate=true;last=0;
      status.textContent='The view is ready again.';wake();
    });
    controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=!reducedMotion.matches;controls.dampingFactor=.08;configureRoomCamera(controls);
    controls.minDistance=3;controls.maxDistance=34;controls.minPolarAngle=.38;controls.maxPolarAngle=1.25;
    controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
    reset();listen(host.querySelector('[data-view]'),'click',reset);
    addStudioEnvironment(scene);
    scene.add(new THREE.HemisphereLight('#ffe9cb','#53545f',1.2));
    const sun=new THREE.DirectionalLight('#ffc28b',3);sun.position.set(12,10,-8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
    Object.assign(sun.shadow.camera,{left:-11,right:11,top:11,bottom:-11,near:.1,far:40});sun.shadow.normalBias=.035;sun.shadow.bias=-.0003;scene.add(sun);
    const fill=new THREE.DirectionalLight('#bfcde8',.8);fill.position.set(-6,7,8);scene.add(fill);
    for(const [x,z] of [[-4.6,-3.8],[-5.7,1],[4,-3.5],[4.75,3.65]]){const lamp=new THREE.PointLight('#ffb65c',22,6,2);lamp.position.set(x,2.6,z);scene.add(lamp);}
    const gltf=await new GLTFLoader().loadAsync('/studio/sunset-studio.glb');
    // Batch the static Blender shell by material to keep draw calls small.
    gltf.scene.updateMatrixWorld(true);
    const batches=Object.fromEntries(['core','N','S','E','W'].map(key=>[key,new Map()]));
    const meshPosition=new THREE.Vector3();
    gltf.scene.traverse(o=>{if(o.isMesh&&!isAnimatedStudioMesh(o.name)){const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);if(/^(Arcade_stool_seat|Stool_leg)/.test(o.name))geometry.scale(1,1.1,1);for(const key of Object.keys(geometry.attributes))if(!['position','normal'].includes(key))geometry.deleteAttribute(key);const group=wallGroup(o.name,meshPosition.setFromMatrixPosition(o.matrixWorld));const batch=batches[group].get(o.material)||[];batch.push(geometry);batches[group].set(o.material,batch);o.geometry.dispose();}});
    for(const [key,batch] of Object.entries(batches))for(const [original,geometries] of batch){const material=key==='core'?original:original.clone();const mesh=new THREE.Mesh(mergeGeometries(geometries),material);mesh.castShadow=true;mesh.receiveShadow=true;(walls[key]?.group||scene).add(mesh);if(walls[key])walls[key].materials.push(material);geometries.forEach(g=>g.dispose());}
    for(const key of ['N','S','E','W'])for(const material of batches[key].keys())if(!batches.core.has(material))material.dispose();
    const retainedMaterials=new Set([...batches.core.keys()]);
    gltf.scene.traverse(o=>{if(o.isMesh&&isAnimatedStudioMesh(o.name)){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])if(!retainedMaterials.has(m))m.dispose();}});
    for(const side of hiddenSides){walls[side].opacity=0;walls[side].group.visible=false;}
    avatar=await loadStudioPixelAvatar();scene.add(avatar.root);props=await createStudioProps(scene);
  } catch(error) {
    disposed=true;listeners.forEach(fn=>fn());controls?.dispose();disposeScene();renderer?.dispose();host.remove();workspace.classList.remove('is-studio');throw error;
  }

  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.32,32),new THREE.MeshBasicMaterial({color:'#26372f',transparent:true,opacity:.18,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.07;scene.add(shadow);
  const marker=new THREE.Mesh(new THREE.RingGeometry(.43,.47,48),new THREE.MeshBasicMaterial({color:'#d9b772',side:THREE.DoubleSide,transparent:true,opacity:.8}));marker.rotation.x=-Math.PI/2;marker.position.y=.09;marker.visible=false;scene.add(marker);
  const cat=createStudioCat();scene.add(cat.root);
  const catController=createCatController({x:2,z:2.8});
  function updateCat(dt){const state=catController.update(dt,player);cat.update(dt,state);cat.root.position.y+=floorHeight(state.x,state.z);}
  function selectTarget(target){
    if(!visible||reading||interaction?.busy)return;
    if(Math.hypot(target.x-player.x,target.z-player.z)<1.15)interact(target);
    else {selected=target;status.hidden=false;status.textContent=`Walk to ${target.label}. The gold ring marks its interaction point.`;renderer.domElement.focus();}
  }
  const labels=TARGETS.filter(target=>target.id!=='exit').map((target,index)=>{
    const shortLabel=target.game?String(index-2).padStart(2,'0'):target.label;
    const button=document.createElement('button');button.className=`studio-label${target.game?' is-game':''}`;button.textContent=shortLabel;button.setAttribute('aria-label',target.label);button.title=target.label;host.querySelector('.studio-labels').append(button);
    listen(button,'click',()=>selectTarget(target));
    return {target,button,shortLabel};
  });
  // Hit zones cover the physical desks, phone and cabinets, so labels are not
  // the only affordance. Ignore drag gestures used to orbit the camera.
  const pickers=TARGETS.filter(t=>t.id!=='exit').map(target=>{
    const o=target.obstacle;const mesh=new THREE.Mesh(new THREE.BoxGeometry(o.w,target.game ? 1.7 : 1.5,o.d),new THREE.MeshBasicMaterial({visible:false}));
    mesh.position.set(o.x,(target.elevation||0)+(target.game ? .85 : .75),o.z);mesh.userData.target=target;scene.add(mesh);return mesh;
  });
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let pointerStart;
  listen(renderer.domElement,'pointerdown',event=>{pointerStart={x:event.clientX,y:event.clientY,id:event.pointerId};clear();});
  listen(renderer.domElement,'pointercancel',()=>{pointerStart=null;});
  listen(renderer.domElement,'pointerup',event=>{
    if(!pointerStart||pointerStart.id!==event.pointerId||Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>6){pointerStart=null;return;}
    pointerStart=null;const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObjects(pickers)[0];if(hit)selectTarget(hit.object.userData.target);
  });
  function focusCamera(station,amount){
    if(!saved)return;
    const p=station.camera.position,t=station.camera.target;
    camera.position.copy(saved.camera).lerp(new THREE.Vector3(p.x,p.y,p.z),amount);
    controls.target.copy(saved.target).lerp(new THREE.Vector3(t.x,t.y,t.z),amount);
    camera.lookAt(controls.target);camera.updateMatrixWorld();
  }
  const smooth=t=>t*t*(3-2*t);
  function travel(path,finish){
    const lengths=path.slice(1).map((p,i)=>Math.hypot(p.x-path[i].x,p.z-path[i].z)),length=lengths.reduce((a,b)=>a+b,0);
    avatar.play('walk');sequence={kind:'travel',time:0,duration:Math.max(.2,length/1.2),update(t){
      let remaining=t*length,index=0;while(index<lengths.length-1&&remaining>lengths[index])remaining-=lengths[index++];
      const a=path[index],b=path[index+1],q=lengths[index]?remaining/lengths[index]:1;
      player.x=THREE.MathUtils.lerp(a.x,b.x,q);player.z=THREE.MathUtils.lerp(a.z,b.z,q);
      if(Math.hypot(b.x-a.x,b.z-a.z)>.001)avatar.root.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);
    },finish};
  }
  function animate(name,token,options={}){avatar.play(name,{loop:false,finish:()=>interaction.complete(token),immediate:reducedMotion.matches,...options});}
  function faceStation(station,token){
    const start=avatar.root.rotation.y,delta=THREE.MathUtils.euclideanModulo(station.facing-start+Math.PI,Math.PI*2)-Math.PI;
    avatar.play('idle');sequence={time:0,duration:.22,update(t){avatar.root.rotation.y=start+delta*smooth(t);},finish:()=>interaction.complete(token)};
  }
  function settle(state,station){
    sequence?.update(1);sequence=null;avatar.settle();
    if(state==='aligning'){player.x=station.seat.x;player.z=station.seat.z;avatar.root.rotation.y=station.facing;}
    if(state==='using'){propAmount=1;props.set(station,1,avatar.root);focusCamera(station,1);}
    if(state==='putting-away'){propAmount=0;props.set(station,0,avatar.root);}
  }
  interaction=createInteractionController({
    onChange({state,station,token}){
      clear();sequence=null;controls.enabled=state==='exploring';controls.minDistance=state==='exploring'?3:.3;
      host.dataset.interaction=state;host.querySelector('.studio-controls').hidden=state!=='exploring';
      host.querySelector('[data-area]').disabled=state!=='exploring';host.querySelector('[data-view]').disabled=state!=='exploring';host.querySelector('[data-help]').disabled=state!=='exploring';
      const sequenceUI=host.querySelector('.studio-sequence');sequenceUI.hidden=['exploring','viewing'].includes(state);
      sequenceUI.querySelector('span').textContent=({aligning:'Taking your place…',sitting:'Getting comfortable…',using:'Opening your workspace…','putting-away':'Putting things away…',standing:'Back to the studio…'})[state]||'';
      if(state==='aligning')travel(saved.path,()=>faceStation(station,token));
      if(state==='sitting'){avatar.setStation(station);animate('sit_down',token);}
      if(state==='using'){
        const clip=station.game?'arcade_play':station.id==='notes'?'book_open':station.id==='contact'?'phone_pickup':'typing';
        animate(clip,token);sequence={time:0,duration:1.1,update(t){propAmount=smooth(t);props.set(station,propAmount,avatar.root);focusCamera(station,propAmount);}};
      }
      if(state==='viewing'){
        propAmount=1;props.set(station,1,avatar.root);focusCamera(station,1);
        if(station.id==='contact')avatar.settle();else avatar.play(station.game?'arcade_play':station.id==='projects'?'typing':'seated_idle');
      }
      if(state==='putting-away'){
        reader?.close(true);animate(station.id==='contact'?'phone_putdown':'release',token);
        const initial=propAmount;sequence={time:0,duration:station.id==='contact'?1.3:.65,update(t){propAmount=initial*(1-smooth(t));props.set(station,propAmount,avatar.root);}};
      }
      if(state==='standing'){
        animate('stand_up',token,{finish:()=>travel([...saved.path].reverse(),()=>interaction.complete(token))});
        sequence={time:0,duration:1.1,update(t){focusCamera(station,1-smooth(t));}};
      }
      if(state==='exploring'){avatar.play('idle');locomoting=false;props.reset();propAmount=0;}
    },
    onView(station){
      if(station.game){visible=false;host.hidden=true;workspace.classList.remove('is-studio');workspace.classList.add('studio-game');cancelAnimationFrame(frame);frame=0;playGame(station.id);}
      else reader.show(station.id);
    },
    onRestore(){
      if(saved){Object.assign(player,saved.player);camera.position.copy(saved.camera);controls.target.copy(saved.target);avatar.root.rotation.y=saved.facing;saved=null;}
      controls.update();renderer.domElement.focus({preventScroll:true});
    },
  });
  reader=createStudioReader(host,{getContent,onClose:()=>interaction.close(),onPage(){if(!reducedMotion.matches){props.page();avatar.play('page_turn',{loop:false,finish:()=>avatar.play('seated_idle')});}}});
  function interact(target=near){
    if(!target||reading||interaction.busy)return;clear();
    if(target.id==='exit'){leave();return;}
    cancelViewTravel();const station=ANCHORS[target.id],path=alignmentPath(player,station);
    if(!path){status.hidden=false;status.textContent='Approach the front of this chair first. The gold ring marks the clear path.';selected=target;return;}
    saved={player:{...player},camera:camera.position.clone(),target:controls.target.clone(),facing:avatar.root.rotation.y,path};
    status.hidden=true;interaction.start(station);if(reducedMotion.matches)interaction.skip(settle);
  }
  listen(host.querySelector('[data-skip]'),'click',()=>interaction.skip(settle));
  function cancel(){reader.close(true);interaction.close();if(reducedMotion.matches)interaction.skip(settle);}
  listen(host.querySelector('[data-cancel]'),'click',cancel);
  function cancelViewTravel(){if(!viewTween)return;viewTween=null;controls.enabled=!interaction.busy;}
  listen(renderer.domElement,'pointerdown',cancelViewTravel,true);
  listen(renderer.domElement,'wheel',cancelViewTravel,{capture:true,passive:true});
  listen(host.querySelector('[data-area]'),'change',event=>{
    if(interaction.busy)return;
    const to=roomFocusPose(event.target.value);if(!to){reset();return;}
    controls.enableDamping=false;controls.update();controls.enableDamping=!reducedMotion.matches;
    viewTween={time:0,from:camera.position.clone(),target:controls.target.clone(),to};controls.enabled=false;
    renderer.domElement.focus({preventScroll:true});
  });
  const help=host.querySelector('.studio-help'),helpButton=host.querySelector('[data-help]');
  function showHelp(value){help.hidden=!value;helpButton.setAttribute('aria-expanded',String(value));clear();if(!value)renderer.domElement.focus();}
  listen(helpButton,'click',()=>showHelp(help.hidden));listen(host.querySelector('[data-help-close]'),'click',()=>showHelp(false));
  listen(host.querySelector('[data-fallback]'),'click',()=>{showHelp(false);openApp('projects');});
  // Development-only pose/station review controls; omitted from production.
  if(import.meta.env.DEV&&new URLSearchParams(location.search).has('studio-review')){
    const review=document.createElement('details');review.className='studio-review-tools';review.innerHTML='<summary>Review stations</summary>';
    for(const station of Object.values(ANCHORS)){
      const button=document.createElement('button');button.textContent=station.label;
      listen(button,'click',()=>{if(interaction.busy)return;Object.assign(player,station.approach);avatar.root.rotation.y=station.facing;reset();renderer.domElement.focus();});review.append(button);
    }
    host.append(review);
  }
  listen(action,'click',()=>interact());
  const keyMap={w:'up',a:'left',s:'down',d:'right',ArrowUp:'up',ArrowLeft:'left',ArrowDown:'down',ArrowRight:'right'};
  listen(document,'keydown',event=>{
    if(!visible||reading||!host.contains(event.target)||event.ctrlKey||event.metaKey||event.altKey||event.target.closest('input,textarea,select,[contenteditable]'))return;
    const key=event.key.length===1?event.key.toLowerCase():event.key;
    if(keyMap[key]&&!interaction.busy&&!reader.open&&help.hidden){event.preventDefault();event.stopImmediatePropagation();held.set(`key:${event.code}`,keyMap[key]);}
    else if(key==='e'&&!event.repeat){event.preventDefault();event.stopImmediatePropagation();interact();}
    else if(key==='Escape'){event.preventDefault();event.stopImmediatePropagation();if(interaction.busy)cancel();else if(!help.hidden)showHelp(false);else leave();}
  },true);
  listen(document,'keyup',event=>held.delete(`key:${event.code}`),true);
  host.querySelectorAll('[data-dir]').forEach(button=>{
    listen(button,'pointerdown',event=>{if(event.button!==0||reading||interaction.busy)return;event.preventDefault();button.setPointerCapture(event.pointerId);renderer.domElement.focus({preventScroll:true});held.set(`touch:${event.pointerId}`,button.dataset.dir);button.classList.add('is-held');});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(button,type,event=>{held.delete(`touch:${event.pointerId}`);button.classList.remove('is-held');});
    listen(button,'keydown',event=>{if(!['Enter',' '].includes(event.key)||reading||interaction.busy)return;event.preventDefault();held.set(`button:${event.code}`,button.dataset.dir);button.classList.add('is-held');});
    listen(button,'keyup',event=>{held.delete(`button:${event.code}`);button.classList.remove('is-held');});
    listen(button,'blur',()=>{held.delete('button:Enter');held.delete('button:Space');button.classList.remove('is-held');});
  });
  listen(window,'blur',()=>{clear();last=0;});listen(document,'visibilitychange',()=>{clear();last=0;if(!document.hidden)wake();});
  listen(document,'focusin',event=>{if(!host.contains(event.target))clear();});
  listen(reducedMotion,'change',()=>{controls.enableDamping=!reducedMotion.matches;});
  let previousReading=false;
  const layer=workspace.querySelector('.window-layer');
  function syncReader(){reading=!!layer.querySelector('.app-window:not([hidden])');host.classList.toggle('is-reading',reading);controls.enabled=!reading&&!interaction.busy;if(reading)clear();else if(previousReading&&visible){renderer.domElement.focus({preventScroll:true});last=0;wake();}previousReading=reading;}
  const readerObserver=new MutationObserver(syncReader);readerObserver.observe(layer,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});syncReader();
  let portraitLayout;
  function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.zoom=(w<760?1.12:1.32)*Math.min(1,camera.aspect/1.35);camera.updateProjectionMatrix();const portrait=camera.aspect<.8;if(portraitLayout!==portrait){portraitLayout=portrait;if(!interaction?.busy)reset();}}
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  const point=new THREE.Vector3();let lastShadow=0;
  function tick(now){
    frame=0;if(disposed||!visible||document.hidden||contextLost){last=0;return;}
    const dt=last?Math.min(.05,(now-last)/1000):0;last=now;
    const keys=new Set(held.values()),vector=movementVector(keys,controls.getAzimuthalAngle());
    const before={...player};if(!reading&&!interaction.busy&&help.hidden)moveWithCollision(player,vector.x*dt*1.65,vector.z*dt*1.65);
    const distance=Math.hypot(player.x-before.x,player.z-before.z),walking=distance>.0001;
    if(!interaction.busy){
      if(walking!==locomoting){avatar.play(walking?'walk':'idle');locomoting=walking;}
      if(walking){const angle=Math.atan2(player.x-before.x,player.z-before.z);const delta=THREE.MathUtils.euclideanModulo(angle-avatar.root.rotation.y+Math.PI,Math.PI*2)-Math.PI;avatar.root.rotation.y+=delta*(1-Math.exp(-dt*16));status.hidden=true;}
    }
    avatar.update(dt,{walking:walking||sequence?.kind==='travel',speed:sequence?.kind==='travel'?1.2:dt?distance/dt:0,reduced:reducedMotion.matches});
    if(sequence){const current=sequence;current.time+=dt;const t=reducedMotion.matches?1:Math.min(1,current.time/current.duration);current.update(t);if(t===1&&sequence===current){sequence=null;current.finish?.();}}
    if(reducedMotion.matches&&interaction.busy&&interaction.state!=='viewing')interaction.skip(settle);
    props.update(reducedMotion.matches?0:dt);
    if(interaction.station)props.set(interaction.station,propAmount,avatar.root);
    const elevation=floorHeight(player.x,player.z);avatar.root.position.set(player.x,elevation+.04,player.z);shadow.position.set(player.x,elevation+.07,player.z);
    if(now-lastShadow>100){renderer.shadowMap.needsUpdate=true;lastShadow=now;}
    renderer.domElement.dataset.position=`${player.x.toFixed(2)},${player.z.toFixed(2)}`;
    if(!reading)updateCat(dt);
    near=interaction.busy?undefined:nearestTarget(player);if(near?.id===selected?.id)selected=undefined;
    const target=selected||near;marker.visible=!!target;if(target)marker.position.set(target.x,floorHeight(target.x,target.z)+.09,target.z);
    action.disabled=!near;action.textContent=near?`E · ${near.action}`:'';host.querySelector('.studio-interact').hidden=!near;
    if(viewTween){const tween=viewTween;tween.time+=dt;const t=reducedMotion.matches?1:Math.min(1,tween.time/.55),q=smooth(t);camera.position.lerpVectors(tween.from,tween.to.position,q);controls.target.lerpVectors(tween.target,tween.to.target,q);camera.lookAt(controls.target);if(t===1){viewTween=null;controls.enabled=!interaction.busy;}}
    if(controls.enabled)controls.update();camera.updateMatrixWorld();avatar.faceCamera(camera);
    renderer.domElement.dataset.cameraTarget=controls.target.toArray().map(n=>n.toFixed(2)).join(',');
    hiddenSides=cutawaySides(camera.position.x-controls.target.x,camera.position.z-controls.target.z,hiddenSides);renderer.domElement.dataset.cutaway=hiddenSides.join(',');
    for(const [side,wall] of Object.entries(walls)){
      const goal=hiddenSides.includes(side)?0:1;wall.opacity=reducedMotion.matches?goal:THREE.MathUtils.damp(wall.opacity,goal,12,dt||.016);
      if(Math.abs(wall.opacity-goal)<.01)wall.opacity=goal;
      const opaque=wall.opacity===1;if(wall.group.visible!==(wall.opacity>0)){wall.group.visible=wall.opacity>0;renderer.shadowMap.needsUpdate=true;}
      for(const material of wall.materials){if(material.transparent===opaque){material.transparent=!opaque;material.needsUpdate=true;}material.opacity=wall.opacity;material.depthWrite=opaque;}
      wall.group.children.forEach(mesh=>{if(mesh.castShadow!==opaque){mesh.castShadow=opaque;renderer.shadowMap.needsUpdate=true;}});
    }
    labels.forEach(({target,button,shortLabel})=>{point.set(target.obstacle.x,(target.elevation||0)+(target.game?2.4:2),target.obstacle.z).project(camera);button.hidden=interaction.busy||(!near&&!selected)||point.z>1||point.z< -1||Math.abs(point.x)>1||Math.abs(point.y)>1;button.style.left=`${(point.x*.5+.5)*host.clientWidth}px`;button.style.top=`${(-point.y*.5+.5)*host.clientHeight}px`;button.classList.toggle('is-near',near?.id===target.id);if(button.textContent!==shortLabel)button.textContent=shortLabel;});
    renderer.render(scene,camera);if(!reading)wake();
  }
  function wake(){if(ready&&!frame&&!disposed&&visible&&!document.hidden&&!contextLost)frame=requestAnimationFrame(tick);}
  ready=true;if(!contextLost)status.hidden=true;
  if(visible)renderer.domElement.focus({preventScroll:true});wake();
  return {get active(){return visible;},refresh(){reader.refresh();},show(){const returning=workspace.classList.contains('studio-game');workspace.classList.remove('studio-game');visible=true;host.hidden=false;workspace.classList.add('is-studio');clear();last=0;resize();syncReader();if(returning&&interaction.state==='viewing')interaction.close();renderer.domElement.focus({preventScroll:true});wake();},hide:leave,
    destroy(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();readerObserver.disconnect();listeners.forEach(fn=>fn());interaction.dispose();reader.destroy();avatar.dispose();controls.dispose();disposeScene();renderer.dispose();host.remove();workspace.classList.remove('is-studio');}};
}
