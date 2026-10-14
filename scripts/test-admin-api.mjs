import test from 'node:test';
import assert from 'node:assert/strict';
import {api} from '../src/admin/api.js';

test('platform failure shows a useful error instead of a JSON parsing exception',async()=>{
 const original=globalThis.fetch;
 try {
  globalThis.fetch=async()=>new Response('A server error has occurred\nFUNCTION_INVOCATION_FAILED',{status:500});
  await assert.rejects(()=>api('config'),error=>error.status===500&&/admin server is temporarily unavailable/.test(error.message)&&error.name!=='SyntaxError');
 }finally{globalThis.fetch=original;}
});
test('JSON authentication errors keep their status and message',async()=>{
 const original=globalThis.fetch;
 try {
  globalThis.fetch=async()=>Response.json({error:'Please sign in.'},{status:401});
  await assert.rejects(()=>api('session'),error=>error.status===401&&error.message==='Please sign in.');
 }finally{globalThis.fetch=original;}
});
test('invalid successful responses cannot masquerade as CMS configuration',async()=>{
 const original=globalThis.fetch;
 try {
  for(const body of ['<html>Wrong route</html>','null','[]']) {
   globalThis.fetch=async()=>new Response(body,{status:200});
   await assert.rejects(()=>api('config'),error=>error.status===502&&/unexpected response/.test(error.message));
  }
 }finally{globalThis.fetch=original;}
});
