import { createHash, randomUUID } from 'node:crypto';
import { HttpError, protectResponse, sameSecret } from './security.mjs';
import { invalidatePublished, services } from './firebase.mjs';
import { validateContent } from './schema.mjs';

const INBOX = 'portfolioGithubInbox';
const INTEGRATIONS = 'portfolioIntegrations';
const MAX_REPOSITORIES = 500;
const COOLDOWN_MS = 5 * 60_000;
const LEASE_MS = 2 * 60_000;
const MAX_PAGE_BYTES = 1_500_000;
const validOwner = value => typeof value === 'string' && /^(?!-)[a-z\d-]{1,39}(?<!-)$/i.test(value);
const timestamp = value => Number.isFinite(value) ? value : Date.now();
const clean = (value, max) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '';
const positiveId = value => Number.isSafeInteger(value) && value > 0;
const date = value => typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : '';
const stateRef = db => db.collection(INTEGRATIONS).doc('github');
const recordRef = (db, id) => db.collection(INBOX).doc(String(id));

export function githubOwner() {
  const owner = process.env.GITHUB_OWNER || 'Vivek-Biswal';
  if (!validOwner(owner)) throw new HttpError(503, 'The GitHub account setting is invalid.');
  return owner;
}

function httpsUrl(value) {
  if (typeof value !== 'string' || !value || value.length > 2048 || /[\u0000-\u0020<>"'\\]/.test(value)) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

// URLs are constructed from an authenticated API response's owner/name fields;
// no repository-provided URL is ever fetched by this integration.
function candidateFromRepository(repository, owner) {
  if (!repository || typeof repository !== 'object' || !positiveId(repository.id)) throw new HttpError(502, 'GitHub returned an invalid repository list.');
  if (repository.private !== false || repository.disabled === true || (repository.visibility !== undefined && repository.visibility !== 'public') || !validOwner(repository.owner?.login) || repository.owner.login.toLowerCase() !== owner.toLowerCase()) return null;
  const name = repository.name;
  if (typeof name !== 'string' || !/^[a-z\d._-]{1,100}$/i.test(name) || typeof repository.full_name !== 'string' || repository.full_name.toLowerCase() !== `${owner}/${name}`.toLowerCase()) throw new HttpError(502, 'GitHub returned invalid repository details.');
  const canonicalOwner = repository.owner.login;
  return {
    name,
    fullName: `${canonicalOwner}/${name}`,
    description: clean(repository.description, 2000),
    repositoryUrl: `https://github.com/${canonicalOwner}/${name}`,
    demoUrl: httpsUrl(repository.homepage),
    language: clean(repository.language, 50),
    topics: Array.isArray(repository.topics) ? [...new Set(repository.topics.filter(value => typeof value === 'string').map(value => clean(value, 50)).filter(Boolean))].sort().slice(0, 20) : [],
    createdAt: date(repository.created_at),
    updatedAt: date(repository.updated_at),
    pushedAt: date(repository.pushed_at),
    archived: repository.archived === true,
  };
}

const fingerprintOf = candidate => createHash('sha256').update(JSON.stringify(candidate)).digest('hex');

function suggestedProject(repositoryId, candidate, now) {
  return {
    id: `github-${repositoryId}`,
    githubId: repositoryId,
    title: candidate.name,
    summary: candidate.description || `${candidate.name}: a public GitHub repository.`,
    details: '',
    url: candidate.demoUrl || candidate.repositoryUrl,
    repositoryUrl: candidate.repositoryUrl,
    demoUrl: candidate.demoUrl,
    image: '',
    category: candidate.language || 'GitHub project',
    year: candidate.createdAt.slice(0, 4) || String(new Date(now).getUTCFullYear()),
    tags: [...new Set([candidate.language, ...candidate.topics].filter(Boolean))].slice(0, 20),
  };
}

function safeSyncError(error) {
  if (error instanceof HttpError) return error.message;
  return 'The GitHub scan could not finish. Existing suggestions and published projects have been preserved.';
}

async function readResponse(response) {
  if (Number(response.headers?.get('content-length')) > MAX_PAGE_BYTES) throw new HttpError(502, 'GitHub returned too much data.');
  if (!response.body?.getReader) {
    const text = await response.text();
    if (Buffer.byteLength(text) > MAX_PAGE_BYTES) throw new HttpError(502, 'GitHub returned too much data.');
    try { return JSON.parse(text); } catch { throw new HttpError(502, 'GitHub returned an invalid response.'); }
  }
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > MAX_PAGE_BYTES) throw new HttpError(502, 'GitHub returned too much data.');
      chunks.push(Buffer.from(part.value));
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(502, 'GitHub returned an invalid response.'); }
}

async function fetchRepositories(owner, fetchImpl) {
  const repositories = new Map();
  const seenIds = new Set();
  let complete = false;
  const deadline = Date.now() + 25_000;
  for (let page = 1; page <= 5; page++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new HttpError(504, 'The GitHub scan timed out. Try again later.');
    let response;
    try {
      response = await fetchImpl(`https://api.github.com/users/${encodeURIComponent(owner)}/repos?type=owner&sort=full_name&direction=asc&per_page=100&page=${page}`, {
        method: 'GET',
        headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10', 'User-Agent': 'Vivek-Portfolio-Public-Discovery' },
        redirect: 'error',
        signal: AbortSignal.timeout(Math.min(8000, remaining)),
      });
    } catch { throw new HttpError(502, 'GitHub could not be reached. Try again later.'); }
    if (response.status === 403 || response.status === 429) throw new HttpError(429, 'GitHub is temporarily limiting public requests. Wait before refreshing again.');
    if (!response.ok) throw new HttpError(502, 'GitHub could not provide the public repository list. Try again later.');
    const items = await readResponse(response);
    if (!Array.isArray(items) || items.length > 100) throw new HttpError(502, 'GitHub returned an invalid repository list.');
    for (const item of items) {
      const candidate = candidateFromRepository(item, owner);
      if (seenIds.has(item.id)) throw new HttpError(502, 'GitHub changed its repository list during this scan. Refresh again later.');
      seenIds.add(item.id);
      if (candidate) repositories.set(item.id, { repositoryId: item.id, candidate, fingerprint: fingerprintOf(candidate) });
    }
    if (items.length < 100) { complete = true; break; }
  }
  // A full fifth page is deliberately treated as incomplete. Never mark older
  // records unavailable when the public account may have more than 500 repos.
  return { repositories, complete };
}

function canonicalGithubUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com' || url.username || url.password) return '';
    const path = url.pathname.replace(/\/+$/, '').replace(/\.git$/i, '').toLowerCase();
    return /^\/[^/]+\/[^/]+$/.test(path) ? `https://github.com${path}` : '';
  } catch { return ''; }
}

