import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import defaults from '../content/defaults.json' with { type: 'json' };
import { listGithubInbox, reviewGithubRepo, runScheduledGithubSync, syncGithubRepos } from '../server/github.mjs';

const clone = value => value === undefined ? undefined : structuredClone(value);
const now = Date.UTC(2026, 9, 21, 12);
const actor = { uid: 'owner', role: 'owner' };
test('scheduled discovery uses the canonical route so Vercel does not stop at a redirect',async()=>{
  const config=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
  const cron=config.crons.find(item=>item.path.includes('github-sync'));
  assert.ok(cron,'Daily GitHub discovery must be registered.');
  assert.equal(cron.schedule,'0 3 * * *','Use one daily scan compatible with the free Hobby plan.');
  assert.equal(cron.path.endsWith('/'),config.trailingSlash===true,'Vercel cron requests do not follow slash redirects.');
});
const repository = (id = 101, fields = {}) => ({
  id, name: `repo-${id}`, full_name: `Vivek-Biswal/repo-${id}`, owner: { login: 'Vivek-Biswal' }, private: false,
  description: 'A useful little project.', homepage: 'https://example.com/demo', language: 'JavaScript', topics: ['web', 'portfolio'],
  created_at: '2025-01-02T00:00:00Z', updated_at: '2026-10-20T00:00:00Z', pushed_at: '2026-10-20T00:00:00Z', archived: false,
  ...fields,
});

// The fake stages transaction writes until every read/validation succeeds and
// rejects read-after-write, matching Firestore's important transaction rules.
function fakeDatabase() {
  const records = new Map();
  let transactionTail = Promise.resolve();
  const snapshot = (path, value) => ({ id: path.split('/').at(-1), exists: value !== undefined, ref: reference(path), data: () => clone(value) });
  const reference = path => ({ path, id: path.split('/').at(-1), get: async () => snapshot(path, records.get(path)) });
  const db = {
    records,
    collection(name) {
      const query = limit => ({
        get: async () => ({ docs: [...records].filter(([path]) => path.startsWith(`${name}/`) && path.split('/').length === 2).sort(([a], [b]) => a.localeCompare(b)).slice(0, limit).map(([path, value]) => snapshot(path, value)) }),
        limit: value => query(value),
      });
      return { ...query(Infinity), doc: id => reference(`${name}/${id}`) };
    },
    async runTransaction(callback) {
      const previous = transactionTail;
      let unlock;
      transactionTail = new Promise(resolve => { unlock = resolve; });
      await previous;
      const writes = [];
      try {
        const result = await callback({
          get: async ref => { assert.equal(writes.length, 0, 'all transaction reads precede writes'); return snapshot(ref.path, records.get(ref.path)); },
          set(ref, value, options) { writes.push({ path: ref.path, value: clone(value), merge: options?.merge }); },
        });
        for (const { path, value, merge } of writes) records.set(path, merge ? { ...records.get(path), ...value } : value);
        return result;
      } finally { unlock(); }
    },
  };
  for (const name of ['draft', 'published']) records.set(`portfolioContent/${name}`, { content: clone(defaults), version: 1, updatedAt: now - 1000, updatedBy: actor.uid });
  return db;
}

const fetchItems = items => async () => new Response(JSON.stringify(items), { status: 200, headers: { 'content-type': 'application/json' } });
const itemById = (db, id = 101) => clone(db.records.get(`portfolioGithubInbox/${id}`));
const reviewBody = (db, item, decision, project) => ({ repositoryId: item.repositoryId, expectedFingerprint: item.fingerprint, expectedVersion: item.version, decision, ...(['approve', 'unpublish'].includes(decision) ? { expectedDraftVersion: contentRecord(db, 'draft').version, expectedPublishedVersion: contentRecord(db, 'published').version } : {}), ...(project ? { project } : {}) });
const contentRecord = (db, name) => db.records.get(`portfolioContent/${name}`);
const response = () => ({ statusCode: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(value) { this.body = JSON.parse(value); } });

