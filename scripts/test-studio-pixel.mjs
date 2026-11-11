import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3,Vector2,Raycaster,Plane,Group,Scene,Box3} from 'three';
import {readFileSync} from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createSpriteAnimationClock,stationPose,createUprightCharacter,orientCharacterPlane} from '../src/two/studio-pixel-avatar.js';
import {stationFramePlacement} from '../src/two/sprite-painter.js';
import {ANCHORS} from '../src/two/studio-anchors.js';
import {mountStudioProps,isAnimatedStudioMesh} from '../src/two/studio-props.js';
import {roomFocusPose,configureRoomCamera} from '../src/two/studio-camera.js';
import {STATIONS,CABINETS} from '../src/two/studio-world.js';
import {createInteractionController} from '../src/two/studio-interaction.js';

test('character stays vertical at every chair and camera elevation instead of leaning through furniture',()=>{
 const root=new Group(),mesh=createUprightCharacter(null);root.add(mesh);
 for(const station of Object.values(ANCHORS))for(const height of [2.5,6,18]){
  root.position.set(station.seat.x,station.seat.y+.04,station.seat.z);root.rotation.y=station.facing;
  const camera=new PerspectiveCamera();camera.position.set(root.position.x+3,height,root.position.z+5);camera.lookAt(root.position);
  orientCharacterPlane(mesh,root,camera);root.updateMatrixWorld(true);
  const feet=mesh.localToWorld(new Vector3(0,0,0)),head=mesh.localToWorld(new Vector3(0,2.2,0));
  assert.ok(Math.abs(head.x-feet.x)<1e-8&&Math.abs(head.z-feet.z)<1e-8,station.id+' never pitches into its desk');
  assert.ok(Math.abs(head.y-feet.y-2.2)<1e-8);assert.equal(mesh.material.depthWrite,true);
 }
 mesh.geometry.dispose();mesh.material.dispose();
});

test('seated poses use the pelvis contact and actual seat height instead of a face anchor',()=>{
 const hips=[[1503,323],[178,766],[622,767],[1066,768],[1508,768]];
 for(const station of Object.values(ANCHORS))for(let i=3;i<8;i++){
  const [x,y]=hips[i-3],frame={x:x-50,y:y-250,width:180,height:360},scale=600/425;
  const rect=stationFramePlacement(frame,425,i,{seatSurface:station.seatSurface});
  assert.ok(Math.abs(rect.x+(x-frame.x)*scale)<1e-8,'pelvis remains at seat centre');
  const hipPixel=rect.y+(y-frame.y)*scale,worldHip=.04+(640-hipPixel)/640*2.2;
  assert.ok(Math.abs(worldHip-station.seatSurface)<1e-8,'hips touch the seat at '+station.id);
 }
});

test('all ten pelvis anchors match the real chair and stool meshes in the exported room',async()=>{
 const bytes=readFileSync(new URL('../public/studio/sunset-studio.glb',import.meta.url));
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 gltf.scene.updateMatrixWorld(true);const seats=[];
 gltf.scene.traverse(o=>{if(o.isMesh&&/^(Chair_cushion|Arcade_stool_seat)/.test(o.name)){
  const box=new Box3().setFromObject(o),centre=box.getCenter(new Vector3());
  seats.push({x:centre.x,z:centre.z,y:box.max.y*(o.name.startsWith('Arcade')?1.1:1)});
 }});
 assert.equal(seats.length,10);
 for(const station of Object.values(ANCHORS)){
  const surface=seats.find(s=>Math.hypot(s.x-station.seat.x,s.z-station.seat.z)<.01);
  assert.ok(surface,station.id+' has an authored seat');
  assert.ok(Math.abs(surface.y-station.seat.y-station.seatSurface)<.005,station.id+' matches its seat height');
 }
});

