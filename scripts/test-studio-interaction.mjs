import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {AnimationMixer,Vector3} from 'three';
import {createInteractionController,paginateParagraphs} from '../src/two/studio-interaction.js';
import {ANCHORS,alignmentPath} from '../src/two/studio-anchors.js';

test('complete interaction opens once and restores once, ignoring repeated activation and stale callbacks',()=>{
 let opens=0,restores=0;const c=createInteractionController({onView:()=>opens++,onRestore:()=>restores++});
 assert.equal(c.start(ANCHORS.projects),true);const stale=c.token;assert.equal(c.start(ANCHORS.notes),false);
 c.complete();assert.equal(c.complete(stale),false);c.complete();c.complete();
 assert.equal(c.state,'viewing');assert.equal(opens,1);assert.equal(c.complete(),false);
 c.close();c.close();c.complete();c.complete();assert.equal(c.state,'exploring');assert.equal(restores,1);
});
for(const phase of ['aligning','sitting','using','viewing','putting-away','standing'])test(`Escape during ${phase} settles safely`,()=>{
 let opened=0,restored=0;const c=createInteractionController({onView:()=>opened++,onRestore:()=>restored++});c.start(ANCHORS.contact);
 for(let i=0;i<6&&c.state!==phase;i++){if(c.state==='viewing')c.close();else c.complete();}
 assert.equal(c.state,phase);c.close();c.skip();assert.equal(c.state,'exploring');assert.equal(restored,1);assert.ok(opened<=1);
});
test('skip reaches content once; disposal invalidates pending events',()=>{
 let views=0;const c=createInteractionController({onView:()=>views++});c.start(ANCHORS.snake);c.skip();c.skip();assert.equal(views,1);const t=c.token;c.dispose();assert.equal(c.complete(t),false);
});
test('every desk and cabinet has a clear short docking path; blocked paths are rejected',()=>{
 for(const station of Object.values(ANCHORS)){assert.ok(alignmentPath(station.approach,station),station.id);assert.ok(station.camera.position);assert.equal(station.facing,station.forward.x?Math.PI/2:Math.PI);}
 assert.equal(alignmentPath({x:-4.6,z:-4.3},ANCHORS.projects),null);
});
test('book pagination preserves every word of long articles, empty paragraphs and unbroken text',()=>{
 const input=['',Array.from({length:900},(_,i)=>`word${i}`).join(' '),'last paragraph','x'.repeat(4000)];const pages=paginateParagraphs(input);
 assert.equal(pages.flat().join(' ').split(/\s+/).filter(Boolean).join(' '),input.join(' ').split(/\s+/).filter(Boolean).join(' '));
 assert.ok(pages.length>5);assert.deepEqual(paginateParagraphs([]),[[]]);
});
test('exported avatar shares one skin, has every clip, and seated/standing poses keep finite transforms',async()=>{
 const bytes=readFileSync(new URL('../public/studio/studio-avatar.glb',import.meta.url)),json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
 assert.equal(json.skins.length,1);assert.equal(json.meshes.length,1);
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const mixer=new AnimationMixer(gltf.scene);const hip=gltf.scene.getObjectByName('hips');assert.ok(hip);
 const positions={};
 for(const name of ['idle','walk','turn','sit_down','stand_up','seated_idle','typing','book_open','page_turn','phone_pickup','phone_putdown','arcade_play']){
  const clip=gltf.animations.find(c=>c.name===name);assert.ok(clip,name);mixer.stopAllAction();const action=mixer.clipAction(clip).play();action.time=clip.duration*.999;mixer.update(0);gltf.scene.updateMatrixWorld(true);
  positions[name]=hip.getWorldPosition(new Vector3());assert.ok(positions[name].toArray().every(Number.isFinite));
 }
 assert.ok(positions.idle.y-positions.sit_down.y>.2,'hips lower into the seat');assert.ok(Math.abs(positions.stand_up.y-positions.idle.y)<.02);
});

