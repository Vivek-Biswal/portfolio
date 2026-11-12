import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import defaults from '../content/defaults.json' with {type:'json'};
import {lineSections} from '../server/render-line.mjs';
import {renderPublic} from '../server/render-public.mjs';
import {escapeHtml, noteHref} from '../src/shared/content.js';

const template=()=>readFileSync(new URL('../2d/index.html',import.meta.url),'utf8');
const count=(html,pattern)=>[...html.matchAll(pattern)].length;
const hrefs=html=>[...html.matchAll(/\bhref="([^"]*)"/g)].map(match=>match[1]);
const hasClass=(html,name)=>new RegExp(`class="[^"\\n]*\\b${name}\\b[^"\\n]*"`).test(html);

function fixture(){
 const c=structuredClone(defaults);
 c.profile={...c.profile,name:'Mira Chen',headline:'Shared headline from the CMS.',introduction:'Shared introduction from the CMS.',status:'Shared current status',portrait:'/images/custom-portrait.png'};
 c.about.paragraphs=['First shared About paragraph.','Second shared About paragraph.'];
 c.skills=['A shared skill','Another shared skill'];
 c.projects=Array.from({length:3},(_,i)=>({id:`shared-project-${i}`,title:`Shared project ${i}`,summary:`Project summary ${i}.`,details:`Project details ${i}.`,url:`https://portfolio.example/projects/${i}`,image:`/images/project-${i}.png`,category:`Category ${i}`,year:'2026',tags:[`Technology ${i}`],repositoryUrl:`https://github.com/example/project-${i}`,demoUrl:`https://demo.example/project-${i}`}));
 c.notes=Array.from({length:7},(_,i)=>({id:`shared-note-${i}`,title:`Shared note ${i}`,summary:`Note summary ${i}.`,paragraphs:[`Published note body ${i}.`]}));
 c.contact={...c.contact,email:'shared@example.com',heading:'Shared contact heading.',message:'Shared contact message.',phone:'+91 12345 67890',location:'Shared location',socialLinks:[{label:'LinkedIn',url:'https://www.linkedin.com/in/shared-owner/'},{label:'X',url:'https://x.com/shared-owner'}],contactCardUrl:'/shared-owner.vcf',resumeUrl:'/shared-profile.pdf',booking:{url:'https://cal.com/shared-owner/intro',label:'Shared meeting link',durationMinutes:20,timezone:'Asia/Kolkata'}};
 c.settings={...c.settings,siteTitle:'Shared portfolio title',description:'Shared search description',copyright:'Shared copyright owner'};
 return c;
}

test('the scroll redesign retains one CMS destination per section and one copy of its motion shell',()=>{
 const c=fixture(),once=renderPublic(template(),'2d',c),twice=renderPublic(once,'2d',c);
 assert.equal(twice,once,'rendering an already rendered page must not accumulate wrappers, sections or bootstrap payloads');
 for(const id of ['hello','work','ideas','contact'])assert.equal(count(twice,new RegExp(`<section\\b[^>]*\\bid="${id}"`,'g')),1,`${id} remains a single CMS destination`);
 assert.equal(count(twice,/\bid="portfolio-content"/g),1);
 assert.equal(count(twice,/\bid="hello-title"/g),1);
 assert.equal(count(twice,/\bid="work-title"/g),1);
 assert.ok(hasClass(twice,'hero-stage'),'the hero motion stage is rendered with the content');
 assert.ok(hasClass(twice,'scroll-ribbon')&&hasClass(twice,'ribbon-track'),'the scrolling ribbon is present');
 assert.ok(hasClass(twice,'motion-intro')&&/\bdata-kinetic-phrase\b/.test(twice),'the scroll-driven phrase retains its animation target');
 const cloud=twice.match(/<[^>]*\bclass="[^"\n]*\bletter-cloud\b[^"\n]*"[^>]*>/)?.[0];
 assert.ok(cloud,'decorative letter layer exists');assert.match(cloud,/\baria-hidden="true"/,'decorative letters are hidden from screen readers');
 assert.match(twice,/<main\b[^>]*\bid="journey"[^>]*\btabindex="-1"/,'the skip destination remains keyboard focusable');
 for(const target of ['#hello','#work','#ideas','#contact','/','/3d/'])assert.ok(hrefs(twice).includes(target),`navigation keeps ${target}`);
});

