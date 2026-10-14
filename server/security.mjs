import { randomBytes, timingSafeEqual } from 'node:crypto';
export class HttpError extends Error { constructor(status,message) {super(message);this.status=status;} }
export function parseCookies(header='') {
  const result={}; for(const item of header.split(';')) {const index=item.indexOf('=');if(index<1)continue;try{result[item.slice(0,index).trim()]=decodeURIComponent(item.slice(index+1).trim());}catch{/* malformed cookies grant no access */}}
  return result;
}
export function sameSecret(a,b) {
  if(typeof a!=='string'||typeof b!=='string'||a.length>256||b.length>256)return false;
  const first=Buffer.from(a),second=Buffer.from(b);return first.length===second.length&&first.length>0&&timingSafeEqual(first,second);
}
export function assertOrigin(req) {
  const origin=req.headers.origin;
  const expected=process.env.SITE_ORIGIN || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://127.0.0.1:5173');
  // A preview must explicitly use its own SITE_ORIGIN; host headers are never authority.
  if(origin!==expected)throw new HttpError(403,'This request must come from the portfolio website.');
}
export function assertCsrf(req) {
  assertOrigin(req);
  if(!sameSecret(parseCookies(req.headers.cookie).portfolio_csrf,req.headers['x-csrf-token']))throw new HttpError(403,'Your security token expired. Reload and try again.');
}
export const csrfToken=()=>randomBytes(32).toString('hex');
export function cookie(name,value,maxAge,httpOnly=true) {
  const secure=Boolean(process.env.VERCEL)||process.env.NODE_ENV==='production';
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Strict${httpOnly?'; HttpOnly':''}${secure?'; Secure':''}`;
}
export function assertAdminIdentity(token,user,record,{mfa=true}={}) {
  if(!token || !user || user.disabled || !user.emailVerified || token.email_verified!==true)throw new HttpError(403,'This account is not authorized.');
  if(token.admin!==true || user.customClaims?.admin!==true || !record?.active || !['owner','admin'].includes(record.role))throw new HttpError(403,'Administrator access is required.');
  if(mfa && token.firebase?.sign_in_second_factor!=='totp')throw new HttpError(403,'Authenticator verification is required.');
  return {uid:user.uid,email:user.email,role:record.role};
}
export async function readJson(req,maxBytes=200_000) {
  if(!String(req.headers['content-type']||'').startsWith('application/json'))throw new HttpError(415,'Send JSON content.');
  if(req.body!==undefined) {
    const body=Buffer.isBuffer(req.body)?req.body.toString('utf8'):req.body;
    if(Buffer.byteLength(typeof body==='string'?body:JSON.stringify(body))>maxBytes)throw new HttpError(413,'This request is too large.');
    try{return typeof body==='string'?JSON.parse(body):body;}catch{throw new HttpError(400,'Invalid JSON.');}
  }
  const chunks=[];let size=0;
  for await(const chunk of req) {size+=Buffer.byteLength(chunk);if(size>maxBytes)throw new HttpError(413,'This request is too large.');chunks.push(Buffer.from(chunk));}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new HttpError(400,'Invalid JSON.');}
}
export function protectResponse(res) {
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https:; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'");
}