test('public discovery creates a private pending inbox without changing published or draft content', async () => {
  const db = fakeDatabase();
  const before = [clone(contentRecord(db, 'draft')), clone(contentRecord(db, 'published'))];
  const calls = [];
  const fetchImpl = async (url, options) => { calls.push({ url, options }); return fetchItems([repository()])(); };
  const result = await syncGithubRepos({ db, fetchImpl, now, actor });
  assert.equal(result.added, 1);
  assert.equal(result.items[0].reviewState, 'pending');
  assert.equal(result.items[0].published, false);
  assert.equal(result.items[0].repositoryId, 101);
  assert.equal(result.items[0].project.githubId, 101);
  assert.equal(result.draftVersion, 1);
  assert.equal(result.publishedVersion, 1);
  assert.deepEqual([contentRecord(db, 'draft'), contentRecord(db, 'published')], before);
  assert.equal(new URL(calls[0].url).hostname, 'api.github.com');
  assert.equal(calls[0].options.redirect, 'error');
  assert.equal(calls[0].options.headers.Authorization, undefined);
  assert.equal(calls[0].options.headers['X-GitHub-Api-Version'], '2026-03-10');
  assert.ok(calls[0].options.signal instanceof AbortSignal);
  assert.equal([...db.records.keys()].filter(path => path.startsWith('portfolioAudit/')).length, 0);
});

test('approve publishes only the chosen project and preserves unrelated unfinished draft changes', async () => {
  const db = fakeDatabase();
  await syncGithubRepos({ db, fetchImpl: fetchItems([repository(), repository(102)]), now });
  const draft = contentRecord(db, 'draft');
  draft.content.about.paragraphs = ['An unfinished About edit.'];
  draft.content.projects[0].title = 'An unfinished existing project edit';
  draft.version = 7;
  const originalPublic = clone(contentRecord(db, 'published').content);
  const item = itemById(db);
  const inbox = await listGithubInbox({ db, now });
  const edited = { ...inbox.items.find(value => value.repositoryId === 101).project, title: 'Approved project', summary: 'An edited, accurate project summary.' };
  const result = await reviewGithubRepo({ db, actor, body: reviewBody(db, item, 'approve', edited), now: now + 1000 });
  assert.equal(result.draftVersion, 8);
  assert.equal(result.publishedVersion, 2);
  assert.deepEqual(contentRecord(db, 'published').content.about, originalPublic.about);
  assert.equal(contentRecord(db, 'published').content.projects[0].title, originalPublic.projects[0].title);
  assert.equal(contentRecord(db, 'draft').content.projects[0].title, 'An unfinished existing project edit');
  assert.deepEqual(contentRecord(db, 'draft').content.about.paragraphs, ['An unfinished About edit.']);
  assert.equal(contentRecord(db, 'published').content.projects.find(value => value.githubId === 101).title, 'Approved project');
  assert.equal(contentRecord(db, 'published').content.projects.some(value => value.githubId === 102), false);
  assert.equal(result.items.find(value => value.repositoryId === 101).published, true);
  assert.equal([...db.records.keys()].filter(path => path.startsWith('portfolioRevisions/')).length, 1);
});

test('metadata changes return an approved repository to pending while its public snapshot stays unchanged', async () => {
  const db = fakeDatabase();
  await syncGithubRepos({ db, fetchImpl: fetchItems([repository()]), now });
  await reviewGithubRepo({ db, actor, body: reviewBody(db, itemById(db), 'approve'), now: now + 1000 });
  const publicBefore = clone(contentRecord(db, 'published'));
  const approved = itemById(db);
  const changed = repository(101, { description: 'New metadata needing review.', pushed_at: '2026-10-21T01:00:00Z' });
  const result = await syncGithubRepos({ db, fetchImpl: fetchItems([changed]), now: now + 301_000 });
  assert.equal(result.changed, 1);
  assert.equal(result.items[0].reviewState, 'pending');
  assert.equal(result.items[0].published, true);
  assert.notEqual(result.items[0].fingerprint, approved.fingerprint);
  assert.deepEqual(contentRecord(db, 'published'), publicBefore);
  await assert.rejects(reviewGithubRepo({ db, actor, body: reviewBody(db, approved, 'approve'), now: now + 302_000 }), error => error.status === 409);
});

test('reject and pending are private decisions; unchanged rejected metadata is not suggested again', async () => {
  const db = fakeDatabase();
  await syncGithubRepos({ db, fetchImpl: fetchItems([repository()]), now });
  const before = clone(contentRecord(db, 'published'));
  await reviewGithubRepo({ db, actor, body: reviewBody(db, itemById(db), 'reject'), now: now + 1000 });
  await syncGithubRepos({ db, fetchImpl: fetchItems([repository()]), now: now + 301_000 });
  assert.equal(itemById(db).reviewState, 'rejected');
  await reviewGithubRepo({ db, actor, body: reviewBody(db, itemById(db), 'pending'), now: now + 302_000 });
  assert.equal(itemById(db).reviewState, 'pending');
  assert.deepEqual(contentRecord(db, 'published'), before);
  assert.equal([...db.records.keys()].filter(path => path.startsWith('portfolioRevisions/')).length, 0);
});

