import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import defaults from '../content/defaults.json' with {type:'json'};
import {renderPublic} from '../server/render-public.mjs';
import {escapeHtml, emailHref} from '../src/shared/content.js';

const files={index:'index.html','1d':'1d/index.html',project:'work/dimensional-portfolio.html',notes:'work/notes.html',now:'work/now.html'};
const template=page=>readFileSync(new URL('../'+files[page],import.meta.url),'utf8');
const render=(page,content)=>renderPublic(template(page),page,content);
const homes=content=>['index','1d'].map(page=>[page,render(page,content)]);
const hrefs=html=>[...html.matchAll(/\bhref="([^"]*)"/g)].map(match=>match[1]);
const visibleText=html=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const countId=(html,id)=>[...html.matchAll(new RegExp(`\\bid="${id}"`,'g'))].length;
const disclosure=(html,id)=>html.match(new RegExp(`<details\\b(?=[^>]*\\bid="${id}")[^>]*>[\\s\\S]*?</details>`))?.[0]||'';

function fixture(revision='original'){
  const c=structuredClone(defaults);
  c.profile={...c.profile,name:`Mira ${revision}`,headline:`A ${revision} shared headline.`,introduction:`The ${revision} shared introduction.`,status:`Exploring the ${revision} idea`,portrait:`/images/${revision}-photo.png`,dottedPortrait:`/images/${revision}-dots.png`,portraitCaption:`A ${revision} portrait caption.`};
  c.about.paragraphs=[`First ${revision} About paragraph.`,`Second ${revision} About paragraph.`];
  c.skills=[`${revision} interface design`,`${revision} prototyping`];
  c.projects=Array.from({length:2},(_,i)=>({id:`${revision}-project-${i}`,title:`A ${revision} project ${i}`,summary:`Shared ${revision} summary ${i}.`,details:`The ${revision} details ${i}.`,url:`https://portfolio.example/${revision}/project-${i}`,image:`/images/${revision}-project-${i}.png`,category:`${revision} category ${i}`,year:'2026',tags:[`${revision} technology ${i}`],repositoryUrl:`https://github.com/example/${revision}-${i}`,demoUrl:`https://demo.example/${revision}/${i}`}));
  c.notes=Array.from({length:3},(_,i)=>({id:`${revision}-note-${i}`,title:`A ${revision} note ${i}`,summary:`The ${revision} note summary ${i}.`,paragraphs:[`First ${revision} note paragraph ${i}.`,`Second ${revision} note paragraph ${i}.`]}));
  c.now={title:`The ${revision} current work`,introduction:`A ${revision} current-work introduction.`,sections:[{heading:`The ${revision} focus`,paragraphs:[`A ${revision} current-work paragraph.`]}]};
  c.contact={...c.contact,email:`${revision}@example.com`,phone:'+91 12345 67890',location:`The ${revision} location`,heading:`The ${revision} contact heading`,message:`The ${revision} contact message.`,socialLinks:[{label:'LinkedIn',url:`https://www.linkedin.com/in/${revision}-owner/`},{label:`${revision} journal`,url:`https://journal.example/${revision}`}],resumeUrl:`/${revision}-profile.pdf`,contactCardUrl:`/${revision}-contact.vcf`,booking:{url:`https://cal.com/${revision}-owner/intro`,label:`A ${revision} conversation`,durationMinutes:25,timezone:'Asia/Kolkata'}};
  c.settings={...c.settings,siteTitle:`The ${revision} portfolio`,description:`The ${revision} search description`,copyright:`Copyright ${revision} owner`};
  return c;
}

test('all essentials routes stay script-free with usable native navigation',()=>{
  const c=fixture();
  for(const page of Object.keys(files)){
    const html=render(page,c);
    assert.ok(!/<script\b/i.test(html),`${page} must not require or inject a script`);
    assert.ok(!/\bon(?:click|keydown|load)\s*=/i.test(html),`${page} must not add inline script handlers`);
    assert.match(html,/<main\b[^>]*\bid="main"[^>]*\btabindex="-1"/,`${page} keeps a focusable skip destination`);
    assert.ok(hrefs(html).includes('#main'),`${page} retains its skip link`);
    assert.ok(!hrefs(html).some(href=>href.startsWith('/admin')),`${page} does not expose an admin link`);
  }
  for(const [page,html] of homes(c)){
    for(const id of ['about','work','notes','contact'])assert.equal(countId(html,id),1,`${page}: one destination for ${id}`);
    for(const href of ['#about','#work','#contact','/2d/','/3d/'])assert.ok(hrefs(html).includes(href),`${page}: missing navigation ${href}`);
    assert.ok(!hrefs(html).some(href=>href.startsWith('/work/')),`${page}: portfolio reading stays on the home page`);
  }
});

