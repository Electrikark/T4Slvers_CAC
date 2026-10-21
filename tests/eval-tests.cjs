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
    'f1,fraud,text,s,a\nf2,fraud,text,s,b\nf3,fraud,text,s,c\nl1,legit,text,s,d\nl2,legit,text,s,e\n')).messages;
  const answers = { a: 'suspicious', b: 'insufficient_evidence', c: 'details_match', d: 'suspicious', e: 'details_match' };
  const stub = text => ({ assessment: answers[text], trace: { blockedBy: [] },
    evidence: { findings: answers[text] === 'suspicious' ? [{ ruleId: 'T1-GIFT', tier: 1, status: 'established' }] : [] } });
  const results = M.judge(messages, stub);
  const t = M.tally(results);
  assert.deepEqual([t.fraud.suspicious, t.fraud.insufficient, t.fraud.match, t.legit.suspicious, t.legit.match], [1, 1, 1, 1, 1]);
  near(t.rates.caught.rate, 1 / 3); near(t.rates.paused.rate, 2 / 3); near(t.rates.reassured.rate, 1 / 3);
  near(t.rates.falseAlarm.rate, 1 / 2);
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
    'u1,legit,text,unit test,dev,USPS: Your package is out for delivery. Track it at https://tools.usps.com/go/TrackConfirmAction\n' +
    'reserved,fraud,text,unit test,test,Reserved row excluded from a development run.\n');
  const { spawnSync } = require('node:child_process');
  const run = args => spawnSync(process.execPath, [path.join(__dirname, '../eval/run.cjs'), '--input', input, '--out', dir].concat(args), { encoding: 'utf8' });
  const ok = run(['--strict']);
  assert.equal(ok.status, 0, ok.stderr);
  const report = fs.readFileSync(path.join(dir, 'report.md'), 'utf8');
  assert.match(report, /Fraud given Details Match \(false reassurance; must be 0\):\*\* 0\/1/);
  assert.equal(parseCsv(fs.readFileSync(path.join(dir, 'results.csv'), 'utf8')).length, 3);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'results.json'), 'utf8')).map(r => r.id), ['g1', 'u1']);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('E13 Display CSV neutralizes formula-like cells while the raw encoder preserves text', () => {
  const texts = ['=1+1', '+123', '-12', '@SUM(A1)', '  =1', '\t=1', '\n+1', 'plain', ' padded '];
  const records = texts.map(text => ({ text }));
  assert.deepEqual(parseCsv(toCsv(['text'], records)).slice(1).map(r => r[0]), texts);
  const shown = parseCsv(toCsv(['text'], records, { spreadsheetSafe: true })).slice(1).map(r => r[0]);
  assert.deepEqual(shown, texts.map((text, i) => i < 7 ? "'" + text : text));
});
test('E14 Development selection never invokes the analyzer on reserved rows', () => {
  const messages = [{ id: 'dev', text: 'seen', split: 'dev', label: 'legit' },
    { id: 'test', text: 'reserved', split: 'test', label: 'fraud' }];
  const calls = [];
  const analyze = text => {
    assert.notEqual(text, 'reserved'); calls.push(text);
    return { assessment: 'insufficient_evidence', evidence: { findings: [] }, trace: { blockedBy: [] } };
  };
  assert.deepEqual(M.judge(messages, analyze, 'dev').map(r => r.id), ['dev']);
  assert.deepEqual(calls, ['seen']);
  assert.throws(() => M.judge([], analyze, 'dev'), /No messages/);
  assert.throws(() => M.judge(messages, analyze, 'test'), /both fraud and legitimate/);
});
test('E15 CSV display prefixes never alter exact JSON results', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tfs-export-'));
  try {
    const input = path.join(dir, 'messages.csv');
    fs.writeFileSync(input, 'id,label,channel,source,split,text\nx,legit,text,unit test,dev,=1+1\n');
    const { spawnSync } = require('node:child_process');
    const result = spawnSync(process.execPath, [path.join(__dirname, '../eval/run.cjs'), '--input', input, '--out', dir], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const csv = parseCsv(fs.readFileSync(path.join(dir, 'results.csv'), 'utf8'));
    assert.equal(csv[1][csv[0].indexOf('text')], "'=1+1");
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'results.json'), 'utf8'))[0].text, '=1+1');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

const failed = rows.filter(r => !r[1]);
console.log(`Evaluation harness: ${rows.length - failed.length}/${rows.length}`);
failed.forEach(r => console.error(r[0] + ' | FAIL | ' + r[2]));
process.exitCode = failed.length ? 1 : 0;
