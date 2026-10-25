// Discovery tool: data boundary, exact spans, request coverage, local-only processing, fallbacks.
// Run: node discovery/tests/discovery-node.cjs        (add --no-browser to skip the Chromium checks)
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const FIXTURE = path.join(ROOT, 'discovery/fixtures/fictional-dev.csv');
const { runDiscovery, Refusal } = require('../lib/run.cjs');
const { sentenceUnits, buildCandidates } = require('../lib/candidates.cjs');
const { planWindows, cacheKey, prepare } = require('../lib/embed.cjs');
const { agglomerate, cut, adjustedRand } = require('../lib/cluster.cjs');
const { loadEngine } = require('../../eval/engine.cjs');
const shared = require('../review/shared.js');
const { fakeEmbedderFactory } = require('./helpers.cjs');

const SENTINELS = ['HELDOUT-SENTINEL', 'heldout-sentinel', 'SPANS-SPLIT-EXCLUDED', 'AMBIGUOUS-SPLIT-EXCLUDED'];
const TODAY = '2026-10-22';
const NO_BROWSER = process.argv.includes('--no-browser');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const tmp = name => fs.mkdtempSync(path.join(os.tmpdir(), 'discovery-' + name + '-'));
const walk = dir => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]) : [];

function spyEngine(log) {
  return (root, options) => {
    const real = loadEngine(root, options);
    return { ...real, analyze: (text, channel) => { log.push(text); return real.analyze(text, channel); } };
  };
}

async function run(name, extra = {}) {
  const out = path.join(tmp(name), 'report');
  const cacheDir = extra.cacheDir || path.join(tmp(name + '-cache'), 'cache');
  const result = await runDiscovery({ root: ROOT, inputs: [FIXTURE], split: 'dev', today: TODAY, out, cacheDir, quiet: true,
    embedderFactory: fakeEmbedderFactory(), ...extra });
  return { ...result, out, cacheDir };
}

const results = [];
async function test(name, fn) {
  try { await fn(); results.push([name, true]); console.log('PASS ' + name); }
  catch (err) { results.push([name, false]); console.log('FAIL ' + name + '\n  ' + (err.stack || err).toString().split('\n').slice(0, 6).join('\n  ')); }
}

