// Checks the field-evaluation tool itself: CSV reading, validation, splits, rates and outcomes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseCsv, toCsv } = require('../eval/csv.cjs');
const M = require('../eval/metrics.cjs');
const { loadEngine, FILES } = require('../eval/engine.cjs');

const rows = [];
function test(name, fn) {
  try { fn(); rows.push([name, true]); } catch (err) { rows.push([name, false, err.message]); }
}
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.001, `${a} is not ${b}`);
const header = 'id,label,channel,source,text\n';

test('E1 CSV: quotes, doubled quotes, commas, line breaks, CRLF and a byte-order mark', () => {
  const csv = '﻿id,text\r\na,"Hello, ""Grandma""\r\nline two"\r\nb,plain\r\n\r\n';
  assert.deepEqual(parseCsv(csv), [['id', 'text'], ['a', 'Hello, "Grandma"\r\nline two'], ['b', 'plain']]);
});
test('E2 CSV: written files read back unchanged', () => {
  const records = [{ id: 'x', text: 'a, "b"\nc' }, { id: 'y', text: ' padded ' }];
  const back = parseCsv(toCsv(['id', 'text'], records));
  assert.deepEqual(back.slice(1), [['x', 'a, "b"\nc'], ['y', ' padded ']]);
});
test('E3 CSV: an unclosed quote is an error, not silent data loss', () => {
  assert.throws(() => parseCsv('id,text\na,"never closed'));
});
test('E4 Wilson ranges match published values', () => {
  const half = M.wilson(5, 10); near(half.low, 0.2366); near(half.high, 0.7634);
  const none = M.wilson(0, 20); near(none.low, 0); near(none.high, 0.1611);
  const all = M.wilson(20, 20); near(all.low, 0.8389); near(all.high, 1);
  assert.equal(M.wilson(0, 0), null);
});
test('E5 Validation names every bad row', () => {
  const csv = header + 'a,fraud,text,FTC page,one\na,maybe,sms,,two\nc,legit,email,bank app,one\nd,legit,text,inbox,\n';
  const { errors } = M.readMessages(parseCsv(csv));
  ['id repeats', 'label must be', 'channel must be', 'source is empty', 'same text as row', 'text is empty']
    .forEach(part => assert.ok(errors.some(e => e.includes(part)), 'missing error: ' + part));
});
test('E6 Missing columns stop the run', () => {
  assert.match(M.readMessages(parseCsv('id,label,text\na,fraud,x\n')).errors[0], /Missing column\(s\): channel, source/);
});
test('E7 Fictional template rows are skipped, never counted', () => {
  const template = fs.readFileSync(path.join(__dirname, '../eval/messages.template.csv'), 'utf8');
  const result = M.readMessages(parseCsv(template));
  assert.deepEqual([result.messages.length, result.skipped, result.errors], [0, 3, []]);
});
test('E8 Automatic split is stable and close to 30% test', () => {
  assert.equal(M.autoSplit('ftc-toll-03'), M.autoSplit('ftc-toll-03'));
  const ids = Array.from({ length: 1000 }, (_, i) => 'msg-' + i);
  const share = ids.filter(id => M.autoSplit(id) === 'test').length / ids.length;
  assert.ok(share > 0.25 && share < 0.35, 'test share ' + share);
  const set = M.readMessages(parseCsv(header.replace('text\n', 'split,text\n') + 'a,fraud,text,FTC,dev,x\n')).messages;
  assert.equal(set[0].split, 'dev', 'a chosen split is kept');
});
test('E9 Outcomes: Details Match on fraud is false reassurance', () => {
  assert.equal(M.outcomeOf('fraud', 'details_match'), 'REASSURED');
  assert.equal(M.outcomeOf('fraud', 'suspicious'), 'caught');
  assert.equal(M.outcomeOf('legit', 'suspicious'), 'FALSE_ALARM');
  assert.equal(M.outcomeOf('legit', 'insufficient_evidence'), 'paused');
});
test('E10 Counts and rates from stubbed results', () => {
  const messages = M.readMessages(parseCsv(header +
    'f1,fraud,text,s,a\nf2,fraud,text,s,b\nf3,fraud,text,s,c\nl1,legit,text,s,d\nl2,legit,text,s,e\nl3,legit,text,s,w\n')).messages;
  const answers = { a: 'suspicious', b: 'insufficient_evidence', c: 'details_match', d: 'suspicious', e: 'details_match', w: 'insufficient_evidence' };
  const stub = text => ({ assessment: answers[text], trace: { blockedBy: [] }, requestRisk: { level: text === 'w' ? 'high' : 'none' },
    evidence: { findings: answers[text] === 'suspicious' ? [{ ruleId: 'T1-GIFT', tier: 1, status: 'established' }] : [] } });
  const results = M.judge(messages, stub);
  const t = M.tally(results);
  assert.deepEqual([t.fraud.suspicious, t.fraud.insufficient, t.fraud.match, t.legit.suspicious, t.legit.match], [1, 1, 1, 1, 1]);
  near(t.rates.caught.rate, 1 / 3); near(t.rates.paused.rate, 2 / 3); near(t.rates.reassured.rate, 1 / 3);
  near(t.rates.falseAlarm.rate, 1 / 3);
  // A strong warning on an honest message counts as alarming, even without the Suspicious label.
  assert.equal(t.legit.warnedOnly, 1); near(t.rates.alarmed.rate, 2 / 3);
  assert.deepEqual(M.ruleCounts(results), [{ rule: 'T1-GIFT', fraud: 1, legit: 1 }]);
});
test('E11 The real engine and list load, and report how many records are reviewed', () => {
  // The same engine files as the page, in the same order, so the evaluation measures the app.
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const pageFiles = [...html.matchAll(/<script defer src="([^"]+)"/g)].map(m => m[1])
    .filter(f => !['js/selfCheck.js', 'js/mockData.js', 'js/annotate.js', 'js/app.js'].includes(f));
  assert.deepEqual(FILES, pageFiles);
  const loaded = loadEngine();
  assert.equal(loaded.analyze('Grandma, please buy 3 Apple gift cards and send me the codes.', 'text').assessment, 'suspicious');
  assert.equal(loaded.analyze('USPS: Your package is out for delivery. Track it at https://tools.usps.com/go/TrackConfirmAction', 'text').claimedIdentity, 'USPS');
  // With no review on any record, nothing is trusted.
  if (!loaded.store.orgs.some(o => o.humanReview || o.contacts)) assert.equal(loaded.reviewedOrgs, 0);
});
test('E12 The command runs end to end, and --strict passes when no fraud gets Details Match', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tfs-eval-'));
  const input = path.join(dir, 'messages.csv');
  fs.writeFileSync(input, 'id,label,channel,source,split,text\n' + 'g1,fraud,text,unit test,dev,"Grandma, please buy 3 Apple gift cards and send me the codes."\n' +
    'u1,legit,text,unit test,dev,USPS: Your package is out for delivery. Track it at https://tools.usps.com/go/TrackConfirmAction\n');
  const { spawnSync } = require('node:child_process');
  const run = args => spawnSync(process.execPath, [path.join(__dirname, '../eval/run.cjs'), '--input', input, '--out', dir].concat(args), { encoding: 'utf8' });
  const ok = run(['--split', 'dev', '--strict']);
  assert.equal(ok.status, 0, ok.stderr);
  const report = fs.readFileSync(path.join(dir, 'report.md'), 'utf8');
  assert.match(report, /Fraud given Details Match \(false reassurance; must be 0\):\*\* 0\/1/);
  assert.equal(parseCsv(fs.readFileSync(path.join(dir, 'results.csv'), 'utf8')).length, 3);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('E13 Dev selection never calls the engine for test rows', () => {
  const { selectMessages } = require('../eval/run.cjs');
  const seen = [];
  const inputs = [{ id: 'd', text: 'dev text', channel: 'text', split: 'dev', label: 'fraud' },
    { id: 't', text: 'held-out text', channel: 'text', split: 'test', label: 'fraud' }];
  const chosen = selectMessages(inputs, 'dev');
  M.judge(chosen, text => { seen.push(text); return { assessment: 'insufficient_evidence', evidence: { findings: [] }, trace: { blockedBy: [] } }; });
  assert.deepEqual(seen, ['dev text']);
  assert.deepEqual(chosen.map(r => r.id), ['d']);
});
test('E14 Protocol validation rejects empty splits, mixed groups and missing expected codes', () => {
  const { HEADER, validateDataset } = require('../eval/dataset.cjs');
  const record = ['x', 'g-01', 'fraud', 'text', 'code', 'authored test scenario', '2026-10-16', 'dev', 'T1-CODE', 'synthetic', 'Send me your code.'];
  const good = [HEADER, record];
  assert.deepEqual(validateDataset(good, 0).errors, []);
  for (const [index, value, issue] of [[7, '', 'split must'], [8, '', 'fraud needs'], [6, '2026-02-30', 'invalid collection']]) {
    const bad = record.slice(); bad[index] = value;
    assert.ok(validateDataset([HEADER, bad], 0).errors.some(e => e.includes(issue)));
  }
  const peer = record.slice(); peer[0] = 'y'; peer[7] = 'test'; peer[10] = 'Read me your password.';
  assert.ok(validateDataset([HEADER, record, peer], 0).errors.some(e => e.includes('group spans splits')));
});
test('E15 A changed locked test row is refused', () => {
  const { HEADER, digest, verifyLock } = require('../eval/dataset.cjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tfs-lock-'));
  try {
    const input = path.join(dir, 'messages.csv');
    const row = { id: 't', group_id: 'g', split: 'test', label: 'fraud', channel: 'text', category: 'code', source: 'authored test', collected: '2026-10-16', expected_findings: 'T1-CODE', notes: 'synthetic', text: 'Send me your code.' };
    const bytes = toCsv(HEADER, [row]);
    fs.writeFileSync(input, bytes); fs.writeFileSync(path.join(dir, 'locked.csv'), bytes);
    fs.writeFileSync(path.join(dir, 'messages-lock.json'), JSON.stringify({ file: 'locked.csv', sha256: digest(bytes), test_sha256: digest(bytes) }));
    verifyLock(input);
    fs.writeFileSync(input, toCsv(HEADER, [{ ...row, text: 'Changed text.' }]));
    assert.throws(() => verifyLock(input), /test rows changed/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('E16 Revised dev fields normalize without changing expected labels', () => {
  const { HEADER, readDevData } = require('../eval/dev-data.cjs');
  const base = ['M001', 'G-code-01', 'dev', 'fraud', 'T1-CODE', 'code', 'sms', 'synthetic', 'Forward me your password.'];
  const good = readDevData([HEADER, base]);
  assert.deepEqual(good.errors, []);
  assert.equal(good.records[0].channel, 'text');
  assert.equal(good.records[0].expected_findings, 'T1-CODE');
  const legit = base.slice(); legit[3] = 'legit'; legit[4] = 'none';
  assert.equal(readDevData([HEADER, legit]).records[0].expected_findings, '');
  const empty = base.slice(); empty[4] = '';
  assert.ok(readDevData([HEADER, empty]).errors.length);
});
test('E17 Failure order A to E and full expected-code coverage', () => {
  const { classify } = require('../eval/failures.cjs');
  assert.equal(classify({ label: 'fraud', outcome: 'REASSURED' }, 'T1-CODE'), 'A');
  assert.equal(classify({ label: 'fraud', outcome: 'paused' }, 'T1-CODE'), 'B');
  assert.equal(classify({ label: 'fraud', outcome: 'caught', tier1: 'T1-CODE' }, 'T1-CODE T1-GIFT'), 'C');
  assert.equal(classify({ label: 'legit', outcome: 'FALSE_ALARM', tier2: 'secrecy' }, 'none'), 'D');
  assert.equal(classify({ label: 'legit', outcome: 'paused', tier2: 'secrecy' }, 'none'), 'E');
  assert.equal(classify({ label: 'legit', outcome: 'paused', tier2: '' }, 'none'), '');
});

test('E18 Supplied source preserves categories, none expectations and row values', () => {
  const { HEADER, readSuppliedData, expectedCodes } = require('../eval/supplied-data.cjs');
  const row = ['p1', 'g1', 'fraud', 'text', 'fake_bank_alert', 'public source', '2026-10-16', 'dev', 'none', 'public_example', '  Original input  '];
  const got = readSuppliedData([HEADER, row]);
  assert.deepEqual(got.errors, []);
  assert.equal(got.records[0].text, row[10]);
  assert.equal(got.records[0].expected_findings, 'none');
  assert.deepEqual(expectedCodes('none'), []);
  const peer = row.slice(); peer[0] = 'p2'; peer[7] = 'test'; peer[10] = 'Different input';
  assert.ok(readSuppliedData([HEADER, row, peer]).errors.some(e => e.includes('group spans')));
});

test('E19 The dev CLI never evaluates a held-out sentinel', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tfs-dev-only-'));
  try {
    const input = path.join(dir, 'messages.csv'), preload = path.join(dir, 'preload.cjs');
    fs.writeFileSync(input, 'id,label,channel,source,split,text\nd,legit,text,unit fixture,dev,DEV_INPUT\nt,fraud,text,unit fixture,test,HELDOUT_INPUT\n');
    const modulePath = path.join(__dirname, '../eval/engine.cjs');
    const stub = `require(${JSON.stringify(modulePath)}).loadEngine = () => ({ engine: { version: 'fixture' }, store: { version: 'fixture', orgs: [] }, reviewedOrgs: 0, analyze(text) { if (text !== 'DEV_INPUT') throw new Error('held-out row reached engine'); return { assessment: 'insufficient_evidence', evidence: { findings: [] }, trace: { blockedBy: [] } }; } });`;
    fs.writeFileSync(preload, stub);
    const run = require('node:child_process').spawnSync(process.execPath, ['--require', preload, path.join(__dirname, '../eval/run.cjs'), '--input', input, '--out', dir, '--split', 'dev'], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    const output = parseCsv(fs.readFileSync(path.join(dir, 'results.csv'), 'utf8'));
    assert.equal(output.length, 2);
    assert.equal(output[1][0], 'd');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('E20 Missing/all split is refused and the test gate uses Los Angeles time', () => {
  const { checkSplit, localDate } = require('../eval/test-access.cjs');
  assert.throws(() => checkSplit(null), /explicitly/);
  assert.throws(() => checkSplit('all'), /disabled/);
  assert.doesNotThrow(() => checkSplit('dev', new Date('2026-10-16T12:00:00Z')));
  assert.equal(localDate(new Date('2026-10-19T06:59:59Z')), '2026-10-18');
  assert.throws(() => checkSplit('test', new Date('2026-10-19T06:59:59Z')), /sealed/);
  assert.doesNotThrow(() => checkSplit('test', new Date('2026-10-19T07:00:00Z')));
});

test('E21 Test release refuses unapproved data, another input and changed engine bytes', () => {
  const { verifyTestRelease, RELEASE_FILES } = require('../eval/test-access.cjs');
  const { digest } = require('../eval/dataset.cjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tfs-release-'));
  try {
    fs.mkdirSync(path.join(dir, 'eval/data'), { recursive: true });
    const input = path.join(dir, 'input.csv'), engine = path.join(dir, RELEASE_FILES[0]);
    fs.writeFileSync(input, 'id,group_id,split,text\nnew,new-family,test,unit fixture text\n');
    const ledger = path.join(dir, 'eval/data/exposure-ledger.json');
    fs.writeFileSync(ledger, JSON.stringify({ devIds: [], devFamilyIds: [], textHashes: [] }));
    for (const file of RELEASE_FILES) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      fs.writeFileSync(path.join(dir, file), 'fixture');
    }
    const release = { ready: true, familyReviewComplete: true, sourceAuditComplete: true, approvedBy: 'unit fixture', input: 'input.csv', sha256: digest(fs.readFileSync(input)), exposureSha256: digest(fs.readFileSync(ledger)), referenceDate: '2026-10-19', engineFiles: Object.fromEntries(RELEASE_FILES.map(file => [file, digest('fixture')])) };
    const config = path.join(dir, 'eval/data/test-release.json'), day = new Date('2026-10-19T12:00:00Z');
    assert.throws(() => verifyTestRelease(dir, input, day), /not ready/);
    fs.writeFileSync(config, JSON.stringify({ ...release, ready: false }));
    assert.throws(() => verifyTestRelease(dir, input, day), /not ready/);
    fs.writeFileSync(config, JSON.stringify(release));
    assert.ok(verifyTestRelease(dir, input, day));
    const emptyLedger = fs.readFileSync(ledger);
    const { recordDevExposure } = require('../eval/test-access.cjs');
    recordDevExposure(dir, [{ id: 'old-id', group_id: 'old-family', text: ' UNIT  fixture text ' }]);
    const knownExposure = { ...release, exposureSha256: digest(fs.readFileSync(ledger)) };
    fs.writeFileSync(config, JSON.stringify(knownExposure));
    assert.throws(() => verifyTestRelease(dir, input, day), /previously dev/);
    fs.writeFileSync(ledger, emptyLedger); fs.writeFileSync(config, JSON.stringify(release));
    fs.writeFileSync(config, JSON.stringify({ ...release, engineFiles: {} }));
    assert.throws(() => verifyTestRelease(dir, input, day), /incomplete/);
    fs.writeFileSync(config, JSON.stringify(release));
    assert.throws(() => verifyTestRelease(dir, path.join(dir, 'other.csv'), day), /differs/);
    fs.writeFileSync(engine, 'changed');
    assert.throws(() => verifyTestRelease(dir, input, day), /evaluation file changed/);
    fs.writeFileSync(engine, 'fixture'); fs.writeFileSync(input, 'changed');
    assert.throws(() => verifyTestRelease(dir, input, day), /input changed/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('E22 A test attempt is reserved once, including an interrupted attempt', () => {
  const { reserveTestRun, finishTestRun } = require('../eval/test-access.cjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tfs-once-'));
  try {
    const receipt = path.join(dir, 'receipt.json');
    reserveTestRun(receipt, { rows: 1 });
    assert.equal(JSON.parse(fs.readFileSync(receipt)).phase, 'started');
    assert.throws(() => reserveTestRun(receipt, { rows: 1 }), /EEXIST/);
    finishTestRun(receipt, { report: 'fixture' });
    assert.equal(JSON.parse(fs.readFileSync(receipt)).phase, 'complete');
    assert.throws(() => reserveTestRun(receipt, { rows: 1 }), /EEXIST/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('E23 Public test report keeps aggregates and IDs but drops text and source values', () => {
  const { buildReport } = require('../eval/publish-test-result.cjs');
  const output = buildReport([{ id: 'fixture-1', label: 'legit', split: 'test', assessment: 'insufficient_evidence', outcome: 'paused',
    tier1: '', tier2: '', blockedBy: '', source: 'PRIVATE_SOURCE', text: 'PRIVATE_TEXT' }], { sha256: 'fixture-hash' });
  assert.ok(output.includes('fixture-1'));
  assert.ok(output.includes('small held-out pilot'));
  assert.ok(!output.includes('PRIVATE_SOURCE') && !output.includes('PRIVATE_TEXT'));
});

const failed = rows.filter(r => !r[1]);
console.log(`Evaluation harness: ${rows.length - failed.length}/${rows.length}`);
failed.forEach(r => console.error(r[0] + ' | FAIL | ' + r[2]));
process.exitCode = failed.length ? 1 : 0;
