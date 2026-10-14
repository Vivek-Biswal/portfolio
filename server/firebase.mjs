import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import webConfig from '../content/firebase-web.json' with {type:'json'};
import defaults from '../content/defaults.json' with {type:'json'};
import { HttpError, parseCookies, assertAdminIdentity } from './security.mjs';
import { validateContent } from './schema.mjs';
export const initialContent=defaults;
export const firebaseWebConfig=webConfig;
export function configured() {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.GOOGLE_CLOUD_PROJECT);
}
export function services() {
  if(!configured())throw new HttpError(503,'Firebase server credentials are not configured yet.');
  const emulator=Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST);
  if(emulator && (process.env.VERCEL || process.env.NODE_ENV==='production'))throw new HttpError(503,'Emulators cannot be used in production.');
  if(emulator && (!process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIRESTORE_EMULATOR_HOST || !/^demo-/.test(process.env.FIREBASE_PROJECT_ID||'')))throw new HttpError(503,'Local emulators require a demo project and both Auth and Firestore.');
  const projectId=process.env.FIREBASE_PROJECT_ID||webConfig.projectId;
  const existing=getApps().find(app=>app.name==='portfolio-admin');
  const options={projectId,storageBucket:process.env.FIREBASE_STORAGE_BUCKET||webConfig.storageBucket};
  if(!emulator) options.credential=process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) : applicationDefault();
  const app=existing||initializeApp(options,'portfolio-admin');
  return {auth:getAuth(app),db:getFirestore(app),bucket:getStorage(app).bucket()};
}
export async function requireAdmin(req) {
  const session=parseCookies(req.headers.cookie).portfolio_session;
  if(!session)throw new HttpError(401,'Please sign in.');
  const {auth,db}=services();
  let token,user;
  try {token=await auth.verifySessionCookie(session,true);user=await auth.getUser(token.uid);}catch{throw new HttpError(401,'Your session expired. Please sign in again.');}
  const record=(await db.collection('portfolioAdmins').doc(token.uid).get()).data();
  return assertAdminIdentity(token,user,record);
}
let cache;
export function invalidatePublished(){cache=undefined;}
export async function getPublished() {
  if(!configured())return {content:defaults,version:0,source:'initial'};
  if(cache && cache.until>Date.now())return cache.value;
  const snapshot=await services().db.collection('portfolioContent').doc('published').get();
  if(!snapshot.exists)throw new HttpError(503,'Published content has not been initialized.');
  const data=snapshot.data();const value={content:validateContent(data.content),version:data.version,source:'firebase'};
  cache={value,until:Date.now()+3000};return value;
}
