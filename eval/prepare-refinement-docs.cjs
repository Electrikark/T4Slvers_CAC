'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { toCsv } = require('./csv.cjs');
const { loadEngine } = require('./engine.cjs');
const root = path.join(__dirname, '..');
const docs = path.join(root, 'docs/testing');
const output = name => path.join(docs, name);
const write = (name, lines) => fs.writeFileSync(output(name), lines.join('\n') + '\n');
const link = (label, relative) => `[${label}](${path.join(root, relative)})`;
const sources = [
  ['usps','https://news.usps.com/2024/06/26/dont-get-smished/'],
  ['amazon','https://digprjsurvey.amazon.com/csad/help/node/T2W6VB0DExBF3oyVvx'],
  ['chase','https://www.chase.com/digital/resources/privacy-security/security/self-service-text-messages'],
  ['bankofamerica','https://web.bankofamerica.com/en/security/report-suspicious-activity'],
  ['wellsfargo','https://www.wellsfargo.com/privacy-security/fraud/bank-scams/bank-imposter/'],
  ['apple','https://support.apple.com/en-us/102568'],
  ['paypal','https://www.paypal.com/us/security/report-suspicious-messages?locale=us'],
  ['microsoft','https://support.microsoft.com/en-us/security/avoid-and-report-microsoft-technical-support-scams'],
  ['irs','https://www.irs.gov/help/tax-scams'],
  ['ssa','https://www.ssa.gov/scam/'],
  ['ups','https://www.ups.com/us/en/business-solutions/ups-billing'],
  ['geeksquad','https://www.bestbuy.com/site/privacy-policy/protect-yourself/pcmcat266100050002.c?id=pcmcat266100050002']
];
const loaded = loadEngine(root, { today: '2026-10-17' });
const queue = sources.map(([id, sourceUrl]) => {
  const org = loaded.store.orgs.find(o => o.id === id);
  if (!org) throw new Error('Missing store entry: ' + id);
  return { org_id: id, organization: org.displayName, listed_domains_to_review: org.officialDomains.join(' '),
    research_source: sourceUrl, research_located: '2026-10-17', status: 'draft',
    approved_kind: '', approved_value: '', scope_type: '', scope_path: '', sourceUrl: '',
    checkedOn: '', reviewDue: '', reviewedBy: '', decision_notes: '' };
});
fs.writeFileSync(path.join(root, 'eval/data/company-review-queue.csv'), toCsv(Object.keys(queue[0]), queue));

