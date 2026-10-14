import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { services, requireAdmin, getPublished, configured, firebaseWebConfig, invalidatePublished } from './firebase.mjs';
import { HttpError, readJson, assertCsrf, protectResponse, cookie, csrfToken, parseCookies, assertAdminIdentity } from './security.mjs';
import { validateContent } from './schema.mjs';
import { renderPublic } from './render-public.mjs';
import { profileText,contactCard } from './downloads.mjs';
const json=(res,status,value)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value));};
const html=(res,value)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(value);};
const redirect=(res,path)=>{res.statusCode=303;res.setHeader('Location',path);res.end();};
const version=value=>{if(!Number.isInteger(value)||value<0)throw new HttpError(400,'A content version is required.');return value;};
const method=(req,name)=>{if(req.method!==name)throw new HttpError(405,'Method not allowed.');};
async function limitLogin(req) {
  const forwarded=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
  const key=createHash('sha256').update(forwarded).digest('hex');
  const {db}=services();const ref=db.collection('portfolioLoginLimits').doc(key);const now=Date.now();
  await db.runTransaction(async transaction=>{
    const old=(await transaction.get(ref)).data();const fresh=old&&old.resetAt>now;
    const count=fresh?old.count+1:1;if(count>15)throw new HttpError(429,'Too many attempts. Wait ten minutes and try again.');
    transaction.set(ref,{count,resetAt:fresh?old.resetAt:now+600_000});
  });
}
async function readTemplate(name, options) {
  if(options?.template)return options.template(name);
  return readFile(resolve('server/generated',name),'utf8');
}
const imageTypes={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif','application/pdf':'pdf'};
function validateFile(bytes,type) {
  if(!bytes.length||bytes.length>2_000_000||!imageTypes[type])throw new HttpError(400,'Upload a PNG, JPEG, WebP, GIF or PDF smaller than 2 MB.');
  const valid=type==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):
    type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:
    type==='image/webp'?bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP':
    type==='image/gif'?/^GIF8[79]a$/.test(bytes.subarray(0,6).toString()):bytes.subarray(0,5).toString()==='%PDF-';
  if(!valid)throw new HttpError(400,'The file does not match its declared type.');
}
export async function handleRequest(req,res,options={}) {
  const url=new URL(req.url,'http://localhost');const action=url.searchParams.get('action')||'content';
  res.setHeader('X-Content-Type-Options','nosniff');
  try {
    if(action==='public') {
      method(req,'GET');const page=url.searchParams.get('page')||'index';
      const templates={index:'index.html','1d':'1d.html','2d':'2d.html','3d':'3d.html',project:'project.html',notes:'notes.html',now:'now.html'};
      if(!templates[page])throw new HttpError(404,'Page not found.');
      const current=await getPublished();res.setHeader('Cache-Control','no-store');
      return html(res,renderPublic(await readTemplate(templates[page],options),page,current.content));
    }
    if(action==='content') {
      method(req,'GET');res.setHeader('Cache-Control','no-store');return json(res,200,await getPublished());
    }
    if(action==='profile'||action==='contact-card') {
      method(req,'GET');const {content}=await getPublished();
      res.setHeader('Content-Type',action==='profile'?'text/plain; charset=utf-8':'text/vcard; charset=utf-8');
      res.setHeader('Content-Disposition',`attachment; filename="portfolio.${action==='profile'?'txt':'vcf'}"`);
      res.setHeader('Cache-Control','no-store');res.end(action==='profile'?profileText(content):contactCard(content));return;
    }
    if(action==='media') {
      method(req,'GET');const id=url.searchParams.get('id')||'';if(!/^[a-f0-9-]{36}$/.test(id))throw new HttpError(404,'File not found.');
      const {db,bucket}=services();const item=(await db.collection('portfolioMedia').doc(id).get()).data();
      if(!item||item.archived)throw new HttpError(404,'File not found.');if(!item.published)await requireAdmin(req);
      const [bytes]=await bucket.file(item.path).download();
      res.setHeader('Content-Type',item.type);res.setHeader('Content-Disposition',`${item.type==='application/pdf'?'attachment':'inline'}; filename="${id}.${imageTypes[item.type]}"`);
      res.setHeader('Cache-Control',item.published?'public, max-age=3600':'no-store');res.end(bytes);return;
    }
    protectResponse(res);
    if(action==='config') {method(req,'GET');return json(res,200,{firebase:firebaseWebConfig,serverReady:configured(),mfaRequired:true,mediaEnabled:process.env.FIREBASE_MEDIA_ENABLED==='true'});}
    if(action==='csrf') {method(req,'GET');const token=csrfToken();res.setHeader('Set-Cookie',cookie('portfolio_csrf',token,3600));return json(res,200,{token});}
    if(action==='admin-page') {
      method(req,'GET');try {await requireAdmin(req);}catch(error){if(error.status===401||error.status===403)return redirect(res,'/admin/login/');throw error;}
      return html(res,await readTemplate('admin.html',options));
    }
    if(action==='session'&&req.method==='POST') {
      assertCsrf(req);const body=await readJson(req,16000);
      if(typeof body.idToken!=='string'||body.idToken.length>12000)throw new HttpError(400,'Invalid sign-in token.');
      const {auth,db}=services();let token;
      try {token=await auth.verifyIdToken(body.idToken,true);}catch{throw new HttpError(401,'Please sign in again.');}
      if(Date.now()/1000-token.auth_time>300)throw new HttpError(401,'Please sign in again to start a session.');
      const user=await auth.getUser(token.uid);const record=(await db.collection('portfolioAdmins').doc(token.uid).get()).data();
      const identity=assertAdminIdentity(token,user,record);
      await limitLogin(req);
      const session=await auth.createSessionCookie(body.idToken,{expiresIn:2*60*60*1000});
      res.setHeader('Set-Cookie',cookie('portfolio_session',session,7200));return json(res,200,{user:identity});
    }
    if(action==='session') {method(req,'GET');return json(res,200,{user:await requireAdmin(req)});}
    const admin=await requireAdmin(req);
    if(req.method!=='GET')assertCsrf(req);
    const {auth,db,bucket}=services();
    if(action==='preview') {
      method(req,'GET');const page=url.searchParams.get('page')||'1d';
      if(!['1d','2d','3d'].includes(page))throw new HttpError(404,'Preview not found.');
      const draft=(await db.collection('portfolioContent').doc('draft').get()).data();
      if(!draft)throw new HttpError(503,'Initialize the shared content before previewing.');
      const preview=renderPublic(await readTemplate(page+'.html',options),page,draft.content);
      return html(res,preview.replace('<html lang="en">','<html lang="en" data-content-preview="true">'));
    }
    if(action==='logout') {
      method(req,'POST');await auth.revokeRefreshTokens(admin.uid);res.setHeader('Set-Cookie',[cookie('portfolio_session','',0),cookie('portfolio_csrf','',0)]);return json(res,200,{ok:true});
    }
    if(action==='draft'&&req.method==='GET') {
      const [draft,published]=await Promise.all([db.collection('portfolioContent').doc('draft').get(),db.collection('portfolioContent').doc('published').get()]);
      if(!draft.exists)throw new HttpError(503,'Initialize the shared content before editing.');
      return json(res,200,{...draft.data(),publishedVersion:published.data()?.version||0});
    }
    if(action==='draft') {
      method(req,'PUT');const body=await readJson(req);const content=validateContent(body.content);const expected=version(body.expectedVersion);
      const ref=db.collection('portfolioContent').doc('draft');const audit=db.collection('portfolioAudit').doc(randomUUID());let updated;
      await db.runTransaction(async transaction=>{const old=(await transaction.get(ref)).data();if(!old||old.version!==expected)throw new HttpError(409,'Someone changed this draft. Reload before saving.');
        updated={content,version:old.version+1,updatedAt:Date.now(),updatedBy:admin.uid};transaction.set(ref,updated);transaction.set(audit,{action:'save-draft',at:Date.now(),actor:admin.uid,version:updated.version});});
      return json(res,200,updated);
    }
    if(action==='publish'||action==='restore') {
      method(req,'POST');const body=await readJson(req,5000);const expected=version(body.expectedVersion);
      const draftRef=db.collection('portfolioContent').doc('draft'),publishedRef=db.collection('portfolioContent').doc('published');
      const revisionRef=db.collection('portfolioRevisions').doc(randomUUID());let updated;
      if(action==='restore'&&!/^[a-f0-9-]{36}$/.test(body.revisionId||''))throw new HttpError(400,'Invalid revision.');
      await db.runTransaction(async transaction=>{
        const draft=(await transaction.get(draftRef)).data();const published=(await transaction.get(publishedRef)).data();
        if(!draft||draft.version!==expected)throw new HttpError(409,'This draft changed. Reload before publishing.');
        const restore=action==='restore'?(await transaction.get(db.collection('portfolioRevisions').doc(body.revisionId))).data():null;
        if(action==='restore'&&!restore)throw new HttpError(404,'Revision not found.');
        const content=validateContent(restore?restore.content:draft.content);
        const mediaIds=[...new Set([...JSON.stringify(content).matchAll(/action=media&id=([a-f0-9-]{36})/g)].map(match=>match[1]))];
        const mediaRecords=await Promise.all(mediaIds.map(id=>transaction.get(db.collection('portfolioMedia').doc(id))));
        if(mediaRecords.some(item=>!item.exists||item.data().archived))throw new HttpError(400,'A referenced upload is unavailable.');
        updated={content,version:(published?.version||0)+1,updatedAt:Date.now(),updatedBy:admin.uid};
        transaction.set(publishedRef,updated);transaction.set(revisionRef,{...updated,publishedAt:updated.updatedAt});
        if(restore)transaction.set(draftRef,{...updated,version:draft.version+1});
        mediaRecords.forEach(item=>transaction.update(item.ref,{published:true}));
        transaction.set(db.collection('portfolioAudit').doc(randomUUID()),{action,at:updated.updatedAt,actor:admin.uid,version:updated.version});
      });invalidatePublished();return json(res,200,updated);
    }
    if(action==='revisions') {method(req,'GET');const result=await db.collection('portfolioRevisions').orderBy('publishedAt','desc').limit(20).get();return json(res,200,{items:result.docs.map(doc=>({id:doc.id,version:doc.data().version,publishedAt:doc.data().publishedAt,actor:doc.data().updatedBy}))});}
    if(action==='media-list') {method(req,'GET');const result=await db.collection('portfolioMedia').orderBy('createdAt','desc').limit(50).get();return json(res,200,{items:result.docs.filter(doc=>!doc.data().archived).map(doc=>({id:doc.id,...doc.data(),path:undefined,url:`/api/portfolio?action=media&id=${doc.id}`}))});}
    if(action==='media-upload') {
      if(process.env.FIREBASE_MEDIA_ENABLED!=='true')throw new HttpError(409,'File uploads need a configured Storage bucket. You can use existing asset paths or HTTPS image URLs instead.');
      method(req,'POST');const body=await readJson(req,3_000_000);
      if(typeof body.data!=='string'||body.data.length>2_700_000||typeof body.name!=='string'||body.name.length>150)throw new HttpError(400,'Invalid file.');
      const bytes=Buffer.from(body.data,'base64');validateFile(bytes,body.type);
      const id=randomUUID(),path=`portfolio/${id}.${imageTypes[body.type]}`;await bucket.file(path).save(bytes,{contentType:body.type,resumable:false});
      const item={name:body.name,type:body.type,size:bytes.length,path,published:false,archived:false,createdAt:Date.now(),createdBy:admin.uid};
      await db.collection('portfolioMedia').doc(id).set(item);return json(res,201,{id,name:item.name,url:`/api/portfolio?action=media&id=${id}`});
    }
    throw new HttpError(404,'Endpoint not found.');
  } catch(error) {
    const status=error.status||(error.name==='ZodError'?400:503);
    return json(res,status,{error:status===503?'The Firebase connection is not ready. Check server credentials and project setup.':error.name==='ZodError'?'Some content fields are invalid.':error.message,issues:error.name==='ZodError'?error.issues.map(item=>({field:item.path.join('.'),message:item.message})):undefined});
  }
}
