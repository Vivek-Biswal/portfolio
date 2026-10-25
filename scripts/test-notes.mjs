import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import defaults from '../content/defaults.json' with {type:'json'};
import {validateContent} from '../server/schema.mjs';
import {renderPublic} from '../server/render-public.mjs';
import {lineSections} from '../server/render-line.mjs';
import {escapeHtml, noteHref} from '../src/shared/content.js';
import {renderLineNotebook} from '../src/one/notebook-content.js';
import {buildApps, renderNotesApp} from '../src/two/app-content.js';

function fixture() {
  const content=structuredClone(defaults);
  content.notes=[
    {id:'a-first-idea',title:'A first shared idea',summary:'A short introduction to the first idea.',paragraphs:['FIRST BODY — an idea recorded in the shared CMS.','A second paragraph belonging only to the first note.']},
    {id:'middle-thought',title:'A thought worth sharing',summary:'The same summary in every world.',paragraphs:['MIDDLE BODY — current published words from the CMS.','Keep this exact paragraph, including punctuation & emphasis.']},
    {id:'a-final-note',title:'One more little note',summary:'A different thought to read next.',paragraphs:['FINAL BODY — this belongs only to the final note.']},
  ];
  content.now={title:'What I’m exploring this week',introduction:'A current introduction from the shared CMS.',sections:[{heading:'An experiment in progress',paragraphs:['CURRENT WORK — these are my current published plans.']}]};
  return validateContent(content);
}
const legacyNotes=content=>renderPublic(readFileSync('work/notes.html','utf8'),'notes',content);
const readers=(content,id='middle-thought')=>[
  ['1D',legacyNotes(content)],
  ['2D',renderLineNotebook(content,{kind:'note',id})],
  ['3D',renderNotesApp(content,{kind:'note',id})],
];
const hrefs=html=>[...html.matchAll(/href="([^"]+)"/g)].map(match=>match[1]);

test('note links preserve their world and encode the note identifier',()=>{
  const note={id:'middle-thought'};
  assert.equal(noteHref(note),'/work/notes.html#middle-thought');
  assert.equal(noteHref(note,'1d'),'/work/notes.html#middle-thought');
  assert.equal(noteHref(note,'2d'),'/2d/#note-middle-thought');
  assert.equal(noteHref(note,'3d'),'/3d/#note-middle-thought');
  const unusual={id:'an idea/?#&'};
  for(const world of ['2d','3d'])assert.equal(noteHref(unusual,world),`/${world}/#note-${encodeURIComponent(unusual.id)}`);
});

test('all three reading presentations use the same current CMS note copy',()=>{
  const content=fixture(),note=content.notes[1];
  for(const [world,html] of readers(content)) {
    assert.equal(typeof html,'string',world);
    for(const text of [note.title,note.summary,...note.paragraphs])assert.ok(html.includes(escapeHtml(text)),`${world}: missing shared note copy`);
  }
});

test('each native reader displays only the selected note body',()=>{
  const content=fixture();
  for(const [world,html] of readers(content).slice(1)) {
    assert.ok(html.includes('MIDDLE BODY'),world);
    assert.ok(!html.includes('FIRST BODY'),world);
    assert.ok(!html.includes('FINAL BODY'),world);
    assert.ok(!html.includes('CURRENT WORK'),world);
  }
});

test('2D ideas and 3D notes index link to readers in their own world',()=>{
  const content=fixture();
  const views=[['2D','2d',lineSections(content).ideas],['3D','3d',buildApps(content).notes.html]];
  for(const [name,world,html] of views) {
    for(const note of content.notes)assert.ok(hrefs(html).includes(noteHref(note,world)),`${name}: missing native note link`);
    assert.ok(hrefs(html).includes(`/${world}/#now`),`${name}: current work must retain its world`);
    assert.ok(!hrefs(html).some(url=>url.startsWith('/work/notes.html')||url.startsWith('/work/now.html')),`${name}: sends readers to 1D`);
  }
});

test('2D keeps complete shared notes readable in its own world when JavaScript is unavailable',()=>{
  const content=fixture();
  const fallback=lineSections(content).ideas.match(/<noscript\b[^>]*>([\s\S]*?)<\/noscript>/)?.[1];
  assert.ok(fallback,'2D needs a readable fallback for the native notebook links');
  for(const note of content.notes) {
    assert.ok(fallback.includes(`id="note-${note.id}"`),'A native note link needs a fallback destination');
    for(const text of [note.title,note.summary,...note.paragraphs])assert.ok(fallback.includes(escapeHtml(text)),'Fallback note copy differs from the CMS');
  }
  assert.ok(fallback.includes('id="now"'));
  assert.ok(fallback.includes('CURRENT WORK'));
  assert.ok(!hrefs(fallback).some(url=>url.startsWith('/work/notes.html')||url.startsWith('/work/now.html')));
});

