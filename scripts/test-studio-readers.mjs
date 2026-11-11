import test from 'node:test';
import assert from 'node:assert/strict';
import defaults from '../content/defaults.json' with {type:'json'};
import {renderStudioExperience as render} from '../src/two/studio-reader-views.js';

test('book contents reach every CMS note on desktop and phone, including odd final spreads',()=>{
 const c=structuredClone(defaults);c.notes=Array.from({length:26},(_,i)=>({id:`note-${i}`,title:`Idea ${i}`,summary:`Summary ${i}`,paragraphs:['An idea.']}));
 for(const singlePage of [false,true]){
  const ids=[];for(let page=0;page<6;page+=singlePage?1:2){
   const view=render(c,{kind:'notes',page,singlePage});
   ids.push(...[...view.body.matchAll(/data-item="([^"]+)"/g)].map(m=>m[1]));
  }
  assert.deepEqual(ids,c.notes.map(n=>n.id));
 }
 c.notes=c.notes.slice(0,1);
 const desktop=render(c,{kind:'notes'}),mobile=render(c,{kind:'notes',singlePage:true});
 assert.match(desktop.body,/studio-endpaper/);assert.doesNotMatch(mobile.body,/studio-endpaper/);
 assert.match(mobile.footer,/1 \/ 1/);assert.match(desktop.footer,/data-next disabled/);
});

test('long book articles paginate without dropping words and live updates retain the selected ID',()=>{
 const c=structuredClone(defaults),words=Array.from({length:1200},(_,i)=>`word${String(i).padStart(4,'0')}`);
 c.notes=[{id:'long',title:'Long article',summary:'Summary',paragraphs:[words.join(' ')]}];
 for(const singlePage of [false,true]){
  const seen=[];for(let page=0;page<9;page+=singlePage?1:2){
   const view=render(c,{kind:'notes',selected:'long',page,singlePage});
   assert.equal(view.selected,'long');seen.push(...view.body.match(/word\d{4}/g));
  }
  assert.deepEqual(seen,words);
 }
 c.notes[0].title='Updated title';assert.match(render(c,{kind:'notes',selected:'long'}).body,/Updated title/);
 c.notes=[];const empty=render(c,{kind:'notes',selected:'long',page:99});
 assert.equal(empty.selected,null);assert.equal(empty.page,0);assert.match(empty.body,/A fresh notebook/);
});

test('computer files preserve project details, images, technologies and real destination links',()=>{
 const c=structuredClone(defaults);c.projects=[{id:'work',title:'A <project>',summary:'A & B',details:'Full details',image:'/project.png',tags:['Three.js'],url:'https://example.com/work',repositoryUrl:'https://github.com/example/work',demoUrl:'https://example.com/demo'}];
 const folder=render(c,{kind:'projects'});assert.match(folder.body,/studio-finder/);assert.match(folder.body,/data-item="work"/);assert.match(folder.body,/A &lt;project&gt;/);
 const detail=render(c,{kind:'projects',selected:'work'});assert.equal(detail.selected,'work');
 for(const value of ['Full details','Three.js','/project.png','https://example.com/demo','https://github.com/example/work'])assert.ok(detail.body.includes(value),value);
 c.projects=[];const empty=render(c,{kind:'projects',selected:'work'});assert.equal(empty.selected,null);assert.match(empty.body,/The folder is ready/);
});

test('internet phone exposes only configured contact channels without fake booking state',()=>{
 const c=structuredClone(defaults);c.contact={...c.contact,email:'hello@example.com',heading:'Let’s <talk>',message:'A shared message.',socialLinks:[{label:'LinkedIn',url:'https://www.linkedin.com/in/example/'}],booking:{url:'https://cal.com/example/intro',durationMinutes:30},contactCardUrl:'/contact.vcf',resumeUrl:'/profile.pdf'};
 const phone=render(c,{kind:'contact'});assert.match(phone.body,/studio-browser-bar/);assert.match(phone.body,/Let’s &lt;talk&gt;/);
 for(const url of ['mailto:hello%40example.com','https://cal.com/example/intro','https://www.linkedin.com/in/example/','/contact.vcf','/profile.pdf'])assert.ok(phone.body.includes(url),url);
 assert.doesNotMatch(phone.body,/Meetings by email for now/);assert.match(phone.header,/data-close/);
 c.contact.booking.url='';assert.match(render(c,{kind:'contact'}).body,/Meetings by email for now/);
});