test('exported interactive props retain editable hinges, receiver and every station anchor',async()=>{
 const bytes=readFileSync(new URL('../public/studio/studio-props.glb',import.meta.url));
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 for(const name of ['Journal_cover_hinge','Journal_page_hinge','Telephone_receiver','Project_keyboard',...Object.keys(ANCHORS).flatMap(id=>[`${id}_seat`,`${id}_hand_contact`,`${id}_screen_anchor`])])assert.ok(gltf.scene.getObjectByName(name),name);
});

test('walk export starts immediately and alternates planted feet without sliding or leg stretching',async()=>{
 const bytes=readFileSync(new URL('../public/studio/studio-avatar.glb',import.meta.url));
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const clip=gltf.animations.find(c=>c.name==='walk'),mixer=new AnimationMixer(gltf.scene),action=mixer.clipAction(clip).play();
 assert.ok(clip.tracks.every(track=>Math.abs(track.times[0])<.001),'no frozen first frame on every stride');
 function sample(fraction){action.time=clip.duration*fraction;mixer.update(0);gltf.scene.updateMatrixWorld(true);return Object.fromEntries(['L','R'].flatMap(side=>['upperLeg','shin','foot'].map(name=>[name+side,gltf.scene.getObjectByName(name+side).getWorldPosition(new Vector3())])));}
 for(const [side,a,b] of [['L',.1,.4],['R',.6,.9]]){
  const first=sample(a),last=sample(b),planted=first['foot'+side];
  assert.ok(Math.abs(planted.y-.1)<.003,'stance ankle remains at floor height');
  const worldDrift=last['foot'+side].z-planted.z+1.65*clip.duration*(b-a);
  assert.ok(Math.abs(worldDrift)<.01,`${side} stance foot drift ${worldDrift}`);
 }
 for(const fraction of [.1,.25,.4,.6,.75,.9]){
  const pose=sample(fraction);
  for(const side of ['L','R']){
   assert.ok(Math.abs(pose['upperLeg'+side].distanceTo(pose['shin'+side])-.42)<.004,'thigh keeps its length');
   assert.ok(Math.abs(pose['shin'+side].distanceTo(pose['foot'+side])-.412)<.004,'shin keeps its length');
  }
 }
 assert.ok(sample(.25).footR.y>sample(.25).footL.y+.06);
 assert.ok(sample(.75).footL.y>sample(.75).footR.y+.06);
});

test('telephone grip reaches the cradle and places the earpiece beside the same rigged ear',async()=>{
 async function load(path){const b=readFileSync(new URL(path,import.meta.url));return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
 const [avatar,props]=await Promise.all([load('../public/studio/studio-avatar.glb'),load('../public/studio/studio-props.glb')]);
 const station=ANCHORS.contact,root=avatar.scene,mixer=new AnimationMixer(root),clip=avatar.animations.find(c=>c.name==='phone_pickup'),action=mixer.clipAction(clip).play();
 root.position.set(station.seat.x,.04,station.seat.z);root.rotation.y=station.facing;
 const hand=root.getObjectByName('handR');
 action.time=0;mixer.update(0);root.updateMatrixWorld(true);props.scene.updateMatrixWorld(true);
 assert.ok(hand.getWorldPosition(new Vector3()).distanceTo(props.scene.getObjectByName('Telephone_receiver').getWorldPosition(new Vector3()))<.025,'pickup starts at the cradle');
 action.time=clip.duration*.999;mixer.update(0);root.updateMatrixWorld(true);
 const earpiece=hand.getWorldPosition(new Vector3()).add(new Vector3(.025,.17,0));
 const ear=root.getObjectByName('head').localToWorld(new Vector3(-.153,.225,-.005));
 assert.ok(earpiece.distanceTo(ear)<.035,`earpiece contact error ${earpiece.distanceTo(ear)}`);
});
