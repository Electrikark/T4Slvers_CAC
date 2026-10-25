/* Review-evidence gate for data/store.js.

   A contact can only support a Details Match once a person has reviewed it. This file
   checks that every contact claiming review carries real evidence, that the review record,
   the store and the saved test report agree, and that the engine itself accepts each
   record. It fails loudly while the reviewer is still the template value, so an unreviewed
   record can never reach a reader: js/engine/copy.js prints the reviewer's name on screen
   ("Review status: ... reviewed by ...").

   The five reviewed organizations use the dated single-reviewer exception in RELEASE.md:
   one named reviewer per contact. Record a review with scripts/record-review.py, which
   fills every file this gate reads.

   Run: node tests/review-placeholders.cjs   (chained into npm test) */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({URL, performance, console});
context.window = context;
for (const file of ['js/engine/normalize.js', 'js/engine/extract.js', 'js/engine/sender.js',
  'js/engine/domain.js', 'js/engine/trusted.js', 'data/store.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
}

const store = context.TFS_STORE;
const today = new Date().toISOString().slice(0, 10);
const REVIEW_WINDOW_DAYS = 90;
const RECORD = 'docs/testing/five-organization-review.json';
const REPORT = 'docs/testing/five-organization-test-results.json';
const HOW_TO_FIX = 'After opening every source page, run: python3 scripts/record-review.py --reviewer "Your Name" --date YYYY-MM-DD';

// Strings that mean "nobody has filled this in yet". Never a reviewer.
const PLACEHOLDER = /REVIEWER(?:_\d+)?_NAME|REPLACE[_ ]?WITH|TODO|FIXME|XXX|^<.*>$|^\s*$/i;

const failures = [];
function check(label, condition, detail) {
  if (!condition) failures.push(label + ' -> ' + detail);
}

function isCalendarDate(value) {
  const m = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const day = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return day.getUTCFullYear() === +m[1] && day.getUTCMonth() === +m[2] - 1 && day.getUTCDate() === +m[3];
}

function addDays(date, days) {
  return new Date(Date.parse(date + 'T00:00:00Z') + days * 86400000).toISOString().slice(0, 10);
}

// 1. The template value must not survive in the store file or the review record.
for (const file of ['data/store.js', RECORD]) {
  const templateLines = fs.readFileSync(path.join(root, file), 'utf8').split('\n')
    .map((line, i) => ({line, n: i + 1}))
    .filter(row => /REVIEWER(?:_\d+)?_NAME|REPLACE[_ ]?WITH|TODO/i.test(row.line));
  check(file, templateLines.length === 0,
    'still holds the unfilled reviewer template on line(s) ' + templateLines.map(r => r.n).join(', ') + '. ' + HOW_TO_FIX);
}

// 2. Every contact claiming review must carry complete, current evidence.
let reviewedCount = 0;
for (const org of store.orgs || []) {
  for (const contact of org.contacts || []) {
    if (contact.status !== 'reviewed') continue;
    reviewedCount++;
    const at = org.id + '/' + contact.kind + '/' + contact.value;
    const reviewer = String(contact.reviewedBy || '').trim();
    check(at, reviewer && !PLACEHOLDER.test(reviewer), 'reviewedBy is empty or a placeholder: ' + JSON.stringify(contact.reviewedBy));
    check(at, /^https:\/\//.test(String(contact.sourceUrl || '')), 'sourceUrl is not an https source page');
    check(at, isCalendarDate(contact.checkedOn), 'checkedOn is not a real YYYY-MM-DD date');
    check(at, isCalendarDate(contact.reviewDue), 'reviewDue is not a real YYYY-MM-DD date');
    if (isCalendarDate(contact.checkedOn)) {
      check(at, contact.checkedOn <= today, 'checkedOn is in the future');
      if (isCalendarDate(contact.reviewDue)) {
        const expected = addDays(contact.checkedOn, REVIEW_WINDOW_DAYS);
        check(at, contact.reviewDue === expected,
          'reviewDue should be ' + expected + ' (90 days after ' + contact.checkedOn + '), found ' + contact.reviewDue);
      }
    }
    if (isCalendarDate(contact.reviewDue)) {
      check(at, contact.reviewDue >= today, 'the review expired on ' + contact.reviewDue + '; recheck the source page');
    }
  }
}

// 3. A reviewed organization must not still advertise itself as pending elsewhere in the record.
for (const org of store.orgs || []) {
  if (!(org.contacts || []).some(c => c.status === 'reviewed')) continue;
  check(org.id, !org.humanReviewDraft,
    'contacts are marked reviewed but the organization still carries a humanReviewDraft block saying review is pending');
  check(org.id, !/pending/i.test(String(org.verifiedBy || '')),
    'contacts are marked reviewed but verifiedBy still says review is pending: ' + JSON.stringify(org.verifiedBy));
  const sourceReview = org.sourceReview || {};
  check(org.id, sourceReview.status === 'reviewed', 'sourceReview.status is not "reviewed"');
  check(org.id, (org.contacts || []).every(c => c.status !== 'reviewed' || c.reviewedBy === sourceReview.reviewer),
    'sourceReview.reviewer does not match the contacts\' reviewedBy');
}

// 4. The review record, the store and the saved test report must agree.
const record = JSON.parse(fs.readFileSync(path.join(root, RECORD), 'utf8'));
for (const org of store.orgs || []) {
  for (const contact of org.contacts || []) {
    if (contact.status !== 'reviewed') continue;
    const at = org.id + '/' + contact.value;
    check(RECORD, contact.reviewedBy === record.reviewer, at + ' names ' + JSON.stringify(contact.reviewedBy) + ', the record names ' + JSON.stringify(record.reviewer));
    check(RECORD, contact.checkedOn === record.reviewDate, at + ' was checked on ' + contact.checkedOn + ', the record says ' + record.reviewDate);
    check(RECORD, contact.reviewDue === record.reviewDue, at + ' is due ' + contact.reviewDue + ', the record says ' + record.reviewDue);
  }
}
const report = JSON.parse(fs.readFileSync(path.join(root, REPORT), 'utf8'));
check(REPORT, report.referenceDate === record.reviewDate && report.expiresAfter === record.reviewDue,
  'the saved test report is for ' + report.referenceDate + ' / ' + report.expiresAfter + ', not this review (' +
  record.reviewDate + ' / ' + record.reviewDue + '). ' + HOW_TO_FIX);

// 5. The engine's own gate must agree: each reviewed contact is actually in the trusted view.
const view = context.TFS.buildTrustedView(store, today);
for (const org of store.orgs || []) {
  for (const contact of org.contacts || []) {
    if (contact.status !== 'reviewed') continue;
    const accepted = view.trusted.some(r => r.orgId === org.id && r.value === contact.value);
    // Excluded entries carry id/orgId/reason, not the contact value, so report this
    // organization's exclusion reasons as a set.
    const why = [...new Set((view.excluded || []).filter(r => r.orgId === org.id).map(r => r.reason))].join(', ');
    check(org.id + '/' + contact.value, accepted, 'the engine still excludes this contact' + (why ? ' (' + why + ')' : ''));
  }
}

if (failures.length) {
  console.error('Review evidence gate: ' + failures.length + ' problem(s).\n');
  for (const line of failures) console.error('  ' + line);
  console.error('\nDetails Match stays unreachable until these are resolved. That is the ' +
    'intended behaviour: the app must not claim a match from a record no person has checked.');
  process.exit(1);
}

assert.ok(reviewedCount > 0, 'no reviewed contacts found');
console.log('Review evidence gate: ' + reviewedCount + ' reviewed contact(s), each with a named reviewer, ' +
  'a current 90-day review and an https source page; record, store and report agree; all accepted by the engine.');
console.log('Organizations with a trusted contact: ' + new Set(view.trusted.map(r => r.orgId)).size + ' of ' + store.orgs.length);