test('a rejected source remains rejected across availability changes until its fingerprint changes', async () => {
  const db = fakeDatabase();
  await syncGithubRepos({ db, fetchImpl: fetchItems([repository()]), now });
  await reviewGithubRepo({ db, actor, body: reviewBody(db, itemById(db), 'reject'), now: now + 1000 });
  await syncGithubRepos({ db, fetchImpl: fetchItems([]), now: now + 301_000 });
  assert.equal(itemById(db).available, false);
  await syncGithubRepos({ db, fetchImpl: fetchItems([repository()]), now: now + 602_000 });
  assert.equal(itemById(db).available, true);
  assert.equal(itemById(db).reviewState, 'rejected');
  await syncGithubRepos({ db, fetchImpl: fetchItems([repository(101, { description: 'A changed description.' })]), now: now + 903_000 });
  assert.equal(itemById(db).reviewState, 'pending');
});

test('unpublish removes only the linked GitHub project from both snapshots and keeps the repository suggestion', async () => {
  const db = fakeDatabase();
  await syncGithubRepos({ db, fetchImpl: fetchItems([repository()]), now });
  await reviewGithubRepo({ db, actor, body: reviewBody(db, itemById(db), 'approve'), now: now + 1000 });
  const draft = contentRecord(db, 'draft');
  draft.content.contact.message = 'Unpublished contact edit.';
  const result = await reviewGithubRepo({ db, actor, body: reviewBody(db, itemById(db), 'unpublish'), now: now + 2000 });
  for (const name of ['draft', 'published']) {
    assert.equal(contentRecord(db, name).content.projects.some(project => project.githubId === 101), false);
    assert.equal(contentRecord(db, name).content.projects[0].id, defaults.projects[0].id);
  }
  assert.equal(contentRecord(db, 'draft').content.contact.message, 'Unpublished contact edit.');
  assert.ok(itemById(db));
  assert.equal(result.items[0].published, false);
  assert.equal(result.items[0].reviewState, 'unpublished');
  assert.equal(result.summary.unpublished, 1);
  assert.equal([...db.records.keys()].filter(path => path.startsWith('portfolioRevisions/')).length, 2);
});

test('unchanged scans preserve an explicit unpublished decision and do not republish the repository', async () => {
  const db = fakeDatabase();
  await syncGithubRepos({ db, fetchImpl: fetchItems([repository()]), now });
  await reviewGithubRepo({ db, actor, body: reviewBody(db, itemById(db), 'approve'), now: now + 1000 });
  await reviewGithubRepo({ db, actor, body: reviewBody(db, itemById(db), 'unpublish'), now: now + 2000 });
  const publicBefore = clone(contentRecord(db, 'published'));
  const unpublished = itemById(db);
  const unchanged = await syncGithubRepos({ db, fetchImpl: fetchItems([repository()]), now: now + 301_000 });
  assert.equal(unchanged.items[0].reviewState, 'unpublished');
  assert.equal(unchanged.items[0].published, false);
  assert.equal(unchanged.summary.unpublished, 1);
  assert.equal(unchanged.summary.pending, 0);
  assert.equal(itemById(db).version, unpublished.version);
  assert.deepEqual(contentRecord(db, 'published'), publicBefore);
  const changed = await syncGithubRepos({ db, fetchImpl: fetchItems([repository(101, { description: 'A source update after unpublishing.' })]), now: now + 602_000 });
  assert.equal(changed.items[0].reviewState, 'pending');
  assert.equal(changed.items[0].published, false);
  assert.deepEqual(contentRecord(db, 'published'), publicBefore);
});

