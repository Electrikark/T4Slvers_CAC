#!/usr/bin/env node
/* The release gate for adversarial/. Fast, fixed and deterministic, so it can sit in `npm test`.

   Two things are checked here, and only two:

     1. SAFETY. No meaning-preserving rewrite of any fraud seed may reach Details Match. This is
        the one failure that hurts a person, and the gate is meant to make it structurally
        impossible (src/assessment.js: any established finding sets RISK_SIGNAL). A break here is
        a release blocker.
     2. BASELINE. Every fraud seed marked `expect` still produces that Tier 1 code on the plain
        text, and every legitimate seed is still not Suspicious. This catches a rule change that
        silently drops a whole family.

   The escape RATE is deliberately NOT asserted. It moves whenever a rule is widened, which is the
   point of widening a rule; a test that failed on improvement would just get deleted. Read the
   rate from `node adversarial/run.cjs` and record it in RELEASE.md beside the engine version.

   The settings here are frozen in adversarial/freeze.json. Changing them changes what the gate
   means, so the fingerprints are checked too. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { loadEngine } = require('../eval/engine.cjs');
const { TRANSFORMS } = require('../adversarial/transforms.cjs');
const seeds = require('../adversarial/seeds.cjs');
const { rngFrom, generate, verdictOf } = require('../adversarial/run.cjs');

const ROOT = path.join(__dirname, '..');
const FREEZE = path.join(ROOT, 'adversarial/freeze.json');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

let failures = 0;
const fail = message => { failures++; console.error('  FAIL ' + message); };
const ok = message => console.log('  ok   ' + message);

function main() {
  const freeze = JSON.parse(fs.readFileSync(FREEZE, 'utf8'));
  console.log('Adversarial gate (seed ' + freeze.gate.seed + ', depth ' + freeze.gate.depth +
    ', budget ' + freeze.gate.budget + ')');

  // 1. The generator and the seed list must be the frozen ones.
  for (const [file, expected] of Object.entries(freeze.fingerprints)) {
    const actual = sha(path.join(ROOT, file));
    if (actual !== expected) {
      fail(file + ' changed since the freeze.\n       frozen ' + expected.slice(0, 16) +
        '\n       now    ' + actual.slice(0, 16) +
        '\n       If the change is deliberate, rerun adversarial/freeze.cjs and say why in' +
        '\n       docs/decisions/robustness-rewrites.md.');
    }
  }
  if (!failures) ok('generator and seeds match the freeze');

  const loaded = loadEngine(ROOT, { today: freeze.gate.today });
  const analyze = loaded.analyze;

  // 2. Baseline: each seed still behaves as the file says it does.
  for (const seed of seeds.fraud) {
    const base = verdictOf(analyze, seed.text);
    if (!base.tier1.includes(seed.expect)) {
      // A seed listed as a known gap is expected to miss; anything else is a regression.
      if (freeze.knownBaselineGaps.includes(seed.id)) ok(seed.id + ' still a known gap (' + seed.expect + ' absent)');
      else fail(seed.id + ' lost ' + seed.expect + ' on the plain text (got ' + (base.tier1.join(' ') || 'nothing') + ')');
    } else if (freeze.knownBaselineGaps.includes(seed.id)) {
      fail(seed.id + ' now fires ' + seed.expect + '. Remove it from knownBaselineGaps in freeze.json.');
    } else ok(seed.id + ' -> ' + seed.expect);
  }
  for (const seed of seeds.legit) {
    const base = verdictOf(analyze, seed.text);
    if (base.assessment === 'suspicious') fail(seed.id + ' is a legitimate control but reads Suspicious (' + base.tier1.join(' ') + ')');
    else ok(seed.id + ' stays ' + base.assessment);
  }

  // 3. Safety: the property that must never break.
  const rng = rngFrom(freeze.gate.seed);
  let checked = 0, breaks = 0;
  for (const seed of seeds.fraud) {
    if (!verdictOf(analyze, seed.text).tier1.length) continue;
    for (const made of generate(seed, TRANSFORMS, { depth: freeze.gate.depth, budget: freeze.gate.budget, rng })) {
      checked++;
      const after = verdictOf(analyze, made.text);
      if (after.assessment === 'details_match') {
        breaks++;
        fail('SAFETY BREAK: ' + seed.id + ' via ' + made.chain.join(' + ') + ' reached Details Match\n       ' + JSON.stringify(made.text));
      }
    }
  }
  if (!breaks) ok('safety: ' + checked + ' rewrites, none reached Details Match');

  console.log(failures ? '\n' + failures + ' failure(s).' : '\nAdversarial gate passed.');
  return failures ? 1 : 0;
}

if (require.main === module) process.exitCode = main();