test('exported moving props remain on their desks and the book hinges do not sink into the tabletop',async()=>{
 assert.equal(isAnimatedStudioMesh('Journal_writing.001'),true,'old static writing must leave with the old journal');
 const bytes=readFileSync(new URL('../public/studio/studio-props.glb',import.meta.url));
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const props=mountStudioProps(new Scene(),gltf),avatar=new Group();avatar.userData.pixelCharacter=true;
 for(const [id,names] of [['notes',['Journal_root']],['contact',['Telephone_base_root','Telephone_receiver']],['projects',['Project_keyboard']]]){
  const station=ANCHORS[id],table=station.obstacle,top=(station.elevation||0)+.975;
  for(const amount of [0,.25,.5,.75,1]){
   props.set(station,amount,avatar);props.root.updateMatrixWorld(true);
   for(const name of names){const bounds=new Box3().setFromObject(props.root.getObjectByName(name));
    assert.ok(bounds.min.x>table.x-table.w/2&&bounds.max.x<table.x+table.w/2,`${name} stays within table width`);
    assert.ok(bounds.min.z>table.z-table.d/2&&bounds.max.z<table.z+table.d/2,`${name} cannot hang over the character`);
    assert.ok(bounds.min.y>=top-.004,`${name} cannot rotate below the tabletop`);
   }
  }
 }
 avatar.userData.spritePose=6;props.set(ANCHORS.contact,1,avatar);assert.equal(props.root.getObjectByName('Telephone_receiver').visible,false);
 avatar.userData.spritePose=4;props.set(ANCHORS.contact,.9,avatar);assert.equal(props.root.getObjectByName('Telephone_receiver').visible,true);
 props.reset();assert.equal(props.root.getObjectByName('Telephone_receiver').visible,true);
});

test('sitting lowers through distinct poses and standing reverses them without hiding',()=>{
 const sit=[0,.21,.41,.61,.8].map(t=>stationPose('sit_down',t));
 assert.deepEqual(sit,[0,1,2,3,3]);
 assert.deepEqual([0,.28,.56,.84,1.1].map(t=>stationPose('stand_up',t)),[3,2,1,0,0]);
 for(const action of ['seated_idle','typing','arcade_play','book_open','page_turn','phone_pickup','phone_putdown','release']){
  for(const time of [0,.1,.4,.8,1.3,5])assert.ok(Number.isInteger(stationPose(action,time)),`${action} has visible artwork`);
 }
 assert.equal(stationPose('phone_pickup',1.3),6);
 assert.equal(stationPose('phone_putdown',1.3),3);
 assert.notEqual(stationPose('typing',0),stationPose('typing',.21));
});

test('sprite callbacks drive every station through sitting, content, standing and safe cancellation',()=>{
 for(const station of [...STATIONS,...CABINETS])for(const cancelAt of [null,'sitting','using','viewing']){
  const clock=createSpriteAnimationClock();let views=0,restores=0;
  const controller=createInteractionController({onChange({state,token}){
   const clip={aligning:'idle',sitting:'sit_down',using:station.game?'arcade_play':station.id==='notes'?'book_open':station.id==='contact'?'phone_pickup':'typing','putting-away':station.id==='contact'?'phone_putdown':'release',standing:'stand_up'}[state];
   if(clip)clock.play(clip,{loop:false,finish:()=>controller.complete(token)});
   else clock.play(state==='viewing'?'seated_idle':'idle');
  },onView(){views++;},onRestore(){restores++;}});
  controller.start(station);
  for(let i=0;i<200&&controller.busy;i++){
   if(controller.state===cancelAt||controller.state==='viewing')controller.close();
   if(!['aligning','exploring'].includes(controller.state))assert.notEqual(stationPose(clock.name,clock.time),null);
   clock.update(.1);
  }
  assert.equal(controller.state,'exploring',`${station.id} recovers after ${cancelAt}`);
  assert.equal(restores,1);assert.equal(views,cancelAt==='sitting'||cancelAt==='using'?0:1);
  controller.start(station);controller.skip(()=>clock.settle());assert.equal(controller.state,'viewing');
  controller.close();controller.skip(()=>clock.settle());assert.equal(controller.state,'exploring');
 }
});