test('inbox previews and default reapproval preserve refinements made in the Projects editor', async () => {
  const db = fakeDatabase();
  await syncGithubRepos({ db, fetchImpl: fetchItems([repository()]), now });
  await reviewGithubRepo({ db, actor, body: reviewBody(db, itemById(db), 'approve'), now: now + 1000 });
  for (const name of ['draft', 'published']) {
    const project = contentRecord(db, name).content.projects.find(value => value.githubId === 101);
    project.title = 'A manually refined title';
    project.summary = 'The manually edited description.';
    project.details = 'Detailed project narrative written in the Projects editor.';
  }
  const inbox = await listGithubInbox({ db, now: now + 2000 });
  assert.equal(inbox.items[0].project.title, 'A manually refined title');
  assert.equal(inbox.items[0].project.summary, 'The manually edited description.');
  assert.notEqual(inbox.items[0].project.title, itemById(db).approvedProject.title);
  await syncGithubRepos({ db, fetchImpl: fetchItems([repository(101, { description: 'New GitHub source metadata.' })]), now: now + 301_000 });
  await reviewGithubRepo({ db, actor, body: reviewBody(db, itemById(db), 'approve'), now: now + 302_000 });
  const project = contentRecord(db, 'published').content.projects.find(value => value.githubId === 101);
  assert.equal(project.title, 'A manually refined title');
  assert.equal(project.summary, 'The manually edited description.');
  assert.equal(project.details, 'Detailed project narrative written in the Projects editor.');
});

test('approve and unpublish reject stale CMS snapshots and preserve newer draft or published edits', async () => {
  for (const decision of ['approve', 'unpublish']) {
    for (const changedDocument of ['draft', 'published']) {
      const db = fakeDatabase();
      await syncGithubRepos({ db, fetchImpl: fetchItems([repository()]), now });
      await reviewGithubRepo({ db, actor, body: reviewBody(db, itemById(db), 'approve'), now: now + 1000 });
      const inbox = await listGithubInbox({ db, now: now + 2000 });
      const item = inbox.items[0];
      const staleBody = {
        repositoryId: item.repositoryId,
        expectedFingerprint: item.fingerprint,
        expectedVersion: item.version,
        expectedDraftVersion: inbox.draftVersion,
        expectedPublishedVersion: inbox.publishedVersion,
        decision,
        ...(decision === 'approve' ? { project: { ...item.project, title: 'An old preview title' } } : {}),
      };
      // A separate CMS edit saves after the repository review preview opened.
      const current = contentRecord(db, changedDocument);
      current.content.projects.find(project => project.githubId === 101).title = 'A newer CMS project title';
      current.content.about.paragraphs = ['A newer CMS About edit.'];
      current.version++;
      const before = clone([...db.records]);
      await assert.rejects(reviewGithubRepo({ db, actor, body: staleBody, now: now + 3000 }), error => error.status === 409 && /content changed/i.test(error.message));
      assert.deepEqual([...db.records], before, `${decision} preserves a newer ${changedDocument} snapshot`);
    }
  }
});

test('publish decisions require both content versions while reject and pending stay independent', async () => {
  const db = fakeDatabase();
  await syncGithubRepos({ db, fetchImpl: fetchItems([repository()]), now });
  for (const decision of ['approve', 'unpublish']) {
    for (const field of ['expectedDraftVersion', 'expectedPublishedVersion']) {
      const body = reviewBody(db, itemById(db), decision);
      delete body[field];
      const before = clone([...db.records]);
      await assert.rejects(reviewGithubRepo({ db, actor, body, now: now + 1000 }), error => error.status === 400);
      assert.deepEqual([...db.records], before);
    }
  }
  for (const decision of ['reject', 'pending']) {
    const body = reviewBody(db, itemById(db), decision);
    assert.equal(body.expectedDraftVersion, undefined);
    assert.equal(body.expectedPublishedVersion, undefined);
    contentRecord(db, 'draft').version++;
    contentRecord(db, 'published').version++;
    await reviewGithubRepo({ db, actor, body, now: now + 2000 });
    assert.equal(itemById(db).reviewState, decision === 'reject' ? 'rejected' : 'pending');
  }
});

test('stable repository IDs update one project after a rename, with no duplicate imports', async () => {
  const db = fakeDatabase();
  await syncGithubRepos({ db, fetchImpl: fetchItems([repository()]), now });
  await reviewGithubRepo({ db, actor, body: reviewBody(db, itemById(db), 'approve'), now: now + 1000 });
  await syncGithubRepos({ db, fetchImpl: fetchItems([repository(101, { name: 'renamed', full_name: 'Vivek-Biswal/renamed' })]), now: now + 301_000 });
  await reviewGithubRepo({ db, actor, body: reviewBody(db, itemById(db), 'approve'), now: now + 302_000 });
  const imported = contentRecord(db, 'published').content.projects.filter(project => project.githubId === 101);
  assert.equal(imported.length, 1);
  assert.equal(imported[0].repositoryUrl, 'https://github.com/Vivek-Biswal/renamed');
});

