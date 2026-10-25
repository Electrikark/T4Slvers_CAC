/* One discovery run: intake → engine replay → candidates → embeddings → groups → report.
   See discovery/DECISION.md for what each stage may and may not do. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { Refusal, intake, recordExposure } = require('./sources.cjs');
const { replay, engineFingerprint } = require('./replay.cjs');
const { buildCandidates } = require('./candidates.cjs');
const { DEFAULTS, PREPROCESSING, MODEL, embedCandidates, createChromiumEmbedder } = require('./embed.cjs');
const { group, legitNeighbors } = require('./cluster.cjs');
const { renderReport, LIMITS } = require('./report.cjs');
const shared = require('../review/shared.js');

const ROOT = path.join(__dirname, '..', '..');
const TOOL_VERSION = '0.1.0';
// Chosen on development data by the rule in discovery/DECISION.md (Calibration). Change it only
// with a new calibration note.
const DEFAULT_CUTOFF = 0.35;
const NEIGHBORS = 3;
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const round2 = x => Math.round(x * 100) / 100;

function localDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function checkOptions(o) {
  if (o.split !== 'dev') throw new Refusal('Only --split dev is supported. Held-out, combined and missing splits are refused; there is no override.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o.today || '') || new Date(o.today + 'T00:00:00Z').toISOString().slice(0, 10) !== o.today) {
    throw new Refusal('--today must be an explicit reference date (YYYY-MM-DD). The engine is never run on the runtime date.');
  }
  if (o.today > localDate(o.now)) throw new Refusal('--today cannot be in the future.');
  if (!Array.isArray(o.inputs) || !o.inputs.length) throw new Refusal('--input is required (one or more eligible sources).');
  if (!o.out) throw new Refusal('--out is required.');
  if (!(o.cutoff > 0 && o.cutoff < 2)) throw new Refusal('--cutoff must be a cosine distance between 0 and 2.');
  if (!(Number.isInteger(o.tokenLimit) && o.tokenLimit >= 16 && o.tokenLimit <= 512)) throw new Refusal('--token-limit must be an integer from 16 to 512.');
}

function git(root, args) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.replace(/\s+$/, '') : null;
}

// Reports hold message text, so they may not land anywhere git would track.
function checkLocation(root, dir, what) {
  const where = path.relative(root, dir);
  if (where.startsWith('..') || path.isAbsolute(where)) return;
  if (git(root, ['rev-parse', '--is-inside-work-tree']) !== 'true') return;
  const probe = path.join(where, 'findings.json');
  if (spawnSync('git', ['check-ignore', '-q', probe], { cwd: root }).status !== 0) {
    throw new Refusal(`${what} ${where} is inside the repository but not git-ignored. Use discovery/out/… or a folder outside the repository.`);
  }
}

function repository(root) {
  const status = git(root, ['status', '--porcelain', '--untracked-files=normal']);
  return {
    revision: git(root, ['rev-parse', 'HEAD']),
    branch: git(root, ['rev-parse', '--abbrev-ref', 'HEAD']),
    dirty: Boolean(status),
    dirtyFiles: status ? status.split('\n').map(l => l.slice(3)).filter(Boolean) : []
  };
}

async function runDiscovery(options) {
  const o = Object.assign({ cutoff: DEFAULT_CUTOFF, tokenLimit: DEFAULTS.tokenLimit, ml: true, modelDir: 'vendor/minilm' }, options);
  const root = path.resolve(o.root || ROOT);
  checkOptions(o);
  const out = path.resolve(o.out);
  const cacheDir = path.resolve(o.cacheDir || path.join(root, 'discovery/.cache/embeddings'));
  checkLocation(root, out, 'Report folder');
  checkLocation(root, cacheDir, 'Cache folder');
  if (fs.existsSync(out) && fs.readdirSync(out).length) throw new Refusal(`Report folder ${out} already exists and is not empty.`);
  const log = o.quiet ? () => {} : msg => console.log(msg);
  const offsets = [-0.10, -0.05, 0, 0.05, 0.10];
  const config = {
    cutoff: o.cutoff, sensitivity: offsets.map(d => round2(o.cutoff + d)).filter(c => c > 0 && c < 2),
    tokenLimit: o.tokenLimit, windowOverlapTokens: DEFAULTS.overlapTokens, maxWindows: DEFAULTS.maxWindows,
    neighbors: NEIGHBORS, preprocessing: PREPROCESSING
  };
  const stages = {};

  // 1. Intake: dev rows only, selected before anything else reads them.
  const taken = intake(root, o.inputs);
  const messages = taken.messages;
  stages.intake = { status: messages.length ? 'ok' : 'empty', detail: messages.length ? `${messages.length} dev messages selected` : 'No eligible dev rows were selected; the report is empty for that reason.' };
  recordExposure(root, taken.sources, messages);
  log(`Intake: ${messages.length} dev messages from ${taken.sources.length} source(s).`);

  // 2. Engine replay with the real adapter.
  const fingerprint = engineFingerprint(root);
  const engineRun = replay(root, messages, { today: o.today, engineLoader: o.engineLoader });
  stages.replay = { status: engineRun.failures ? 'failed' : 'ok', detail: `engine ${engineRun.version}, store ${engineRun.storeVersion}, reference date ${o.today}` + (engineRun.failures ? `; ${engineRun.failures} message(s) raised an error` : '') };

  // 3. Candidates.
  const candidates = messages.flatMap(m => buildCandidates(m));
  stages.candidates = { status: 'ok', detail: `${candidates.length} candidates from ${messages.length} messages` };

  // 4. Embeddings (optional; failure leaves the ungrouped queue intact).
  const cache = { directory: path.relative(root, cacheDir).startsWith('..') ? cacheDir : path.relative(root, cacheDir), hits: 0, misses: 0, rejected: 0 };
  let vectors = new Map(), model = null, blocked = [];
  if (!o.ml) stages.embedding = { status: 'skipped', detail: 'ML stage not requested (--no-ml).' };
  else if (!candidates.length) stages.embedding = { status: 'skipped', detail: 'No candidates.' };
  else {
    let embedder = null;
    try {
      embedder = await (o.embedderFactory || createChromiumEmbedder)({ root, modelDir: o.modelDir, tokenLimit: o.tokenLimit });
      model = embedder.info;
      vectors = await embedCandidates(candidates, messages, embedder, { tokenLimit: o.tokenLimit, overlapTokens: DEFAULTS.overlapTokens, maxWindows: DEFAULTS.maxWindows }, cacheDir, cache);
      blocked = embedder.blocked.slice();
      stages.embedding = { status: 'ok', detail: `${vectors.size} candidates embedded locally with ${MODEL}` };
    } catch (err) {
      vectors = new Map();
      stages.embedding = { status: 'unavailable', detail: 'ML stage unavailable: ' + String(err && err.message || err).split('\n')[0] };
    } finally {
      if (embedder) { blocked = embedder.blocked.slice(); await embedder.close().catch(() => {}); }
    }
  }
  if (stages.embedding.status !== 'ok') {
    for (const c of candidates) if (c.embedding.status !== 'context_only') c.embedding = { status: stages.embedding.status, tokens: null, windows: [] };
  }

  // 5. Groups.
  const byMessage = new Map(messages.map(m => [m.messageId, m]));
  const items = candidates.filter(c => vectors.has(c.candidateId)).map(c => ({ candidate: c, message: byMessage.get(c.messageId), vector: vectors.get(c.candidateId) }));
  let grouped = { groups: [], singletons: [], sensitivity: [] }, neighbors = {};
  if (items.length) {
    grouped = group(items, config);
    neighbors = legitNeighbors(items, NEIGHBORS);
    stages.clustering = { status: 'ok', detail: `average linkage, cosine distance, cutoff ${config.cutoff}: ${grouped.groups.length} groups, ${grouped.singletons.length} singletons` };
  } else stages.clustering = { status: stages.embedding.status === 'ok' ? 'skipped' : stages.embedding.status, detail: 'No vectors; every candidate is in the ungrouped queue.' };
  const ungroupable = candidates.filter(c => !vectors.has(c.candidateId)).map(c => c.candidateId);

  const real = messages.some(m => m.provenance.bucket === 'real');
  const modelInfo = model ? { name: model.name, dtype: model.dtype, pooling: model.pooling, normalize: model.normalize, assetsDigest: model.assetsDigest, tokenizerDigest: model.tokenizerDigest, assets: model.assets, runtime: model.runtime } : null;
  const runId = `run-${o.today}-` + sha256(JSON.stringify({
    tool: TOOL_VERSION, sources: taken.sources.map(s => [s.path, s.sha256]), config, engine: fingerprint.combined,
    model: model ? [model.assetsDigest, model.runtime] : stages.embedding.status, today: o.today
  })).slice(0, 12);

  const findings = {
    schema: shared.FINDINGS_SCHEMA, version: 1, runId, demonstration: !real, referenceDate: o.today,
    notices: [!real ? 'Demonstration: no real or public development rows were processed; nothing here is a real-data finding.' : null,
      'Human review pending: groups are candidates for investigation, not findings; group names are provisional.'].filter(Boolean).concat(LIMITS),
    config, stages,
    messages, candidates,
    groups: grouped.groups, singletons: grouped.singletons, ungroupable, neighbors, sensitivity: grouped.sensitivity
  };
  stages.report = { status: 'ok', detail: 'findings.json, report.md, manifest.json' };
  const check = shared.validateFindings(findings);
  if (!check.ok) { stages.report = { status: 'failed', detail: check.errors.slice(0, 3).join('; ') }; }

  const manifest = {
    schema: 'safety4seniors.discovery.manifest', version: 1, tool: 'discovery', toolVersion: TOOL_VERSION,
    runId, createdAt: (o.now || new Date()).toISOString(), demonstration: !real,
    repository: repository(root),
    command: { split: o.split, today: o.today, inputs: taken.sources.map(s => s.path), out: path.relative(root, out).startsWith('..') ? out : path.relative(root, out), ml: o.ml, cutoff: o.cutoff, tokenLimit: o.tokenLimit },
    referenceDate: o.today, split: 'dev',
    sources: taken.sources, selection: taken.selection,
    engine: { version: engineRun.version, storeVersion: engineRun.storeVersion, policyVersion: engineRun.policyVersion, reviewedOrgs: engineRun.reviewedOrgs, ...fingerprint },
    model: modelInfo || { name: MODEL, status: stages.embedding.status },
    node: process.version, platform: `${process.platform}-${process.arch}`,
    preprocessing: { id: PREPROCESSING, description: 'Embedding input only: whitespace runs collapsed to one space and trimmed. No masking. Originals and offsets unchanged.' },
    clustering: { method: 'agglomerative', linkage: 'average', metric: 'cosine distance (1 − cosine similarity of L2-normalized vectors)', cutoff: config.cutoff, sensitivity: config.sensitivity, tieBreak: 'lowest item index; items in message order, then start offset, then longer span first' },
    counts: { messages: taken.selection.messages, families: taken.selection.families, candidates: candidates.length, groups: grouped.groups.length, singletons: grouped.singletons.length, ungroupable: ungroupable.length },
    stages, cache, blockedRequests: blocked, outputs: {}
  };

  fs.mkdirSync(out, { recursive: true, mode: 0o700 });
  const findingsText = JSON.stringify(findings, null, 1) + '\n';
  const reportText = renderReport(findings, manifest);
  fs.writeFileSync(path.join(out, 'findings.json'), findingsText, { mode: 0o600 });
  fs.writeFileSync(path.join(out, 'report.md'), reportText, { mode: 0o600 });
  manifest.outputs = { 'findings.json': sha256(findingsText), 'report.md': sha256(reportText) };
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });
  log(`Embedding: ${stages.embedding.status} — ${stages.embedding.detail}`);
  log(`Groups: ${grouped.groups.length} · singletons: ${grouped.singletons.length} · ungrouped-only: ${ungroupable.length}`);
  log(`Wrote ${out}/findings.json, report.md, manifest.json${findings.demonstration ? ' (demonstration: no real-data findings)' : ''}`);
  return { manifest, findings, out, ok: check.ok };
}

module.exports = { runDiscovery, Refusal, DEFAULT_CUTOFF, TOOL_VERSION, localDate };