test('sprite actions complete once, allow chained actions, and invalidate skipped callbacks',()=>{
 const clock=createSpriteAnimationClock();let completed=0;
 clock.play('sit_down',{loop:false,finish(){completed++;clock.play('book_open',{loop:false,finish:()=>completed++});}});
 clock.update(.9);assert.equal(completed,1);clock.update(1.4);clock.update(2);assert.equal(completed,2);
 clock.play('stand_up',{loop:false,finish:()=>completed++});clock.settle();clock.update(5);assert.equal(completed,2);
 clock.play('walk');clock.update(10);assert.equal(completed,2);clock.dispose();clock.update(10);assert.equal(completed,2);
});

test('area views frame Projects and every cabinet without moving the character',()=>{
 for(const [area,objects] of [['projects',[STATIONS.find(s=>s.id==='projects')]],['arcade',CABINETS]]){
  const pose=roomFocusPose(area),camera=new PerspectiveCamera(40,16/9,.1,120);camera.zoom=1.32;camera.updateProjectionMatrix();camera.position.copy(pose.position);camera.lookAt(pose.target);camera.updateMatrixWorld();
  assert.ok(pose.target.length()>2,'focus leaves the room centre');
  for(const object of objects){const point=new Vector3(object.obstacle.x,1.2,object.obstacle.z).project(camera);assert.ok(Math.abs(point.x)<.95&&Math.abs(point.y)<.95&&point.z<1,`${area}: ${object.id} fits in the view`);}
 }
 assert.equal(roomFocusPose('missing'),null);
});

test('actual OrbitControls keeps the pointed-at area under the cursor and supports panning',()=>{
 // A small event target exercises Three's real control implementation without a
 // browser/GPU. This is not a replacement for a visual browser review.
 const listeners=new Map(),element={style:{},clientWidth:1280,clientHeight:720,
  addEventListener(type,fn){listeners.set(type,fn);},removeEventListener(type){listeners.delete(type);},
  getRootNode(){return this;},getBoundingClientRect(){return {left:0,top:0,width:1280,height:720};},setPointerCapture(){},releasePointerCapture(){},
 };
 const camera=new PerspectiveCamera(40,1280/720,.1,120);camera.position.set(10,11,20);
 const controls=new OrbitControls(camera,element);configureRoomCamera(controls);controls.target.set(0,1.4,0);controls.update();camera.updateMatrixWorld();
 const pointer=new Vector2(.6,.2),ray=new Raycaster();ray.setFromCamera(pointer,camera);
 const point=ray.ray.intersectPlane(new Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new Vector3()),controls.target),new Vector3());
 const originalTarget=controls.target.clone();
 listeners.get('wheel')({clientX:1024,clientY:288,deltaY:-500,deltaMode:0,ctrlKey:false,preventDefault(){}});
 camera.updateMatrixWorld();const projected=point.clone().project(camera);
 assert.ok(Math.abs(projected.x-pointer.x)<.001&&Math.abs(projected.y-pointer.y)<.001,'zoom anchors the off-centre point');
 assert.ok(controls.target.distanceTo(originalTarget)>.1,'focus is no longer fixed to the centre');
 for(let i=0;i<6;i++)listeners.get('wheel')({clientX:1024,clientY:288,deltaY:-500,deltaMode:0,ctrlKey:false,preventDefault(){}});
 assert.ok(controls.getDistance()<9&&controls.getDistance()>=3,'close views are reachable and bounded');
 const before=controls.target.clone(),distance=controls.getDistance();
 const pointerEvent={pointerId:1,pointerType:'mouse',button:2,clientX:640,clientY:360,preventDefault(){}};
 listeners.get('pointerdown')(pointerEvent);listeners.get('pointermove')({...pointerEvent,clientX:740});listeners.get('pointerup')(pointerEvent);
 assert.ok(controls.target.distanceTo(before)>.01,'right-drag pans');assert.ok(Math.abs(controls.getDistance()-distance)<.001);
 controls.dispose();
});
