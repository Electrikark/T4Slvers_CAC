'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadEngine } = require('../eval/engine.cjs');
const { storeFor } = require('./reporting-scope/setup.js');
const root = path.resolve(__dirname, '..');
const { engine } = loadEngine();
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'reporting-scope/fixture.json')));
const options = { declaredChannel: 'text', today: fixture.evaluation_date };
let checks = 0;
function test(name, run) { run(); checks++; console.log('PASS ' + name); }

test('OCR helpers have only their explicit local dependency and no verdict or data access', () => {
  const files = ['js/ocr.js', 'js/ocr-ui.js'];
  for (const name of files) {
    const source = fs.readFileSync(path.join(root, name), 'utf8');
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    for (const match of source.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)/g)) {
      assert.ok(html.includes('id="' + match[1] + '"'), 'Missing OCR UI element: ' + match[1]);
    }
    assert.doesNotMatch(source, /TfsEngine|TfsAssessment|TFS_STORE|TFS_POLICIES|innerHTML|outerHTML|insertAdjacentHTML/);
    for (const match of source.matchAll(/\b(?:import|export)\s+(?:[^;]*?\sfrom\s*)?['"]([^'"]+)['"]/g)) {
      assert.equal(name, 'js/ocr-ui.js'); assert.equal(match[1], './ocr.js');
    }
    assert.doesNotMatch(source, /\bimport\s*\(|\brequire\s*\(/);
  }
});
test('Screenshot provenance blocks a match without creating a Tier 1 finding', () => {
  const text = 'Chase: Your statement is ready. Visit https://chase.com';
  const store = storeFor('approved');
  const pasted = engine.analyze(text, store, options);
  const image = engine.analyze(text, store, { ...options, inputSource: 'screenshot' });
  assert.equal(pasted.assessment, 'details_match');
  assert.equal(image.assessment, 'insufficient_evidence');
  assert.ok(image.evidence.uncertainty.includes('ocr_text_unverified'));
  assert.ok(image.trace.blockedBy.includes('UNCERTAINTY'));
  assert.equal(image.evidence.findings.length, 0);
  assert.ok(engine.validateResult(image));
});
test('Established text requests still reach the existing gate', () => {
  const image = engine.analyze('Chase: Buy gift cards to pay the fee.', storeFor('approved'), { ...options, inputSource: 'screenshot' });
  assert.equal(image.assessment, 'suspicious');
  assert.ok(image.trace.rules.includes('T1-GIFT'));
  assert.ok(engine.validateResult(image));
});
test('Provenance cannot be removed from a displayed result without failing validation', () => {
  const image = engine.analyze('Chase: Your statement is ready. Visit https://chase.com', storeFor('approved'), { ...options, inputSource: 'screenshot' });
  image.inputSource = 'pasted_text';
  assert.equal(engine.validateResult(image), false);
  assert.throws(() => engine.analyze('text', storeFor('none'), { ...options, inputSource: 'unknown' }));
});
test('All 813 regression rows (768 matrix + 45 hand-written) retain their plain-text verdict and image-text gate invariants', () => {
  const labels = { suspicious: 'Suspicious', details_match: 'Details Match', insufficient_evidence: 'Insufficient Evidence' };
  const rows = fixture.rows.concat(fixture.hand_rows);
  assert.equal(rows.length, 813);
  for (const row of rows) {
    const store = storeFor(row.record_state);
    const pasted = engine.analyze(row.text, store, options);
    const image = engine.analyze(row.text, store, { ...options, inputSource: 'screenshot' });
    assert.equal(labels[pasted.assessment], row.expected_verdict, row.id);
    assert.equal(image.assessment, pasted.assessment === 'details_match' ? 'insufficient_evidence' : pasted.assessment, row.id);
    // Screenshot line breaks are layout (T.unwrapLayout), so a clause may now run across a wrap.
    // The same rules must fire, and every quote must still be the exact visible text.
    const ids = r => Array.from(r.evidence.findings, f => f.status + ':' + f.ruleId).sort();
    assert.deepEqual(ids(image), ids(pasted), row.id);
    for (const f of image.evidence.findings) if (f.span) assert.equal(row.text.slice(f.span.start, f.span.end), f.span.quote, row.id);
    assert.ok(engine.validateResult(image), row.id);
  }
});
test('Wrapped screenshot lines keep a sentence whole; pasted text is unchanged', () => {
  const store = storeFor('none');
  const read = (text, inputSource) => engine.analyze(text, store, { ...options, inputSource });
  const rules = r => Array.from(r.evidence.findings.filter(f => f.status === 'established' && f.tier === 1), f => f.ruleId);
  const wrapped = 'Chase: Beware of hackers. We ask\nyou to pay with gift cards today. Visit\nhttps://chase.com.';
  assert.deepEqual(rules(read(wrapped, 'screenshot')), ['T1-GIFT']);
  assert.deepEqual(rules(read(wrapped, 'pasted_text')), [], 'pasted text keeps its own line handling');
  const span = read(wrapped, 'screenshot').evidence.findings[0].span;
  assert.equal(wrapped.slice(span.start, span.end), span.quote, 'quotes stay exact, line break included');
  // A blank line is a paragraph break and still separates sentences.
  assert.deepEqual(rules(read('Never read us your code.\n\nThanks', 'screenshot')), []);
});
test('A web address broken after a hyphen is joined exactly as written; ordinary words are not', () => {
  const store = storeFor('none');
  const read = text => engine.analyze(text, store, { ...options, inputSource: 'screenshot' });
  const domains = r => r.evidence.findings.filter(f => f.ruleId === 'T1-DOMAIN').length;
  assert.equal(domains(read('Chase: Your account has been locked. Sign in at chase-secure-\nlogin.net to restore access.')), 1);
  assert.equal(read('Chase: Your account has been locked. Sign in at chase-secure-\nlogin.net to restore access.').assessment, 'suspicious');
  const ctx = require('node:vm').createContext({ URL, performance, console }); ctx.window = ctx;
  require('node:vm').runInContext(fs.readFileSync(path.join(root, 'js/engine/normalize.js'), 'utf8'), ctx);
  const u = ctx.TFS.unwrapLayout;
  assert.equal(u('Visit chase-secure-\nlogin.net now').text, 'Visit chase-secure-login.net now');
  assert.equal(u('a well-\nknown store').text, 'a well- known store', 'a hyphenated word is not an address');
  assert.equal(u('Pay at https://fastrak-ca-\ntolls.com/pay').text, 'Pay at https://fastrak-ca-tolls.com/pay');
  assert.equal(u('line one\r\nline two').text, 'line one line two');
  assert.equal(u('Call 1-\n888-555-0142 now').text, 'Call 1-888-555-0142 now');
  assert.equal(u('pages 10-\n12 of the form').text, 'pages 10- 12 of the form', 'a number range is not a phone number');
  assert.equal(u('Visit hitps://fastrak-\nca.com').text, 'Visit hitps://fastrak- ca.com', 'a misread scheme is never corrected');
  assert.equal(u('para one\n\npara two').text, 'para one\n\npara two');
  const m = u('ab-\ncd.com x'); assert.deepEqual([m.text, Array.from(m.map)], ['ab-cd.com x', [0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11]]);
});
console.log('OCR source and provenance groups: ' + checks + '/' + checks);
