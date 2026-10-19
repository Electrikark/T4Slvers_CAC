'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { parseCsv, toCsv } = require('./csv.cjs');
const { readSuppliedData } = require('./supplied-data.cjs');
const { wilson } = require('./metrics.cjs');

const root = path.join(__dirname, '..');
const base = path.join(root, 'eval/data/supplied-30916d1f');
const source = path.join(base, 'messages-locked-2026-10-17.csv');
const revised = path.join(base, 'revised-2026-10-16');
const out = path.join(root, 'eval/results/holdout-refinement-2026-10-16');
const expectedSha = '30916d1f386a3f5feb67f544be323861b62ac7b4405dd298c2c508686c87f6ab';
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => {
  const [headers, ...values] = parseCsv(fs.readFileSync(file, 'utf8'));
  return values.map(row => Object.fromEntries(headers.map((h, i) => [h, row[i]])));
};
const csv = (file, fields, records) => fs.writeFileSync(file, toCsv(fields, records));
const protectedWrite = (file, bytes) => {
  if (fs.existsSync(file)) assert.equal(fs.readFileSync(file, 'utf8'), bytes, 'Version already exists with different bytes.');
  else { fs.writeFileSync(file, bytes, { flag: 'wx' }); fs.chmodSync(file, 0o444); }
};
const raw = fs.readFileSync(source);
assert.equal(digest(raw), expectedSha);
const parsed = parseCsv(raw.toString('utf8'));
const checked = readSuppliedData(parsed);
assert.deepEqual(checked.errors, []);
const originals = read(source);
const oldGroups = new Map();
originals.forEach(r => { if (!oldGroups.has(r.group_id)) oldGroups.set(r.group_id, []); oldGroups.get(r.group_id).push(r); });

