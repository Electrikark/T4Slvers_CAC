// No packages needed: node tests/run-node.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ URL, performance, console });
context.window = context;
const files = [
  'js/engine/normalize.js', 'js/engine/extract.js', 'js/engine/sender.js', 'js/engine/domain.js', 'js/engine/trusted.js',
  'js/engine/risk.js', 'js/assessment-gate.js', 'js/engine/evidence.js', 'js/engine/aggregate.js', 'js/engine/copy.js',
  'data/store.js', 'js/selfCheck.js', 'js/mockData.js', 'tests/cases.js', 'tests/real-store-cases.js',
  'tests/regression-cases.js', 'tests/step1-cases.js', 'tests/assessment-cases.js', 'tests/self-check-cases.js',
  'tests/phase2-harness.js', 'tests/trusted-cases.js', 'tests/sender-cases.js', 'tests/suite.js'
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
// Boundaries that only a file read can check: the engine never reads the raw list by name.
const boundaryProblems = [];
for (const file of fs.readdirSync(path.join(__dirname, '..', 'js/engine'))) {
  const text = fs.readFileSync(path.join(__dirname, '..', 'js/engine', file), 'utf8');
  if (/TFS_STORE|TFS_POLICIES/.test(text)) boundaryProblems.push(`js/engine/${file} reads a raw record file`);
}
failures += boundaryProblems.length;
console.log(`Boundaries: ${boundaryProblems.length ? 'FAIL' : '1/1'}`);
for (const problem of boundaryProblems) console.error(problem);
// Run the same hand-written assertions against the canonical source export, too.
const sourceGate = require('../src/assessment.js');
const sourceRows = context.runAssessmentTests(sourceGate);
const sourceFailures = sourceRows.filter(row => !row.passed);
failures += sourceFailures.length;
console.log(`Source gate parity: ${sourceRows.length - sourceFailures.length}/${sourceRows.length}`);
for (const row of sourceFailures) console.error(row.cells.join(' | '));
for (const evidence of context.assessmentParityEvidence) {
  const sourceResult = sourceGate.assess(evidence);
  const browserResult = context.TfsAssessment.assess(evidence);
  if (JSON.stringify(sourceResult) !== JSON.stringify(browserResult)) {
    failures++;
    console.error('Source/browser assessment or trace differs');
  }
}
process.exitCode = failures ? 1 : 0;
