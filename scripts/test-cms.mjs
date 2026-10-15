import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertAdminIdentity,assertCsrf,cookie,parseCookies,sameSecret,readJson } from '../server/security.mjs';
import {validateContent} from '../server/schema.mjs';
import {renderPublic} from '../server/render-public.mjs';
import {buildApps} from '../src/two/app-content.js';
import {profileText,contactCard} from '../server/downloads.mjs';
import {handleRequest} from '../server/handler.mjs';
import defaults from '../content/defaults.json' with {type:'json'};
const copy=()=>structuredClone(defaults);
const token={admin:true,email_verified:true,firebase:{sign_in_second_factor:'totp'}};
const user={uid:'owner',email:'owner@example.com',emailVerified:true,disabled:false,customClaims:{admin:true}};
const record={role:'owner',active:true};
test('admin identity requires verified provider claims, live role and MFA',()=>{
 assert.equal(assertAdminIdentity(token,user,record).role,'owner');
 for(const [t,u,r] of [[{...token,admin:false},user,record],[token,{...user,customClaims:{}},record],[token,{...user,disabled:true},record],[token,{...user,emailVerified:false},record],[{...token,email_verified:false},user,record],[token,user,{...record,active:false}],[token,user,{role:'visitor',active:true}],[{...token,firebase:{}},user,record],[token,user,null]])assert.throws(()=>assertAdminIdentity(t,u,r));
});
test('CSRF rejects a missing token, wrong origin and attacker-controlled host headers',()=>{
 const original=process.env.SITE_ORIGIN;process.env.SITE_ORIGIN='https://portfolio.example';
 const valid={headers:{origin:'https://portfolio.example',cookie:'portfolio_csrf=abc','x-csrf-token':'abc'}};
 assert.doesNotThrow(()=>assertCsrf(valid));
 assert.throws(()=>assertCsrf({headers:{...valid.headers,origin:'https://evil.example',host:'portfolio.example','x-forwarded-host':'portfolio.example'}}));
 assert.throws(()=>assertCsrf({headers:{...valid.headers,'x-csrf-token':'wrong'}}));
 assert.throws(()=>assertCsrf({headers:{...valid.headers,cookie:''}}));
 if(original===undefined)delete process.env.SITE_ORIGIN;else process.env.SITE_ORIGIN=original;
});
test('cookies are HttpOnly, Strict and Secure in production; malformed cookies grant nothing',()=>{
 const old=process.env.VERCEL;process.env.VERCEL='1';assert.match(cookie('portfolio_session','signed',7200),/HttpOnly; Secure/);assert.match(cookie('portfolio_session','signed',7200),/SameSite=Strict/);
 if(old===undefined)delete process.env.VERCEL;else process.env.VERCEL=old;
 assert.equal(parseCookies('broken=%xx').broken,undefined);assert.equal(sameSecret('a','aa'),false);assert.equal(sameSecret('',''),false);
});
test('content validation rejects unknown fields, unsafe URLs, duplicate IDs and excessive arrays',()=>{
 assert.doesNotThrow(()=>validateContent(copy()));
 for(const change of [c=>c.admin=true,c=>c.profile.portrait='javascript:alert(1)',c=>c.contact.resumeUrl='//evil.example',c=>c.projects.push({...c.projects[0]}),c=>c.skills=Array(41).fill('skill'),c=>c.profile.name='',c=>c.schemaVersion=99,c=>c.contact.email='bad']){const c=copy();change(c);assert.throws(()=>validateContent(c));}
});
test('all public renderers use the same edited About and Contact fields',()=>{
 const c=copy();c.about.paragraphs=['Shared about revision'];c.contact.email='shared@example.com';
 const home=readFileSync('index.html','utf8'),line=readFileSync('2d/index.html','utf8');
 for(const [page,template] of [['1d',home],['2d',line]]){const html=renderPublic(template,page,c);assert.match(html,/Shared about revision/);assert.match(html,/shared@example.com/);assert.ok(!html.includes('vivekbiswal.dev@gmail.com'));}
 const pixel=buildApps(c);assert.match(pixel.about.html,/Shared about revision/);assert.match(pixel.contact.html,/shared@example.com/);
 assert.ok(!/<script\b/i.test(renderPublic(home,'1d',c)),'1D must remain script-free');
});

