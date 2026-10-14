import {initializeApp} from 'firebase/app';
import {getAuth,setPersistence,inMemoryPersistence,signInWithEmailAndPassword,signOut,multiFactor,TotpMultiFactorGenerator,getMultiFactorResolver,sendPasswordResetEmail,sendEmailVerification} from 'firebase/auth';
import {api} from './api.js';
const status=document.getElementById('login-status'),form=document.getElementById('login-form'),mfaForm=document.getElementById('mfa-form'),enrollForm=document.getElementById('enroll-form');
const email=document.getElementById('email'),password=document.getElementById('password');
let auth,resolver,secret;
function message(text,error=false){status.textContent=text;status.classList.toggle('error',error);}
function busy(value){document.querySelectorAll('form button,#reset-password').forEach(button=>button.disabled=value);}
async function finish(user) {
  const result=await user.getIdTokenResult(true);
  if(result.claims.admin!==true) {await signOut(auth);throw new Error('This account does not have administrator access.');}
  if(!user.emailVerified) {await sendEmailVerification(user);await signOut(auth);throw new Error('Verify your email using the link sent to your inbox, then sign in again.');}
  if(!multiFactor(user).enrolledFactors.length) {
    const session=await multiFactor(user).getSession();secret=await TotpMultiFactorGenerator.generateSecret(session);
    form.hidden=true;mfaForm.hidden=true;enrollForm.hidden=false;
    document.getElementById('setup-key').value=secret.secretKey;document.getElementById('enroll-code').focus();
    message('Add the setup key to your authenticator, then verify its first code.');return;
  }
  await api('session','POST',{idToken:await user.getIdToken(true)});await signOut(auth);location.assign('/admin/');
}
const friendly=error=>error.code==='auth/invalid-credential'?'The email or password is incorrect.':error.code==='auth/too-many-requests'?'Too many attempts. Please wait before trying again.':error.code==='auth/invalid-verification-code'?'That authenticator code is incorrect. Try the current code.':error.code==='auth/operation-not-allowed'?'Email/password sign-in is not enabled in Firebase yet.':error.code==='auth/admin-restricted-operation'?'Authenticator setup requires Firebase Authentication with Identity Platform.':error.message||'Unable to sign in.';
form.addEventListener('submit',async event=>{
  event.preventDefault();if(!auth)return;busy(true);message('Signing in securely…');
  try {const credential=await signInWithEmailAndPassword(auth,email.value.trim(),password.value);await finish(credential.user);}
  catch(error) {
    if(error.code==='auth/multi-factor-auth-required') {
      resolver=getMultiFactorResolver(auth,error);
      if(!resolver.hints.some(hint=>hint.factorId===TotpMultiFactorGenerator.FACTOR_ID)){message('This account needs an authenticator-app factor.',true);}
      else {form.hidden=true;mfaForm.hidden=false;document.getElementById('mfa-code').focus();message('Enter your authenticator code.');}
    } else message(friendly(error),true);
  }finally{busy(false);}
});
mfaForm.addEventListener('submit',async event=>{
  event.preventDefault();busy(true);message('Verifying your authenticator…');
  try {const hint=resolver.hints.find(h=>h.factorId===TotpMultiFactorGenerator.FACTOR_ID);const assertion=TotpMultiFactorGenerator.assertionForSignIn(hint.uid,document.getElementById('mfa-code').value);const result=await resolver.resolveSignIn(assertion);await finish(result.user);}
  catch(error){message(friendly(error),true);}finally{busy(false);}
});
enrollForm.addEventListener('submit',async event=>{
  event.preventDefault();busy(true);
  try {const assertion=TotpMultiFactorGenerator.assertionForEnrollment(secret,document.getElementById('enroll-code').value);await multiFactor(auth.currentUser).enroll(assertion,'Portfolio authenticator');await signOut(auth);secret=null;document.getElementById('setup-key').value='';enrollForm.hidden=true;form.hidden=false;password.value='';message('Authenticator enabled. Sign in again to verify your first secure session.');password.focus();}
  catch(error){message(friendly(error),true);}finally{busy(false);}
});
document.getElementById('reset-password').addEventListener('click',async()=>{
  if(!auth)return;if(!email.validity.valid||!email.value){message('Enter your email address first.',true);email.focus();return;}
  busy(true);try {await sendPasswordResetEmail(auth,email.value.trim());message('If this account exists, a password reset link has been sent.');}catch{message('Unable to request a reset. Try again later.',true);}finally{busy(false);}
});
async function start() {
  busy(true);try {
    const existing=await api('session').catch(()=>null);if(existing?.user){location.replace('/admin/');return;}
    const config=await api('config');
    if(!config.serverReady){message('The Firebase project is registered. Server credentials and owner setup are still required before login is available.',true);return;}
    auth=getAuth(initializeApp(config.firebase));await setPersistence(auth,inMemoryPersistence);message('Administrator access only.');busy(false);
  }catch(error){message(friendly(error),true);}
}
start();