(async () => {
  await test('Split isolation: held-out, ambiguous and split-spanning rows never reach the engine, embedder, cache or outputs', async () => {
    const engineLog = [], embedLog = { embedded: [], counted: [] };
    const r = await run('split', { engineLoader: spyEngine(engineLog), embedderFactory: fakeEmbedderFactory(embedLog) });
    const leaks = s => SENTINELS.filter(x => String(s).includes(x));
    assert.ok(engineLog.length > 0, 'engine ran');
    assert.deepEqual(engineLog.flatMap(leaks), [], 'engine saw excluded text');
    assert.deepEqual(embedLog.embedded.concat(embedLog.counted).flatMap(leaks), [], 'embedder saw excluded text');
    for (const file of walk(r.out).concat(walk(r.cacheDir))) assert.deepEqual(leaks(fs.readFileSync(file, 'utf8')), [], 'leak in ' + file);
    const ids = r.manifest.selection.selectedIds;
    for (const id of ['fx-test-1', 'fx-test-2', 'fx-span-test-1', 'fx-span-dev-1', 'fx-ambiguous-1', 'fx-dup-dev-1', 'fx-dup-test-1']) assert.ok(!ids.includes(id), id + ' selected');
    assert.ok(ids.includes('fx-courier-1') && ids.includes('fx-negated-1'));
    // Excluded rows are counted with a reason, never listed by ID.
    const excluded = r.manifest.sources[0].excluded;
    assert.equal(excluded.nonDev, 4);
    assert.equal(excluded.familySpansSplits, 1);
    assert.equal(excluded.duplicatesNonDevText, 1);
    assert.equal(excluded.missingSplit, 1);
    assert.ok(!JSON.stringify(r.manifest.sources).includes('fx-test'));
    for (const m of r.findings.messages) assert.equal(m.split, 'dev');
  });

  await test('Only --split dev is accepted, and ineligible sources are refused with a reason', async () => {
    for (const split of ['test', 'all', undefined, 'dev,test']) {
      await assert.rejects(runDiscovery({ root: ROOT, inputs: [FIXTURE], split, today: TODAY, out: path.join(tmp('refuse'), 'r'), quiet: true }), Refusal);
    }
    const legacy = path.join(tmp('legacy'), 'messages.csv');
    fs.copyFileSync(path.join(ROOT, 'eval/messages.template.csv'), legacy);
    await assert.rejects(runDiscovery({ root: ROOT, inputs: [legacy], split: 'dev', today: TODAY, out: path.join(tmp('refuse'), 'r'), quiet: true }), /No eligibility rule/);
    await assert.rejects(runDiscovery({ root: ROOT, inputs: [path.join(ROOT, 'experiments/help-search/dev-challenge.json')], split: 'dev', today: TODAY, out: path.join(tmp('refuse'), 'r'), quiet: true }), /No eligibility rule/);
    const cli = spawnSync(process.execPath, [path.join(ROOT, 'discovery/cli.cjs'), '--input', FIXTURE, '--split', 'test', '--today', TODAY, '--out', path.join(tmp('cli'), 'r')], { encoding: 'utf8' });
    assert.equal(cli.status, 2);
    assert.match(cli.stderr, /dev/);
    const noDate = spawnSync(process.execPath, [path.join(ROOT, 'discovery/cli.cjs'), '--input', FIXTURE, '--split', 'dev', '--out', path.join(tmp('cli'), 'r')], { encoding: 'utf8' });
    assert.equal(noDate.status, 2);
    assert.match(noDate.stderr, /--today/);
  });

  await test('An eval/data source records dev exposure through the existing ledger, and only dev rows', async () => {
    const fake = tmp('repo');
    for (const dir of ['js', 'data', 'src', 'adversarial', 'eval']) fs.cpSync(path.join(ROOT, dir), path.join(fake, dir), { recursive: true });
    fs.mkdirSync(path.join(fake, 'tests'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'tests/polite-wording-cases.js'), path.join(fake, 'tests/polite-wording-cases.js'));
    fs.rmSync(path.join(fake, 'eval/data'), { recursive: true, force: true });
    fs.mkdirSync(path.join(fake, 'eval/data'), { recursive: true });
    const { toCsv } = require('../../eval/csv.cjs');
    const { HEADER } = require('../../eval/dev-data.cjs');
    const rows = [
      { id: 'd1', group_id: 'g1', split: 'dev', label: 'fraud', expected_findings: 'T1-GIFT', category: 'gift_card', channel: 'sms', source: 'synthetic', text: 'Buy gift cards and send me the codes now.' },
      { id: 'd2', group_id: 'g2', split: 'dev', label: 'fraud', expected_findings: '', category: 'family', channel: 'sms', source: 'public_example', text: 'Put cash in a box for the courier tonight.' },
      { id: 't1', group_id: 'g3', split: 'test', label: 'fraud', expected_findings: 'T1-WIRE', category: 'bank_login', channel: 'sms', source: 'public_example', text: 'HELDOUT-SENTINEL-LEDGER wire the money today.' }
    ];
    const input = path.join(fake, 'eval/data/dev_messages.csv');
    fs.writeFileSync(input, toCsv(HEADER, rows));
    const out = path.join(tmp('ledger-out'), 'r');
    const r = await runDiscovery({ root: fake, inputs: [input], split: 'dev', today: TODAY, out, quiet: true, embedderFactory: fakeEmbedderFactory(), cacheDir: path.join(tmp('c'), 'c') });
    const ledger = JSON.parse(fs.readFileSync(path.join(fake, 'eval/data/exposure-ledger.json'), 'utf8'));
    assert.deepEqual(ledger.devIds, ['d1', 'd2']);
    assert.deepEqual(ledger.devFamilyIds, ['g1', 'g2']);
    assert.ok(!JSON.stringify(ledger).includes('t1'));
    assert.equal(r.manifest.sources[0].exposure.recorded, true);
    // A fraud row without a Tier 1 code is kept: the discovery schema does not require one.
    const d2 = r.findings.messages.find(m => m.messageId === 'd2');
    assert.deepEqual(d2.suppliedTier1, []);
    assert.equal(d2.provenance.bucket, 'real');
    assert.equal(r.findings.messages.find(m => m.messageId === 'd1').provenance.bucket, 'synthetic');
    // The fixture run never touches the real ledger.
    assert.ok(!fs.existsSync(path.join(ROOT, 'eval/data/exposure-ledger.json')) ||
      !fs.readFileSync(path.join(ROOT, 'eval/data/exposure-ledger.json'), 'utf8').includes('fx-'));
  });

  await test('Exact quotes survive Unicode, CRLF, emoji, multiple requests and window boundaries', async () => {
    const r = await run('spans', { tokenLimit: 48 });
    const byId = new Map(r.findings.messages.map(m => [m.messageId, m]));
    let windows = 0;
    for (const c of r.findings.candidates) {
      const text = byId.get(c.messageId).text;
      assert.equal(text.slice(c.start, c.end), c.quote, c.candidateId);
      assert.equal(text.slice(c.context.start, c.context.end), c.context.quote);
      assert.ok(c.context.start <= c.start && c.context.end >= c.end);
      for (const w of c.embedding.windows) { assert.equal(text.slice(w.start, w.end), w.quote); windows++; }
    }
    assert.ok(windows > 0, 'the small token limit produced windows');
    const crlf = r.findings.candidates.filter(c => c.messageId === 'fx-crlf-unicode-1' && c.methods.includes('line'));
    assert.deepEqual(crlf.map(c => c.quote), ['Héllo Grandma \u{1F44B}', 'It is me, Sam.', 'Please don’t tell Mom.', 'Can you buy a prepaid card at the pharmacy and text me the number on the back?']);
    // Surrogate pairs are never split.
    for (const c of r.findings.candidates) assert.ok(!/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/.test(c.quote));
    const units = sentenceUnits('First one.  Second one!\r\n\r\nThird… fourth?');
    assert.deepEqual(units.map(u => u.kind), ['sentence', 'sentence', 'sentence', 'sentence']);
    assert.deepEqual(units.map(u => 'First one.  Second one!\r\n\r\nThird… fourth?'.slice(u.start, u.end)), ['First one.', 'Second one!', 'Third…', 'fourth?']);
  });

  await test('A message with one covered request still exposes the second request for review', async () => {
    // Unit: one Tier 1 span over the first sentence only.
    const text = 'Buy two gift cards and send us the codes. Also read us the passcode we sent.';
    const message = { messageId: 'm', familyId: 'f', text, engine: { tier1: [{ ruleId: 'T1-GIFT', status: 'established', span: { start: 0, end: 40, quote: text.slice(0, 40) } }], tier2: [], unresolved: [], evidence: [] } };
    const cands = buildCandidates(message);
    const second = cands.find(c => c.quote === 'Also read us the passcode we sent.');
    assert.ok(second, 'second request is a candidate');
    assert.equal(second.coverage.uncovered, true);
    assert.equal(cands.find(c => c.quote === 'Buy two gift cards and send us the codes.').coverage.uncovered, false);
    // Clause candidates expose a second request inside one sentence.
    const joined = buildCandidates({ ...message, text: 'Buy two gift cards and then read us the passcode we sent.', engine: { tier1: [], tier2: [], unresolved: [], evidence: [] } });
    assert.ok(joined.some(c => c.methods.includes('clause') && c.quote === 'and then read us the passcode we sent.'));
    // End to end: the fixture's second request is a candidate whatever the engine decided.
    const r = await run('coverage');
    const m = r.findings.messages.find(x => x.messageId === 'fx-gift-code-1');
    assert.equal(m.engine.assessment, 'suspicious');
    const c = r.findings.candidates.find(x => x.messageId === 'fx-gift-code-1' && x.quote === 'Also read us the one-time passcode we just sent you.');
    assert.ok(c, 'second request present');
    const t1 = m.engine.tier1.filter(f => f.span);
    assert.equal(c.coverage.uncovered, !t1.some(f => f.span.start < c.end && f.span.end > c.start));
  });

  await test('Negated, reported and legitimate requests stay as controls; nothing labels them fraud', async () => {
    const r = await run('controls');
    for (const id of ['fx-negated-1', 'fx-reported-1', 'fx-legit-courier-1', 'fx-legit-gift-1']) {
      const m = r.findings.messages.find(x => x.messageId === id);
      assert.equal(m.suppliedLabel, 'legit');
      assert.ok(r.findings.candidates.some(c => c.messageId === id));
    }
    const unl = r.findings.messages.find(x => x.messageId === 'fx-unlabeled-1');
    assert.equal(unl.suppliedLabel, 'unlabeled');
    // No field in the output carries a model-made label.
    const json = JSON.stringify(r.findings);
    assert.ok(!/"(predicted|inferred|modelLabel|fraudProbability)"/.test(json));
    const n = r.findings.neighbors[r.findings.candidates.find(c => c.messageId === 'fx-courier-1' && c.methods.includes('sentence')).candidateId] || [];
    for (const x of n) assert.equal(r.findings.messages.find(m => m.messageId === x.messageId).suppliedLabel, 'legit');
  });

  await test('Long input is windowed or flagged; nothing is silently lost', async () => {
    const r = await run('long', { tokenLimit: 64 });
    // A multi-sentence message's full text stays as review context; its buried request is a span.
    const longFull = r.findings.candidates.find(c => c.messageId === 'fx-long-1' && c.methods.includes('full_message'));
    assert.equal(longFull.embedding.status, 'context_only');
    assert.ok(r.findings.ungroupable.includes(longFull.candidateId));
    assert.ok(r.findings.candidates.some(c => c.messageId === 'fx-long-1' && /prepaid debit card/.test(c.quote) && c.methods.includes('sentence')));
    // A single run-on sentence over the limit is windowed with exact offsets.
    const c = r.findings.candidates.find(x => x.messageId === 'fx-runon-1' && x.methods.includes('full_message'));
    assert.ok(c.methods.includes('sentence'));
    assert.equal(c.embedding.status, 'windowed');
    assert.equal(c.embedding.windows[0].start, c.start);
    assert.equal(c.embedding.windows[c.embedding.windows.length - 1].end, c.end);
    for (let i = 1; i < c.embedding.windows.length; i++) {
      assert.ok(c.embedding.windows[i].start < c.embedding.windows[i - 1].end, 'windows overlap');
      assert.ok(c.embedding.windows[i].start > c.embedding.windows[i - 1].start, 'windows advance');
    }
    for (const w of c.embedding.windows) assert.ok(w.tokens <= 64);
    // Planner: a single unbroken word longer than the limit is cut at code points, never dropped.
    const blob = 'x'.repeat(5000);
    const plan = await planWindows(blob, 0, blob.length, async ts => ts.map(t => Math.ceil(t.length / 4) + 2), { tokenLimit: 64, overlapTokens: 8, maxWindows: 1000 });
    assert.equal(plan.status, 'windowed');
    assert.equal(plan.windows[0].start, 0);
    assert.equal(plan.windows[plan.windows.length - 1].end, 5000);
    const over = await planWindows(blob, 0, blob.length, async ts => ts.map(t => Math.ceil(t.length / 4) + 2), { tokenLimit: 64, overlapTokens: 8, maxWindows: 3 });
    assert.equal(over.status, 'too_long');
    // Beyond the engine's 20,000 characters: flagged, and every candidate is still present.
    const huge = 'Please call the number below. '.repeat(800) + 'Then buy gift cards and send the codes.';
    const message = { messageId: 'h', familyId: 'h', text: huge, flags: [], engine: { tier1: [], tier2: [], unresolved: [], evidence: [] } };
    const cands = buildCandidates(message);
    assert.ok(cands.some(x => x.quote === 'Then buy gift cards and send the codes.'));
    assert.ok(cands.some(x => x.methods.includes('full_message') && x.end === huge.length));
  });

  await test('Missing model or inference error: ML marked unavailable, ungrouped queue still complete', async () => {
    const missing = await run('nomodel', { embedderFactory: undefined, modelDir: 'discovery/tests/no-such-model' });
    assert.equal(missing.manifest.stages.embedding.status, 'unavailable');
    assert.match(missing.manifest.stages.embedding.detail, /model/i);
    assert.equal(missing.findings.groups.length, 0);
    assert.equal(missing.findings.ungroupable.length, missing.findings.candidates.length);
    assert.ok(missing.findings.candidates.length > 20);
    assert.match(fs.readFileSync(path.join(missing.out, 'report.md'), 'utf8'), /unavailable/i);
    const failing = await run('inference', { embedderFactory: fakeEmbedderFactory(undefined, { failAfter: 5 }) });
    assert.equal(failing.manifest.stages.embedding.status, 'unavailable');
    assert.match(failing.manifest.stages.embedding.detail, /injected inference failure/);
    assert.equal(failing.findings.ungroupable.length, failing.findings.candidates.length);
    assert.equal(shared.validateFindings(failing.findings).ok, true);
    const off = await run('noml', { ml: false });
    assert.equal(off.manifest.stages.embedding.status, 'skipped');
  });

  await test('Fixed inputs and configuration give identical findings; the cache is keyed by every input', async () => {
    const cacheDir = path.join(tmp('det-cache'), 'cache');
    const a = await run('det-a', { cacheDir });
    const b = await run('det-b', { cacheDir });
    assert.equal(fs.readFileSync(path.join(a.out, 'findings.json'), 'utf8'), fs.readFileSync(path.join(b.out, 'findings.json'), 'utf8'));
    assert.equal(a.manifest.runId, b.manifest.runId);
    assert.equal(b.manifest.cache.misses, 0);
    assert.ok(b.manifest.cache.hits > 0);
    const base = { assetsDigest: 'a', tokenizerDigest: 't', runtime: { transformers: '4.3.0', onnxruntime: 'x', browser: 'b' } };
    const k = cacheKey(base, { tokenLimit: 256 }, 'hello world');
    assert.notEqual(k, cacheKey({ ...base, assetsDigest: 'b' }, { tokenLimit: 256 }, 'hello world'));
    assert.notEqual(k, cacheKey({ ...base, tokenizerDigest: 'u' }, { tokenLimit: 256 }, 'hello world'));
    assert.notEqual(k, cacheKey({ ...base, runtime: { ...base.runtime, browser: 'c' } }, { tokenLimit: 256 }, 'hello world'));
    assert.notEqual(k, cacheKey(base, { tokenLimit: 128 }, 'hello world'));
    assert.notEqual(k, cacheKey(base, { tokenLimit: 256 }, 'hello  world'));
    assert.equal(prepare('  a \r\n b\t'), 'a b');
    // A corrupted entry is rejected and recomputed, not trusted.
    const file = walk(cacheDir)[0];
    fs.writeFileSync(file, '{"key":"wrong","vector":[1]}');
    const c = await run('det-c', { cacheDir });
    assert.equal(c.manifest.cache.rejected, 1);
    assert.equal(fs.readFileSync(path.join(c.out, 'findings.json'), 'utf8'), fs.readFileSync(path.join(a.out, 'findings.json'), 'utf8'));
    // Cache entries hold a key and a vector, never text.
    for (const f of walk(cacheDir)) assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(f, 'utf8'))).sort(), ['dims', 'key', 'vector']);
  });

  await test('Clustering is deterministic, keeps singletons, and every candidate stays reachable', async () => {
    const v = [[1, 0], [1, 0], [0, 1], [0.6, 0.8], [-1, 0]].map(x => { const n = Math.hypot(...x); return x.map(y => y / n); });
    const merges = agglomerate(v);
    assert.deepEqual(cut(v.length, merges, 0.05), cut(v.length, agglomerate(v), 0.05));
    const labels = cut(v.length, merges, 0.05);
    assert.equal(labels[0], labels[1]);
    assert.equal(new Set(labels).size, 4, 'three singletons and one pair');
    for (let i = 1; i < merges.length; i++) assert.ok(merges[i].height >= merges[i - 1].height - 1e-12, 'heights are monotone');
    assert.equal(adjustedRand([0, 0, 1, 1], [5, 5, 7, 7]), 1);
    const r = await run('reach');
    const f = r.findings;
    const seen = new Map();
    for (const g of f.groups) for (const id of g.members) seen.set(id, (seen.get(id) || 0) + 1);
    for (const id of f.singletons.concat(f.ungroupable)) seen.set(id, (seen.get(id) || 0) + 1);
    for (const c of f.candidates) assert.equal(seen.get(c.candidateId), 1, c.candidateId);
    assert.ok(f.sensitivity.length >= 3);
    for (const g of f.groups) assert.match(g.provisionalName, /provisional/i);
  });

  await test('discovery:check accepts a valid report and rejects tampered, malformed or mismatched ones', async () => {
    const r = await run('check');
    const check = args => spawnSync(process.execPath, [path.join(ROOT, 'discovery/check.cjs'), ...args], { encoding: 'utf8' });
    assert.equal(check(['--report', r.out]).status, 0);
    const f = JSON.parse(fs.readFileSync(path.join(r.out, 'findings.json'), 'utf8'));
    const bad = tmp('bad');
    fs.cpSync(r.out, bad, { recursive: true });
    f.candidates[3].quote += 'x';
    fs.writeFileSync(path.join(bad, 'findings.json'), JSON.stringify(f));
    const res = check(['--report', bad]);
    assert.equal(res.status, 1);
    assert.match(res.stdout + res.stderr, /quote|digest/);
    fs.writeFileSync(path.join(bad, 'findings.json'), '{not json');
    assert.equal(check(['--report', bad]).status, 1);
    assert.equal(shared.validateFindings({ schema: 'x' }).ok, false);
    assert.equal(shared.validateFindings(null).ok, false);
  });

  await test('Review exports validate, keep human decisions separate, and produce traceable issue drafts', async () => {
    const r = await run('review');
    const f = r.findings;
    const c = f.candidates.find(x => x.messageId === 'fx-courier-1' && x.methods.includes('sentence') && /cash/.test(x.quote));
    const m = f.messages.find(x => x.messageId === c.messageId);
    const review = shared.emptyReview(f.runId);
    review.decisions[c.candidateId] = shared.decision({ reviewState: 'confirmed', outcome: 'missing_concept', evidence: 'Cash handed to a courier at the door; no Tier 1 rule covers it.', nextAction: 'Draft a rule proposal with controls.', knownBeforeRun: 'no', mode: 'ungrouped', updatedAt: '2026-10-24T00:00:00.000Z' });
    const s = c.start + 2;
    review.decisions[f.candidates[0].candidateId] = shared.decision({ reviewState: 'adjusted', adjusted: { start: s, end: c.end, quote: 'wrong' }, mode: 'grouped' });
    assert.equal(shared.validateReview(review, f).ok, false, 'adjusted quote must reconstruct');
    delete review.decisions[f.candidates[0].candidateId];
    assert.equal(shared.validateReview(review, f).ok, true, shared.validateReview(review, f).errors.join('; '));
    const bogus = JSON.parse(JSON.stringify(review));
    bogus.decisions[c.candidateId].outcome = 'new_scam_type';
    assert.equal(shared.validateReview(bogus, f).ok, false);
    const draft = shared.issueDraft(review.decisions[c.candidateId], c, m);
    for (const heading of ['Exact request', 'Current behavior', 'Intended rule scope', 'Legitimate control', 'Negated control', 'Reported control', 'Unknowns']) assert.ok(draft.includes(heading), heading);
    assert.ok(draft.includes(c.candidateId) && draft.includes(m.familyId));
    const summary = shared.summarizeReview(review, f);
    assert.equal(summary.byOutcome.missing_concept.families.synthetic, 1);
    assert.equal(summary.byOutcome.missing_concept.families.real, 0);
    assert.equal(summary.mlBenefit, 'unproven');
    assert.equal(summary.reviewer, '');
    // The CLI writes the summary and drafts next to the report.
    const file = path.join(tmp('rev'), 'review.json');
    fs.writeFileSync(file, JSON.stringify(review));
    const res = spawnSync(process.execPath, [path.join(ROOT, 'discovery/check.cjs'), '--report', r.out, '--review', file], { encoding: 'utf8' });
    assert.equal(res.status, 0, res.stdout + res.stderr);
    assert.match(fs.readFileSync(path.join(r.out, 'issue-drafts.md'), 'utf8'), /Possible missing risk concept/);
    assert.match(fs.readFileSync(path.join(r.out, 'review-summary.md'), 'utf8'), /not recorded/);
  });

  await test('Reports are refused in tracked repository paths; output is git-ignored by default', async () => {
    await assert.rejects(runDiscovery({ root: ROOT, inputs: [FIXTURE], split: 'dev', today: TODAY, out: path.join(ROOT, 'discovery/lib/out-here'), quiet: true, embedderFactory: fakeEmbedderFactory() }), /ignored/);
    for (const file of ['discovery/out/x/findings.json', 'discovery/.cache/embeddings/ab/x.json', 'discovery/out/review-run.json']) {
      assert.equal(spawnSync('git', ['check-ignore', '-q', file], { cwd: ROOT }).status, 0, file);
    }
  });

  await test('The production pages and verdict path do not depend on discovery, and a run changes no engine file', async () => {
    const prod = ['js', 'src', 'data', 'scripts', 'eval', 'css'].flatMap(d => walk(path.join(ROOT, d)))
      .concat(fs.readdirSync(ROOT).filter(n => n.endsWith('.html')).map(n => path.join(ROOT, n)));
    for (const file of prod) {
      if (!/\.(js|cjs|mjs|html|css)$/.test(file)) continue;
      assert.ok(!/discovery\//.test(fs.readFileSync(file, 'utf8')), path.relative(ROOT, file) + ' references discovery/');
    }
    const files = require('../../eval/engine.cjs').FILES.concat(['src/assessment.js']);
    const before = files.map(f => sha(fs.readFileSync(path.join(ROOT, f))));
    await run('noedit');
    assert.deepEqual(files.map(f => sha(fs.readFileSync(path.join(ROOT, f)))), before);
    // The discovery code itself makes no network calls of its own.
    for (const file of walk(path.join(ROOT, 'discovery/lib')).concat(walk(path.join(ROOT, 'discovery/review')))) {
      const src = fs.readFileSync(file, 'utf8');
      assert.ok(!/\b(XMLHttpRequest|WebSocket|sendBeacon|navigator\.sendBeacon)\b/.test(src), file);
      assert.ok(!/fetch\(\s*['"`]https?:/.test(src), file);
    }
  });

  if (!NO_BROWSER) {
    const { createChromiumEmbedder } = require('../lib/embed.cjs');
    await test('Local model in Chromium: offline, blocked external requests recorded, traversal refused, repeatable', async () => {
      const e = await createChromiumEmbedder({ root: ROOT });
      try {
        const probe = await e.page.evaluate(async () => {
          const out = {};
          for (const u of ['https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/config.json', location.origin + '/vendor/minilm/../../eval/engine.cjs', location.origin + '/eval/engine.cjs']) {
            try { const r = await fetch(u); out[u] = r.status; } catch (err) { out[u] = 'blocked'; }
          }
          return out;
        });
        assert.equal(Object.values(probe).filter(v => v === 200).length, 0, JSON.stringify(probe));
        assert.ok(e.blocked.some(u => u.startsWith('https://huggingface.co/')));
        const [a] = await e.embed(['Put the cash in an envelope for the courier.']);
        const [b] = await e.embed(['Put the cash in an envelope for the courier.']);
        assert.equal(a.length, 384);
        assert.deepEqual(a, b);
        assert.ok(Math.abs(Math.hypot(...a) - 1) < 1e-4);
        const [n] = await e.countTokens(['hello world']);
        assert.equal(n, 4);
        await assert.rejects(e.embed(['word '.repeat(400)]), /token limit/);
      } finally { await e.close(); }
      const real = await runDiscovery({ root: ROOT, inputs: [FIXTURE], split: 'dev', today: TODAY, out: path.join(tmp('real'), 'r'), cacheDir: path.join(tmp('real-cache'), 'c'), quiet: true });
      assert.equal(real.manifest.stages.embedding.status, 'ok');
      assert.deepEqual(real.manifest.blockedRequests, []);
      assert.match(real.manifest.model.runtime.browser, /\d+\./);
    });
  }

  const failed = results.filter(r => !r[1]);
  console.log(`Discovery: ${results.length - failed.length}/${results.length} passed`);
  process.exitCode = failed.length ? 1 : 0;
})();