test('both home routes display the current shared profile, work, notes and contact content',()=>{
  const c=fixture();
  for(const [page,html] of homes(c)){
    const values=[c.profile.name,c.profile.headline,c.profile.introduction,c.profile.status,c.profile.dottedPortrait,c.profile.portraitCaption,...c.about.paragraphs,...c.skills,c.contact.heading,c.contact.message,c.contact.email,c.contact.phone,c.contact.location,c.contact.booking.label,c.settings.siteTitle,c.settings.description,c.settings.copyright];
    for(const value of values)assert.ok(html.includes(escapeHtml(value)),`${page}: missing shared field ${value}`);
    for(const project of c.projects){
      for(const value of [project.title,project.summary,project.details,project.image,project.category,project.year,...project.tags])assert.ok(html.includes(escapeHtml(value)),`${page}: missing project field ${value}`);
      for(const url of [project.url,project.repositoryUrl,project.demoUrl])assert.ok(hrefs(html).includes(escapeHtml(url)),`${page}: missing project destination ${url}`);
    }
    for(const note of c.notes){
      const article=disclosure(html,'note-'+note.id);
      assert.match(article,/<summary\b/,`${page}: note ${note.id} has a native open/close control`);
      for(const value of [note.title,note.summary,...note.paragraphs])assert.ok(article.includes(escapeHtml(value)),`${page}: missing inline note field ${value}`);
    }
    const desk=disclosure(html,'now');
    assert.match(desk,/<summary\b/,`${page}: current work has a native open/close control`);
    for(const value of [c.now.title,c.now.introduction,...c.now.sections.flatMap(section=>[section.heading,...section.paragraphs])])assert.ok(desk.includes(escapeHtml(value)),`${page}: missing inline current-work field ${value}`);
    for(const url of [emailHref(c.contact.email),c.contact.resumeUrl,c.contact.contactCardUrl,c.contact.booking.url,...c.contact.socialLinks.map(link=>link.url)])assert.ok(hrefs(html).includes(escapeHtml(url)),`${page}: missing contact destination ${url}`);
    assert.ok(!/vivekbiswal\.(?:dev|com)(?:@|%40)gmail\.com/i.test(html),`${page}: stale contact address`);
  }
});

test('note IDs remain reachable after CMS reordering and readers retain complete published copy',()=>{
  const c=fixture();
  c.notes=[c.notes[2],c.notes[0],c.notes[1]];
  const reader=render('notes',c);
  for(const note of c.notes){
    assert.equal(countId(reader,note.id),1,`one article anchor for ${note.id}`);
    for(const [page,home] of homes(c)){
      assert.equal(countId(home,'note-'+note.id),1,`${page}: stable inline note anchor after reordering`);
      assert.match(disclosure(home,'note-'+note.id),/<summary\b/,`${page}: reordered note remains operable`);
    }
    for(const text of [note.title,note.summary,...note.paragraphs])assert.ok(reader.includes(escapeHtml(text)),`complete published article: ${text}`);
  }
  const now=render('now',c);
  for(const text of [c.now.title,c.now.introduction,...c.now.sections.flatMap(section=>[section.heading,...section.paragraphs])])assert.ok(now.includes(escapeHtml(text)),`current-work reader retains ${text}`);
  const projects=render('project',c);
  for(const project of c.projects)for(const text of [project.title,project.summary,project.details])assert.ok(projects.includes(escapeHtml(text)),`project reader retains ${text}`);
});

test('empty collections keep the essentials and readers usable without phantom content links',()=>{
  const c=fixture(),removedIds=[...c.projects,...c.notes].map(item=>item.id);
  c.projects=[];c.notes=[];c.skills=[];c.contact.socialLinks=[];c.contact.booking.url='';c.contact.resumeUrl='';c.contact.contactCardUrl='';
  for(const page of Object.keys(files)){
    const html=render(page,c),links=hrefs(html);
    assert.ok(!links.includes(''),`${page}: no empty destination`);
    assert.ok(!links.some(href=>href.startsWith('/work/notes.html#')),`${page}: no nonexistent note destination`);
    assert.ok(!links.some(href=>removedIds.some(id=>href.includes(id))),`${page}: no stale project/note destination`);
    assert.ok(!/\b(?:src|href)="(?:undefined|null)"/.test(html),`${page}: no invalid generated attribute`);
    assert.ok(html.includes(escapeHtml(c.profile.name)),`${page}: shared owner remains available`);
  }
  for(const [page,html] of homes(c)){
    assert.match(disclosure(html,'now'),/<summary\b/,`${page}: current work remains reachable on the page`);
    assert.ok(hrefs(html).includes(emailHref(c.contact.email)),`${page}: contact remains usable`);
    for(const id of ['about','work','notes','contact'])assert.equal(countId(html,id),1,`${page}: empty collections preserve ${id}`);
  }
});

