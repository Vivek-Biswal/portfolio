import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, verify } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const apiUrl=new URL('../api/portfolio.js',import.meta.url).href;
const payload=Buffer.from('Portfolio authentication signature regression');
const fixtures=[
  {kind:'rsa',options:{modulusLength:2048},algorithm:'RS256'},
  {kind:'ec',options:{namedCurve:'prime256v1'},algorithm:'ES256'},
];

test('production API loads when Node require(ESM) interoperability is disabled',()=>{
  // No inherited Firebase credentials, NODE_OPTIONS, dotenv or external requests.
  const env={};
  for(const key of ['SystemRoot','WINDIR','TEMP','TMP'])if(process.env[key])env[key]=process.env[key];
  const result=spawnSync(process.execPath,[
    '--no-experimental-require-module','--input-type=module','-e',
    `await import(${JSON.stringify(apiUrl)}); console.log('API import succeeded');`,
  ],{cwd:root,env,encoding:'utf8',timeout:30_000});
  assert.ifError(result.error);
  assert.equal(result.status,0,`API startup failed: ${result.stderr}`);
  assert.match(result.stdout,/API import succeeded/);
});

for(const fixture of fixtures) {
  test(`JWKS ${fixture.algorithm} keys verify real signatures and reject tampering`,async()=>{
    const {default:jwksClient}=await import('jwks-rsa');
    const {publicKey,privateKey}=generateKeyPairSync(fixture.kind,fixture.options);
    const unrelated=generateKeyPairSync(fixture.kind,fixture.options);
    const kid=`portfolio-test-${fixture.algorithm}`;
    const jwk={...publicKey.export({format:'jwk'}),kid,alg:fixture.algorithm,use:'sig'};
    const uri='https://jwks.invalid/portfolio-regression';
    let requests=0;
    const client=jwksClient({jwksUri:uri,cache:false,fetcher:async requestedUri=>{
      assert.equal(requestedUri,uri);
      requests++;
      return {keys:[jwk,{...jwk,kid:'encryption-only',use:'enc'},{kty:'oct',kid:'symmetric',k:'AA',use:'sig'}]};
    }});

    // This is the same getSigningKeys()/getPublicKey() contract used by Firebase Admin.
    const keys=await client.getSigningKeys();
    assert.equal(requests,1);
    assert.equal(keys.length,1,'Encryption and symmetric keys must not become signing keys');
    assert.equal(keys[0].kid,kid);
    assert.equal(keys[0].alg,fixture.algorithm);
    const pem=keys[0].getPublicKey();
    assert.match(pem,/^-----BEGIN PUBLIC KEY-----/);
    assert.equal(keys[0].publicKey,pem);

    const signature=sign('sha256',payload,privateKey);
    assert.equal(verify('sha256',payload,pem,signature),true);
    assert.equal(verify('sha256',Buffer.from('Tampered portfolio authentication payload'),pem,signature),false);
    assert.equal(verify('sha256',payload,pem,sign('sha256',payload,unrelated.privateKey)),false);
    assert.equal((await client.getSigningKey(kid)).getPublicKey(),pem);
    await assert.rejects(()=>client.getSigningKey('missing-key'),error=>error.name==='SigningKeyNotFoundError');
  });
}