// Family decisions are fixed from message/source review here, before any result
// file is opened. Conservative links may reduce sample size; they cannot add test.
const clusters = [
  ['Generic login-code templates cannot establish distinct sender families.', ['pub_code_domain_bound','pub_code_android_hash','pub_code_do_not_share','pub_code_expiring','pub_code_plain','syn_legit_login_domain_bound','syn_legit_login_no_share']],
  ['Prescription-ready templates have unresolved pharmacy identity and overlap the dev pickup family.', ['pub_pharmacy_filled','pub_pharmacy_pickup','syn_legit_pharmacy_copay','syn_legit_pharmacy_id']],
  ['Generic appointment reminders overlap dev; sender and booking identity cannot establish independence.', ['pub_appt_contact','pub_appt_confirm','pub_appt_dayof','pub_appt_hour','pub_appt_prepare','syn_legit_appt_fee','syn_legit_appt_urgent_followup','syn_legit_appt_changed']],
  ['Unnamed-bank debit template cannot be separated confidently from dev transaction-alert variants.', ['pub_bank_debit','pub_bank_review_transaction','syn_legit_bank_purchase_gift']],
  ['Generic upcoming-delivery tracking notices have unresolved sender identity and overlap dev arrival notices.', ['pub_delivery_nextday','pub_delivery_shipped','pub_delivery_enroute','syn_legit_delivery_expensive_item']],
  ['Bank verification-link and account-alert variants have ambiguous campaign boundaries; merge conservatively.', ['pub_bank_account_suspended','pub_bank_verify_identity','pub_bank_new_device','pub_bank_new_payee','pub_bank_payment_cancel','syn_bank_domain_deception']],
  ['Generic family-emergency money appeals have no distinct transfer route to establish an independent family.', ['pub_grandchild_stranded','pub_grandchild_secrecy','syn_grandchild_no_t1']],
  ['The customs-fee placeholder can overlap dev parcel-fee requests; the destination is not observable.', ['pub_delivery_customs','pub_delivery_fee','pub_delivery_locker_fee','syn_delivery_fee_portal']],
  ['The toll-collections placeholder cannot establish a distinct fake-site family from dev toll-payment links.', ['pub_toll_collections','pub_toll_account_billing','pub_toll_late_fee','syn_toll_impersonation_domain']],
  ['Bank-security requests disclose an account login code.', ['pub_bank_code_disclosure','syn_bank_otp_reply']],
  ['Unrecognized-charge callback variants share a dispute pretext.', ['pub_bank_charge_callback','syn_bank_refund_callback']],
  ['Workplace gift-card requests share the repayment pretext.', ['pub_gift_boss_request','syn_gift_manager_reimburse']],
  ['Legit parcel handover-code variants share the physical-handover instruction.', ['pub_delivery_handover_code','syn_legit_delivery_handover_code']],
];
const parent = new Map([...oldGroups.keys()].map(g => [g, g]));
const find = g => parent.get(g) === g ? g : find(parent.get(g));
for (const [reason, members] of clusters) {
  members.forEach(g => assert.ok(oldGroups.has(g), 'Unknown group: ' + g));
  const buckets = new Set(members.map(g => oldGroups.get(g)[0].label + ':' + oldGroups.get(g)[0].category));
  assert.equal(buckets.size, 1, reason);
  const head = find(members[0]);
  members.slice(1).forEach(g => parent.set(find(g), head));
}
const components = new Map();
for (const g of oldGroups.keys()) {
  const key = find(g);
  if (!components.has(key)) components.set(key, []);
  components.get(key).push(g);
}
const assignment = new Map();
const families = [];
for (const members of components.values()) {
  members.sort();
  const group = 'F2-' + members[0];
  const rows = members.flatMap(g => oldGroups.get(g));
  const priorDev = rows.some(r => r.split === 'dev');
  const reasons = clusters.filter(([, gs]) => gs.some(g => members.includes(g))).map(([reason]) => reason);
  const hasTest = rows.some(r => r.split === 'test');
  // Every old test family has an explicit ambiguity link to prior dev.
  if (hasTest) assert.ok(priorDev && reasons.length, 'Do not retire a test family without a reason.');
  const split = priorDev ? 'dev' : 'test';
  members.forEach(g => assignment.set(g, { group, split, reason: reasons.join(' ') }));
  families.push({ group_id: group, split, label: rows[0].label, category: rows[0].category, rows: rows.length,
    previous_groups: members.join(' '), reason: reasons.join(' ') || 'Existing family retained.' });
}
const rows = originals.map(r => {
  const a = assignment.get(r.group_id);
  assert.ok(!(r.split === 'dev' && a.split === 'test'));
  return { ...r, group_id: a.group, split: a.split };
});
const moves = originals.filter((r, i) => r.split !== rows[i].split).map(r => {
  const a = assignment.get(r.group_id);
  return { id: r.id, from: r.split, to: a.split, old_group: r.group_id, group: a.group, reason: a.reason };
});
assert.equal(moves.length, 16);
assert.ok(moves.every(r => r.from === 'test' && r.to === 'dev'));
for (let i = 0; i < originals.length; i++) {
  for (const key of parsed[0].filter(k => !['group_id', 'split'].includes(k))) assert.equal(rows[i][key], originals[i][key]);
}
const newBytes = toCsv(parsed[0], rows);
assert.deepEqual(readSuppliedData(parseCsv(newBytes)).errors, []);
fs.mkdirSync(revised, { recursive: true }); fs.mkdirSync(out, { recursive: true });
protectedWrite(path.join(revised, 'messages.csv'), newBytes);
csv(path.join(revised, 'family-registry.csv'), Object.keys(families[0]), families);
csv(path.join(revised, 'split-moves.csv'), Object.keys(moves[0]), moves);
protectedWrite(path.join(revised, 'manifest.json'), JSON.stringify({ source_sha256: expectedSha, sha256: digest(newBytes),
  rows: rows.length, families: families.length, dev: rows.filter(r => r.split === 'dev').length,
  test: rows.filter(r => r.split === 'test').length, moves: moves.length, dev_to_test: 0,
  stage: 'Revised dev-only baseline. Prospective test intake is empty. Not a test release.',
  family_review: 'Assistant audit; new holdout needs independent confirmation.',
  detection_rules_changed: false, previous_lock_preserved: true }, null, 2) + '\n');
