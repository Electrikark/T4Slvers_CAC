/* The message set for the OCR robustness measurement.
   Every message comes from the existing tests or demos, plus the 16-message synthetic challenge
   set from ml/probe.py. Each row names the store it is checked against, so the pasted and OCR
   versions always use the same records. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..', '..');

function demoMessages() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/mockData.js'), 'utf8'), context);
  return Object.entries(context.window.demoScenarios).map(([key, d]) => ({
    id: 'demo-' + key, source: 'app demo', store: 'real', text: d.input
  }));
}

function probeMessages() {
  const src = fs.readFileSync(path.join(root, 'ml/probe.py'), 'utf8');
  const rows = [...src.matchAll(/\("(legit|fraud)",\s*"((?:[^"\\]|\\.)*)"\)/g)];
  return rows.map((m, i) => ({ id: `probe-${String(i + 1).padStart(2, '0')}`, source: 'synthetic challenge (ml/probe.py)',
    store: 'real', label: m[1], text: m[2].replace(/\\"/g, '"') }));
}

function fixtureMessages() {
  const fixture = JSON.parse(fs.readFileSync(path.join(root, 'tests/reporting-scope/fixture.json'), 'utf8'));
  // One matrix row per context x family x demand form (the plain "dot" variant): surface variants
  // such as CRLF or doubled spaces are typing tricks a screenshot cannot show.
  const seen = new Set();
  const matrix = fixture.rows.filter(r => r.variant === 'dot' && r.record_state === 'none').filter(r => {
    const key = `${r.context}-${r.family}-${r.demand_form}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const pick = r => ({ id: r.id, source: 'tests/reporting-scope/fixture.json', store: 'fixture:' + r.record_state, text: r.text });
  return matrix.map(pick).concat(fixture.hand_rows.map(pick));
}

function messages() {
  const all = fixtureMessages().concat(demoMessages(), probeMessages());
  const texts = new Map();
  for (const m of all) {
    const key = m.text + '|' + m.store;
    if (texts.has(key)) continue;
    texts.set(key, m);
  }
  return [...texts.values()];
}

module.exports = { messages, root };

if (require.main === module) {
  const list = messages();
  const by = {};
  for (const m of list) by[m.source] = (by[m.source] || 0) + 1;
  console.log(list.length, 'messages;', new Set(list.map(m => m.text)).size, 'unique texts', by);
}