write('holdout-refinement-2026-10-17.md', [
  '# Refined evidence and holdout plan', '',
  'Updated October 17, 2026. This supersedes the prior preserve-all split policy and earlier video framing.', '',
  '## The two requested numbers', '',
  'Original source partition, before the new family audit:', '',
  '| Source cohort | Dev fraud | Dev legit | Test fraud | Test legit |', '|---|---:|---:|---:|---:|',
  '| Public examples/templates | 36 | 42 | 9 | 7 |', '| Synthetic | 50 | 50 | 0 | 0 |', '| Verified received messages | 0 | 0 | 0 | 0 |', '',
  'Public examples may include genuine quoted cases, but none is authenticated here as received-message evidence. All seven former legit test rows are published templates/examples. Do not rename the public cohort real.', '',
  '**Verified real-dev catch rate: unavailable.** The public-example comparison is **5/36 before, 6/36 after** (13.9% to 16.7%). These are the same dev rows used for repairs. Wilson row-count ranges are 6.1%–28.7% and 7.9%–31.9%; they do not turn a tuned, clustered convenience sample into a field estimate. Synthetic fraud rose from 8/50 to 29/50.', '',
  'Zero of 92 legit dev rows were Suspicious, but 50 are synthetic and 42 are public examples/templates. This is not a measured real-world false-alarm rate. Zero false reassurance was structurally enforced by the absence of reviewed reference records, not earned by detection quality.', '',
  'The same Insufficient Evidence headline appeared on 143/178 original dev rows: 51 fraud and 92 legit. Tier 2 explanations can still differ. This is a verdict-separation limit, not proof that users gain nothing; the phone pilot must test understanding and next actions. Reference review will not make an otherwise unverifiable login code or receipt match automatically.', '',
  '## Why 51 fraud rows paused', '',
  'The original single root-cause tags remain: 45 other and six missing record. Their specific limits are:', '',
  '| Current limitation | Rows |', '|---|---:|',
  '| Destination replaced by a placeholder | 9 |',
  '| Domain lacks the specific deception evidence required by the rule | 5 |',
  '| Sender reference absent | 6 |',
  '| Callback lacks required device-alarm context | 7 |',
  '| Remote request lacks qualifying pressure | 6 |',
  '| Card purchase lacks qualifying payment/disclosure evidence | 6 |',
  '| Isolated opener lacks a Tier 1 action | 7 |',
  '| General money appeal lacks a specified Tier 1 method | 4 |',
  '| Indirect third-party wire need falls outside sender-demand scope | 1 |', '| Total | 51 |', '',
  'These describe input evidence and the current policy contract. They are not 51 parser bugs. No detection wording was changed in this refinement. The scope of agreed gaps 2–4 is still needed before further detection work.', '',
  '## Revised split and intake', '',
  'All 16 former test rows were retired to dev through conservative family merges. Every move and reason is in ' + link('the split audit', 'docs/testing/split-audit.md') + '. No dev row moved to test. All 194 rows remain; only group IDs and splits changed in a new version. The earlier lock is unchanged.', '',
  'The revised baseline has **54 families, 194 dev rows (95 fraud, 99 legit), and zero test rows**. The old 178-row dev results remain historical evidence. The retired rows were inspected for family/label assignment, not passed to the app or used to alter detection rules. There is no score for the revised full pool or for test.', '',
  'Current verified test intake is **0 fraud and 0 legit**. Target by Sunday, October 18: 20 of each. Shortfall: 20 and 20. An empty set has no rate or interval. Do not pad with synthetic rows, exposed dev rows or repeated-family variants.', '',
  '## Evaluation controls', '',
  '- Omitted and all splits are refused. Only explicit dev or test selection is accepted.',
  '- Test is blocked before October 19 in Los Angeles time; the reference-date flag cannot unlock it.',
  '- Release requires named source/family approval, exact input and evaluation-file hashes, a dev-exposure ledger hash and a fixed reference date. Known dev IDs, family IDs and normalized copies are rejected. Semantic variants still need independent review.',
  '- One attempt is reserved before test analysis. Interrupted attempts also consume the receipt. A text-free helper preserves the first public result.',
  '- The full suite now passes **1,203 checks**, including 23 evaluation-harness checks. Detection rules and the real reference store are unchanged from the prior tested version.', '',
  '## Weekend priorities and open inputs', '',
  'First, complete human review of ' + link('the 12-company queue', 'docs/testing/company-review-packet.md') + '. Next, collect varied real intake and complete ' + link('the phone/pilot checks', 'docs/testing/phone-pilot-plan.md') + '. Keep wording fixes stopped until gaps 2–4 are defined.', '',
  'Reviewed records may enable Details Match when other gate conditions hold. They do not authenticate a sender, make every legit row match, or fix every missed fraud. Reviewing the twelve existing companies does not add absent brands from the six missing-reference cases.', '',
  'Volunteer sign-off, roster, utility area, devices and pilot time are pending. No company was marked reviewed, no volunteer message was sent, and no actual-phone check or booking is claimed complete. A merged final release and approved test freeze are still pending. Preserve the first October 19 outcome; report exact counts and ranges as a small held-out pilot if intake is below target.', '',
  'Private evidence: ' + link('source counts and per-ID paused causes', 'eval/results/holdout-refinement-2026-10-16') + '. The revision folders retain the work-start date. The older 1,199-check run and original result files remain historical evidence.'
]);

write('split-protocol.md', [
  '# Revised grouping and holdout protocol', '',
  'Updated October 17, 2026. The removal-only rule supersedes prior count-off and per-group five-row rules for this exposed corpus.', '',
  '## Current state', '',
  'The historical lock is unchanged. A separate version has 194 dev rows, 54 conservative families and no test rows. All 16 former test rows moved to dev; none was deleted. No dev row moved into test. The original 178-row dev analysis remains historical; retired rows have not been evaluated. See ' + link('the ID-level audit', 'docs/testing/split-audit.md') + '.', '',
  '## Intake before app use', '',
  '1. Use ' + link('the private intake file', 'eval/data/prospective-test-intake.csv') + '. Redact names, accounts, addresses and live secrets. Retain decision-relevant sender links and contact numbers privately; record any replacements. Do not follow suspicious destinations.',
  '2. Establish label and expected findings from origin and message evidence before app use. Distinguish verified received messages, authenticated published cases, unverified public examples/templates and synthetic items.',
  '3. New real intake defaults to test pending family review. Fraud families use the same story and ask; toll sites distinguish families when observable. Legit families use the same company and alert type.',
  '4. Check all known dev aliases. A family touching dev goes wholly to dev and the move is logged. When uncertain, merge conservatively or exclude it from held-out claims. Never promote an exposed row, renamed copy or synthetic item into test.',
  '5. Label/source review of test is allowed. Do not run the app on it or alter detection rules from what it reveals. Keep observations sealed in the ignored private note until after the first test.', '',
  '## Final release', '',
  'Aim for 20 verified fraud and 20 verified legit messages by Sunday, October 18, across varied sources and families. Current shortfall: 20 and 20. Count families as well as rows. Templates do not fill a received-message target.', '',
  'Finish human reference review and approved repairs before freeze. Record exact data, code, exposure-ledger hashes, reference date and named source/family approval. Local edits alone are not a merged release.', '',
  'Bare evaluation and all are disabled. Test needs October 19 or later in Los Angeles time and a ready release. One attempt is reserved before analysis, including an interrupted attempt. Do not remove the receipt to tune and rerun.', '',
  'Publish the first result with exact counts and ranges using the text-free helper. Preserve old locks. A small set is a small held-out pilot; an empty set has no score.'
]);

