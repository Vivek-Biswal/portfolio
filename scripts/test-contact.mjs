import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import defaults from '../content/defaults.json' with {type:'json'};
import {validateContent} from '../server/schema.mjs';
import {renderPublic} from '../server/render-public.mjs';
import {buildApps} from '../src/two/app-content.js';
import {contactChannels, contactRowsHtml, publicBookingUrl, bookingNote, projectLinks, projectLinksHtml} from '../src/shared/contact.js';

const copy=()=>structuredClone(defaults);
const validBookingUrls=[
  'https://cal.com/vivek-biswal/intro',
  'https://cal.com/vivek-biswal/intro/',
  'https://calendar.google.com/calendar/appointments/schedules/Public_schedule-123',
  'https://calendar.google.com/calendar/u/0/appointments/schedules/Public_schedule-123',
  'https://calendar.google.com/calendar/u/12/appointments/schedules/Public_schedule-123/',
  'https://calendar.app.google/Public_schedule-123',
];
const invalidBookingUrls=[
  'https://meet.google.com/abc-defg-hij',
  'http://cal.com/vivek-biswal/intro',
  'javascript:alert(1)',
  '//cal.com/vivek-biswal/intro',
  '/calendar/appointments/schedules/schedule-id',
  'https://cal.com.evil.example/vivek-biswal/intro',
  'https://calendar.google.com.evil.example/calendar/appointments/schedules/schedule-id',
  'https://calendar.app.google.evil.example/schedule-id',
  'https://owner:secret@cal.com/vivek-biswal/intro',
  'https://owner@calendar.google.com/calendar/appointments/schedules/schedule-id',
  'https://cal.com/vivek-biswal',
  'https://cal.com/vivek-biswal/intro/extra',
  'https://cal.com/vivek%20biswal/intro',
  'https://calendar.google.com/calendar/u/me/appointments/schedules/schedule-id',
  'https://calendar.google.com/calendar/appointments/schedules/schedule%2Fid',
  'https://calendar.app.google/schedule.id',
  ' https://cal.com/vivek-biswal/intro',
];
function fixture() {
  const c=copy();
  c.contact.heading='A shared conversation';
  c.contact.email='shared-contact@example.com';
  c.contact.booking={url:validBookingUrls[3],label:'Book a conversation',durationMinutes:30,timezone:'Asia/Kolkata'};
  c.contact.socialLinks=[
    {label:'LinkedIn',url:'https://www.linkedin.com/in/vivek-biswal/'},
    {label:'X',url:'https://x.com/vivekbiswal2006'},
    {label:'GitHub',url:'https://github.com/Vivek-Biswal'},
  ];
  return c;
}
function publicViews(c) {
  return [
    ['1D',renderPublic(readFileSync('1d/index.html','utf8'),'1d',c)],
    ['2D',renderPublic(readFileSync('2d/index.html','utf8'),'2d',c)],
    ['3D',buildApps(c).contact.html],
  ];
}

test('old content receives optional booking and project link defaults without requiring migration',()=>{
  const c=copy();
  delete c.contact.booking;
  for (const p of c.projects) {delete p.repositoryUrl;delete p.demoUrl;delete p.githubId;}
  const parsed=validateContent(c);
  assert.deepEqual(parsed.contact.booking,{url:'',label:'Book a conversation',durationMinutes:30,timezone:'Asia/Kolkata'});
  for (const p of parsed.projects) {
    assert.equal(p.repositoryUrl,'');assert.equal(p.demoUrl,'');assert.equal(p.githubId,undefined);
  }
  assert.doesNotThrow(()=>publicViews(c));
});

test('schema and public helper accept real Cal.com and Google Calendar booking URL formats consistently',()=>{
  for (const url of validBookingUrls) {
    const c=fixture();c.contact.booking.url=url;
    assert.equal(validateContent(c).contact.booking.url,url,url);
    assert.equal(publicBookingUrl(url),url,url);
    assert.equal(contactChannels(c).find(row=>row.id==='meet').url,url,url);
  }
});

test('booking rejects meeting rooms, insecure URLs, lookalike hosts, credentials and malformed identifiers',()=>{
  for (const url of invalidBookingUrls) {
    const c=fixture();c.contact.booking.url=url;
    assert.throws(()=>validateContent(c),undefined,url);
    assert.equal(publicBookingUrl(url),'',url);
    assert.equal(contactChannels(c).some(row=>row.id==='meet'),false,url);
  }
});

test('contact schema rejects unknown fields and invalid booking duration or timezone',()=>{
  for (const change of [
    c=>c.contact.booking.privateToken='secret',
    c=>c.contact.adminOnly=true,
    c=>c.contact.socialLinks[0].html='<script>alert(1)</script>',
    c=>c.contact.booking.durationMinutes=0,
    c=>c.contact.booking.durationMinutes=30.5,
    c=>c.contact.booking.durationMinutes=121,
    c=>c.contact.booking.timezone='not-a-timezone',
  ]) {
    const c=fixture();change(c);assert.throws(()=>validateContent(c));
  }
});

