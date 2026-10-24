'use strict';
/* Messages the rules were tuned or checked against outside eval/data. They are dev material, so
   none may appear in the held-out test split:
     - adversarial/seeds.cjs, the seed messages of the rewrite robustness run;
     - adversarial/known-failures.json, every rewrite that failed and was looked at;
     - tests/polite-wording-cases.js, the messages the courtesy-word fix was written against.
   Matching uses the same fingerprint as the dev-exposure ledger (NFKC, spaces collapsed,
   lowercase), so it catches exact and near-exact copies only. A reworded relative of a seed is
   still the same family and still belongs in dev; that part needs the human family review. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');

// The texts a browser case file passes to the engine, collected by running it against a stub.
function caseFileTexts(file) {
  const texts = [];
  const stubResult = { assessment: 'x', trace: { rules: [] }, requestRisk: { flags: [] }, evidence: { findings: [] } };
  const t = { test: (name, fn) => fn(), assert() {}, same() {} };
  const sandbox = {
    TfsEngine: { analyze: text => { texts.push(text); return stubResult; }, validateResult: () => true },
    TFS_PHASE2: { add: (name, fn) => fn(t) }
  };
  sandbox.window = sandbox;
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  return texts;
}

function exposedTexts(root = ROOT) {
  const out = [];
  const seeds = require(path.join(root, 'adversarial/seeds.cjs'));
  for (const s of seeds.fraud.concat(seeds.legit)) out.push(s.text);
  const known = JSON.parse(fs.readFileSync(path.join(root, 'adversarial/known-failures.json'), 'utf8'));
  for (const r of known.escapes.concat(known.falseAlarms)) out.push(r.text);
  out.push(...caseFileTexts(path.join(root, 'tests/polite-wording-cases.js')));
  return out;
}

module.exports = { exposedTexts, caseFileTexts };
