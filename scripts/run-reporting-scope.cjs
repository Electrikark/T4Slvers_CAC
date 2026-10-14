'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { loadEngine, FILES } = require('../eval/engine.cjs');
const { evaluate } = require('../tests/reporting-scope/setup.js');
const root = path.join(__dirname, '..');
const input = fs.readFileSync(path.join(root, 'tests/reporting-scope/fixture.json'));
const fixture = JSON.parse(input);
const rows = evaluate(loadEngine().engine, fixture);
const counts = {};
for (const row of rows) {
  const group = ['WF', 'PC', 'RD', 'TW'].includes(row.context) ? row.context + '-' + row.family : row.context;
  const count = counts[group] || (counts[group] = { passed: 0, total: 0 });
  count.total++; if (row.passed) count.passed++;
}
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
const report = { metric: 'suite pass rate', evaluation_date: fixture.evaluation_date,
  fixture_sha256: sha256(input), engine_sha256: sha256(Buffer.concat(FILES.map(f => fs.readFileSync(path.join(root, f))))),
  passed: rows.filter(r => r.passed).length, total: rows.length, counts, failures: rows.filter(r => !r.passed) };
const outputIndex = process.argv.indexOf('--output');
if (outputIndex >= 0) fs.writeFileSync(process.argv[outputIndex + 1], JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
for (const [cell, count] of Object.entries(counts)) console.log(`${cell}: ${count.passed}/${count.total}`);
console.log(`Suite pass rate: ${report.passed}/${report.total} (${(report.passed / report.total * 100).toFixed(2)}%)`);
process.exitCode = report.failures.length ? 1 : 0;
