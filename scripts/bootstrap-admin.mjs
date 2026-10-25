import { parseArgs } from 'node:util';
import { services, initialContent } from '../server/firebase.mjs';
import { validateContent } from '../server/schema.mjs';
const {values}=parseArgs({options:{email:{type:'string'},role:{type:'string',default:'admin'},'existing-user-only':{type:'boolean',default:false}}});
const email=values.email||'vivekbiswal.com@gmail.com';
const role=values.role;
if(!['admin','owner'].includes(role))throw new Error('Role must be admin or owner.');
const {auth,db}=services();
let user;
try{user=await auth.getUserByEmail(email);}catch(error){
  if(error.code!=='auth/user-not-found'||values['existing-user-only'])throw error;
  user=await auth.createUser({email,displayName:initialContent.profile.name,emailVerified:false});
}
await auth.setCustomUserClaims(user.uid,{...(user.customClaims||{}),admin:true});
await db.collection('portfolioAdmins').doc(user.uid).set({role,active:true,email,updatedAt:Date.now()},{merge:true});
const content=validateContent(initialContent);
await db.runTransaction(async transaction=>{
  const published=db.collection('portfolioContent').doc('published'),draft=db.collection('portfolioContent').doc('draft');
  const [currentPublished,currentDraft]=await Promise.all([transaction.get(published),transaction.get(draft)]);
  if(!currentPublished.exists)transaction.create(published,{content,version:1,updatedAt:Date.now(),updatedBy:user.uid});
  if(!currentDraft.exists)transaction.create(draft,{content,version:1,updatedAt:Date.now(),updatedBy:user.uid});
});
console.log(`Administrator provisioned for ${email}. Role: ${role}. Existing published content was preserved.`);
console.log('Use /admin/login/ to set your password through the reset flow, verify your email, and enroll your authenticator.');