test('previous and next note navigation remains in the active world',()=>{
  const content=fixture();
  for(const [name,world,html] of [
    ['2D','2d',renderLineNotebook(content,{kind:'note',id:'middle-thought'})],
    ['3D','3d',renderNotesApp(content,{kind:'note',id:'middle-thought'})],
  ]) {
    const links=hrefs(html);
    assert.ok(links.includes(noteHref(content.notes[0],world)),`${name}: previous note missing`);
    assert.ok(links.includes(noteHref(content.notes[2],world)),`${name}: next note missing`);
    assert.ok(!links.some(url=>url.startsWith('/work/notes.html')||url.startsWith('/work/now.html')),`${name}: reader navigation leaves its world`);
  }
});

test('CMS note copy is escaped rather than interpreted as reader markup',()=>{
  const content=fixture();
  Object.assign(content.notes[1],{title:'<img src=x onerror=alert(1)>',summary:'</p><script>alert("summary")</script>',paragraphs:['<svg onload=alert(1)>A thought & a quote "here".']});
  for(const [name,html] of readers(content)) {
    for(const text of [content.notes[1].title,content.notes[1].summary,...content.notes[1].paragraphs])assert.ok(html.includes(escapeHtml(text)),`${name}: CMS text was not escaped`);
    assert.ok(!html.includes('<img src=x onerror='),name);
    assert.ok(!html.includes('<script>alert("summary")</script>'),name);
    assert.ok(!html.includes('<svg onload='),name);
  }
});

test('current work uses the shared Now content in both native readers',()=>{
  const content=fixture();
  const one=renderPublic(readFileSync('work/now.html','utf8'),'now',content);
  for(const [name,html] of [
    ['1D',one],
    ['2D',renderLineNotebook(content,{kind:'now'})],
    ['3D',renderNotesApp(content,{kind:'now'})],
  ]) {
    for(const text of [content.now.title,content.now.introduction,...content.now.sections.flatMap(section=>[section.heading,...section.paragraphs])])assert.ok(html.includes(escapeHtml(text)),`${name}: missing current work copy`);
    assert.ok(!html.includes('MIDDLE BODY'),name);
  }
});

test('a note whose ID is now remains distinct from the current-work view',()=>{
  const content=fixture();content.notes[1].id='now';
  for(const [name,world,render] of [['2D','2d',renderLineNotebook],['3D','3d',renderNotesApp]]) {
    assert.equal(noteHref(content.notes[1],world),`/${world}/#note-now`);
    const note=render(content,{kind:'note',id:'now'}),currentWork=render(content,{kind:'now'});
    assert.ok(note.includes('MIDDLE BODY'),name);
    assert.ok(!note.includes('CURRENT WORK'),name);
    assert.ok(currentWork.includes('CURRENT WORK'),name);
    assert.ok(!currentWork.includes('MIDDLE BODY'),name);
  }
});

test('a note removed by a CMS update cannot leave a stale reader article',()=>{
  const content=fixture();
  const selection={kind:'note',id:'middle-thought'};
  assert.ok(renderLineNotebook(content,selection).includes('MIDDLE BODY'));
  assert.ok(renderNotesApp(content,selection).includes('MIDDLE BODY'));
  content.notes=content.notes.filter(note=>note.id!==selection.id);
  assert.equal(renderLineNotebook(content,selection),null,'2D must signal recovery to the ideas index');
  const pixel=renderNotesApp(content,selection);
  assert.ok(!pixel.includes('MIDDLE BODY'),'3D must not show deleted note copy');
  for(const note of content.notes)assert.ok(hrefs(pixel).includes(noteHref(note,'3d')),'3D must return to a usable notes index');
});

test('CMS edits and note reordering update readers without changing the selected note identity',()=>{
  const content=fixture(),selected=content.notes[1];
  selected.title='An edited shared title';
  selected.paragraphs=['UPDATED BODY — the newest publication.'];
  content.notes=[content.notes[2],selected,content.notes[0]];
  for(const [name,world,html] of [
    ['2D','2d',renderLineNotebook(content,{kind:'note',id:selected.id})],
    ['3D','3d',renderNotesApp(content,{kind:'note',id:selected.id})],
  ]) {
    assert.ok(html.includes('An edited shared title'),name);
    assert.ok(html.includes('UPDATED BODY'),name);
    assert.ok(!html.includes('MIDDLE BODY'),name);
    assert.ok(hrefs(html).includes(noteHref(content.notes[0],world)),name);
    assert.ok(hrefs(html).includes(noteHref(content.notes[2],world)),name);
  }
});

test('an empty notes collection keeps current work available without phantom note links',()=>{
  const content=fixture();content.notes=[];
  assert.equal(renderLineNotebook(content,{kind:'note',id:'missing-note'}),null);
  const pixel=renderNotesApp(content);
  assert.equal(hrefs(pixel).filter(url=>url.includes('#note-')).length,0);
  assert.ok(hrefs(pixel).includes('/3d/#now'));
  assert.ok(renderNotesApp(content,{kind:'now'}).includes('CURRENT WORK'));
  assert.ok(renderLineNotebook(content,{kind:'now'}).includes('CURRENT WORK'));
});
