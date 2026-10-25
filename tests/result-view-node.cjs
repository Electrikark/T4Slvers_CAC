'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { loadEngine } = require('../eval/engine.cjs');
const context = {};
vm.runInNewContext(fs.readFileSync(require.resolve('../js/result-view.js'), 'utf8'), context);
const { build, titleForMatch } = context.TfsResultView;
const { analyze, engine, store } = loadEngine();
let count = 0;
const test = (name, run) => { run(); count++; console.log('PASS ' + name); };
const viewFor = text => build(analyze(text, 'text'), text);

test('Urgency and secrecy share an action while both behaviors stay visible', () => {
  const view = viewFor('Please act now. Keep this secret from your family.');
  const pressure = view.groups.find(g => g.id === 'pressure');
  assert.ok(pressure);
  assert.ok(pressure.reasons.some(s => /quickly/.test(s)));
  assert.ok(pressure.reasons.some(s => /secret/.test(s)));
  assert.equal(view.groups.filter(g => g.id === 'pressure').length, 1);
});
test('Code, gift-card, device, and money requests keep separate protective steps', () => {
  const text = 'Chase: Please send us your login code. Buy gift cards and send me the codes. Install AnyDesk now. Pay with Bitcoin now.';
  const result = analyze(text, 'text'), before = JSON.stringify(result);
  const view = build(result, text);
  for (const key of ['codes', 'gifts', 'device', 'money']) assert.ok(view.groups.some(g => g.id === key), key);
  for (const flag of result.requestRisk.flags) assert.ok(view.groups.some(g => g.sources.includes('flag:' + flag.id)), flag.id);
  result.evidence.findings.forEach((f, i) => assert.ok(view.groups.some(g => g.sources.includes('finding:' + i + ':' + f.ruleId)), f.ruleId));
  assert.equal(JSON.stringify(result), before, 'presentation changed engine evidence');
});
test('An ordinary message retains uncertainty and an independent next step', () => {
  const view = viewFor('See you at lunch on Sunday!');
  assert.equal(view.title, 'There isn’t enough information');
  assert.ok(view.limits.some(s => /cannot verify who sent/.test(s)));
  assert.ok(view.groups.some(g => /No warning pattern/.test(g.reasons.join(' '))));
  assert.ok(view.groups.some(g => /contact details you had before/.test(g.action)));
});
test('A short-link destination and pending review are visible limits', () => {
  const view = viewFor('Chase: Your statement is ready at https://chase.com or https://bit.ly/example');
  assert.ok(view.limits.some(s => /review/i.test(s)));
  assert.ok(view.limits.some(s => /short link/i.test(s)));
});
test('Matching labels distinguish website addresses, email domains, and phone numbers', () => {
  const match = kinds => ({ evidence: { contacts: kinds.map(kind => ({support:{target:{kind}}})) } });
  assert.equal(titleForMatch(match(['link'])), 'Website address matches our records');
  assert.equal(titleForMatch(match(['email'])), 'Email domain matches our records');
  assert.equal(titleForMatch(match(['phone'])), 'Phone number matches our records');
  assert.equal(titleForMatch(match(['link','link'])), 'Website addresses match our records');
  assert.equal(titleForMatch(match(['link','email'])), 'Website address and email domain match our records');
});
test('A reviewed fixture can name a match; a screenshot still cannot', () => {
  const fixture = JSON.parse(JSON.stringify(store));
  fixture.orgs.find(o => o.id === 'chase').humanReview = { reviewer:'Fictional test fixture', date:'2026-10-12', reviewDue:'2099-12-31', sourceUrl:'https://example.invalid/fixture' };
  const text = 'Chase: Your statement is ready at https://chase.com';
  const result = engine.analyze(text, fixture, {declaredChannel:'text',today:'2026-10-24'});
  assert.equal(result.assessment, 'details_match');
  assert.equal(build(result,text).title, 'Website address matches our records');
  const unnamed = engine.analyze('Your statement is ready at https://chase.com', fixture, {declaredChannel:'text',today:'2026-10-24'});
  assert.equal(unnamed.assessment, 'insufficient_evidence');
  assert.ok(build(unnamed, '').limits.some(s => /does not explicitly name/.test(s)));
  const image = engine.analyze(text, fixture, {declaredChannel:'text',today:'2026-10-24',inputSource:'screenshot'});
  assert.equal(image.assessment, 'insufficient_evidence');
  assert.equal(build(image,text).screenshot, true);
  assert.notEqual(build(image,text).title, 'Website address matches our records');
});
test('Every replay row keeps its engine decision and every finding remains represented', () => {
  const fixture = JSON.parse(fs.readFileSync(require.resolve('./reporting-scope/fixture.json'), 'utf8'));
  for (const row of fixture.rows.concat(fixture.hand_rows)) {
    const result = analyze(row.text, 'text'), before = JSON.stringify(result);
    const view = build(result, row.text);
    assert.ok(view.groups.length && view.limits.length, row.id);
    result.evidence.findings.forEach((f,i) => assert.ok(view.groups.some(g => g.sources.includes('finding:' + i + ':' + f.ruleId)), row.id));
    assert.equal(JSON.stringify(result), before, row.id);
    assert.ok(engine.validateResult(result), row.id);
  }
});
console.log('Result display: ' + count + '/' + count);
