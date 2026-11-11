import * as THREE from 'three';
import {createPixelPainter,createStudioPosePainter} from './sprite-painter.js';

const durations={sit_down:.8,stand_up:1.1,typing:1.2,book_open:1.3,page_turn:.4,phone_pickup:1.3,phone_putdown:1.3,arcade_play:1.2,release:.65};
const loops=new Set(['idle','walk','seated_idle','typing','arcade_play']);

// The existing interaction controller still receives one completion per action.
// Whole sprite poses keep the supplied artwork intact instead of bending its limbs.
export function createSpriteAnimationClock(){
 let name='idle',time=0,loop=true,finish=null,finished=false;
 return {
  get name(){return name;},get time(){return time;},
  play(next,options={}){name=next;time=0;loop=options.loop??loops.has(next);finish=options.finish||null;finished=false;},
  update(dt){if(finished)return;time+=Math.max(0,dt);if(!loop&&time>=(durations[name]||.35)){finished=true;const callback=finish;finish=null;callback?.();}},
  settle(){time=durations[name]||.35;finished=true;finish=null;},
  dispose(){finished=true;finish=null;},
 };
}

// Whole-frame poses, forward for sitting and reversed for standing.
// Return null only for locomotion; every station action has a visible pose.
export function stationPose(name,time=0){
 const t=Math.max(0,time),progress=Math.min(1,t/(durations[name]||1));
 if(name==='idle'||name==='walk')return null;
 if(name==='sit_down')return Math.min(3,Math.floor(progress*4));
 if(name==='stand_up')return 3-Math.min(3,Math.floor(progress*4));
 if(name==='typing'||name==='arcade_play')return 4+Math.floor(t*5)%2;
 if(name==='phone_pickup')return progress<.25?3:progress<.55?4:6;
 if(name==='phone_putdown')return progress<.35?6:progress<.7?4:3;
 if(name==='book_open')return progress<.3?3:7;
 if(name==='page_turn')return 7;
 if(name==='release')return progress<.45?4:3;
 return 3;
}

// Only yaw toward the viewer. A THREE.Sprite pitches with the camera, moving
// its head backwards through the desk/cabinet when viewed from above.
export function createUprightCharacter(map){
 const material=new THREE.MeshBasicMaterial({map,alphaTest:.35,depthWrite:true,toneMapped:false,side:THREE.DoubleSide});
 const geometry=new THREE.PlaneGeometry(1.76,2.2);geometry.translate(0,1.1,0);
 const mesh=new THREE.Mesh(geometry,material);mesh.name='Upright_character_artwork';
 return mesh;
}
export function orientCharacterPlane(mesh,root,camera){
 mesh.rotation.set(0,Math.atan2(camera.position.x-root.position.x,camera.position.z-root.position.z)-root.rotation.y,0);
}

export async function loadStudioPixelAvatar(){
 const [painter,stationPainter]=await Promise.all([createPixelPainter(),createStudioPosePainter()]),canvas=document.createElement('canvas');canvas.width=512;canvas.height=640;
 const context=canvas.getContext('2d');if(!context)throw Error('Character canvas is unavailable');
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.NearestFilter;texture.generateMipmaps=false;
 const sprite=createUprightCharacter(texture),material=sprite.material;
 const root=new THREE.Group();root.name='Vivek_2D_character';root.userData.pixelCharacter=true;root.add(sprite);
 const clock=createSpriteAnimationClock();let phase=0,previous='',facing=1,seatSurface=.585;
 const forward=new THREE.Vector3(),right=new THREE.Vector3();
 function draw(moving){
  const pose=stationPose(clock.name,clock.time),key=`${pose===null?(moving?Math.floor(phase*8)%8:'idle'):('seat'+pose)}:${facing}`;
  if(key===previous)return;previous=key;context.clearRect(0,0,512,640);
  const options={x:256,y:638,height:600,facing,seatSurface};
  if(pose===null)painter.draw(context,{...options,pose:moving?'run':'idle',phase});
  else stationPainter.draw(context,pose,options);
  root.userData.spritePose=pose===null?(moving?'walk':'idle'):pose;
  texture.needsUpdate=true;
 }
 draw(false);
 return {root,play:(name,options)=>clock.play(name,options),settle:()=>clock.settle(),
  setStation(station){
   seatSurface=station?.seatSurface??.585;
   if(station){
    const dx=station.camera.position.x-station.seat.x,dz=station.camera.position.z-station.seat.z;
    facing=station.forward.x*dz-station.forward.z*dx<0?-1:1;
   }
   previous='';
  },
  update(dt,{walking=false,speed=1.65,reduced=false}={}){
   clock.update(dt);
   // Every interaction uses an opaque authored pose; the character never disappears.
   if(reduced)clock.settle();
   if(walking&&!reduced)phase=(phase+dt*speed/1.2)%1;
   draw(walking&&!reduced);
  },
  faceCamera(camera){
   orientCharacterPlane(sprite,root,camera);
   // Keep the seated silhouette stable while the camera focuses on the object.
   if(clock.name!=='idle'&&clock.name!=='walk')return;
   forward.set(Math.sin(root.rotation.y),0,Math.cos(root.rotation.y));right.setFromMatrixColumn(camera.matrixWorld,0);
   const side=forward.dot(right);if(Math.abs(side)>.12)facing=side<0?-1:1;
  },
  dispose(){clock.dispose();texture.dispose();material.dispose();sprite.geometry.dispose();},
 };
}
