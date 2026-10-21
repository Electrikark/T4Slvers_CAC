/* Step 2 of the ML experiment: the rules' verdict (B) for every public message.
   Uses eval/engine.cjs, so the engine files, reference list and policies are exactly the app's.
   It does not use `npm run eval`, which logs every dev run in eval/data/exposure-ledger.json;
   public messages should not enter that log.

   Run:  node ml/rules_verdicts.cjs --today 2026-10-21
   In:   ml/data/public_splits.csv
   Out:  ml/results/rules_public.csv   id, ml_split, label, assessment, tier1, tier2
         ml/results/rules_public.json  engine version, list version, reviewed count, date */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseCsv, toCsv } = require('../eval/csv.cjs');
const { loadEngine } = require('../eval/engine.cjs');
const M = require('../eval/metrics.cjs');

const root = path.join(__dirname, '..');
const arg = name => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : null; };
const today = arg('today');
if (!today || !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
  console.error('Give the reference date, e.g. --today 2026-10-21 (review dates are checked against it).');
  process.exit(2);
}

const input = path.join(__dirname, 'data/public_splits.csv');
if (!fs.existsSync(input)) { console.error('Run python ml/prepare.py first.'); process.exit(2); }
const rows = parseCsv(fs.readFileSync(input, 'utf8'));
const header = rows[0];
const messages = rows.slice(1).map(cells => Object.fromEntries(header.map((h, k) => [h, cells[k]])))
  .map(r => Object.assign(r, { channel: 'text' }));

const loaded = loadEngine(root, { today });
const started = Date.now();
const judged = M.judge(messages, loaded.analyze);
const out = judged.map(r => ({
  id: r.id, ml_split: r.ml_split, label: r.label, assessment: r.assessment,
  tier1: r.tier1.join(' '), tier2: r.tier2.join(' ')
}));

fs.mkdirSync(path.join(__dirname, 'results'), { recursive: true });
const outCsv = path.join(__dirname, 'results/rules_public.csv');
fs.writeFileSync(outCsv, toCsv(['id', 'ml_split', 'label', 'assessment', 'tier1', 'tier2'], out));
const count = (label, a) => out.filter(r => r.label === label && r.assessment === a).length;
const info = {
  date: today,
  engine: loaded.engine.version,
  referenceList: loaded.store.version,
  organizationsWithTrustedContact: `${loaded.reviewedOrgs} of ${loaded.store.orgs.length}`,
  inputSha256: crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex'),
  seconds: Math.round((Date.now() - started) / 1000),
  fraud: { suspicious: count('fraud', 'suspicious'), insufficient_evidence: count('fraud', 'insufficient_evidence'), details_match: count('fraud', 'details_match') },
  legit: { suspicious: count('legit', 'suspicious'), insufficient_evidence: count('legit', 'insufficient_evidence'), details_match: count('legit', 'details_match') }
};
fs.writeFileSync(path.join(__dirname, 'results/rules_public.json'), JSON.stringify(info, null, 2) + '\n');
console.log(JSON.stringify(info, null, 2));
console.log('Wrote ml/results/rules_public.csv');
