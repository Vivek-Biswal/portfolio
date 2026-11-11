import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {ANCHORS} from './studio-anchors.js';

export const isAnimatedStudioMesh=name=>/^(Open_journal|Telephone_base|Telephone_dial|Dial_hole|Telephone_receiver|Receiver_end|Keyboard|Keyboard_key)/.test(name);

export async function createStudioProps(scene){
 const gltf=await new GLTFLoader().loadAsync('/studio/studio-props.glb');
 const root=gltf.scene;root.name='Studio_interactive_props';scene.add(root);
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 const hinge=root.getObjectByName('Journal_cover_hinge'),leaf=root.getObjectByName('Journal_page_hinge'),receiver=root.getObjectByName('Telephone_receiver');
 if(!hinge||!leaf||!receiver)throw Error('Interactive prop anchors are missing');
 const cradle=receiver.position.clone();
 const screens=new Map();
 for(const station of Object.values(ANCHORS)){
  const contact=new THREE.Object3D();contact.name=`${station.id}_hand_contact`;contact.position.set(station.hand.x,station.hand.y,station.hand.z);root.add(contact);
  const seat=new THREE.Object3D();seat.name=`${station.id}_seat`;seat.position.set(station.seat.x,station.seat.y+.58,station.seat.z);root.add(seat);
  if(station.game||station.id==='projects'){
   const material=new THREE.MeshStandardMaterial({color:'#7eac9e',emissive:'#76bcaa',emissiveIntensity:0,transparent:true,opacity:0,roughness:.3});
   const screen=new THREE.Mesh(new THREE.PlaneGeometry(station.game?.62:1.8,station.game?.65:.45),material);screen.name=`${station.id}_screen`;
   screen.position.set(station.obstacle.x,station.game?1.23:1.95,station.obstacle.z+.052+(station.game?.41:0));
   if(station.forward.x){screen.rotation.y=-Math.PI/2;screen.position.set(station.obstacle.x-.41,1.23,station.obstacle.z);}
   root.add(screen);screens.set(station.id,screen);
  }
 }
 let turn=0;
 return {root,
  set(station,amount,avatar){
   amount=THREE.MathUtils.clamp(amount,0,1);
   if(station?.id==='notes'){hinge.rotation.z=amount*Math.PI*.98;leaf.rotation.z=Math.sin(turn)*Math.PI;}
   if(station?.id==='contact'){
    if(avatar?.userData.pixelCharacter){
     // The phone pose includes its receiver; remove the cradle copy while held.
     receiver.visible=amount<.65;receiver.position.copy(cradle);receiver.rotation.z=0;
    }else{
    // Follow the animated hand in world space, blending out of the cradle.
    const hand=avatar?.getObjectByName('handR')||avatar?.getObjectByName('hand.R');
    const point=hand?hand.getWorldPosition(new THREE.Vector3()):new THREE.Vector3(4.94,1.4,4.6);
    receiver.position.copy(cradle).lerp(point,Math.min(1,amount*5));receiver.rotation.z=amount*Math.PI/2;
    }
   }
   const screen=screens.get(station?.id);if(screen){screen.material.opacity=amount*.72;screen.material.emissiveIntensity=amount*.65;}
  },
  page(){turn=.001;},
  update(dt){if(turn>0){turn+=dt*Math.PI/.65;if(turn>=Math.PI){turn=0;leaf.rotation.z=0;}else leaf.rotation.z=Math.sin(turn)*Math.PI;}},
  reset(){receiver.visible=true;hinge.rotation.z=0;leaf.rotation.z=0;receiver.position.copy(cradle);receiver.rotation.set(0,0,0);screens.forEach(s=>{s.material.opacity=0;s.material.emissiveIntensity=0;});},
 };
}
