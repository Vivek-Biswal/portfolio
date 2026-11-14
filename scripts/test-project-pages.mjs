import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import defaults from '../content/defaults.json' with {type:'json'};
import {lineProjectHref,lineProjectActions,renderLineProjects,projectDestinations} from '../src/one/project-content.js';
import {lineSections} from '../server/render-line.mjs';
import {renderPublic} from '../server/render-public.mjs';
import {escapeHtml} from '../src/shared/content.js';

const template=()=>readFileSync('2d/work/index.html','utf8');
const hrefs=html=>[...html.matchAll(/href="([^"]+)"/g)].map(match=>match[1]);
function fixture(){
  const c=structuredClone(defaults);
  c.projects=[c.projects[0],{...c.projects[0],id:'another-idea',title:'Another shared project',details:'A second idea.\n\nWith every detail preserved.',image:'',url:'https://example.com/project',demoUrl:'https://demo.example.com/',repositoryUrl:'https://github.com/example/project'}];
  return c;
}
test('every 2D image, title and primary action stays in its dedicated project world',()=>{
  const c=fixture(),html=lineSections(c).work;
  for(const project of c.projects){
    const route=lineProjectHref(project);
    assert.equal(hrefs(html).filter(href=>href===route).length,3);
    assert.ok(renderLineProjects(c).includes(`id="project-${project.id}"`),'native deep link has an actual article target');
  }
  assert.ok(!hrefs(html).includes('/work/dimensional-portfolio.html'));
  assert.equal(lineProjectHref({id:'a /?#&'}),'/2d/work/#project-a%20%2F%3F%23%26');
});
test('actual website, demo and repository destinations remain distinct from Explore project',()=>{
  const p=fixture().projects[1],html=lineProjectActions(p),links=projectDestinations(p);
  for(const destination of [p.url,p.demoUrl,p.repositoryUrl])assert.ok(hrefs(html).includes(destination));
  assert.equal(links.find(link=>link.kind==='project').label,'Visit website');
  assert.ok(hrefs(html).includes(lineProjectHref(p)));
  assert.match(html,/target="_blank" rel="noopener noreferrer"/);
  assert.deepEqual(projectDestinations({...p,url:p.demoUrl}).map(link=>link.kind),['demo','repository']);
  assert.deepEqual(projectDestinations({...p,url:'javascript:alert(1)',demoUrl:'',repositoryUrl:''}),[]);
});
test('every published project keeps complete CMS content and stable IDs after reordering',()=>{
  const c=fixture();c.projects[1].details=('A complete long paragraph. '.repeat(160))+'\nLast detail.';
  const first=renderLineProjects(c);c.projects.reverse();const second=renderLineProjects(c);
  for(const p of c.projects){
    for(const html of [first,second]){
      assert.ok(html.includes(`id="project-${p.id}"`));
      for(const value of [p.title,p.summary,p.category,p.year,...p.tags,...p.details.split('\n').filter(Boolean)])assert.ok(html.includes(escapeHtml(value)));
    }
  }
  const ids=[...second.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length);
  assert.ok(hrefs(second).includes(lineProjectHref(c.projects[1])));
});
test('projects without optional media or URLs still have readable case studies',()=>{
  const c=fixture();c.projects=[{...c.projects[0],url:'',image:'',details:'',tags:[]}];
  const html=renderLineProjects(c),work=lineSections(c).work;
  assert.ok(!/<img\b/.test(html));assert.ok(!/<a[^>]*href=""/.test(html));
  assert.ok(html.includes('More details will be shared here soon.'));
  assert.equal(hrefs(work).filter(href=>href===lineProjectHref(c.projects[0])).length,3);
  assert.ok(hrefs(html).includes('/2d/#ideas'),'one project does not link to itself as Up next');
});
test('empty collections show the catalog fallback without phantom articles',()=>{
  const c=fixture();c.projects=[];const html=renderLineProjects(c);
  assert.ok(html.includes('case-empty'));assert.ok(!html.includes('class="case-study"'));
  assert.ok(hrefs(html).includes('/2d/#work'));
});
test('CMS markup stays escaped in project content and bootstrap JSON',()=>{
  const c=fixture(),payload='</script><img src=x onerror=alert(1)> & "quoted"';
  c.profile.name=payload;c.projects[0]={...c.projects[0],title:payload,summary:payload,details:payload,tags:[payload],image:'/image.png" onerror="evil'};
  const rendered=renderPublic(template(),'2d-work',c);
  assert.ok(!rendered.includes('<img src=x onerror='));assert.ok(!/\sonerror="/.test(rendered));
  assert.ok(rendered.includes(escapeHtml(payload)));
  const json=rendered.match(/id="portfolio-content">([\s\S]*?)<\/script>/)[1];
  assert.ok(!json.includes('</script>'));assert.equal(JSON.parse(json).projects[0].title,payload);
});
test('published updates replace stories and identity without accumulating markup',()=>{
  const c=fixture(),original=renderPublic(template(),'2d-work',c);
  c.profile.name='Mira Chen';c.settings.copyright='Current copyright';
  c.projects=c.projects.slice(1);c.projects[0].details='Updated published detail.';
  const updated=renderPublic(original,'2d-work',c);
  assert.equal(renderPublic(updated,'2d-work',c),updated);
  assert.ok(updated.includes('Updated published detail.'));
  assert.ok(!updated.includes('id="project-dimensional-portfolio"'));
  assert.equal([...updated.matchAll(/id="portfolio-content"/g)].length,1);
  assert.match(updated,/<title>Selected work — Mira Chen — 2D<\/title>/);
  assert.match(updated,/class="signature"[^>]*>mira/);
  assert.ok(updated.includes('Current copyright'));
});
