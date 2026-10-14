// Layer 3: mechanical expansion only. This script never loads the application.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { SPEC, FINDING, decisions, expectation, evaluationDate } = require('../tests/reporting-scope/spec.cjs');
const { templates, boundaries, wraps, link } = require('../tests/reporting-scope/templates.cjs');
const handRows = require('../tests/reporting-scope/hand-cases.cjs');
const rows = [];
assert.equal(decisions.length, 16);
assert.equal(new Set(decisions.map(d => d.context + '-' + d.family)).size, 16);
for (const decision of decisions) {
  assert.equal(decision.senderDemand, SPEC[decision.context]);
  assert.ok(FINDING[decision.family] && decision.reason);
  const template = templates[decision.context + '-' + decision.family];
  for (const token of ['{B}', '{W}', '{LINK}']) assert.ok(template.includes(token));
  if (decision.context === 'WF') assert.match(template, /Beware of hackers/);
  const variants = Object.entries(boundaries).map(([variant, B]) => ({ variant, B, W: ' ' }))
    .concat(Object.entries(wraps).map(([variant, W]) => ({ variant, B: '.', W })));
  for (const { variant, B, W } of variants) {
    const states = variant === 'dot' ? ['none', 'approved', 'rejected', 'expired'] : ['none', 'approved'];
    for (const recordState of states) {
      const text = template.replace('{B}', B).replace('{W}', W).replace('{LINK}', link);
      assert.ok(!/\{[A-Z]+\}/.test(text));
      rows.push({ id: `${decision.context}-${decision.family}-${variant}-${recordState}`,
        context: decision.context, family: decision.family, variant, record_state: recordState, text,
        ...expectation(decision, recordState), known_limitation: null });
    }
  }
}
assert.equal(rows.length, 384);
assert.equal(new Set(rows.map(r => r.id)).size, 384);
const fixture = { evaluation_date: evaluationDate, rows, hand_rows: handRows };
const destination = path.join(__dirname, '../tests/reporting-scope/fixture.json');
const content = JSON.stringify(fixture, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(fs.readFileSync(destination, 'utf8'), content, 'fixture differs from spec/templates');
else fs.writeFileSync(destination, content);
console.log(`Reporting-scope fixture: ${rows.length} generated rows, ${handRows.length} hand rows`);
