/* Compares the engine's reading of each screenshot's OCR text with its reading of the exact
   visible text. Both sides use inputSource "screenshot", the same declared channel, the same
   store and the same evaluation date, so only the OCR errors differ.

   Run:  node experiments/ocr-robustness/analyze.cjs
   In:   out/ocr.json (from render_ocr.cjs)
   Out:  out/report.md, out/details.json */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { loadEngine } = require('../../eval/engine.cjs');
const { storeFor } = require('../../tests/reporting-scope/setup.js');
const { messages } = require('./messages.cjs');

const OUT = path.join(__dirname, 'out');
const cache = JSON.parse(fs.readFileSync(path.join(OUT, 'ocr.json'), 'utf8'));
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, '../../tests/reporting-scope/fixture.json'), 'utf8'));
const loaded = loadEngine();
const byId = new Map(messages().map(m => [m.id, m]));
const DAY = fixture.evaluation_date;
const vm = require('node:vm');
const sandbox = vm.createContext({}); sandbox.window = sandbox;
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../js/engine/normalize.js'), 'utf8'), sandbox);
const unwrap = text => sandbox.TFS.unwrapLayout(text).text;

function read(text, m) {
  const store = m.store === 'real' ? loaded.store : storeFor(m.store.split(':')[1]);
  const r = loaded.engine.analyze(text, store, { declaredChannel: 'text', inputSource: 'screenshot', today: DAY });
  const est = r.evidence.findings.filter(f => f.status === 'established');
  return {
    assessment: r.assessment,
    tier1: [...new Set(est.filter(f => f.tier === 1).map(f => f.ruleId))].sort(),
    tier2: [...new Set(est.filter(f => f.tier === 2).map(f => f.ruleId))].sort(),
    checks: r.checks.filter(c => c.code !== 'ocr_text_unverified').map(c => c.code + (c.target ? ':' + c.target : '')).sort()
  };
}