test('all three worlds render identical contact channels and navigate directly to the configured booking provider',()=>{
  const c=validateContent(fixture());
  const expected=['email','meet','linkedin','x','github'];
  assert.deepEqual(contactChannels(c).map(row=>row.id),expected);
  for (const [name,html] of publicViews(c)) {
    assert.deepEqual([...html.matchAll(/data-channel="([^"]+)"/g)].map(match=>match[1]),expected,name);
    assert.ok(html.includes(c.contact.booking.url),name);
    assert.ok(html.includes('shared-contact@example.com'),name);
    assert.ok(html.includes('A shared conversation'),name);
    assert.match(html,/data-channel="meet"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/,name);
    assert.ok(!html.includes('Meetings by email for now.'),name);
    assert.ok(!/<iframe\b/i.test(html),name);
    assert.ok(!/booking confirmed|meeting confirmed/i.test(html),name);
  }
  assert.ok(!/<script\b/i.test(publicViews(c)[0][1]),'1D contact must remain usable without JavaScript');
});

test('unconfigured booking keeps working email and social links with an honest fallback across all worlds',()=>{
  const c=fixture();c.contact.booking.url='';
  assert.ok(bookingNote(c).includes('Meetings by email for now.'));
  for (const [name,html] of publicViews(c)) {
    assert.ok(!html.includes('data-channel="meet"'),name);
    assert.ok(html.includes('href="mailto:shared-contact%40example.com"'),name);
    assert.ok(html.includes('Meetings by email for now.'),name);
    assert.deepEqual([...html.matchAll(/data-channel="([^"]+)"/g)].map(match=>match[1]),['email','linkedin','x','github'],name);
  }
});

test('untrusted contact copy is escaped and unsafe social URLs never become navigation',()=>{
  const c=fixture();
  c.contact.heading='<img src=x onerror=alert(1)>';
  c.contact.message='</p><script>alert(1)</script>';
  c.contact.booking.label='<svg onload=alert(1)>Book';
  c.contact.socialLinks.push({label:'<img src=x onerror=alert(1)>',url:'https://example.com/profile'});
  c.contact.socialLinks.push({label:'Unsafe',url:'javascript:alert(1)'});
  const rows=contactRowsHtml(c);
  assert.ok(rows.includes('&lt;svg'));
  assert.ok(rows.includes('&lt;img'));
  assert.ok(!/<(?:img|svg|script)\b/.test(rows));
  assert.ok(!rows.includes('href="javascript:'));
  for (const [name,html] of publicViews(c)) {
    assert.ok(html.includes('&lt;img'),name);
    assert.ok(!html.includes('<script>alert(1)</script>'),name);
    assert.ok(!html.includes('<svg onload='),name);
  }
});

test('manual project page, repository, and live demo are independent and duplicate URLs render once',()=>{
  const project={url:'/work/manual-project.html',repositoryUrl:'https://github.com/Vivek-Biswal/example',demoUrl:'https://demo.example.com/'};
  assert.deepEqual(projectLinks(project).map(link=>link.kind),['project','demo','repository']);
  for (const url of [project.url,project.repositoryUrl,project.demoUrl])assert.ok(projectLinksHtml(project).includes(url));
  const dedup={...project,url:project.repositoryUrl+'/'};
  assert.deepEqual(projectLinks(dedup).map(link=>link.kind),['demo','repository']);
  assert.equal((projectLinksHtml(dedup).match(/github\.com/g)||[]).length,1);
  assert.deepEqual(projectLinks({...project,url:project.demoUrl}).map(link=>link.kind),['demo','repository']);
  assert.equal(projectLinks({...project,url:'',repositoryUrl:project.demoUrl}).length,1);
  assert.equal(projectLinks({url:'javascript:alert(1)',repositoryUrl:'data:text/html,<script>',demoUrl:''}).length,0);
});

test('all project presentations retain manual links alongside real source and demo links',()=>{
  const c=fixture();
  c.projects=[{...c.projects[0],id:'approved-project',title:'Approved public project',url:'/work/manual-project.html',repositoryUrl:'https://github.com/Vivek-Biswal/approved-project',demoUrl:'https://approved-project.example.com/'}];
  const views=[...publicViews(c).slice(0,2),['3D',buildApps(c).projects.html],['work page',renderPublic(readFileSync('work/dimensional-portfolio.html','utf8'),'project',c)]];
  for (const [name,html] of views) {
    assert.ok(html.includes('Approved public project'),name);
    assert.ok(html.includes('/work/manual-project.html'),name);
    assert.ok(html.includes('https://github.com/Vivek-Biswal/approved-project'),name);
    assert.ok(html.includes('https://approved-project.example.com/'),name);
  }
});

test('private inbox state cannot enter the validated public content payload',()=>{
  const c=fixture();
  const privateInbox=[{reviewState:'pending',project:{title:'PRIVATE PENDING REPOSITORY',repositoryUrl:'https://github.com/private-pending'}}];
  assert.throws(()=>validateContent({...c,githubInbox:privateInbox}));
  const published=validateContent(c);
  const views=[...publicViews(published),['pixel projects',buildApps(published).projects.html],['work page',renderPublic(readFileSync('work/dimensional-portfolio.html','utf8'),'project',published)]];
  for (const [name,html] of views) {
    assert.ok(!html.includes('PRIVATE PENDING REPOSITORY'),name);
    assert.ok(!html.includes('https://github.com/private-pending'),name);
    assert.ok(!html.includes('portfolioGithubInbox'),name);
  }
});