function targetProjects(projects, repositoryId, repositoryUrl) {
  const matches = projects.filter(project => project.githubId === repositoryId);
  if (matches.length > 1) throw new HttpError(409, 'This repository is linked more than once. Resolve the duplicate project before reviewing.');
  const canonical = canonicalGithubUrl(repositoryUrl);
  if (projects.some(project => project.githubId !== repositoryId && [project.repositoryUrl, project.url].some(value => canonicalGithubUrl(value) === canonical))) throw new HttpError(409, 'This GitHub repository already belongs to another project. Edit that project instead of adding a duplicate.');
  return matches[0];
}

function reviewedProject(project, item, now, publishedProject) {
  if (project !== undefined && (!project || typeof project !== 'object' || Array.isArray(project))) throw new HttpError(400, 'Project details must be an object.');
  return { ...(project || publishedProject || item.approvedProject || suggestedProject(item.repositoryId, item.candidate, now)), githubId: item.repositoryId, repositoryUrl: item.candidate.repositoryUrl };
}

function replaceProject(content, item, project) {
  const projects = content.projects;
  const existing = targetProjects(projects, item.repositoryId, item.candidate.repositoryUrl);
  if (projects.some(value => value.id === project.id && value.githubId !== item.repositoryId)) throw new HttpError(409, 'That project ID is already in use. Choose a different ID.');
  return validateContent({ ...content, projects: existing ? projects.map(value => value.githubId === item.repositoryId ? project : value) : [...projects, project] });
}

