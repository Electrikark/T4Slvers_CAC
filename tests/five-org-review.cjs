// Real-source data stays draft. Approved/expired/rejected copies are test scenarios only.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const context = vm.createContext({URL, performance, console});
context.window = context;
for (const file of ['js/engine/normalize.js', 'js/engine/extract.js', 'js/engine/sender.js',
  'js/engine/domain.js', 'js/engine/trusted.js', 'js/engine/risk.js', 'js/engine/policy.js',
  'js/assessment-gate.js', 'js/engine/evidence.js', 'js/engine/aggregate.js', 'js/engine/copy.js', 'data/store.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename:file});
}
const review = JSON.parse(fs.readFileSync(path.join(root, 'docs/testing/five-organization-review.json')));
const day = review.reviewDate;
const rows = [];
let passed = 0;
const clone = value => JSON.parse(JSON.stringify(value));
function run(text, store, today=day) {
  const result = context.TfsEngine.analyze(text, store, {declaredChannel:'text', today});
  assert.ok(context.TfsEngine.validateResult(result), 'invalid result');
  return result;
}
function check(id, fn) { fn(); passed++; }
function scenarioStore(id, state) {
  const store = clone(context.TFS_STORE);
  const org = store.orgs.find(o => o.id === id);
  org.contacts.forEach(r => {
    r.status = state === 'Draft' ? 'draft' : state === 'Rejected' ? 'rejected' : 'reviewed';
    r.reviewedBy = 'Test scenario only; not a human approval';
    if (state === 'Expired') r.reviewDue = '2026-10-16';
  });
  return store;
}
for (const row of review.organizations) {
  for (const state of ['Approved and current', 'Expired', 'Rejected', 'Draft']) {
    check(row.id + ':' + state, () => {
      const store = scenarioStore(row.id, state);
      const org = store.orgs.find(o => o.id === row.id);
      const view = context.TFS.buildTrustedView(store, day);
      const eligible = state === 'Approved and current';
      const trusted = view.trusted.filter(r => r.orgId === row.id);
      assert.equal(trusted.length, eligible ? org.contacts.length : 0);
      const result = run(row.name + ': Information is available at https://' + row.domain + '.', store);
      assert.equal(result.assessment, eligible ? 'details_match' : 'insufficient_evidence');
      const website = 'If you need their website, type ' + row.domain + ' yourself instead of tapping a link.';
      assert.equal(result.nextSteps.includes(website), eligible);
      // Assert eligibility per contact as well as verdict and rendered next-step website.
      for (const record of org.contacts) {
        const target = context.TFS.extractTargets(record.kind === 'phone' ? record.value : 'https://' + record.value).targets[0];
        assert.equal(context.TFS.trustedMatches(view, target, row.id).length, eligible ? 1 : 0);
      }
      if (!eligible) {
        assert.ok(result.checks.every(c => c.status !== 'SUPPORTS'));
        for (const record of org.contacts) assert.ok(!result.nextSteps.join(' ').includes(record.value));
      }
      rows.push({organization:row.name, state, assessment:result.assessment,
        eligibleContacts:trusted.length, websiteShown:result.nextSteps.includes(website), passed:true});
    });
  }
  check(row.id + ':risk-overrides-match', () => {
    const store = scenarioStore(row.id, 'Approved and current');
    const result = run(row.name + ': Pay with gift cards today. Visit https://' + row.domain + '.', store);
    assert.ok(result.checks.some(c => c.status === 'SUPPORTS'));
    assert.equal(result.assessment, 'suspicious');
    assert.ok(result.meaning.includes('cannot cancel this warning'));
  });
  check(row.id + ':expiry-boundary', () => {
    const store = scenarioStore(row.id, 'Approved and current');
    const message = row.name + ': Information is available at https://' + row.domain + '.';
    assert.equal(run(message, store, review.reviewDue).assessment, 'details_match');
    assert.equal(run(message, store, '2027-01-16').assessment, 'insufficient_evidence');
    assert.ok(!run(message, store, '2027-01-16').nextSteps.join(' ').includes(row.domain));
  });
  check(row.id + ':missing-source', () => {
    const store = scenarioStore(row.id, 'Approved and current');
    store.orgs.find(o => o.id === row.id).contacts.forEach(r => r.sourceUrl = '');
    const result = run(row.name + ': Information is available at https://' + row.domain + '.', store);
    assert.equal(result.assessment, 'insufficient_evidence');
    assert.ok(!result.nextSteps.join(' ').includes(row.domain));
  });
}
check('actual-store-remains-draft', () => {
  assert.equal(context.TFS.buildTrustedView(context.TFS_STORE, day).trusted.length, 0);
  for (const row of review.organizations) {
    const org = context.TFS_STORE.orgs.find(o => o.id === row.id);
    assert.ok(org.contacts.every(r => r.status === 'draft' && r.sourceUrl && r.reviewedBy === review.reviewer));
    assert.ok(org.contacts.every(r => r.checkedOn === day && r.reviewDue === review.reviewDue));
    assert.equal(org.humanReview, undefined);
  }
  assert.equal((Date.parse(review.reviewDue) - Date.parse(day)) / 86400000, 90);
});
const report = {referenceDate:day, timezone:review.reviewTimezone, expiresAfter:review.reviewDue,
  expirySemantics:'reviewDue is the last eligible date; excluded the following day',
  scenarioOnly:true, checks:passed, passed, failed:0, rows};
if (process.argv.includes('--write-report')) {
  fs.writeFileSync(path.join(root, 'docs/testing/five-organization-test-results.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log('Five-organization eligibility: ' + passed + '/' + passed + ' (20 organization/state scenarios plus 16 boundary and safety checks)');
