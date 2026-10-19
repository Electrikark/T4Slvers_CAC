// No packages needed: node tests/run-node.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ URL, performance, console });
context.window = context;
context.TFS_SCOPE_FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, 'reporting-scope/fixture.json'), 'utf8'));
const files = [
  'js/engine/normalize.js', 'js/engine/extract.js', 'js/engine/sender.js', 'js/engine/domain.js', 'js/engine/trusted.js',
  'js/engine/risk.js', 'js/engine/policy.js', 'js/assessment-gate.js', 'js/engine/evidence.js', 'js/engine/aggregate.js', 'js/engine/copy.js',
  'data/store.js', 'data/policies.js', 'js/selfCheck.js', 'js/mockData.js', 'js/annotate.js', 'tests/cases.js', 'tests/real-store-cases.js',
  'tests/regression-cases.js', 'tests/step1-cases.js', 'tests/assessment-cases.js', 'tests/self-check-cases.js',
  'tests/phase2-harness.js', 'tests/trusted-cases.js', 'tests/sender-cases.js', 'tests/tier-cases.js', 'tests/scope-cases.js',
  'tests/reporting-scope/setup.js', 'tests/reporting-scope/matrix-cases.js', 'tests/next-steps-cases.js', 'tests/policy-cases.js', 'tests/annotate-cases.js', 'tests/rules-f1-cases.js', 'tests/rules-f2-cases.js', 'tests/rules-f3-cases.js', 'tests/rules-f4-cases.js', 'tests/rules-f5-cases.js', 'tests/suite.js'
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
// Message text is rendered with textContent only; no file that draws results may use innerHTML.
for (const file of ['js/app.js', 'js/annotate.js', 'js/selfCheck.js']) {
  if (/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))) boundaryProblems.push(`${file} renders HTML strings`);
}
failures += boundaryProblems.length;
console.log(`Boundaries: ${boundaryProblems.length ? 'FAIL' : '2/2'}`);
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