test('project titles open complete inline details and only external project actions leave the page',()=>{
  const c=fixture();
  c.projects[0].url='/work/dimensional-portfolio.html';
  c.projects.reverse();
  for(const [page,html] of homes(c)){
    assert.ok(!hrefs(html).some(href=>href.startsWith('/work/')),`${page}: local project reading does not navigate away`);
    for(const project of c.projects){
      const id='project-'+project.id,body=disclosure(html,id);
      assert.equal(countId(html,id),1,`${page}: stable unique project anchor`);
      assert.match(body,/<summary\b[^>]*>[\s\S]*?<\/summary>/,`${page}: project is a native disclosure`);
      const summary=body.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/)?.[1]||'';
      assert.ok(summary.includes(escapeHtml(project.title)),`${page}: clicking the project title opens it in place`);
      assert.ok(!/<a\b/.test(summary),`${page}: project summary does not contain competing navigation`);
      for(const value of [project.summary,project.details,project.image,...project.tags])assert.ok(body.includes(escapeHtml(value)),`${page}: complete inline project field ${value}`);
      for(const url of [project.repositoryUrl,project.demoUrl])assert.ok(hrefs(body).includes(escapeHtml(url)),`${page}: actual project destination remains available`);
      if(project.url.startsWith('https://'))assert.ok(hrefs(body).includes(escapeHtml(project.url)),`${page}: external project page remains available`);
    }
  }
});

test('long inline articles and current-work updates remain complete without duplicate anchors',()=>{
  const c=fixture();
  c.notes[0].paragraphs=Array.from({length:60},(_,i)=>`Paragraph ${i+1}: ${'A complete thought with room to breathe. '.repeat(35)}`);
  c.now.sections.push({heading:'A second current focus',paragraphs:['The complete second current-work update.']});
  for(const [page,html] of homes(c)){
    const article=disclosure(html,'note-'+c.notes[0].id);
    for(const paragraph of c.notes[0].paragraphs)assert.ok(article.includes(escapeHtml(paragraph)),`${page}: long article is not truncated`);
    assert.ok(disclosure(html,'now').includes('The complete second current-work update.'),`${page}: all current-work sections are included`);
    const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
    assert.equal(new Set(ids).size,ids.length,`${page}: expanding the home content does not duplicate IDs`);
    assert.equal(renderPublic(html,page,c),html,`${page}: rerendering long inline content is idempotent`);
  }
});

test('hostile CMS text stays escaped across home and reading routes',()=>{
  const c=fixture(),attack='<img src=x onerror=alert(1)><script data-attack="cms">alert(2)</script> & "quotes"';
  c.profile.name=`Mira ${attack}`;
  c.profile.headline=attack;c.profile.introduction=attack;c.profile.status=attack;c.profile.portraitCaption=attack;
  c.about.paragraphs=[attack];c.skills=[attack];
  c.projects[0]={...c.projects[0],title:attack,summary:attack,details:attack,tags:[attack]};
  c.notes[0]={...c.notes[0],title:attack,summary:attack,paragraphs:[attack]};
  c.now={title:attack,introduction:attack,sections:[{heading:attack,paragraphs:[attack]}]};
  c.contact.heading=attack;c.contact.message=attack;c.settings.description=attack;
  for(const page of Object.keys(files)){
    const html=render(page,c);
    assert.ok(html.includes(escapeHtml(attack)),`${page}: escaped text remains readable`);
    assert.ok(!html.includes('<img src=x onerror='),`${page}: no injected image`);
    assert.ok(!html.includes('<script data-attack='),`${page}: no injected script`);
    assert.ok(!/<script\b/i.test(html),`${page}: remains script-free with hostile text`);
  }
});

test('rerendering with newer CMS data replaces old owner, articles and contact copy',()=>{
  const before=fixture('previous'),after=fixture('updated');
  for(const page of Object.keys(files)){
    const once=render(page,before),updated=renderPublic(once,page,after);
    assert.ok(updated.includes(escapeHtml(after.profile.name)),`${page}: updated owner`);
    assert.ok(!updated.includes(escapeHtml(before.profile.name)),`${page}: stale owner removed`);
    assert.ok(!updated.includes('previous'),`${page}: stale published content or links remain`);
    assert.ok(updated.includes(escapeHtml(after.settings.description)),`${page}: updated description`);
    assert.equal(renderPublic(updated,page,after),updated,`${page}: repeated rendering must not accumulate markup`);
  }
});

test('root and explicit 1D routes present the same published content and destinations',()=>{
  const c=fixture(),root=render('index',c),one=render('1d',c);
  assert.equal(visibleText(root),visibleText(one),'the two essentials entry points have consistent reader-visible text');
  assert.deepEqual(hrefs(root),hrefs(one),'the two entry points retain the same navigation and CMS links');
  const fallback=structuredClone(c);fallback.profile.dottedPortrait='';
  for(const [page,html] of homes(fallback))assert.ok(html.includes(`src="${escapeHtml(c.profile.portrait)}"`),`${page}: ordinary portrait remains the fallback`);
});
