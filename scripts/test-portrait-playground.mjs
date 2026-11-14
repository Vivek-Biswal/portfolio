import test from 'node:test';
import assert from 'node:assert/strict';
import {mountPortraitPlayground} from '../src/one/portrait-playground.js';

class Events{
  listeners=new Map();
  addEventListener(type,listener){
    if(!this.listeners.has(type))this.listeners.set(type,new Set());
    this.listeners.get(type).add(listener);
  }
  removeEventListener(type,listener){this.listeners.get(type)?.delete(listener);}
  emit(type,event={}){for(const listener of [...this.listeners.get(type)||[]])listener(event);}
  get listenerCount(){return [...this.listeners.values()].reduce((total,list)=>total+list.size,0);}
}

function createStage(selected='portrait'){
  const styles=new Map(),classes=new Set();
  const button={hidden:true,closest:selector=>selector==='#portrait-remix'?button:null};
  const status={textContent:''};
  const canvas={closest:selector=>selector==='.playground-canvas'?canvas:null,getBoundingClientRect:()=>({left:0,top:0,width:400,height:400})};
  const radios=['portrait','play','signed'].map(value=>({value,checked:value===selected,matches:selector=>selector==='input[name="portrait-composition"]'}));
  const descendants=new Set([button,status,canvas,...radios]);
  const stage={
    isConnected:true,dataset:{composition:selected},
    style:{setProperty:(key,value)=>styles.set(key,value),removeProperty:key=>styles.delete(key)},
    classList:{add:value=>classes.add(value),remove:value=>classes.delete(value)},
    contains:element=>descendants.has(element),
    querySelectorAll:selector=>selector==='input[name="portrait-composition"]'?radios:[],
    querySelector:selector=>selector==='#portrait-remix'?button:selector==='.playground-announcement'?status:selector==='input[name="portrait-composition"]:checked'?radios.find(radio=>radio.checked):null,
  };
  return {stage,button,status,canvas,radios,styles,classes};
}

function harness({reduced=false,motion='on',selected='portrait'}={}){
  const doc=new Events(),win=new Events(),reducedQuery=new Events(),fineQuery=new Events();
  Object.assign(reducedQuery,{matches:reduced});Object.assign(fineQuery,{matches:true});
  const frames=new Map(),timers=new Map(),observers=new Set();let sequence=0;
  const view=createStage(selected);
  doc.documentElement={dataset:{motion}};doc.hidden=false;doc.stage=view.stage;
  doc.querySelector=selector=>selector==='.portrait-playground'?doc.stage:null;
  win.matchMedia=query=>query.includes('reduced-motion')?reducedQuery:fineQuery;
  win.requestAnimationFrame=callback=>{const id=++sequence;frames.set(id,callback);return id;};
  win.cancelAnimationFrame=id=>frames.delete(id);
  win.setTimeout=callback=>{const id=++sequence;timers.set(id,callback);return id;};
  win.clearTimeout=id=>timers.delete(id);
  win.MutationObserver=class{
    constructor(callback){this.callback=callback;}
    observe(){observers.add(this);}
    disconnect(){observers.delete(this);}
  };
  const flush=queue=>{const pending=[...queue.values()];queue.clear();pending.forEach(callback=>callback());};
  const controller=mountPortraitPlayground(doc,win);
  return {doc,win,view,reducedQuery,fineQuery,frames,timers,observers,controller,
    flushFrames:()=>flush(frames),flushTimers:()=>flush(timers),
    setMotion(value){doc.documentElement.dataset.motion=value;for(const observer of observers)observer.callback();},
    choose(value,target=view){const radio=target.radios.find(radio=>radio.value===value);radio.checked=true;doc.emit('change',{target:radio});},
    remix(target=view){doc.emit('click',{target:target.button});},
    move(target=view){doc.emit('pointermove',{target:target.canvas,pointerType:'mouse',clientX:400,clientY:0});},
  };
}

const expectSelection=(view,value)=>{
  assert.equal(view.stage.dataset.composition,value);
  assert.deepEqual(view.radios.filter(radio=>radio.checked).map(radio=>radio.value),[value]);
};

