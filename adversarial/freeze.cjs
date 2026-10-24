#!/usr/bin/env node
/* Writes adversarial/freeze.json: the gate's settings plus fingerprints of the generator and the
   seed list. Same idea as experiments/help-search/freeze.json — the number the gate produces only
   means something if what produced it is pinned.

   Run this when a transform or a seed is deliberately changed, and record why in
   docs/decisions/robustness-rewrites.md. Running it to silence a failing gate, without that note,
   defeats the point of having one. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const FILES = ['adversarial/transforms.cjs', 'adversarial/seeds.cjs', 'adversarial/run.cjs'];
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, file))).digest('hex');

const existing = fs.existsSync(path.join(ROOT, 'adversarial/freeze.json'))
  ? JSON.parse(fs.readFileSync(path.join(ROOT, 'adversarial/freeze.json'), 'utf8')) : {};

const freeze = {
  frozen_at: new Date().toISOString(),
  gate: existing.gate || { seed: 20261023, depth: 2, budget: 60, today: '2026-10-22' },
  // Seeds whose rule does not fire on the plain text. Listed, not hidden: each is a rule gap, and
  // the gate fails if one starts passing, so the list cannot quietly go stale.
  knownBaselineGaps: existing.knownBaselineGaps || [],
  fingerprints: Object.fromEntries(FILES.map(f => [f, sha(f)]))
};

fs.writeFileSync(path.join(ROOT, 'adversarial/freeze.json'), JSON.stringify(freeze, null, 2) + '\n');
console.log(JSON.stringify(freeze, null, 2));