export async function listGithubInbox({ db, now } = {}) {
  const at = timestamp(now);
  const owner = githubOwner();
  const [stateSnapshot, snapshot, draftSnapshot, publishedSnapshot] = await Promise.all([
    stateRef(db).get(), db.collection(INBOX).limit(MAX_REPOSITORIES + 1).get(), db.collection('portfolioContent').doc('draft').get(), db.collection('portfolioContent').doc('published').get(),
  ]);
  const state = stateSnapshot.data() || {};
  const publicProjects = publishedSnapshot.data()?.content?.projects || [];
  const items = snapshot.docs.slice(0, MAX_REPOSITORIES).map(doc => doc.data()).filter(item => item.owner?.toLowerCase() === owner.toLowerCase()).map(item => {
    const publishedProject = publicProjects.find(project => project.githubId === item.repositoryId);
    return {
      repositoryId: item.repositoryId,
      candidate: item.candidate,
      fingerprint: item.fingerprint,
      version: item.version,
      reviewState: item.reviewState,
      available: item.available === true,
      published: Boolean(publishedProject),
      // The Projects editor may have refined an already imported project. Its
      // current public content is authoritative over the older inbox snapshot.
      project: publishedProject || item.approvedProject || suggestedProject(item.repositoryId, item.candidate, at),
      reviewedAt: item.reviewedAt || null,
    };
  }).sort((a, b) => a.candidate.fullName.localeCompare(b.candidate.fullName));
  return {
    owner,
    items,
    draftVersion: draftSnapshot.data()?.version || 0,
    publishedVersion: publishedSnapshot.data()?.version || 0,
    lastSyncAt: state.lastSyncAt || null,
    nextSyncAt: state.lastSyncAt ? state.lastSyncAt + 24 * 60 * 60_000 : null,
    refreshAvailableAt: state.cooldownUntil || null,
    syncInProgress: state.leaseUntil > at,
    lastSyncError: state.lastSyncError || '',
    cronReady: Boolean(process.env.CRON_SECRET && process.env.CRON_SECRET.length <= 256),
    summary: {
      total: items.length,
      pending: items.filter(item => item.reviewState === 'pending').length,
      approved: items.filter(item => item.reviewState === 'approved').length,
      rejected: items.filter(item => item.reviewState === 'rejected').length,
      unpublished: items.filter(item => item.reviewState === 'unpublished').length,
      published: items.filter(item => item.published).length,
      unavailable: items.filter(item => !item.available).length,
      truncated: state.truncated === true || snapshot.docs.length > MAX_REPOSITORIES,
    },
  };
}

