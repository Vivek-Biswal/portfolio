import * as THREE from 'three';
import {createPixelPainter} from './sprite-painter.js';

const durations={sit_down:.45,stand_up:1.1,typing:1.2,book_open:1.3,page_turn:.4,phone_pickup:1.3,phone_putdown:1.3,arcade_play:1.2,release:.65};
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

export async function loadStudioPixelAvatar(){
 const painter=await createPixelPainter(),canvas=document.createElement('canvas');canvas.width=512;canvas.height=640;
 const context=canvas.getContext('2d');if(!context)throw Error('Character canvas is unavailable');
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.NearestFilter;texture.generateMipmaps=false;
 const material=new THREE.SpriteMaterial({map:texture,transparent:true,alphaTest:.03,depthWrite:false,toneMapped:false});
 const sprite=new THREE.Sprite(material);sprite.center.set(.5,0);sprite.scale.set(1.76,2.2,1);
 const root=new THREE.Group();root.name='Vivek_2D_character';root.userData.pixelCharacter=true;root.add(sprite);
 const clock=createSpriteAnimationClock();let phase=0,opacity=1,previous='',facing=1;
 const forward=new THREE.Vector3(),right=new THREE.Vector3();
 function draw(moving){const key=`${moving?Math.floor(phase*8)%8:'idle'}:${facing}`;if(key===previous)return;previous=key;context.clearRect(0,0,512,640);painter.draw(context,{x:256,y:638,height:600,pose:moving?'run':'idle',phase,facing});texture.needsUpdate=true;}
 draw(false);
 return {root,play:(name,options)=>clock.play(name,options),settle:()=>clock.settle(),
  update(dt,{walking=false,speed=1.65,reduced=false}={}){
   clock.update(dt);
   const exploring=clock.name==='idle'||clock.name==='walk'||clock.name==='stand_up';
   opacity=reduced?(exploring?1:0):THREE.MathUtils.damp(opacity,exploring?1:0,12,dt);material.opacity=opacity;sprite.visible=opacity>.01;
   if(walking&&!reduced)phase=(phase+dt*speed/1.2)%1;
   draw(walking&&!reduced);
  },
  faceCamera(camera){
   forward.set(Math.sin(root.rotation.y),0,Math.cos(root.rotation.y));right.setFromMatrixColumn(camera.matrixWorld,0);
   const side=forward.dot(right);if(Math.abs(side)>.12)facing=side<0?-1:1;
  },
  dispose(){clock.dispose();texture.dispose();material.dispose();},
 };
}