test('duplicate manual repository URLs, project ID collisions and stale versions fail without any writes', async () => {
  for (const duplicate of ['repositoryUrl', 'id']) {
    const db = fakeDatabase();
    await syncGithubRepos({ db, fetchImpl: fetchItems([repository()]), now });
    for (const name of ['draft', 'published']) {
      const project = contentRecord(db, name).content.projects[0];
      if (duplicate === 'repositoryUrl') project.url = 'https://github.com/vivek-biswal/repo-101.git';
      else project.id = 'github-101';
    }
    const before = clone([...db.records]);
    await assert.rejects(reviewGithubRepo({ db, actor, body: reviewBody(db, itemById(db), 'approve'), now: now + 1000 }), error => error.status === 409);
    assert.deepEqual([...db.records], before);
  }
  const db = fakeDatabase();
  await syncGithubRepos({ db, fetchImpl: fetchItems([repository()]), now });
  const item = itemById(db);
  await reviewGithubRepo({ db, actor, body: reviewBody(db, item, 'reject'), now: now + 1000 });
  await assert.rejects(reviewGithubRepo({ db, actor, body: reviewBody(db, item, 'approve'), now: now + 2000 }), error => error.status === 409);
});

test('approval binds the real repository identity and rejects unsafe or oversized content atomically', async () => {
  const db = fakeDatabase();
  await syncGithubRepos({ db, fetchImpl: fetchItems([repository()]), now });
  const suggestion = (await listGithubInbox({ db, now })).items[0].project;
  const tampered = { ...suggestion, githubId: 999, repositoryUrl: 'https://attacker.example/project' };
  await reviewGithubRepo({ db, actor, body: reviewBody(db, itemById(db), 'approve', tampered), now: now + 1000 });
  const project = contentRecord(db, 'published').content.projects.find(value => value.githubId === 101);
  assert.equal(project.repositoryUrl, 'https://github.com/Vivek-Biswal/repo-101');
  assert.equal(contentRecord(db, 'published').content.projects.some(value => value.githubId === 999), false);
  const before = clone([...db.records]);
  await assert.rejects(reviewGithubRepo({ db, actor, body: reviewBody(db, itemById(db), 'approve', { ...project, demoUrl: 'javascript:alert(1)' }), now: now + 2000 }));
  assert.deepEqual([...db.records], before);

  const full = fakeDatabase();
  await syncGithubRepos({ db: full, fetchImpl: fetchItems([repository()]), now });
  for (const name of ['draft', 'published']) contentRecord(full, name).content.projects = Array.from({ length: 40 }, (_, index) => ({ ...clone(defaults.projects[0]), id: `existing-${index}` }));
  const fullBefore = clone([...full.records]);
  await assert.rejects(reviewGithubRepo({ db: full, actor, body: reviewBody(full, itemById(full), 'approve'), now: now + 1000 }));
  assert.deepEqual([...full.records], fullBefore);
});

test('missing repositories cannot be approved and are never silently removed from public content', async () => {
  const db = fakeDatabase();
  await syncGithubRepos({ db, fetchImpl: fetchItems([repository()]), now });
  await reviewGithubRepo({ db, actor, body: reviewBody(db, itemById(db), 'approve'), now: now + 1000 });
  const before = clone(contentRecord(db, 'published'));
  const result = await syncGithubRepos({ db, fetchImpl: fetchItems([]), now: now + 301_000 });
  assert.equal(result.unavailable, 1);
  assert.equal(result.items[0].available, false);
  assert.equal(result.items[0].published, true);
  assert.deepEqual(contentRecord(db, 'published'), before);
  await assert.rejects(reviewGithubRepo({ db, actor, body: reviewBody(db, itemById(db), 'approve'), now: now + 302_000 }), error => error.status === 409);
  await reviewGithubRepo({ db, actor, body: reviewBody(db, itemById(db), 'unpublish'), now: now + 303_000 });
  assert.equal(contentRecord(db, 'published').content.projects.some(project => project.githubId === 101), false);
});

