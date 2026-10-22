'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { parseCsv, toCsv } = require('./csv.cjs');
const { classify } = require('./failures.cjs');
const { readSuppliedData } = require('./supplied-data.cjs');
const { tally } = require('./metrics.cjs');

function read(file) {
  const [header, ...rows] = parseCsv(fs.readFileSync(file, 'utf8'));
  return rows.map(a => Object.fromEntries(header.map((h, i) => [h, a[i]])));
}

function main() {
  const option = name => {
    const at = process.argv.indexOf('--' + name);
    if (at < 0 || !process.argv[at + 1]) throw new Error('Missing --' + name);
    return process.argv[at + 1];
  };
  const input = option('input'), out = option('out');
  const checked = readSuppliedData(parseCsv(fs.readFileSync(input, 'utf8')));
  assert.deepEqual(checked.errors, []);
  const messages = checked.records.filter(r => r.split === 'dev');
  const byId = new Map(messages.map(r => [r.id, r]));
  const before = read(option('baseline')), after = read(option('after'));
  const review = JSON.parse(fs.readFileSync(option('review'), 'utf8'));
  const afterById = new Map(after.map(r => [r.id, r]));
  for (const list of [before, after]) {
    assert.equal(list.length, messages.length);
    assert.equal(new Set(list.map(r => r.id)).size, messages.length);
    for (const r of list) {
      assert.equal(r.split, 'dev');
      assert.ok(byId.has(r.id));
      assert.equal(r.label, byId.get(r.id).label);
      assert.equal(r.text, byId.get(r.id).text);
    }
  }
  const failures = [];
  const baselineKinds = {}, afterKinds = {}, causes = {};
  const merged = after.map(r => {
    const m = byId.get(r.id), kind = classify(r, m.expected_findings);
    if (kind) afterKinds[kind] = (afterKinds[kind] || 0) + 1;
    return { ...r, expected: m.expected_findings, group: m.group_id, kind };
  });
  for (const r of before) {
    const m = byId.get(r.id), kind = classify(r, m.expected_findings);
    if (!kind) continue;
    const note = review[r.id];
    assert.ok(note && ['wording', 'scope', 'missing record', 'overly broad warning', 'other'].includes(note.cause), 'Each failure needs a manual cause: ' + r.id);
    assert.ok(note.idea.endsWith('.'), 'Each cause needs an explanatory sentence: ' + r.id);
    const current = afterById.get(r.id), afterKind = classify(current, m.expected_findings);
    baselineKinds[kind] = (baselineKinds[kind] || 0) + 1;
    causes[note.cause] = (causes[note.cause] || 0) + 1;
    failures.push({ id: r.id, group: m.group_id, kind, expected: m.expected_findings,
      got: 'T1: ' + (r.tier1 || 'none') + '; T2: ' + (r.tier2 || 'none'), cause: note.cause,
      fix_idea: note.idea, fixed: afterKind ? 'no' : 'yes', current_kind: afterKind,
      current_got: 'T1: ' + (current.tier1 || 'none') + '; T2: ' + (current.tier2 || 'none') });
  }
  const baselineFailureIds = new Set(failures.map(r => r.id));
  const regressions = merged.filter(r => r.kind && !baselineFailureIds.has(r.id)).map(r => r.id);
  failures.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
  const escape = value => String(value).replace(/\|/g, '/').replace(/[\r\n]+/g, ' ');
  const rows = messages.length, fraud = messages.filter(r => r.label === 'fraud').length;
  const lines = ['# Dev failure analysis (dev split only)',
    `Run: ${option('day')} (baseline counts; fixed? checked after rerun) · engine 0.4.0 · ${rows} dev messages (${fraud} fraud, ${rows - fraud} legit) · 0 companies reviewed`,
    '## Counts', '| Kind | Count |', '|---|---|',
    ...Object.entries({ A: 'Fraud reassured', B: 'Fraud missed', C: 'Right verdict, wrong reason', D: 'False alarm', E: 'Legit with a Tier 2 warning' }).map(([k, name]) => `| ${k}. ${name} | ${baselineKinds[k] || 0} |`),
    '## By cause', '| Cause | Count |', '|---|---|',
    ...['wording', 'scope', 'missing record', 'overly broad warning', 'other'].map(c => `| ${c} | ${causes[c] || 0} |`),
    '## Every failure', '| id | group | kind | expected | got | cause | fix idea | fixed? |', '|---|---|---|---|---|---|---|---|',
    ...failures.map(r => '| ' + [r.id, r.group, r.kind, r.expected, r.got, r.cause, r.fix_idea, r.fixed].map(escape).join(' | ') + ' |')];
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'dev-failure-analysis.md'), lines.join('\n') + '\n');
  fs.writeFileSync(path.join(out, 'failures-reviewed.csv'), toCsv(Object.keys(failures[0]), failures));
  fs.writeFileSync(path.join(out, 'results-merged.csv'), toCsv(Object.keys(merged[0]), merged));
  const rateInput = list => list.map(r => ({ ...r, tier1: r.tier1.split(/\s+/).filter(Boolean), tier2: r.tier2.split(/\s+/).filter(Boolean) }));
  const test = checked.records.filter(r => r.split === 'test');
  const stats = { source_sha256: crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex'),
    rows: checked.records.length, dev: messages.length, dev_fraud: fraud, dev_legit: rows - fraud,
    test_rows: test.length, test_fraud: test.filter(r => r.label === 'fraud').length, test_legit: test.filter(r => r.label === 'legit').length,
    baselineKinds, afterKinds, causes, baseline_failures: failures.length, fixed: failures.filter(r => r.fixed === 'yes').length,
    remaining: merged.filter(r => r.kind).length, regressions, before: tally(rateInput(before)), after: tally(rateInput(after)),
    synthetic_dev: messages.filter(r => /\bsynthetic\b/i.test(r.notes)).length,
    public_example_dev: messages.filter(r => /\bpublic_example\b/i.test(r.notes)).length };
  fs.writeFileSync(path.join(out, 'analysis-stats.json'), JSON.stringify(stats, null, 2) + '\n');
  console.log(JSON.stringify({ dev: rows, baselineKinds, afterKinds, causes, fixed: stats.fixed, remaining: stats.remaining, regressions }));
}

if (require.main === module) main();
