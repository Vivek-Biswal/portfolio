import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3,Vector2,Raycaster,Plane} from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createSpriteAnimationClock} from '../src/two/studio-pixel-avatar.js';
import {roomFocusPose,configureRoomCamera} from '../src/two/studio-camera.js';
import {STATIONS,CABINETS} from '../src/two/studio-world.js';

test('sprite actions complete once, allow chained actions, and invalidate skipped callbacks',()=>{
 const clock=createSpriteAnimationClock();let completed=0;
 clock.play('sit_down',{loop:false,finish(){completed++;clock.play('book_open',{loop:false,finish:()=>completed++});}});
 clock.update(.5);assert.equal(completed,1);clock.update(1.4);clock.update(2);assert.equal(completed,2);
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