test('re-rendering content produces exactly one bootstrap payload and updates the signature',()=>{
 const c=copy();c.profile.name='Changed Owner';c.settings.copyright='New copyright';
 const once=renderPublic(readFileSync('2d/index.html','utf8'),'2d',c);
 const twice=renderPublic(once,'2d',c);
 assert.equal((twice.match(/id="portfolio-content"/g)||[]).length,1);
 assert.match(twice,/class="signature"[^>]*>changed/);assert.match(twice,/New copyright/);
});

test('editing the pixel introduction preserves its independent walking controls',()=>{
 const c=copy();c.settings.pixelTitle='An edited little world';
 const template=readFileSync('3d/index.html','utf8');
 const once=renderPublic(template,'3d',c),twice=renderPublic(once,'3d',c);
 for(const html of [once,twice]){
  assert.match(html,/<h1>An edited little world<\/h1>/);
  assert.equal((html.match(/class="outdoor-controls"/g)||[]).length,1);
  for(const direction of ['left','up','down','right'])assert.ok(html.includes(`data-walk="${direction}"`));
 }
});
test('downloads follow the current shared profile and contact content',()=>{
 const c=copy();c.profile.name='Changed; Owner';c.contact.email='updated@example.com';
 assert.match(profileText(c),/updated@example.com/);assert.match(contactCard(c),/FN:Changed\\; Owner/);assert.match(contactCard(c),/EMAIL:updated@example.com/);
});
test('renderers escape markup and safely embed bootstrap JSON',()=>{
 const c=copy();c.profile.name='<img src=x onerror=alert(1)>';c.about.paragraphs=['</script><script>alert(1)</script>'];
 const html=renderPublic(readFileSync('2d/index.html','utf8'),'2d',c);
 assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<script>alert(1)'));
 const payload=html.match(/<script type="application\/json" id="portfolio-content">([\s\S]*?)<\/script>/)[1];
 assert.equal(JSON.parse(payload).profile.name,c.profile.name);assert.ok(!payload.includes('</script>'));
});
test('request body size and content type are enforced',async()=>{
 await assert.rejects(()=>readJson({headers:{'content-type':'text/plain'},body:'{}'}));
 await assert.rejects(()=>readJson({headers:{'content-type':'application/json'},body:JSON.stringify({x:'a'.repeat(100)})},50));
 await assert.rejects(()=>readJson({headers:{'content-type':'application/json'},body:'{'}));
});
const response=()=>({statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},end(value=''){this.body=value;}});
test('unauthenticated dashboard redirects; editing and private data APIs deny access',async()=>{
 const res=response();await handleRequest({url:'/api/portfolio?action=admin-page',method:'GET',headers:{}},res);assert.equal(res.statusCode,303);assert.equal(res.headers.Location,'/admin/login/');
 for(const [action,method] of [['draft','GET'],['draft','PUT'],['publish','POST'],['restore','POST'],['revisions','GET'],['media-list','GET'],['media-upload','POST'],['preview','GET']]){const r=response();await handleRequest({url:'/api/portfolio?action='+action,method,headers:{}},r);assert.equal(r.statusCode,401,action);assert.ok(!String(r.body).includes('private workspace'));}
});
test('public template traversal is rejected',async()=>{
 const r=response();await handleRequest({url:'/api/portfolio?action=public&page=../../admin',method:'GET',headers:{}},r);assert.equal(r.statusCode,404);
});
test('Firestore and Storage rules deny direct browser reads and writes',()=>{
 for(const file of ['firestore.rules','storage.rules'])assert.match(readFileSync(file,'utf8'),/allow read, write: if false/);
});
