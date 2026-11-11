import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3,Vector2,Raycaster,Plane} from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createSpriteAnimationClock,stationPose} from '../src/two/studio-pixel-avatar.js';
import {roomFocusPose,configureRoomCamera} from '../src/two/studio-camera.js';
import {STATIONS,CABINETS} from '../src/two/studio-world.js';
import {createInteractionController} from '../src/two/studio-interaction.js';

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