test('initialization respects a native composition selected before JavaScript finishes loading',()=>{
  for(const selected of ['play','signed']){
    const h=harness({selected});
    expectSelection(h.view,selected);
    assert.equal(h.view.status.textContent,'','mount does not announce an unrequested change');
    assert.equal(h.frames.size+h.timers.size,0,'mount does not start an unsolicited drawing');
    h.remix();expectSelection(h.view,selected==='play'?'signed':'portrait');
    h.controller.destroy();
  }
});

test('rapid Remix presses keep the last composition and replace pending ink work',()=>{
  const h=harness();
  assert.equal(h.view.button.hidden,false,'enhancement control is made available');
  for(let i=0;i<11;i++)h.remix();
  expectSelection(h.view,'signed');
  assert.equal(h.view.status.textContent,'Signed composition selected.');
  assert.equal(h.frames.size,1,'only the final ink start remains pending');
  h.flushFrames();
  assert.ok(h.view.classes.has('is-signing'));assert.equal(h.timers.size,1);
  h.remix();
  expectSelection(h.view,'portrait');
  assert.equal(h.timers.size,0,'new input clears the old ink cleanup');
  assert.ok(!h.view.classes.has('is-signing'),'old drawing is reset before replay');
  h.flushFrames();h.flushTimers();
  assert.ok(!h.view.classes.has('is-signing'));assert.equal(h.frames.size+h.timers.size,0);
  h.controller.destroy();
});

test('a CMS hero replacement preserves selection and cancels work on detached artwork',()=>{
  const h=harness();h.choose('signed');h.move();h.flushFrames();
  assert.ok(h.view.styles.has('--tilt-x'));assert.ok(h.view.classes.has('is-signing'));
  const fresh=createStage();h.view.stage.isConnected=false;h.doc.stage=fresh.stage;
  h.doc.emit('portfolio:content-updated');
  expectSelection(fresh,'signed');
  assert.equal(fresh.button.hidden,false);
  assert.equal(h.view.styles.size,0);assert.ok(!h.view.classes.has('is-signing'));
  assert.equal(h.frames.size+h.timers.size,0,'detached art has no pending work');
  h.remix(fresh);expectSelection(fresh,'portrait');
  h.choose('play',h.view);expectSelection(fresh,'portrait');
  h.controller.destroy();
});

test('reduced motion keeps native selection and Remix usable without scheduling ink or tilt',()=>{
  const h=harness({reduced:true});
  h.choose('signed');expectSelection(h.view,'signed');
  h.remix();expectSelection(h.view,'portrait');
  h.move();
  assert.equal(h.frames.size+h.timers.size,0);
  assert.equal(h.view.styles.size,0);assert.ok(!h.view.classes.has('is-signing'));
  assert.equal(h.view.status.textContent,'Portrait composition selected.');
  h.controller.destroy();
});

test('turning decorative motion off clears active work without resetting the composition',()=>{
  const h=harness();h.choose('play');h.move();h.flushFrames();
  assert.ok(h.view.classes.has('is-signing'));assert.ok(h.view.styles.has('--tilt-y'));
  h.setMotion('off');
  expectSelection(h.view,'play');
  assert.equal(h.frames.size+h.timers.size,0);assert.equal(h.view.styles.size,0);
  assert.ok(!h.view.classes.has('is-signing'));
  h.remix();expectSelection(h.view,'signed');assert.equal(h.frames.size+h.timers.size,0);
  h.controller.destroy();
});

test('destroy clears timers, frame callbacks, observers and listeners and leaves native radios intact',()=>{
  const h=harness();h.remix();h.flushFrames();h.move();
  assert.ok(h.frames.size>0&&h.timers.size>0,'cleanup is exercised with pending work');
  h.controller.destroy();
  assert.equal(h.frames.size+h.timers.size,0);
  assert.equal(h.doc.listenerCount+h.win.listenerCount+h.reducedQuery.listenerCount+h.fineQuery.listenerCount,0);
  assert.equal(h.observers.size,0);assert.equal(h.view.styles.size,0);
  assert.ok(!h.view.classes.has('is-signing'));assert.equal(h.view.button.hidden,true);
  expectSelection(h.view,'play');
  h.doc.emit('click',{target:h.view.button});expectSelection(h.view,'play');
  assert.doesNotThrow(()=>h.controller.destroy(),'teardown is safe to repeat');
});
