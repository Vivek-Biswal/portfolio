import test from 'node:test';
import assert from 'node:assert/strict';
import {canStand,moveWithCollision,movementVector,nearestTarget,TARGETS,floorHeight} from '../src/two/studio-world.js';
import {cutawaySides} from '../src/two/studio-cutaway.js';
test('camera-relative movement keeps diagonals at walking speed',()=>{
  for(const angle of [0,Math.PI/2,Math.PI]){
    const v=movementVector(new Set(['up','right']),angle);
    assert.ok(Math.abs(Math.hypot(v.x,v.z)-1)<1e-10);
  }
  assert.deepEqual(movementVector(new Set(),0),{x:0,z:0});
});
test('desks and walls block movement, with sliding and no tunnelling',()=>{
  assert.equal(canStand(-5.7,.85),false);
  const p={x:-5.7,z:2.5};moveWithCollision(p,0,-5);
  assert.ok(p.z>2.3);assert.ok(canStand(p.x,p.z));
  const edge={x:1.4,z:5.25};moveWithCollision(edge,20,20);
  assert.ok(canStand(edge.x,edge.z));
});
test('all interaction points can be reached and distant targets do not activate',()=>{
  for(const target of TARGETS){assert.ok(canStand(target.x,target.z),target.id);assert.equal(nearestTarget(target)?.id,target.id);}
  assert.equal(nearestTarget({x:0,z:1}),undefined);
});
test('every destination has a connected walking path from the entrance',()=>{
  const queue=[[0,28]],seen=new Set(['0,28']);
  for(let cursor=0;cursor<queue.length;cursor++){
    const [x,z]=queue[cursor];
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,nz=z+dz,key=`${nx},${nz}`;
      if(!seen.has(key)&&canStand(nx/10,nz/10)){seen.add(key);queue.push([nx,nz]);}
    }
  }
  for(const target of TARGETS)assert.ok(queue.some(([x,z])=>Math.hypot(x/10-target.x,z/10-target.z)<.16),`${target.id} is connected`);
});
test('stairs change height continuously and camera cutaway keeps exactly two foreground walls hidden',()=>{
  assert.equal(floorHeight(0,0),0);assert.equal(floorHeight(-4,-3),.5);
  assert.ok(floorHeight(-4,-1.5)>0&&floorHeight(-4,-1.5)<.5);
  for(const [x,z,sides] of [[1,1,['E','S']],[-1,1,['W','S']],[-1,-1,['W','N']],[1,-1,['E','N']]])assert.deepEqual(cutawaySides(x,z),sides);
  assert.deepEqual(cutawaySides(.1,-.1,['W','N']),['W','N']);
});
