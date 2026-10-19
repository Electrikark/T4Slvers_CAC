'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { parseCsv } = require('./csv.cjs');
const { digest } = require('./dataset.cjs');
const { tally } = require('./metrics.cjs');
const safe = value => String(value || '').replace(/[|\r\n]/g, ' ').replace(/[<>]/g, '');

function buildReport(rows, receipt) {
  if (!rows.length || rows.some(r => r.split !== 'test')) throw new Error('A nonempty test-only result is required.');
  const t = tally(rows);
  const range = value => value ? `${(100 * value.low).toFixed(1)}%–${(100 * value.high).toFixed(1)}%` : 'N/A';
  return ['# Held-out result: 2026-10-19', '',
    t.fraud.n < 20 || t.legit.n < 20 ? 'This is a small held-out pilot.' : 'This is a held-out pilot.', '',
    '| Measure | Count | 95% Wilson range |', '|---|---:|---|',
    `| Fraud marked Suspicious | ${t.fraud.suspicious}/${t.fraud.n} | ${range(t.rates.caught)} |`,
    `| Legit marked Suspicious | ${t.legit.suspicious}/${t.legit.n} | ${range(t.rates.falseAlarm)} |`,
    `| Fraud with Insufficient Evidence | ${t.fraud.insufficient}/${t.fraud.n} | — |`,
    `| Legit with Insufficient Evidence | ${t.legit.insufficient}/${t.legit.n} | — |`,
    `| Legit with Tier 2 warnings | ${rows.filter(r => r.label === 'legit' && String(r.tier2 || '').trim()).length}/${t.legit.n} | — |`, '',
    'Intervals describe row counts under independent-trial assumptions. Repeated families and convenience sampling limit wider claims. Report distinct families and provenance separately.', '',
    'Zero false reassurance is not detection evidence when no reviewed records allow Details Match.', '',
    'Frozen input SHA-256: `' + safe(receipt.sha256) + '`.', '',
    '| id | label | assessment | outcome |', '|---|---|---|---|',
    ...rows.map(r => `| ${safe(r.id)} | ${safe(r.label)} | ${safe(r.assessment)} | ${safe(r.outcome)} |`), ''].join('\n');
}

function main(root = path.join(__dirname, '..')) {
  const receipt = JSON.parse(fs.readFileSync(path.join(root, 'eval/results/test-evaluation-receipt.json'), 'utf8'));
  if (receipt.phase !== 'complete') throw new Error('No completed single test attempt is available.');
  const raw = fs.readFileSync(receipt.results);
  if (digest(raw) !== receipt.resultsSha256) throw new Error('Saved test results changed.');
  const [headers, ...cells] = parseCsv(raw.toString('utf8'));
  const rows = cells.map(row => Object.fromEntries(headers.map((h, i) => [h, row[i]])));
  const output = path.join(root, 'docs/testing/test-result-2026-10-19.md');
  fs.writeFileSync(output, buildReport(rows, receipt), { flag: 'wx' });
  console.log('Saved a text-free public test report.');
}

if (require.main === module) {
  try { main(); } catch (err) { console.error(err.message); process.exitCode = 2; }
}
module.exports = { buildReport, main };
