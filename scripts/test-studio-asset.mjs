import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {wallGroup} from '../src/two/studio-cutaway.js';
import {Vector3} from 'three';

test('the exported studio loads and all four decorated walls can be batched independently',async()=>{
  const bytes=readFileSync(new URL('../public/studio/sunset-studio.glb',import.meta.url));
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const groups=new Map(),sides=new Set();gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(object=>{
    if(!object.isMesh)return;
    const side=wallGroup(object.name,new Vector3().setFromMatrixPosition(object.matrixWorld));sides.add(side);
    if(object.name.startsWith('Entrance'))assert.equal(side,'S','door frame follows the front cutaway');
    if(/^(Projects_back_panel|Arcade_back|Ideas_partition)/.test(object.name))assert.equal(side,'N','display walls cannot block the rear cutaway');
    const geometry=object.geometry.clone().applyMatrix4(object.matrixWorld);
    // These authored materials are untextured. Removing UVs lets cubes, foliage
    // and font geometry share batches despite different source attributes.
    for(const key of Object.keys(geometry.attributes))if(!['position','normal'].includes(key))geometry.deleteAttribute(key);
    const key=side+object.material.uuid,batch=groups.get(key)||[];batch.push(geometry);groups.set(key,batch);
  });
  assert.deepEqual([...sides].sort(),['E','N','S','W','core']);
  assert.ok(groups.size<100,'static room remains under 100 material batches');
  for(const geometries of groups.values()){
    const merged=mergeGeometries(geometries);assert.ok(merged,'mixed authored geometry merges successfully');
    assert.ok(merged.attributes.position.count>0);merged.dispose();geometries.forEach(g=>g.dispose());
  }
});
