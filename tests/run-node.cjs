// No packages needed: node tests/run-node.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ URL, performance, console });
context.window = context;
const files = [
  'js/engine/normalize.js', 'js/engine/extract.js', 'js/engine/domain.js',
  'js/engine/risk.js', 'js/engine/aggregate.js', 'js/engine/copy.js',
  'data/store.js', 'js/mockData.js', 'tests/cases.js', 'tests/real-store-cases.js',
  'tests/regression-cases.js', 'tests/step1-cases.js', 'tests/suite.js'
];
for (const file of files) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { filename: file });
}
let failures = 0;
for (const group of context.runEngineTests().groups) {
  const failed = group.rows.filter(row => !row.passed);
  failures += failed.length;
  console.log(`${group.name}: ${group.rows.length - failed.length}/${group.rows.length}`);
  for (const row of failed) console.error(row.cells.join(' | '));
}
process.exitCode = failures ? 1 : 0;