test('rate limits, network errors, malformed payloads and later-page failures preserve every inbox record', async () => {
  const db = fakeDatabase();
  await syncGithubRepos({ db, fetchImpl: fetchItems([repository()]), now });
  const before = itemById(db);
  const failures = [
    async () => new Response('{"message":"rate limit"}', { status: 403 }),
    async () => { throw new Error('private error contents'); },
    async () => new Response('{malformed', { status: 200 }),
    async url => new URL(url).searchParams.get('page') === '1' ? fetchItems(Array.from({ length: 100 }, (_, index) => repository(index + 200)))() : new Response('unavailable', { status: 503 }),
  ];
  for (let index = 0; index < failures.length; index++) {
    await assert.rejects(syncGithubRepos({ db, fetchImpl: failures[index], now: now + (index + 1) * 301_000 }));
    assert.deepEqual(itemById(db), before);
    assert.equal([...db.records.keys()].filter(path => path.startsWith('portfolioGithubInbox/')).length, 1);
    assert.ok(!db.records.get('portfolioIntegrations/github').lastSyncError.includes('private error contents'));
    assert.equal(db.records.get('portfolioIntegrations/github').leaseUntil, 0);
  }
});

test('pagination cap cannot incorrectly mark old repositories unavailable', async () => {
  const db = fakeDatabase();
  await syncGithubRepos({ db, fetchImpl: fetchItems([repository(999)]), now });
  const fetchImpl = async url => {
    const page = Number(new URL(url).searchParams.get('page'));
    return fetchItems(Array.from({ length: 100 }, (_, index) => repository((page - 1) * 100 + index + 1000)))();
  };
  const result = await syncGithubRepos({ db, fetchImpl, now: now + 301_000 });
  assert.equal(itemById(db, 999).available, true);
  assert.equal(result.summary.truncated, true);
  assert.equal([...db.records.keys()].filter(path => path.startsWith('portfolioGithubInbox/')).length, 500);
});

test('private and foreign repositories are excluded and unsafe homepage URLs are not suggested', async () => {
  const db = fakeDatabase();
  const result = await syncGithubRepos({ db, fetchImpl: fetchItems([
    repository(101, { private: true }),
    repository(102, { owner: { login: 'another-owner' }, full_name: 'another-owner/repo-102' }),
    repository(103, { homepage: 'javascript:alert(1)', description: 'safe\u0000description' }),
  ]), now });
  assert.deepEqual(result.items.map(item => item.repositoryId), [103]);
  assert.equal(result.items[0].candidate.demoUrl, '');
  assert.equal(result.items[0].project.url, 'https://github.com/Vivek-Biswal/repo-103');
  assert.equal(result.items[0].candidate.description, 'safe description');
});

test('cooldown and lease reject repeated/concurrent scans before another GitHub request', async () => {
  const db = fakeDatabase();
  let release;
  const waiting = new Promise(resolve => { release = resolve; });
  const first = syncGithubRepos({ db, fetchImpl: async () => { await waiting; return fetchItems([repository()])(); }, now });
  await new Promise(resolve => setTimeout(resolve, 0));
  let called = false;
  const secondFetch = async () => { called = true; return fetchItems([])(); };
  await assert.rejects(syncGithubRepos({ db, fetchImpl: secondFetch, now: now + 100 }), error => error.status === 429);
  assert.equal(called, false);
  release();
  await first;
  await assert.rejects(syncGithubRepos({ db, fetchImpl: secondFetch, now: now + 1000 }), error => error.status === 429);
  assert.equal(called, false);
});

test('scheduled route fails closed for missing/wrong secrets and does not reveal private inbox data', async () => {
  const original = process.env.CRON_SECRET;
  try {
    const db = fakeDatabase();
    delete process.env.CRON_SECRET;
    let res = response();
    await runScheduledGithubSync({ method: 'GET', headers: {} }, res, { db, fetchImpl: fetchItems([repository()]), now });
    assert.equal(res.statusCode, 401);
    assert.equal(itemById(db), undefined);
    process.env.CRON_SECRET = 'a-test-secret-which-is-never-returned';
    res = response();
    await runScheduledGithubSync({ method: 'GET', headers: { authorization: 'Bearer wrong' } }, res, { db, now });
    assert.equal(res.statusCode, 401);
    res = response();
    await runScheduledGithubSync({ method: 'GET', headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }, res, { db, fetchImpl: fetchItems([repository()]), now });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.added, 1);
    assert.equal(res.body.items, undefined);
    assert.ok(!JSON.stringify(res.body).includes(process.env.CRON_SECRET));
    assert.equal(res.headers['Cache-Control'], 'no-store');
    res = response();
    await runScheduledGithubSync({ method: 'GET', headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }, res, { db, now: now + 1000 });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.skipped, true);
  } finally {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  }
});
