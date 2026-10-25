// Approved/expired/rejected copies are test scenarios; the real five-organization data is reviewed.
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
const checkResults = [];
const dayAfter = date => new Date(Date.parse(date) + 86400000).toISOString().slice(0, 10);
const expiredDay = dayAfter(review.reviewDue);
const chase = {};
let passed = 0;
const clone = value => JSON.parse(JSON.stringify(value));
function run(text, store, today=day) {
  const result = context.TfsEngine.analyze(text, store, {declaredChannel:'text', today});
  assert.ok(context.TfsEngine.validateResult(result), 'invalid result');
  return result;
}
function check(id, fn) { fn(); passed++; checkResults.push({id, passed:true}); }
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
      const message = row.name + ': Information is available at https://' + row.domain + '.';
      const result = run(message, store);
      assert.equal(result.assessment, eligible ? 'details_match' : 'insufficient_evidence');
      const website = row.id === 'amazon' ? 'Open the Amazon app or type amazon.com yourself.'
        : 'If you need their website, type ' + row.domain + ' yourself instead of tapping a link.';
      assert.equal(result.nextSteps.includes(website), eligible);
      if (row.id === 'amazon') {
        assert.equal(org.contacts.some(r => r.kind === 'phone'), false, 'no unsourced Amazon phone');
        assert.equal(result.nextSteps.includes('Open the Amazon app or type amazon.com yourself.'), eligible);
      }
      // Assert eligibility per contact as well as verdict and rendered next-step website.
      for (const record of org.contacts) {
        const target = context.TFS.extractTargets(record.kind === 'phone' ? record.value : 'https://' + record.value).targets[0];
        assert.equal(context.TFS.trustedMatches(view, target, row.id).length, eligible ? 1 : 0);
      }
      if (!eligible) {
        assert.ok(result.checks.every(c => c.status !== 'SUPPORTS'));
        for (const record of org.contacts) assert.ok(!result.nextSteps.join(' ').includes(record.value));
      }
      const outcome = {organization:row.name, state, message, assessment:result.assessment,
        trace:result.trace, eligibleContacts:trusted.length, websiteShown:result.nextSteps.includes(website),
        nextSteps:result.nextSteps, passed:true};
      rows.push(outcome);
      if (row.id === 'chase' && eligible) chase.approvedScenario = outcome;
    });
  }
  check(row.id + ':risk-overrides-match', () => {
    const store = scenarioStore(row.id, 'Approved and current');
    const result = run(row.name + ': Pay with gift cards today. Visit https://' + row.domain + '.', store);
    assert.ok(result.checks.some(c => c.status === 'SUPPORTS'));
    assert.equal(result.assessment, 'suspicious');
    assert.ok(result.meaning.includes('cannot cancel this warning'));
    if (row.id === 'chase') chase.suspiciousWithOfficialLink = {
      message:row.name + ': Pay with gift cards today. Visit https://' + row.domain + '.',
      assessment:result.assessment, trace:result.trace, checks:result.checks,
      nextSteps:result.nextSteps, meaning:result.meaning};
  });
  check(row.id + ':expiry-boundary', () => {
    const store = scenarioStore(row.id, 'Approved and current');
    const message = row.name + ': Information is available at https://' + row.domain + '.';
    assert.equal(run(message, store, review.reviewDue).assessment, 'details_match');
    assert.equal(run(message, store, expiredDay).assessment, 'insufficient_evidence');
    assert.ok(!run(message, store, expiredDay).nextSteps.join(' ').includes(row.domain));
  });
  check(row.id + ':missing-source', () => {
    const store = scenarioStore(row.id, 'Approved and current');
    store.orgs.find(o => o.id === row.id).contacts.forEach(r => r.sourceUrl = '');
    const result = run(row.name + ': Information is available at https://' + row.domain + '.', store);
    assert.equal(result.assessment, 'insufficient_evidence');
    assert.ok(!result.nextSteps.join(' ').includes(row.domain));
  });
}
/* The five organizations are now reviewed in data/store.js by one named volunteer,
   under the dated single-reviewer exception in RELEASE.md. This check holds the real
   file to the same evidence the scenarios above assume: a named reviewer, a source page
   per contact, dates that agree with docs/testing/five-organization-review.json, and a
   90-day window. */
check('actual-store-is-reviewed', () => {
  const trusted = context.TFS.buildTrustedView(context.TFS_STORE, day).trusted;
  assert.equal(trusted.length, 9, 'nine reviewed contacts across the five organizations');
  assert.ok(review.reviewer && !/REVIEWER(?:_\d+)?_NAME/.test(review.reviewer), 'a named reviewer');
  for (const row of review.organizations) {
    const org = context.TFS_STORE.orgs.find(o => o.id === row.id);
    assert.ok(org.contacts.every(r => r.status === 'reviewed' && r.sourceUrl &&
      r.reviewedBy === review.reviewer));
    assert.ok(org.contacts.every(r => r.checkedOn === day && r.reviewDue === review.reviewDue));
    // The contacts carry their own review; no organization-wide shortcut is used.
    assert.equal(org.humanReview, undefined);
    assert.equal(org.humanReviewDraft, undefined, 'a reviewed organization must not still claim review is pending');
  }
  assert.equal((Date.parse(review.reviewDue) - Date.parse(day)) / 86400000, 90);
  const message = 'Chase: Information is available at https://chase.com.';
  const actual = run(message, context.TFS_STORE);
  assert.equal(actual.assessment, 'details_match', 'reviewed records support a match');
  chase.actualStore = {message, assessment:actual.assessment, trace:actual.trace,
    checks:actual.checks, nextSteps:actual.nextSteps};
});
const report = {referenceDate:day, timezone:review.reviewTimezone, expiresAfter:review.reviewDue,
  expirySemantics:'reviewDue is the last eligible date; excluded the following day',
  scenarioOnly:true, checks:passed, passed, failed:0, rows, checkResults, chase};
if (process.argv.includes('--write-report')) {
  fs.writeFileSync(path.join(root, 'docs/testing/five-organization-test-results.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log('Five-organization eligibility: ' + passed + '/' + passed + ' (20 organization/state scenarios plus 16 boundary and safety checks)');