require('./test-access.cjs').recordDevExposure(root, originals.concat(rows));
const intake = path.join(root, 'eval/data/prospective-test-intake.csv');
if (!fs.existsSync(intake)) csv(intake, parsed[0], []);
const release = path.join(root, 'eval/data/test-release.json');
if (!fs.existsSync(release)) fs.writeFileSync(release, JSON.stringify({ ready: false, familyReviewComplete: false, sourceAuditComplete: false,
  approvedBy: '', input: null, sha256: null, exposureSha256: null, referenceDate: '2026-10-19', engineFiles: {},
  reason: 'No eligible test rows yet. Add traceable real intake, check families, then freeze the engine and exact input.' }, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'eval/data/active-eval.json'), JSON.stringify({ input: 'supplied-30916d1f/revised-2026-10-16/messages.csv', sha256: digest(newBytes), today: '2026-10-17' }, null, 2) + '\n');

// Outcomes below describe only the original 178-row dev cohort. The 16 retired
// test rows have not been analyzed by the engine and are excluded from comparisons.
const before = read(path.join(root, 'eval/results/supplied-30916d1f/baseline/results.csv'));
const after = read(path.join(root, 'eval/results/supplied-30916d1f/after/results.csv'));
const reviewed = read(path.join(root, 'eval/results/supplied-30916d1f/failures-reviewed.csv'));
const byId = new Map(originals.map(r => [r.id, r]));
const cohort = r => /\bsynthetic\b/i.test(r.source + ' ' + r.notes) ? 'synthetic' : /\bpublic_example\b/.test(r.notes) ? 'public_example' : 'unverified_other';
assert.ok(originals.every(r => cohort(r) !== 'unverified_other'));
const matrix = [];
for (const [version, data] of [['original', originals], ['revised', rows]]) {
  for (const source_kind of ['received_verified', 'public_example', 'synthetic']) {
    for (const split of ['dev','test']) for (const label of ['fraud','legit']) {
      matrix.push({ version, source_kind, split, label, count: data.filter(r => cohort(r) === source_kind && r.split === split && r.label === label).length });
    }
  }
}
csv(path.join(out, 'source-split-counts.csv'), Object.keys(matrix[0]), matrix);
const catchRates = [];
for (const source_kind of ['received_verified', 'public_example', 'synthetic']) {
  for (const [run, data] of [['before', before], ['after', after]]) {
    const selected = data.filter(r => r.label === 'fraud' && cohort(byId.get(r.id)) === source_kind);
    const caught = selected.filter(r => r.outcome === 'caught').length;
    catchRates.push({ source_kind, run, caught, total: selected.length, wilson_95: wilson(caught, selected.length) });
  }
}
const paused = reviewed.filter(r => r.current_kind === 'B');
assert.equal(paused.length, 51);
const reasons = new Map();
for (const r of paused) {
  if (!reasons.has(r.fix_idea)) reasons.set(r.fix_idea, { cause: r.cause, reason: r.fix_idea, count: 0, public_example: 0, synthetic: 0, ids: [] });
  const item = reasons.get(r.fix_idea); item.count++; item[cohort(byId.get(r.id))]++; item.ids.push(r.id);
}
const reasonRows = [...reasons.values()].map(r => ({ ...r, ids: r.ids.join(' ') }));
csv(path.join(out, 'paused-fraud-causes.csv'), Object.keys(reasonRows[0]), reasonRows);
const stats = { original_source_sha256: expectedSha, revised_sha256: digest(newBytes), source_matrix: matrix,
  dev_comparison: catchRates, verified_received_rows: 0, before_test: { fraud: 9, legit: 7 },
  revised_test: { fraud: 0, legit: 0 }, retired_test_rows: moves.length,
  sunday_target: { fraud: 20, legit: 20 }, shortfall: { fraud: 20, legit: 20 }, paused_causes: reasonRows };