// Fields a person might act on: web addresses, phone numbers, money amounts and codes.
function fields(text) {
  const t = text.replace(/\s+/g, ' ');
  const set = (re, f = x => x) => [...new Set([...t.matchAll(re)].map(m => f(m[0])))].sort();
  return {
    links: set(/\b(?:https?:\/\/)?(?:[a-z0-9-]+\.)+(?:com|net|org|gov|top|xyz|site|info|us)(?:\/[^\s]*)?/gi, s => s.toLowerCase().replace(/[.,;:!?]+$/, '')),
    phones: set(/\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b|\b1-\d{3}-\d{3}-\d{4}\b/g, s => s.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')),
    amounts: set(/\$\s?\d[\d,]*(?:\.\d{2})?/g, s => s.replace(/\s/g, '')),
    codes: set(/\b\d{4,8}\b/g)
  };
}

function cer(a, b) {
  const x = a.replace(/\s+/g, ' ').trim(), y = b.replace(/\s+/g, ' ').trim();
  const d = Array.from({ length: x.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= y.length; j++) d[0][j] = j;
  for (let i = 1; i <= x.length; i++) for (let j = 1; j <= y.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
  }
  return x.length ? d[x.length][y.length] / x.length : 0;
}

const diff = (a, b) => ({ lost: a.filter(x => !b.includes(x)), gained: b.filter(x => !a.includes(x)) });
const rows = [];
for (const entry of Object.values(cache)) {
  const m = byId.get(entry.id);
  if (!m || m.text !== entry.text) continue;
  const base = read(entry.text, m), ocr = read(entry.ocr, m);
  // Fields are compared on the OCR text as the engine reads it (wrapped lines joined, T.unwrapLayout).
  const fb = fields(entry.text), fo = fields(unwrap(entry.ocr));
  const fieldChanges = {};
  for (const k of Object.keys(fb)) { const d = diff(fb[k], fo[k]); if (d.lost.length || d.gained.length) fieldChanges[k] = d; }
  rows.push({
    id: m.id, source: m.source, condition: entry.condition, cer: cer(entry.text, entry.ocr), confidence: entry.confidence, ms: entry.ms,
    verdict: [base.assessment, ocr.assessment], tier1: diff(base.tier1, ocr.tier1), tier2: diff(base.tier2, ocr.tier2),
    checks: diff(base.checks, ocr.checks), fields: fieldChanges, text: entry.text, ocr: entry.ocr
  });
}

const conditions = [...new Set(rows.map(r => r.condition))];
const pct = (k, n) => n ? `${k}/${n} (${(100 * k / n).toFixed(1)}%)` : '0/0';
const any = (list, f) => list.filter(f).length;
const lostT1 = r => r.tier1.lost.length > 0, gainT1 = r => r.tier1.gained.length > 0;
const lostT2 = r => r.tier2.lost.length > 0, gainT2 = r => r.tier2.gained.length > 0;
const lostSusp = r => r.verdict[0] === 'suspicious' && r.verdict[1] !== 'suspicious';
const newSusp = r => r.verdict[0] !== 'suspicious' && r.verdict[1] === 'suspicious';
const toMatch = r => r.verdict[0] !== 'details_match' && r.verdict[1] === 'details_match';
const fieldHit = r => Object.keys(r.fields).length > 0;

const lines = ['# OCR robustness: rules on OCR text vs the exact visible text', '',
  `Engine ${loaded.engine.version}, list ${loaded.store.version}, evaluation date ${DAY}. Both sides analyzed with inputSource "screenshot".`,
  `${new Set(rows.map(r => r.id)).size} unique messages x ${conditions.length} conditions = ${rows.length} screenshots. ` +
  'Conditions are renderings of the same message, not independent examples.', '',
  '| Condition | Median char error | Lost a Tier 1 rule | Gained a Tier 1 rule | Lost a Tier 2 warning | Gained a Tier 2 warning | Suspicious lost | Suspicious gained | Became Details Match | Changed a link, phone, amount or code |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'];
for (const c of conditions.concat('all')) {
  const list = c === 'all' ? rows : rows.filter(r => r.condition === c);
  const cers = list.map(r => r.cer).sort((a, b) => a - b);
  lines.push(`| ${c} | ${(100 * cers[Math.floor(cers.length / 2)]).toFixed(1)}% | ${pct(any(list, lostT1), list.length)} | ${pct(any(list, gainT1), list.length)} | ` +
    `${pct(any(list, lostT2), list.length)} | ${pct(any(list, gainT2), list.length)} | ${pct(any(list, lostSusp), list.length)} | ${pct(any(list, newSusp), list.length)} | ` +
    `${pct(any(list, toMatch), list.length)} | ${pct(any(list, fieldHit), list.length)} |`);
}
const uniq = f => new Set(rows.filter(f).map(r => r.id)).size;
lines.push('', `Unique messages affected in at least one condition: lost Tier 1 ${uniq(lostT1)}, lost Suspicious ${uniq(lostSusp)}, ` +
  `gained Suspicious ${uniq(newSusp)}, field changed ${uniq(fieldHit)}, of ${new Set(rows.map(r => r.id)).size}.`, '');

const rulesLost = {};
for (const r of rows) for (const id of r.tier1.lost.concat(r.tier2.lost)) rulesLost[id] = (rulesLost[id] || 0) + 1;
lines.push('## Which rules were lost', '', '| Rule | Times lost |', '| --- | --- |',
  ...Object.entries(rulesLost).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`), '');

const fieldKinds = {};
for (const r of rows) for (const k of Object.keys(r.fields)) fieldKinds[k] = (fieldKinds[k] || 0) + 1;
lines.push('## Which fields changed', '', '| Field | Screenshots |', '| --- | --- |',
  ...Object.entries(fieldKinds).map(([k, v]) => `| ${k} | ${v} |`), '');

lines.push('## Every lost Tier 1 rule or lost Suspicious', '');
for (const r of rows.filter(r => lostT1(r) || lostSusp(r))) {
  lines.push(`- **${r.id}** [${r.condition}] ${r.verdict.join(' → ')}; lost ${r.tier1.lost.concat(r.tier2.lost).join(', ') || 'none'}`,
    `  - shown: ${JSON.stringify(r.text)}`, `  - read: ${JSON.stringify(r.ocr.replace(/\n/g, ' '))}`);
}
lines.push('', '## Field changes (first 25)', '');
for (const r of rows.filter(fieldHit).slice(0, 25)) {
  lines.push(`- **${r.id}** [${r.condition}] ${Object.entries(r.fields).map(([k, d]) => `${k}: ${JSON.stringify(d.lost)} → ${JSON.stringify(d.gained)}`).join('; ')}`);
}
lines.push('', '## Limits', '',
  '- Constructed screenshots of a single message bubble: no sender line, status bar, keyboard, emoji, photos or cropping.',
  '- One font family (Liberation Sans), drawn by Chromium. Real phones use other fonts and anti-aliasing.',
  '- Most messages come from the engine test suite; they are regression cases, not a sample of real scam traffic.',
  '- This supports a claim about these tested conditions only, not overall real-world OCR reliability.');

fs.writeFileSync(path.join(OUT, 'report.md'), lines.join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'details.json'), JSON.stringify(rows, null, 1));
console.log(lines.slice(0, 14).join('\n'));
