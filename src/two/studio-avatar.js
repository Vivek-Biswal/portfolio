import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export async function loadStudioAvatar(){
 const asset=await new GLTFLoader().loadAsync('/studio/studio-avatar.glb');
 const root=asset.scene,mixer=new THREE.AnimationMixer(root),actions=new Map(asset.animations.map(c=>[c.name,mixer.clipAction(c)]));
 for(const name of ['idle','walk','sit_down','stand_up','typing','book_open','phone_pickup','phone_putdown','arcade_play','seated_idle'])if(!actions.has(name))throw Error(`Avatar is missing ${name}`);
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;} });
 let current,done=null,elapsed=0,blinkAt=3.2;
 const lids=['lidL','lidR','lid.L','lid.R'].map(n=>root.getObjectByName(n)).filter(Boolean);
 const lidHeights=new Map(lids.map(lid=>[lid,lid.position.y]));
 const loopNames=new Set(['idle','walk','seated_idle','typing','arcade_play']);
 function play(name,{loop=loopNames.has(name),finish,immediate=false}={}){
  const next=actions.get(name)||actions.get('idle');done=finish||null;
  if(current===next&&loop&&next.loop===THREE.LoopRepeat&&!next.paused)return;
  const old=current;current=next;next.reset();next.enabled=true;next.clampWhenFinished=!loop;next.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1);next.setEffectiveTimeScale(1);next.setEffectiveWeight(1);next.play();
  if(old&&old!==next){if(immediate)old.stop();else next.crossFadeFrom(old,.20,false);}
 }
 mixer.addEventListener('finished',event=>{if(event.action===current){const callback=done;done=null;callback?.();}});
 play('idle');
 return {root,mixer,play,
  settle(){if(!current)return;current.time=current.getClip().duration;current.paused=true;mixer.update(0);done=null;},
  update(dt,{walking=false,speed=1.65,reduced=false}={}){
   if(walking&&current===actions.get('walk'))current.setEffectiveTimeScale(speed/1.65);
   mixer.update(reduced?0:dt);elapsed+=dt;
   if(elapsed>blinkAt+.14)blinkAt=elapsed+3.2+Math.sin(elapsed)*.7;
   const blink=elapsed>=blinkAt?Math.sin((elapsed-blinkAt)/.14*Math.PI):0;
   // Lid translations are authored at rest; use an absolute offset so paused
   // phone poses cannot accumulate procedural motion across frames.
   lids.forEach(lid=>{lid.scale.y=1+Math.max(0,blink)*3;lid.position.y=lidHeights.get(lid)-Math.max(0,blink)*.018;});
  },
  dispose(){done=null;mixer.stopAllAction();mixer.uncacheRoot(root);},
 };
}