export async function syncGithubRepos({ db, fetchImpl = fetch, now, actor } = {}) {
  const at = timestamp(now);
  const owner = githubOwner();
  const leaseToken = randomUUID();
  const integration = stateRef(db);
  await db.runTransaction(async transaction => {
    const state = (await transaction.get(integration)).data() || {};
    if (state.leaseUntil > at) throw new HttpError(429, 'A GitHub scan is already running. Please wait.');
    if (state.cooldownUntil > at) throw new HttpError(429, 'Wait five minutes between GitHub refreshes.');
    transaction.set(integration, { owner, leaseToken, leaseUntil: at + LEASE_MS, cooldownUntil: at + COOLDOWN_MS, lastAttemptAt: at }, { merge: true });
  });
  try {
    // Fetch the complete bounded result before touching inbox records, so a
    // failure on page two cannot erase or partially replace prior suggestions.
    const { repositories, complete } = await fetchRepositories(owner, fetchImpl);
    const existingSnapshot = await db.collection(INBOX).limit(MAX_REPOSITORIES + 1).get();
    const existingIds = new Set(existingSnapshot.docs.map(doc => doc.id));
    let availableSlots = Math.max(0, MAX_REPOSITORIES - existingIds.size);
    const discovered = [...repositories.values()].filter(item => existingIds.has(String(item.repositoryId)) || availableSlots-- > 0);
    const overflow = discovered.length < repositories.size || existingSnapshot.docs.length > MAX_REPOSITORIES;
    const work = discovered.map(item => ({ ...item, available: true }));
    if (complete && !overflow) {
      for (const document of existingSnapshot.docs) {
        const item = document.data();
        if (item.owner?.toLowerCase() === owner.toLowerCase() && !repositories.has(item.repositoryId) && item.available !== false) work.push({ repositoryId: item.repositoryId, available: false });
      }
    }
    let added = 0;
    let changed = 0;
    let unavailable = 0;
    for (let start = 0; start < work.length; start += 25) {
      const batch = work.slice(start, start + 25);
      const results = await db.runTransaction(async transaction => {
        const lock = (await transaction.get(integration)).data();
        if (lock?.leaseToken !== leaseToken) throw new HttpError(409, 'The GitHub scan lease expired. Refresh again later.');
        const records = await Promise.all(batch.map(item => transaction.get(recordRef(db, item.repositoryId))));
        const counts = { added: 0, changed: 0, unavailable: 0 };
        batch.forEach((item, index) => {
          const old = records[index].data();
          if (!item.available) {
            if (old && old.available !== false) { transaction.set(recordRef(db, item.repositoryId), { ...old, available: false, version: old.version + 1, unavailableAt: at }); counts.unavailable++; }
            return;
          }
          const sourceChanged = !old || old.fingerprint !== item.fingerprint;
          const recordChanged = sourceChanged || old.available !== true;
          transaction.set(recordRef(db, item.repositoryId), {
            ...old,
            owner,
            repositoryId: item.repositoryId,
            candidate: item.candidate,
            fingerprint: item.fingerprint,
            available: true,
            reviewState: sourceChanged ? 'pending' : old.reviewState,
            version: old ? old.version + (recordChanged ? 1 : 0) : 1,
            firstSeenAt: old?.firstSeenAt || at,
            lastSeenAt: at,
            unavailableAt: null,
          });
          if (!old) counts.added++;
          else if (recordChanged) counts.changed++;
        });
        return counts;
      });
      added += results.added; changed += results.changed; unavailable += results.unavailable;
    }
    await db.runTransaction(async transaction => {
      const lock = (await transaction.get(integration)).data();
      if (lock?.leaseToken !== leaseToken) throw new HttpError(409, 'The GitHub scan lease expired. Refresh again later.');
      transaction.set(integration, { owner, leaseToken: '', leaseUntil: 0, lastSyncAt: at, lastSyncError: '', truncated: !complete || overflow, lastScanCount: repositories.size, lastScanBy: clean(actor?.uid, 128) || 'scheduled' }, { merge: true });
    });
    return { ok: true, added, changed, unavailable, ...await listGithubInbox({ db, now: at }) };
  } catch (error) {
    await db.runTransaction(async transaction => {
      const lock = (await transaction.get(integration)).data();
      if (lock?.leaseToken === leaseToken) transaction.set(integration, { leaseToken: '', leaseUntil: 0, lastSyncError: safeSyncError(error) }, { merge: true });
    }).catch(() => {});
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, safeSyncError(error));
  }
}

