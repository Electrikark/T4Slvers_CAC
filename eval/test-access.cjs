'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseCsv } = require('./csv.cjs');

const FIRST_TEST_DATE = '2026-10-19';
const RELEASE_FILES = [...new Set(require('./engine.cjs').FILES.concat([
  'src/assessment.js', 'eval/run.cjs', 'eval/engine.cjs', 'eval/test-access.cjs',
  'eval/metrics.cjs', 'eval/csv.cjs', 'eval/dataset.cjs', 'eval/dev-data.cjs',
  'eval/supplied-data.cjs', 'tests/eval-tests.cjs', 'tests/tier-cases.js',
  'scripts/build-assessment.cjs', 'eval/publish-test-result.cjs', 'package.json',
  'eval/exposed-elsewhere.cjs', 'adversarial/seeds.cjs', 'adversarial/known-failures.json',
  'tests/polite-wording-cases.js'
]))];
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const textFingerprint = text => digest(String(text).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase());

function recordDevExposure(root, records) {
  const file = path.join(root, 'eval/data/exposure-ledger.json');
  const prior = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { devIds: [], devFamilyIds: [], textHashes: [] };
  const ids = new Set(prior.devIds), groups = new Set(prior.devFamilyIds), hashes = new Set(prior.textHashes);
  for (const r of records) {
    ids.add(r.id); if (r.group_id) groups.add(r.group_id); hashes.add(textFingerprint(r.text));
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ devIds: [...ids].sort(), devFamilyIds: [...groups].sort(), textHashes: [...hashes].sort() }, null, 2) + '\n', { mode: 0o600 });
  return file;
}

function localDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now);
}

function checkSplit(split, now = new Date()) {
  if (split !== 'dev' && split !== 'test') throw new Error('Choose --split dev explicitly. The all split and an omitted split are disabled.');
  if (split === 'test' && localDate(now) < FIRST_TEST_DATE) throw new Error('Test evaluation is sealed until 2026-10-19 in America/Los_Angeles.');
}

function verifyTestRelease(root, input, now = new Date()) {
  checkSplit('test', now);
  const receiptPath = path.join(root, 'eval/results/test-evaluation-receipt.json');
  if (fs.existsSync(receiptPath)) throw new Error('The one test attempt is already reserved or used. Do not rerun it.');
  const releasePath = path.join(root, 'eval/data/test-release.json');
  if (!fs.existsSync(releasePath)) throw new Error('Test release is not ready: freeze the clean input and engine first.');
  const release = JSON.parse(fs.readFileSync(releasePath, 'utf8'));
  if (release.ready !== true || release.familyReviewComplete !== true || release.sourceAuditComplete !== true ||
      typeof release.approvedBy !== 'string' || !release.approvedBy.trim()) {
    throw new Error('Test release is not ready: independent family review and a named release approval are required.');
  }
  if (!release.input || path.resolve(root, release.input) !== path.resolve(input)) throw new Error('Test input differs from the approved frozen input.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(release.referenceDate || '') ||
      !Number.isFinite(Date.parse(release.referenceDate)) ||
      new Date(release.referenceDate).toISOString().slice(0, 10) !== release.referenceDate ||
      release.referenceDate > localDate(now)) throw new Error('Test release needs a valid reference date.');
  if (digest(fs.readFileSync(input)) !== release.sha256) throw new Error('Frozen test input changed.');
  const ledgerPath = path.join(root, 'eval/data/exposure-ledger.json');
  if (!fs.existsSync(ledgerPath) || digest(fs.readFileSync(ledgerPath)) !== release.exposureSha256) throw new Error('Dev-exposure ledger is missing or changed.');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const [header, ...cells] = parseCsv(fs.readFileSync(input, 'utf8'));
  const entries = cells.map(row => Object.fromEntries(header.map((h, i) => [h, row[i]]))).filter(r => r.split === 'test');
  if (!entries.length) throw new Error('The frozen test input has no test rows.');
  // Messages the rules were tuned or checked against outside eval/data (eval/exposed-elsewhere.cjs).
  const elsewhere = new Set(require('./exposed-elsewhere.cjs').exposedTexts().map(textFingerprint));
  for (const r of entries) {
    if (!r.group_id) throw new Error('Every test row needs a reviewed family ID.');
    if (ledger.devIds.includes(r.id) || ledger.devFamilyIds.includes(r.group_id) || ledger.textHashes.includes(textFingerprint(r.text))) {
      throw new Error('Test input contains previously dev material: ' + r.id);
    }
    if (elsewhere.has(textFingerprint(r.text))) {
      throw new Error('Test input contains a message already used by the rewrite tests or rule fixes: ' + r.id);
    }
  }
  const files = Object.entries(release.engineFiles || {});
  if (RELEASE_FILES.some(file => !release.engineFiles || !release.engineFiles[file])) throw new Error('Test engine fingerprint is incomplete.');
  for (const [file, expected] of files) {
    if (digest(fs.readFileSync(path.resolve(root, file))) !== expected) throw new Error('Frozen evaluation file changed: ' + file);
  }
  return { release, receiptPath };
}

function reserveTestRun(receiptPath, details) {
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  const fd = fs.openSync(receiptPath, 'wx');
  try { fs.writeFileSync(fd, JSON.stringify({ ...details, phase: 'started', startedUtc: new Date().toISOString() }, null, 2) + '\n'); }
  finally { fs.closeSync(fd); }
}

function finishTestRun(receiptPath, details) {
  const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  fs.writeFileSync(receiptPath, JSON.stringify({ ...receipt, ...details, phase: 'complete', finishedUtc: new Date().toISOString() }, null, 2) + '\n');
  fs.chmodSync(receiptPath, 0o444);
}

module.exports = { FIRST_TEST_DATE, RELEASE_FILES, localDate, checkSplit, textFingerprint, recordDevExposure, verifyTestRelease, reserveTestRun, finishTestRun };