write('company-review-packet.md', [
  '# Draft company-reference review packet', '',
  'Prepared October 17, 2026. Twelve existing store entries are queued. This is a practical scope, not an empirical ranking. No company is human-approved by this packet. Add a utility only after the service area is known.', '',
  '| Store ID | Organization | Primary-source starting page |', '|---|---|---|',
  ...queue.map(r => `| ${r.org_id} | ${r.organization} | [Official guidance](${r.research_source}) |`), '',
  'The private ' + link('review queue', 'eval/data/company-review-queue.csv') + ' contains existing listed domains and blank approval fields. These pages were located for research. A page loading does not validate every listed domain, phone or sender claim.', '',
  '## Human review', '',
  '1. Open the primary source independently. Review each contact separately; do not blanket-approve all legacy domains.',
  '2. Confirm the exact domain or phone, region, purpose and narrow scope. Shared platforms and redirects need care. Do not derive an official number from suspicious content.',
  '3. Record sourceUrl, checkedOn, reviewDue, reviewedBy, kind, value, scope and decision. Use the actual reviewer and date; follow the existing 90-day review policy.',
  '4. Integrate only human-approved contact-level records. Keep draft and unresolved records ineligible. Run trusted-view and paired checks before final freeze.',
  '5. Verify the eligible record count. A listed company or automated research check is not a completed human review.', '',
  'Details Match requires the reviewed reference and all other gate conditions. It does not prove a safe message or authentic sender. These twelve entries do not add absent international brands solely to fit the public-example corpus.', '',
  'Volunteer delivery needs the roster, Google emails and utility service area. No Sheets or volunteer messages were sent. Once those inputs exist, use one access-isolated file per person.'
]);

write('phone-pilot-plan.md', [
  '# Phone checks and pilot preparation', '',
  'Status: prepared, not performed or booked. Device types, participant details and proposed time are pending.', '',
  'Use synthetic practice controls before the held-out run. Never paste prospective test messages into the app for a quick try.', '',
  '| Check | Evidence | Status |', '|---|---|---|',
  '| Actual iPhone Safari and Android Chrome | Device, OS, browser, build hash and date | Pending devices |',
  '| Small screen and large text | Readable verdict, evidence, next step and controls | Not run |',
  '| Paste, clear, retry | Exact source spans and removal of stale results | Not run |',
  '| Paired scam/normal practice cases | Expected outcomes against the frozen engine | Not run |',
  '| Screen reader and touch | Labels, focus order and usable actions | Not run |',
  '| Offline/privacy | After initial load, note offline behavior and whether text leaves the device | Not run |',
  '| Low-evidence explanation | Participant explains pausing versus confirming legitimacy | Not run |', '',
  'Desktop tests and browser emulation do not count as actual-phone checks.', '',
  '## Booking inputs', '',
  '- Date/time and timezone: pending.', '- Organizer and consenting participant contact: pending.',
  '- Location or private call link: pending.', '- Phones and accessibility needs: pending.', '',
  'Use a short practice session to observe pasting, evidence reading and choice of next step. Record task completion and confusion separately from detection metrics. Do not claim reduced fraud loss from this pilot. No event or participant message was sent.'
]);

const notices = [
  ['dev-analysis-notes.md', 'Historical cohort notice: the results below use the original 178 dev rows. The October 17 refinement retires all 16 former test rows to a separate dev-only version. Public-example fraud caught changed from 5/36 to 6/36; no received-message cohort is verified. Zero false reassurance was structurally enforced.'],
  ['dev-failure-analysis.md', 'Historical results: the scores below use the original 178 dev rows. The revised baseline has 194 dev rows and zero test rows; retired test rows are not included in these scores. No received-message cohort is verified. Zero false reassurance was a structural constraint, not detection evidence.'],
  ['session-report-2026-10-16.md', 'Historical report notice: the October 17 refinement supersedes the split status and performance framing below. All 16 former test rows were retired to dev in a new version; the older lock is intact. The prospective holdout is empty. The evaluation-control suite now passes 1,203 checks.']
];
for (const [name, notice] of notices) {
  const file = output(name), text = fs.readFileSync(file, 'utf8');
  if (!text.includes(notice)) {
    const at = text.indexOf('\n');
    fs.writeFileSync(file, text.slice(0, at + 1) + '\n' + notice + ' See ' + link('the refined report', 'docs/testing/holdout-refinement-2026-10-17.md') + '.\n' + text.slice(at + 1));
  }
}
const sealed = output('test-observations.md');
if (!fs.existsSync(sealed)) fs.writeFileSync(sealed, '# Sealed test observations\n\nPrivate, ignored by Git. No detector observations are recorded. Keep new test-derived ideas sealed until after the first held-out result. Do not add original message text.\n', { mode: 0o600, flag: 'wx' });
console.log(JSON.stringify({ reviewedCompanies: loaded.reviewedOrgs, draftQueue: queue.length, docsPrepared: 4, sealedNoteCreated: true }));
