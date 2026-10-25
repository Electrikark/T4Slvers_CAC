/* Rerun a locked message set on the CURRENT engine and print one table per message.
 *
 * Why this exists: the 5-of-14 figure in claude/cac-scamcheck-findings-2026-10-24.md comes
 * from a corpus snapshot dated 17 October 2026 at revision 24ec488, and the app was not
 * rerun during that collection. Two engine changes landed afterwards (the reporting-scope
 * repair and the 0.4.2 courtesy-word fix), so that number may be stale in either direction.
 *
 * It also answers the question the old number cannot: "Insufficient Evidence" is not the
 * same as "showed nothing". The engine may return insufficient_evidence while still
 * carrying Tier 2 findings. This splits those apart.
 *
 * Usage:
 *   node eval/rerun-locked.cjs --in <messages.csv> [--out <dir>] [--today YYYY-MM-DD]
 *
 * Input CSV needs at least: id, label (fraud|legit), text. channel is used if present
 * (text|email|unknown), otherwise unknown. Extra columns are ignored.
 *
 * Writes <out>/rerun-<date>.csv and <out>/rerun-<date>.md, and prints the summary.
 * It reads the engine and the store; it writes nothing into either.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { loadEngine } = require('./engine.cjs');
const { parseCsv } = require('./csv.cjs');

// parseCsv returns arrays of cells; turn the first row into keys.
function readRecords(text) {
  const grid = parseCsv(text);
  if (!grid.length) return [];
  const header = grid[0].map(h => h.trim());
  return grid.slice(1).map(cells => {
    const rec = {};
    header.forEach((key, i) => { rec[key] = (cells[i] ?? '').trim(); });
    return rec;
  });
}

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i === -1 || i === process.argv.length - 1 ? fallback : process.argv[i + 1];
}

const inPath = arg('--in', null);
const outDir = arg('--out', path.join(__dirname, 'data'));
const today = arg('--today', undefined);

if (!inPath) {
  console.error('Need --in <messages.csv>. See eval/messages.template.csv for the columns.');
  process.exit(2);
}
if (!fs.existsSync(inPath)) {
  console.error(`No such file: ${inPath}`);
  process.exit(2);
}

const { engine, store, reviewedOrgs, analyze } = loadEngine(path.join(__dirname, '..'), { today });

// --- read the rows -----------------------------------------------------------------

const rows = readRecords(fs.readFileSync(inPath, "utf8"));
if (!rows.length) {
  console.error('No rows in the input file.');
  process.exit(2);
}
for (const r of rows) {
  if (!r.id || !r.label || !r.text) {
    console.error(`A row is missing id, label or text: ${JSON.stringify(r).slice(0, 120)}`);
    process.exit(2);
  }
  if (r.label !== 'fraud' && r.label !== 'legit') {
    console.error(`Row ${r.id}: label must be exactly "fraud" or "legit", not "${r.label}".`);
    process.exit(2);
  }
}

// --- run ---------------------------------------------------------------------------

const CHANNELS = new Set(['text', 'email', 'unknown']);

function tierCodes(result, tier) {
  const findings = (result.evidence && result.evidence.findings) || [];
  return findings
    .filter(f => f.tier === tier)
    .map(f => f.ruleId)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort();
}

const out = rows.map(r => {
  const channel = CHANNELS.has(r.channel) ? r.channel : 'unknown';
  const result = analyze(r.text, channel);
  const t1 = tierCodes(result, 1);
  const t2 = tierCodes(result, 2);
  const blocked = ((result.trace && result.trace.blockedBy) || []).slice().sort();
  return {
    id: r.id,
    label: r.label,
    channel,
    verdict: result.assessment,
    tier1: t1,
    tier2: t2,
    blockedBy: blocked,
    // The distinction the old number hides.
    showedSomething: t1.length + t2.length > 0,
    engineVersion: result.engineVersion,
    storeVersion: result.storeVersion,
    trustedRecords: (result.referenceView && result.referenceView.trusted) ?? null
  };
});

// --- summarise ---------------------------------------------------------------------

const fraud = out.filter(r => r.label === 'fraud');
const legit = out.filter(r => r.label === 'legit');

const count = (arr, fn) => arr.filter(fn).length;

const summary = {
  // Local calendar day, not UTC: a run at 5pm Pacific must not be stamped tomorrow.
  ranOn: (() => {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  })(),
  engineVersion: out[0].engineVersion,
  storeVersion: out[0].storeVersion,
  trustedRecords: out[0].trustedRecords,
  reviewedOrgs,
  inputFile: path.resolve(inPath),
  messages: out.length,
  fraud: {
    total: fraud.length,
    suspicious: count(fraud, r => r.verdict === 'suspicious'),
    insufficientWithCaution: count(fraud, r => r.verdict === 'insufficient_evidence' && r.showedSomething),
    insufficientSilent: count(fraud, r => r.verdict === 'insufficient_evidence' && !r.showedSomething),
    detailsMatch: count(fraud, r => r.verdict === 'details_match'),
    other: count(fraud, r => !['suspicious', 'insufficient_evidence', 'details_match'].includes(r.verdict))
  },
  legit: {
    total: legit.length,
    suspicious: count(legit, r => r.verdict === 'suspicious'),
    insufficientWithCaution: count(legit, r => r.verdict === 'insufficient_evidence' && r.showedSomething),
    insufficientSilent: count(legit, r => r.verdict === 'insufficient_evidence' && !r.showedSomething),
    detailsMatch: count(legit, r => r.verdict === 'details_match')
  }
};

// A fraud message reaching Details Match is the safety property that must never break.
const safetyBreaches = fraud.filter(r => r.verdict === 'details_match').map(r => r.id);

// --- write -----------------------------------------------------------------------

fs.mkdirSync(outDir, { recursive: true });
const stamp = summary.ranOn;

const csvHeader = 'id,label,channel,verdict,tier1,tier2,blockedBy,showed_something,engine_version,store_version\n';
const csvBody = out
  .map(r =>
    [
      r.id,
      r.label,
      r.channel,
      r.verdict,
      r.tier1.join(' '),
      r.tier2.join(' '),
      r.blockedBy.join(' '),
      r.showedSomething ? 'yes' : 'no',
      r.engineVersion,
      r.storeVersion
    ]
      .map(v => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v)))
      .join(',')
  )
  .join('\n');
const csvPath = path.join(outDir, `rerun-${stamp}.csv`);
fs.writeFileSync(csvPath, csvHeader + csvBody + '\n');

const md = [];
md.push(`# Locked-set rerun — ${stamp}`);
md.push('');
md.push(`- Engine version: \`${summary.engineVersion}\``);
md.push(`- Store version: \`${summary.storeVersion}\``);
md.push(`- Reviewed reference records in the trusted view: **${summary.trustedRecords}**` +
  (summary.trustedRecords === 0 ? ' — Details Match is unreachable, so no message can return it.' : ''));
md.push(`- Input: \`${summary.inputFile}\``);
md.push(`- Messages: ${summary.messages} (${summary.fraud.total} fraud, ${summary.legit.total} legit)`);
md.push('');
md.push('## Scam messages');
md.push('');
md.push('| Outcome | Count |');
md.push('|---|---|');
md.push(`| Suspicious | ${summary.fraud.suspicious} of ${summary.fraud.total} |`);
md.push(`| Insufficient Evidence, but a caution was shown | ${summary.fraud.insufficientWithCaution} |`);
md.push(`| Insufficient Evidence, nothing shown at all | ${summary.fraud.insufficientSilent} |`);
if (summary.fraud.detailsMatch) md.push(`| **Details Match (safety breach)** | ${summary.fraud.detailsMatch} |`);
if (summary.fraud.other) md.push(`| Other verdict | ${summary.fraud.other} |`);
md.push('');
md.push('The last two rows are the ones the old "9 Insufficient Evidence" figure could not tell apart.');
md.push('A message that showed a caution is a different product failure from one that showed nothing.');
md.push('');
md.push('## Legitimate messages');
md.push('');
md.push('| Outcome | Count |');
md.push('|---|---|');
md.push(`| Suspicious (false alarm) | ${summary.legit.suspicious} of ${summary.legit.total} |`);
md.push(`| Insufficient Evidence, but a caution was shown | ${summary.legit.insufficientWithCaution} |`);
md.push(`| Insufficient Evidence, nothing shown | ${summary.legit.insufficientSilent} |`);
md.push(`| Details Match | ${summary.legit.detailsMatch} |`);
md.push('');
md.push('## Per message');
md.push('');
md.push('| id | label | verdict | Tier 1 | Tier 2 | blocked by |');
md.push('|---|---|---|---|---|---|');
for (const r of out) {
  md.push(`| ${r.id} | ${r.label} | ${r.verdict} | ${r.tier1.join(', ') || '—'} | ${r.tier2.join(', ') || '—'} | ${r.blockedBy.join(', ') || '—'} |`);
}
md.push('');
md.push('## Reporting rule');
md.push('');
md.push('Counts only. No percentages and no rates on a set this size. Scope every sentence to');
md.push(`this message set, engine \`${summary.engineVersion}\`, store \`${summary.storeVersion}\`, run ${stamp}.`);
md.push('');
md.push('Once a rule is repaired against any message in this set, that message is development');
md.push('data. It can still be quoted with its date and revision; it can no longer be evidence');
md.push('that the engine improved.');
const mdPath = path.join(outDir, `rerun-${stamp}.md`);
fs.writeFileSync(mdPath, md.join('\n') + '\n');

// --- report ----------------------------------------------------------------------

console.log(`engine ${summary.engineVersion} | store ${summary.storeVersion} | trusted records ${summary.trustedRecords}`);
console.log('');
console.log(`scams   ${summary.fraud.total}: suspicious ${summary.fraud.suspicious}` +
  ` | insufficient+caution ${summary.fraud.insufficientWithCaution}` +
  ` | insufficient+silent ${summary.fraud.insufficientSilent}` +
  (summary.fraud.detailsMatch ? ` | DETAILS MATCH ${summary.fraud.detailsMatch}` : ''));
console.log(`legit   ${summary.legit.total}: suspicious ${summary.legit.suspicious}` +
  ` | insufficient+caution ${summary.legit.insufficientWithCaution}` +
  ` | insufficient+silent ${summary.legit.insufficientSilent}` +
  ` | details match ${summary.legit.detailsMatch}`);
console.log('');
console.log(`wrote ${csvPath}`);
console.log(`wrote ${mdPath}`);

if (safetyBreaches.length) {
  console.error('');
  console.error(`SAFETY BREACH: a scam message reached Details Match: ${safetyBreaches.join(', ')}`);
  process.exit(1);
}
