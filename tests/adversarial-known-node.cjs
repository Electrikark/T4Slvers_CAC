#!/usr/bin/env node
/* Known rewrite failures, tracked one by one.

   adversarial/run.cjs measures how many meaning-preserving rewrites escape the rules. This file
   pins exactly WHICH ones escape at the published settings, in adversarial/known-failures.json,
   so a rule change cannot quietly trade old escapes for new ones:

     - a fraud rewrite that escapes Suspicious and is not on the list    -> FAIL (new escape)
     - a legitimate rewrite that becomes Suspicious and is not listed     -> FAIL (new false alarm)
     - a listed item that no longer fails                                 -> FAIL (stale list)
     - any fraud rewrite reaching Details Match                           -> FAIL (safety)

   A stale list fails on purpose, as knownBaselineGaps does in freeze.json: an entry left on the
   list after its fix would hide the same failure if it came back. After a deliberate rule change,
   regenerate the list with `npm run robustness:known` and say what changed in
   docs/decisions/polite-wording.md (or the decision that made the change).

   The rewrites come from the frozen generator (adversarial/freeze.json fingerprints), so the list
   is only meaningful while those fingerprints hold; that is checked first. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { loadEngine } = require('../eval/engine.cjs');
const { TRANSFORMS } = require('../adversarial/transforms.cjs');
const seeds = require('../adversarial/seeds.cjs');
const { rngFrom, generate, verdictOf } = require('../adversarial/run.cjs');

const ROOT = path.join(__dirname, '..');
const LIST = path.join(ROOT, 'adversarial/known-failures.json');
// The published run: the settings every robustness number in the docs uses.
const SETTINGS = { seed: 20261023, depth: 3, budget: 500, today: '2026-10-22' };
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, file))).digest('hex');

// The same loop as adversarial/run.cjs main(), so the rewrites are the same ones the report counts.
function currentFailures() {
  const loaded = loadEngine(ROOT, { today: SETTINGS.today });
  const analyze = loaded.analyze;
  const rng = rngFrom(SETTINGS.seed);
  const escapes = [], falseAlarms = [];
  let fraud = 0, legit = 0, safetyBreaks = 0;
  for (const seed of seeds.fraud) {
    if (!verdictOf(analyze, seed.text).tier1.includes(seed.expect)) continue;
    for (const made of generate(seed, TRANSFORMS, { depth: SETTINGS.depth, budget: SETTINGS.budget, rng })) {
      fraud++;
      const after = verdictOf(analyze, made.text);
      if (after.assessment === 'details_match') safetyBreaks++;
      if (after.assessment !== 'suspicious') escapes.push({ seed: seed.id, chain: made.chain, text: made.text, got: after.assessment });
    }
  }
  const forLegit = TRANSFORMS.filter(t => t.preserves === 'all');
  for (const seed of seeds.legit) {
    if (verdictOf(analyze, seed.text).assessment === 'suspicious') continue;
    for (const made of generate(seed, forLegit, { depth: SETTINGS.depth, budget: SETTINGS.budget, rng })) {
      legit++;
      const after = verdictOf(analyze, made.text);
      if (after.assessment === 'suspicious') falseAlarms.push({ seed: seed.id, chain: made.chain, text: made.text, tier1: after.tier1 });
    }
  }
  return { engine: loaded.engine.version, store: loaded.store.version, fraud, legit, safetyBreaks, escapes, falseAlarms };
}

const key = row => row.seed + '\u0000' + row.text;

function main() {
  const now = currentFailures();
  if (process.argv.includes('--update')) {
    const freeze = JSON.parse(fs.readFileSync(path.join(ROOT, 'adversarial/freeze.json'), 'utf8'));
    fs.writeFileSync(LIST, JSON.stringify({
      note: 'Rewrites that fail at the published settings. Regenerate with npm run robustness:known after a deliberate rule change.',
      settings: SETTINGS, engine: now.engine, store: now.store,
      generator: freeze.fingerprints,
      counts: { fraudRewrites: now.fraud, escapes: now.escapes.length, legitRewrites: now.legit, falseAlarms: now.falseAlarms.length },
      escapes: now.escapes, falseAlarms: now.falseAlarms
    }, null, 1) + '\n');
    console.log('Wrote adversarial/known-failures.json: ' + now.escapes.length + '/' + now.fraud + ' escapes, ' +
      now.falseAlarms.length + '/' + now.legit + ' false alarms (engine ' + now.engine + ').');
    return 0;
  }

  const list = JSON.parse(fs.readFileSync(LIST, 'utf8'));
  let failures = 0;
  const fail = message => { failures++; console.error('  FAIL ' + message); };
  console.log('Known rewrite failures (seed ' + SETTINGS.seed + ', depth ' + SETTINGS.depth + ', budget ' + SETTINGS.budget + ')');

  for (const [file, expected] of Object.entries(list.generator)) {
    if (sha(file) !== expected) fail(file + ' differs from the generator this list was made with. Rerun npm run robustness:known after the freeze is updated.');
  }
  if (now.safetyBreaks) fail('SAFETY: ' + now.safetyBreaks + ' fraud rewrites reached Details Match');

  for (const [name, current, listed] of [['escape', now.escapes, list.escapes], ['false alarm', now.falseAlarms, list.falseAlarms]]) {
    const known = new Set(listed.map(key)), seen = new Set(current.map(key));
    const added = current.filter(r => !known.has(key(r)));
    const gone = listed.filter(r => !seen.has(key(r)));
    for (const r of added.slice(0, 10)) fail('new ' + name + ': ' + r.seed + ' via ' + r.chain.join(' + ') + '\n       ' + JSON.stringify(r.text));
    if (added.length > 10) fail((added.length - 10) + ' more new ' + name + 's');
    if (gone.length) fail(gone.length + ' listed ' + name + (gone.length === 1 ? ' no longer fails' : 's no longer fail') +
      '. If a rule change fixed them, rerun npm run robustness:known and record it.');
    if (!added.length && !gone.length) console.log('  ok   ' + current.length + ' ' + name + 's, all known');
  }
  console.log(failures ? '\n' + failures + ' failure(s).' : '\nKnown rewrite failures unchanged.');
  return failures ? 1 : 0;
}

if (require.main === module) process.exitCode = main();
module.exports = { currentFailures, SETTINGS };
