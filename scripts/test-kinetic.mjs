import test from 'node:test';
import assert from 'node:assert/strict';
import {letterScatter,textSegments,motionIsEnabled,fittedNameSize} from '../src/one/kinetic-math.js';

test('letter choreography stays deterministic, finite and bounded on long CMS headings',()=>{
 for(let i=0;i<500;i++){
  const desktop=letterScatter(i),mobile=letterScatter(i,{mobile:true});
  assert.deepEqual(desktop,letterScatter(i));
  assert.ok(Object.values(desktop).every(Number.isFinite));
  assert.ok(Math.abs(desktop.x)<=180&&Math.abs(desktop.y)<=150&&Math.abs(desktop.rotation)<=32.5);
  assert.ok(Math.abs(mobile.x)<=86.4&&Math.abs(mobile.y)<=72,'mobile motion stays within a shorter travel');
 }
 assert.deepEqual(letterScatter(1,{strength:NaN}),letterScatter(1));
 assert.equal(letterScatter(1,{strength:0}).scale,1);
});

test('visual glyph splitting preserves combining marks, emoji and every original character',()=>{
 for(const text of ['Vivek Biswal','Café & curiosity','e\u0301 👨‍👩‍👧‍👦 ✨','नमस्ते'])assert.equal(textSegments(text).join(''),text);
 assert.equal(textSegments('e\u0301').length,1);assert.equal(textSegments('👨‍👩‍👧‍👦').length,1);
 assert.deepEqual(textSegments(null),[]);
});

test('reduced motion always overrides saved animation settings and opt-out persists',()=>{
 assert.equal(motionIsEnabled(null,false),true);assert.equal(motionIsEnabled('off',false),false);
 for(const setting of [null,'on','off'])assert.equal(motionIsEnabled(setting,true),false);
 assert.equal(motionIsEnabled('on',false),true);
});

test('long CMS name rows shrink to their column while short names keep their authored size',()=>{
 assert.equal(fittedNameSize(240,500,800),240);
 assert.equal(fittedNameSize(240,1200,600),120);
 assert.equal(fittedNameSize(80,800,280),28);
 for(const width of [280,640,1200])for(const natural of [500,1600,5000]){
  const size=fittedNameSize(240,natural,width);
  assert.ok(size<=240&&size>0);assert.ok(natural*size/240<=width+.001);
 }
 assert.equal(fittedNameSize(80,0,300),80);assert.equal(fittedNameSize(80,NaN,300),80);
});