fs.writeFileSync(path.join(out, 'refinement-stats.json'), JSON.stringify(stats, null, 2) + '\n');
const code = {};
for (const file of require('./test-access.cjs').RELEASE_FILES) code[file] = digest(fs.readFileSync(path.join(root, file)));
fs.writeFileSync(path.join(revised, 'engine-baseline.json'), JSON.stringify({ status: 'Baseline fingerprint, not an approved final release.', files: code }, null, 2) + '\n');
const audit = ['# Split audit and revised holdout', '', 'Updated: 2026-10-17. The revision folder retains its work-start date. This version supersedes the prior preserve-all assignment policy. The earlier lock is unchanged.', '',
  'The new instruction allows only test-to-dev removal. All 16 prior test rows were conservatively retired through whole-family merges with prior dev variants. No prior dev row moved to test. The revised file has 194 dev rows in ' + families.length + ' families and zero test rows. No row was deleted; only group IDs and split values changed in the new version.', '',
  'All 16 prior test rows are public examples/templates, not verified received messages. Label and source inspection for family assignment was allowed; none was passed to the app. No detection rule was changed from that inspection.', '',
  'The before/after dev comparison remains the original 178 rows. Newly retired rows are not inserted into those denominators.', '',
  '| id | from | to | old group | revised family | reason |','|---|---|---|---|---|---|',
  ...moves.map(r => `| ${r.id} | ${r.from} | ${r.to} | ${r.old_group} | ${r.group} | ${r.reason} |`), '',
  '## Fingerprints', '', 'Base Git revision: 24ec48834d2fe58d6255ef31460a480355487c48 with local changes; a merged release has not been claimed.', '',
  'Prior source SHA-256: `' + expectedSha + '`.', '', 'Revised CSV SHA-256: `' + digest(newBytes) + '`.', '',
  'The exact evaluation-file hashes are in the private revised dataset engine-baseline.json. This fingerprint is a baseline, not final human release approval.', '',
  '## Before the October 19 run', '', 'Current clean test: 0 fraud, 0 legit. Target by Sunday, October 18: 20 verified received fraud and 20 verified received legit messages. Shortfall: 20 and 20. No score or interval exists for an empty test set.', '',
  'New real intake defaults to test before app processing. A family that overlaps dev goes to dev as a whole. Existing source text, labels and expectations are preserved. Unknown provenance and ambiguous families stay out of held-out claims. Freeze a new final file after review; do not edit any historical lock.', '',
  'The prior two-thirds count-off target and per-group five-row rule are superseded by the new leakage-first, new-real-intake rule. Do not pad test with synthetic rows or repeat variants to reach a count.', '',
  'Plain evaluation and the all split are disabled. Test execution requires the real Los Angeles date to be October 19 or later, a ready release descriptor with exact input and engine hashes, and an unused one-attempt receipt. An interrupted attempt also consumes that receipt. Do not delete it to tune and rerun.', '',
  'Only approved dev runs occur before that date. Keep final test report text private; publish aggregate counts, intervals and IDs without message excerpts. Report a small held-out pilot if intake is below target, and preserve the first result even if disappointing.', ''];
fs.writeFileSync(path.join(root, 'docs/testing/split-audit.md'), audit.join('\n'));
assert.equal(digest(fs.readFileSync(source)), expectedSha);
console.log(JSON.stringify({ original_rows: originals.length, families: families.length, revised_dev: rows.length,
  revised_test: 0, moved_test_to_dev: moves.length, dev_to_test: 0,
  public_dev_caught_before: catchRates.find(r => r.source_kind === 'public_example' && r.run === 'before'),
  public_dev_caught_after: catchRates.find(r => r.source_kind === 'public_example' && r.run === 'after'),
  verified_real_rows: 0, paused: paused.length, source_unchanged: true }, null, 2));
