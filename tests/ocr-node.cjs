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
test('All 810 regression rows retain their plain-text verdict and image-text gate invariants', () => {
  const labels = { suspicious: 'Suspicious', details_match: 'Details Match', insufficient_evidence: 'Insufficient Evidence' };
  const rows = fixture.rows.concat(fixture.hand_rows);
  assert.equal(rows.length, 810);
  for (const row of rows) {
    const store = storeFor(row.record_state);
    const pasted = engine.analyze(row.text, store, options);
    const image = engine.analyze(row.text, store, { ...options, inputSource: 'screenshot' });
    assert.equal(labels[pasted.assessment], row.expected_verdict, row.id);
    assert.equal(image.assessment, pasted.assessment === 'details_match' ? 'insufficient_evidence' : pasted.assessment, row.id);
    assert.equal(JSON.stringify(image.evidence.findings), JSON.stringify(pasted.evidence.findings), row.id);
    assert.ok(engine.validateResult(image), row.id);
  }
});
console.log('OCR source and provenance groups: ' + checks + '/' + checks);
