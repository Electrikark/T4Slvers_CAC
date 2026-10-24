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
  'tests/reporting-scope/setup.js', 'tests/reporting-scope/matrix-cases.js', 'tests/next-steps-cases.js', 'tests/policy-cases.js', 'tests/annotate-cases.js', 'tests/rules-f1-cases.js', 'tests/rules-f2-cases.js', 'tests/rules-f3-cases.js', 'tests/rules-f4-cases.js', 'tests/rules-f5-cases.js', 'tests/rules-robustness-cases.js', 'tests/rules-v11b-cases.js', 'tests/rules-probe-oct18-cases.js', 'tests/repair-cases.js', 'tests/repair2-cases.js', 'tests/page-wording-cases.js', 'tests/session-repair-cases.js', 'tests/polite-wording-cases.js', 'tests/suite.js'
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
for (const file of ['js/app.js', 'js/annotate.js', 'js/selfCheck.js', 'js/help-ui.js', 'js/why.js']) {
  if (/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))) boundaryProblems.push(`${file} renders HTML strings`);
}
failures += boundaryProblems.length;
console.log(`Boundaries: ${boundaryProblems.length ? 'FAIL' : '2/2'}`);
for (const problem of boundaryProblems) console.error(problem);
// Page copy and contrast (repairs B7 and B9): file reads, so Node only.
const pageProblems = [];
const html = fs.readFileSync(path.join(__dirname, '..', 'check.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'css/styles.css'), 'utf8');
if (!html.includes('This checker reads messages written in English.')) pageProblems.push('B7: the English-only line is missing from check.html');
// WCAG 1.4.11: control borders need 3:1 against the white card.
const luminance = hex => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
for (const selector of ['.option', 'textarea', '.self-check-option']) {
  const rule = css.match(new RegExp('(?:^|\\n)' + selector.replace('.', '\\.') + '\\s*\\{([^}]*)\\}'));
  const color = rule && rule[1].match(/border:\s*1px solid (#[0-9a-f]{6})/i);
  if (!color) { pageProblems.push(`B9: no 1px border color for ${selector}`); continue; }
  const ratio = 1.05 / (luminance(color[1]) + 0.05);
  if (ratio < 3) pageProblems.push(`B9: ${selector} border ${color[1]} is ${ratio.toFixed(2)}:1`);
}
// The selected choice needs a cue that is not color or border width alone: a check mark.
const rules = [...css.replace(/\/\*[^]*?\*\//g, "").matchAll(/([^{}]+)\{([^}]*)\}/g)].map(m => ({ selectors: m[1].split(',').map(x => x.trim()), body: m[2] }));
for (const selector of ['.option', '.self-check-option']) {
  const marked = rules.some(r => r.selectors.some(x => /^(?:before|after)$/.test(x.split('[aria-pressed="true"]::')[1] || '') &&
    x.startsWith(selector + '[aria-pressed="true"]::')) && r.body.includes('content:"\\2713'));
  if (!marked) pageProblems.push(`B9: no check mark for a selected ${selector}`);
}
failures += pageProblems.length;
console.log(`Page copy and contrast: ${pageProblems.length ? 'FAIL' : '2/2'}`);
for (const problem of pageProblems) console.error(problem);
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