test('the redesigned content uses every shared profile, About, project and contact field',()=>{
 const c=fixture(),sections=lineSections(c),html=renderPublic(template(),'2d',c);
 for(const value of [c.profile.name,c.profile.headline,c.profile.introduction,c.profile.status,c.profile.portrait,...c.about.paragraphs,...c.skills])assert.ok(sections.hello.includes(escapeHtml(value)),`missing profile/About field: ${value}`);
 for(const value of [c.contact.heading,c.contact.message,c.contact.email,c.contact.phone,c.contact.location])assert.ok(sections.contact.includes(escapeHtml(value)),`missing Contact field: ${value}`);
 const links=hrefs(sections.contact);
 for(const value of [c.contact.contactCardUrl,c.contact.resumeUrl,c.contact.booking.url,...c.contact.socialLinks.map(link=>link.url)])assert.ok(links.includes(escapeHtml(value)),`missing actual Contact link: ${value}`);
 assert.ok(links.some(link=>link.startsWith('mailto:shared%40example.com')),'email targets the current CMS address');
 for(const project of c.projects){
  assert.equal(count(sections.work,new RegExp(`id="project-title-${project.id}"`,'g')),1,`project ${project.id} appears once`);
  for(const value of [project.title,project.summary,project.details,project.image,project.category,project.year,...project.tags])assert.ok(sections.work.includes(escapeHtml(value)),`missing project field: ${value}`);
  for(const url of [project.url,project.repositoryUrl,project.demoUrl])assert.ok(hrefs(sections.work).includes(url),`missing actual project link: ${url}`);
 }
 assert.match(html,/<title>Shared portfolio title — 2D<\/title>/);
 assert.ok(html.includes('content="Shared search description"'));assert.ok(html.includes('Shared copyright owner'));
 assert.match(html,/class="signature"[^>]*>mira/,'signature follows the CMS owner');
 assert.ok(!/vivekbiswal\.(?:dev|com)(?:@|%40)gmail\.com/i.test(html),'old contact details are not left behind');
});

test('every note remains in the 2D world with a complete native fallback',()=>{
 const c=fixture(),ideas=lineSections(c).ideas;
 for(const note of c.notes){
  assert.equal(count(ideas,new RegExp(`data-line-note="${note.id}"`,'g')),1,`index contains one entry for ${note.id}`);
  assert.ok(hrefs(ideas).includes(noteHref(note,'2d')));
 }
 assert.ok(hrefs(ideas).includes('/2d/#now'));
 assert.ok(!hrefs(ideas).some(url=>url.startsWith('/work/notes.html')||url.startsWith('/work/now.html')),'reader links must keep the current world');
 const fallback=ideas.match(/<noscript\b[^>]*>([\s\S]*?)<\/noscript>/)?.[1];assert.ok(fallback);
 for(const note of c.notes){
  assert.ok(fallback.includes(`id="note-${note.id}"`));
  for(const value of [note.title,note.summary,...note.paragraphs])assert.ok(fallback.includes(escapeHtml(value)),`native fallback contains ${value}`);
 }
 assert.ok(fallback.includes('id="now"'));
});

test('hostile CMS copy stays text throughout the motion markup and JSON bootstrap',()=>{
 const c=fixture(),payload='</script><script data-attack="cms">alert(1)</script><img src=x onerror=alert(1)> & "quotes"';
 c.profile.name='Mira <img src=x onerror=alert(1)>';
 c.profile.headline=payload;c.profile.introduction=payload;c.profile.status=payload;
 c.about.paragraphs=[payload];c.skills=[payload];
 c.projects[0]={...c.projects[0],title:payload,summary:payload,details:payload,tags:[payload]};
 c.notes[0]={...c.notes[0],title:payload,summary:payload,paragraphs:[payload]};
 c.contact.heading=payload;c.contact.message=payload;
 const sections=lineSections(c),html=renderPublic(template(),'2d',c);
 for(const [key,body] of Object.entries(sections)){
  assert.ok(body.includes(escapeHtml(payload)),`${key} escapes CMS copy`);
  assert.ok(!body.includes('<script data-attack="cms">'));
  assert.ok(!body.includes('<img src=x onerror=alert(1)>'));
 }
 const bootstrap=html.match(/<script type="application\/json" id="portfolio-content">([\s\S]*?)<\/script>/)?.[1];assert.ok(bootstrap);
 assert.equal(JSON.parse(bootstrap).profile.headline,payload);
 assert.ok(!bootstrap.includes('</script>'));
 assert.ok(!html.includes('<script data-attack="cms">'));
});

test('empty collections and long CMS values do not create nested sections or lose content during replacement',()=>{
 const c=fixture(),long='A long shared heading '.repeat(45).trim();
 c.profile.name='Mira';c.profile.headline=long;c.profile.introduction=long;
 c.about.paragraphs=[long];c.skills=[];c.projects=[];c.notes=[];
 const empty=lineSections(c),rendered=renderPublic(template(),'2d',c);
 assert.deepEqual(Object.keys(empty),['hello','work','ideas','contact']);
 for(const [id,body] of Object.entries(empty))assert.ok(!/<\/?section\b/i.test(body),`${id} cannot nest section elements because CMS replacement uses the outer section boundary`);
 assert.ok(empty.hello.includes(escapeHtml(long)),'long editable profile text is kept');
 assert.ok(!/\bid="project-title-/.test(empty.work));assert.ok(!/data-line-note=/.test(empty.ideas));
 assert.ok(empty.ideas.includes('id="now"'),'current work survives an empty notes collection');
 assert.ok(rendered.includes(escapeHtml(c.contact.heading)),'the final Contact section survives empty preceding collections');
 assert.equal(renderPublic(rendered,'2d',c),rendered);
});