export async function reviewGithubRepo({ db, actor, body, now } = {}) {
  const at = timestamp(now);
  const owner = githubOwner();
  if (!actor?.uid || typeof actor.uid !== 'string' || actor.uid.length > 128) throw new HttpError(403, 'Administrator access is required.');
  if (!body || !positiveId(body.repositoryId) || !Number.isSafeInteger(body.expectedVersion) || body.expectedVersion < 1 || !/^[a-f0-9]{64}$/.test(body.expectedFingerprint || '') || !['approve', 'reject', 'pending', 'unpublish'].includes(body.decision)) throw new HttpError(400, 'Choose a current repository and a valid review decision.');
  if (['approve', 'unpublish'].includes(body.decision) && (![body.expectedDraftVersion, body.expectedPublishedVersion].every(value => Number.isSafeInteger(value) && value >= 0))) throw new HttpError(400, 'Current draft and published versions are required. Reload the GitHub preview before publishing.');
  const ref = recordRef(db, body.repositoryId);
  const draftRef = db.collection('portfolioContent').doc('draft');
  const publishedRef = db.collection('portfolioContent').doc('published');
  const revisionRef = db.collection('portfolioRevisions').doc(randomUUID());
  const auditRef = db.collection('portfolioAudit').doc(randomUUID());
  let result;
  await db.runTransaction(async transaction => {
    const item = (await transaction.get(ref)).data();
    if (!item || item.owner?.toLowerCase() !== owner.toLowerCase()) throw new HttpError(404, 'Repository suggestion not found.');
    if (item.version !== body.expectedVersion || item.fingerprint !== body.expectedFingerprint) throw new HttpError(409, 'This repository changed. Reload its preview before reviewing.');
    if (body.decision === 'approve' && !item.available) throw new HttpError(409, 'This repository is no longer publicly available. Refresh GitHub before approving it.');
    const next = { ...item, version: item.version + 1, reviewedAt: at, reviewedBy: actor.uid, reviewState: body.decision === 'approve' ? 'approved' : body.decision === 'reject' ? 'rejected' : body.decision === 'unpublish' ? 'unpublished' : 'pending' };
    if (body.decision === 'approve' || body.decision === 'unpublish') {
      const [draftSnapshot, publishedSnapshot] = await Promise.all([transaction.get(draftRef), transaction.get(publishedRef)]);
      const draft = draftSnapshot.data();
      const published = publishedSnapshot.data();
      if (!draft || !published) throw new HttpError(503, 'Initialize the shared portfolio content before publishing projects.');
      if (draft.version !== body.expectedDraftVersion || published.version !== body.expectedPublishedVersion) throw new HttpError(409, 'Portfolio content changed. Reload the GitHub preview before publishing or unpublishing this project.');
      let draftContent;
      let publishedContent;
      if (body.decision === 'approve') {
        const project = reviewedProject(body.project, item, at, published.content.projects.find(value => value.githubId === item.repositoryId));
        // Both content documents are edited independently. Approval must never
        // accidentally publish unrelated, unfinished changes in the draft.
        draftContent = replaceProject(draft.content, item, project);
        publishedContent = replaceProject(published.content, item, project);
        next.approvedProject = publishedContent.projects.find(value => value.githubId === item.repositoryId);
        next.approvedFingerprint = item.fingerprint;
      } else {
        draftContent = validateContent({ ...draft.content, projects: draft.content.projects.filter(project => project.githubId !== item.repositoryId) });
        publishedContent = validateContent({ ...published.content, projects: published.content.projects.filter(project => project.githubId !== item.repositoryId) });
      }
      const mediaIds = body.decision === 'approve' ? [...new Set([...JSON.stringify(next.approvedProject).matchAll(/action=media&id=([a-f0-9-]{36})/g)].map(match => match[1]))] : [];
      const mediaRecords = await Promise.all(mediaIds.map(id => transaction.get(db.collection('portfolioMedia').doc(id))));
      if (mediaRecords.some(record => !record.exists || record.data().archived)) throw new HttpError(400, 'A referenced upload is unavailable.');
      const updatedDraft = { ...draft, content: draftContent, version: draft.version + 1, updatedAt: at, updatedBy: actor.uid };
      const updatedPublished = { ...published, content: publishedContent, version: published.version + 1, updatedAt: at, updatedBy: actor.uid };
      transaction.set(draftRef, updatedDraft);
      transaction.set(publishedRef, updatedPublished);
      transaction.set(revisionRef, { ...updatedPublished, publishedAt: at });
      mediaRecords.forEach(record => transaction.set(record.ref, { published: true }, { merge: true }));
      result = { draftVersion: updatedDraft.version, publishedVersion: updatedPublished.version };
    }
    transaction.set(ref, next);
    transaction.set(auditRef, { action: `github-${body.decision}`, actor: actor.uid, at, repositoryId: item.repositoryId, fingerprint: item.fingerprint, version: next.version, ...(result || {}) });
  });
  if (body.decision === 'approve' || body.decision === 'unpublish') invalidatePublished();
  return { ok: true, ...result, ...await listGithubInbox({ db, now: at }) };
}

export async function runScheduledGithubSync(req, res, options = {}) {
  protectResponse(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const respond = (status, body) => { res.statusCode = status; res.end(JSON.stringify(body)); };
  if (req.method !== 'GET') return respond(405, { error: 'Method not allowed.' });
  const secret = process.env.CRON_SECRET;
  const authorization = req.headers?.authorization;
  if (!secret || secret.length > 256 || typeof authorization !== 'string' || !authorization.startsWith('Bearer ') || !sameSecret(authorization.slice(7), secret)) return respond(401, { error: 'Scheduled access is not authorized.' });
  try {
    const result = await syncGithubRepos({ ...options, db: options.db || services().db });
    return respond(200, { ok: true, added: result.added, changed: result.changed, unavailable: result.unavailable, lastSyncAt: result.lastSyncAt });
  } catch (error) {
    if (error.status === 429 && /already running|five minutes/.test(error.message)) return respond(200, { ok: true, skipped: true, reason: 'A recent GitHub scan already ran.' });
    return respond(error.status || 503, { error: safeSyncError(error) });
  }
}
