#!/usr/bin/env node
/* Robustness run: does a rewrite that keeps the meaning keep the verdict?

   Method, after Ribeiro et al., "Beyond Accuracy: Behavioral Testing of NLP Models with
   CheckList" (ACL 2020), invariance test type. The idea is that a label should survive a
   change that a reader would call the same message. Here the label is the app's own verdict
   and the changes are the rewrites in transforms.cjs.

   Three properties are checked.

     EVASION   A fraud seed the rules catch must stay caught under every rewrite.
               A lost Tier 1 finding is a rule gap: real wording the rules do not reach.
     FRAGILITY A legitimate seed the rules leave alone must stay alone under every rewrite
               that is safe on legitimate text. A new Suspicious verdict is a false alarm
               the rules can be pushed into.
     SAFETY    No rewrite of any fraud seed may reach Details Match. This is the one failure
               that hurts a person: the app saying a scam looks fine. The gate makes it
               structurally impossible, since any finding at all blocks Details Match
               (src/assessment.js, RISK_SIGNAL). The property is checked anyway, because a
               claim nobody tests is a claim nobody should believe.

   Usage:
     node adversarial/run.cjs [--seed 20261023] [--depth 2] [--budget 400]
                              [--today 2026-10-22] [--out adversarial/results]
                              [--fixture]

   --fixture also writes the surviving evasions as a case file, so each one can be turned
   into a failing test before any rule is widened.

   This run never reads eval/data and never records dev exposure, so it cannot touch the
   held-out split. It changes no engine file. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { loadEngine } = require('../eval/engine.cjs');
const { wilson } = require('../eval/metrics.cjs');
const { TRANSFORMS, BY_ID, FAMILIES } = require('./transforms.cjs');
const seeds = require('./seeds.cjs');

const ROOT = path.join(__dirname, '..');

function option(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
}

// mulberry32: one small, readable generator so the same seed gives the same run on any machine.
function rngFrom(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sameMessage = text => text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();

/* ---------- reading one verdict ---------- */

function verdictOf(analyze, text) {
  const r = analyze(text, 'text');
  const established = r.evidence.findings.filter(f => f.status === 'established');
  return {
    assessment: r.assessment,
    tier1: established.filter(f => f.tier === 1).map(f => f.ruleId).sort(),
    tier2: established.filter(f => f.tier === 2).map(f => f.ruleId).sort(),
    level: r.requestRisk.level
  };
}

/* ---------- generating the rewrites ---------- */

// Up to `depth` transforms applied one after another. A transform that does not apply to a
// message returns null and is skipped, so depth is a ceiling and not a quota.
function rewrite(text, chain, rng) {
  let out = text;
  const used = [];
  for (const t of chain) {
    const next = t.apply(out, rng);
    if (next === null || next === undefined || next === out) continue;
    out = next;
    used.push(t.id);
  }
  return used.length ? { text: out, chain: used } : null;
}

function generate(seed, allowed, { depth, budget, rng }) {
  const made = new Map();
  const baseKey = sameMessage(seed.text);
  let tries = 0;
  const limit = budget * 12;
  while (made.size < budget && tries < limit) {
    tries++;
    const length = 1 + Math.floor(rng() * depth);
    const chain = [];
    for (let i = 0; i < length; i++) chain.push(allowed[Math.floor(rng() * allowed.length)]);
    const made1 = rewrite(seed.text, chain, rng);
    if (!made1) continue;
    const key = sameMessage(made1.text);
    // A rewrite that normalizes back to the seed tests nothing.
    if (key === baseKey || made.has(key)) continue;
    made.set(key, made1);
  }
  return [...made.values()];
}

/* ---------- the run ---------- */

function main() {
  const seedNumber = Number(option('seed', '20261023'));
  const depth = Math.max(1, Number(option('depth', '2')));
  const budget = Math.max(1, Number(option('budget', '400')));
  const today = option('today', '2026-10-22');
  const outDir = path.resolve(option('out', path.join(ROOT, 'adversarial/results')));
  const writeFixture = process.argv.includes('--fixture');

  const loaded = loadEngine(ROOT, { today });
  const analyze = loaded.analyze;
  const rng = rngFrom(seedNumber);

  const forFraud = TRANSFORMS;
  const forLegit = TRANSFORMS.filter(t => t.preserves === 'all');

  const rows = [];
  const baselineMisses = [];
  let safetyBreaks = 0;

  for (const seed of seeds.fraud) {
    const base = verdictOf(analyze, seed.text);
    if (!base.tier1.includes(seed.expect)) {
      baselineMisses.push({ id: seed.id, expected: seed.expect, got: base.tier1, assessment: base.assessment });
      continue;
    }
    for (const made of generate(seed, forFraud, { depth, budget, rng })) {
      const after = verdictOf(analyze, made.text);
      const lostExpected = !after.tier1.includes(seed.expect);
      const lostAll = after.tier1.length === 0;
      if (after.assessment === 'details_match') safetyBreaks++;
      rows.push({
        kind: 'fraud', seed: seed.id, expect: seed.expect, category: seed.category,
        chain: made.chain, text: made.text,
        assessment: after.assessment, tier1: after.tier1, tier2: after.tier2, level: after.level,
        // An evasion is a rewrite that cost the message its Suspicious verdict.
        evaded: after.assessment !== 'suspicious',
        lostExpected, lostAll,
        safetyBreak: after.assessment === 'details_match'
      });
    }
  }

  for (const seed of seeds.legit) {
    const base = verdictOf(analyze, seed.text);
    if (base.assessment === 'suspicious') {
      baselineMisses.push({ id: seed.id, expected: 'not suspicious', got: base.tier1, assessment: base.assessment });
      continue;
    }
    for (const made of generate(seed, forLegit, { depth, budget, rng })) {
      const after = verdictOf(analyze, made.text);
      rows.push({
        kind: 'legit', seed: seed.id, expect: 'not suspicious', category: seed.category,
        chain: made.chain, text: made.text,
        assessment: after.assessment, tier1: after.tier1, tier2: after.tier2, level: after.level,
        falseAlarm: after.assessment === 'suspicious',
        // A rewrite that only adds a Tier 2 warning is a smaller cost, counted on its own.
        newWarning: after.assessment !== 'suspicious' && after.tier2.length > base.tier2.length
      });
    }
  }

  const report = buildReport({ rows, baselineMisses, safetyBreaks, loaded, today, seedNumber, depth, budget });
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'report.md'), report);
  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify({
    run: { seed: seedNumber, depth, budget, today, engine: loaded.engine.version, store: loaded.store.version,
      transforms: TRANSFORMS.map(t => ({ id: t.id, family: t.family, preserves: t.preserves, why: t.why })),
      digest: crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex').slice(0, 16) },
    baselineMisses, rows
  }, null, 2) + '\n');

  if (writeFixture) {
    const evasions = rows.filter(r => r.evaded || r.falseAlarm);
    fs.writeFileSync(path.join(outDir, 'evasions.json'), JSON.stringify(evasions.map(r => ({
      seed: r.seed, kind: r.kind, expect: r.expect, chain: r.chain, text: r.text,
      got: { assessment: r.assessment, tier1: r.tier1, tier2: r.tier2 }
    })), null, 2) + '\n');
  }

  console.log(report);
  console.log('Wrote ' + path.relative(process.cwd(), outDir) + '/report.md and results.json' + (writeFixture ? ' and evasions.json' : ''));
  return safetyBreaks > 0 ? 1 : 0;
}

/* ---------- the report ---------- */

const pct = x => (100 * x).toFixed(1) + '%';

/* Rewrites are NOT independent draws. Many share one seed message, and chains overlap, so a
   Wilson interval over all rewrites would claim a precision this design does not have. The seed
   message is the independent unit, so rates are reported as a plain count plus the spread across
   seeds. Wilson is used only where the unit really is independent: the seeds themselves. */
function rateLine(hits, n, perSeed) {
  if (!n) return 'n/a (nothing generated)';
  let line = hits + '/' + n + ' rewrites = ' + pct(hits / n);
  if (perSeed && perSeed.length > 1) {
    const rates = perSeed.map(c => c.hits / c.n).sort((a, b) => a - b);
    line += ' - per seed ' + pct(rates[0]) + ' to ' + pct(rates[rates.length - 1]) +
      ' across ' + rates.length + ' seeds (median ' + pct(rates[Math.floor(rates.length / 2)]) + ')';
  }
  return line;
}

// How many seed messages had at least one escape: here the unit is independent, so an
// interval is meaningful, and it is the number worth quoting.
function seedLine(perSeed) {
  const touched = perSeed.filter(c => c.hits > 0).length;
  if (!perSeed.length) return 'n/a';
  const w = wilson(touched, perSeed.length);
  return touched + '/' + perSeed.length + ' seeds = ' + pct(w.rate) + ' (95% range ' + pct(w.low) + '-' + pct(w.high) + ')';
}

function countBy(rows, key, flag) {
  const out = new Map();
  for (const r of rows) {
    for (const id of key(r)) {
      const c = out.get(id) || { n: 0, hits: 0 };
      c.n++;
      if (flag(r)) c.hits++;
      out.set(id, c);
    }
  }
  return [...out.entries()].sort((a, b) => (b[1].hits / b[1].n) - (a[1].hits / a[1].n) || b[1].n - a[1].n);
}

function buildReport({ rows, baselineMisses, safetyBreaks, loaded, today, seedNumber, depth, budget }) {
  const fraudRows = rows.filter(r => r.kind === 'fraud');
  const legitRows = rows.filter(r => r.kind === 'legit');
  const evaded = fraudRows.filter(r => r.evaded);
  const alarms = legitRows.filter(r => r.falseAlarm);
  const out = [];

  out.push('# Robustness run: meaning-preserving rewrites', '');
  out.push('Engine ' + loaded.engine.version + ' - reference list ' + loaded.store.version +
    ' - reference date ' + today + ' - generator seed ' + seedNumber + ' - depth ' + depth + ' - budget ' + budget + '/seed.');
  out.push('Organizations with a trusted contact: ' + loaded.reviewedOrgs + ' of ' + loaded.store.orgs.length + '.', '');
  out.push('**What this measures.** Whether the current rules keep their verdict when a message is reworded',
    'without changing what it means. It is not accuracy, it is not a detection rate, and these rewrites are',
    'generated, so they are not evidence about what real senders write. Read every number below as a',
    'statement about the rules, not about the world.', '');

  const bySeed = (rows, flag) => countBy(rows, r => [r.seed], flag).map(([, c]) => c);
  const fraudSeeds = bySeed(fraudRows, r => r.evaded);
  const legitSeeds = bySeed(legitRows, r => r.falseAlarm);

  out.push('## Headline', '');
  out.push('| Property | Result |', '| --- | --- |');
  out.push('| Fraud rewrites that escaped Suspicious (evasion) | ' + rateLine(evaded.length, fraudRows.length, fraudSeeds) + ' |');
  out.push('| **Fraud seeds with at least one escape** | **' + seedLine(fraudSeeds) + '** |');
  out.push('| Legitimate rewrites that became Suspicious (false alarm) | ' + rateLine(alarms.length, legitRows.length, legitSeeds) + ' |');
  out.push('| Legitimate seeds with at least one false alarm | ' + seedLine(legitSeeds) + ' |');
  out.push('| Legitimate rewrites given a new Tier 2 warning | ' + rateLine(legitRows.filter(r => r.newWarning).length, legitRows.length) + ' |');
  out.push('| **Fraud rewrites reaching Details Match (must be 0)** | **' + safetyBreaks + '** |', '');
  out.push('The rewrite rates above are counts, not estimates. Rewrites share seed messages and',
    'overlapping chains, so they are not independent draws and a confidence interval over them would',
    'claim a precision this design does not have. The seed message is the independent unit, so the',
    'seed rows carry the intervals and the rewrite rows carry the spread across seeds.', '');

  if (baselineMisses.length) {
    out.push('## Seeds excluded before rewriting (' + baselineMisses.length + ')', '');
    out.push('A rule that never fired on the plain seed cannot be evaded, so these seeds and their rewrites',
      'are left out of every rate above. Each one is a plain rule gap in its own right.', '');
    baselineMisses.forEach(m => out.push('- **' + m.id + '**: expected ' + m.expected + ', got ' +
      (m.got.length ? m.got.join(' ') : 'no Tier 1') + ' (' + m.assessment + ')'));
    out.push('');
  }

  out.push('## Evasion by transform', '', '| Transform | Family | Rewrites containing it | Escaped | Share |', '| --- | --- | --- | --- | --- |');
  countBy(fraudRows, r => r.chain, r => r.evaded).forEach(([id, c]) =>
    out.push('| ' + id + ' | ' + (BY_ID[id] ? BY_ID[id].family : '?') + ' | ' + c.n + ' | ' + c.hits + ' | ' + pct(c.hits / c.n) + ' |'));
  out.push('');
  out.push('A transform appears in every chain that used it, so the columns do not add up to the row count.', '');

  out.push('## Evasion by family', '', '| Family | Rewrites | Escaped | Share |', '| --- | --- | --- | --- |');
  countBy(fraudRows, r => [...new Set(r.chain.map(id => BY_ID[id].family))], r => r.evaded).forEach(([id, c]) =>
    out.push('| ' + id + ' | ' + c.n + ' | ' + c.hits + ' | ' + pct(c.hits / c.n) + ' |'));
  out.push('');

  out.push('## Evasion by seed', '', '| Seed | Rule | Rewrites | Escaped | Share |', '| --- | --- | --- | --- | --- |');
  countBy(fraudRows, r => [r.seed], r => r.evaded).forEach(([id, c]) => {
    const one = fraudRows.find(r => r.seed === id);
    out.push('| ' + id + ' | ' + one.expect + ' | ' + c.n + ' | ' + c.hits + ' | ' + pct(c.hits / c.n) + ' |');
  });
  out.push('');

  const excerpt = t => JSON.stringify(t.replace(/\s+/g, ' ').slice(0, 150));
  const shortest = list => {
    const byChain = new Map();
    for (const r of list) {
      const key = r.seed + '|' + r.chain.join('+');
      if (!byChain.has(key) || r.text.length < byChain.get(key).text.length) byChain.set(key, r);
    }
    return [...byChain.values()].sort((a, b) => a.chain.length - b.chain.length || a.text.length - b.text.length);
  };

  out.push('## Escapes, shortest chain first (' + evaded.length + ')', '');
  if (!evaded.length) out.push('None. Every rewrite of every caught seed stayed Suspicious.');
  shortest(evaded).slice(0, 40).forEach(r => out.push('- **' + r.seed + '** via `' + r.chain.join(' + ') + '` -> ' +
    r.assessment + ' (tier1: ' + (r.tier1.join(' ') || 'none') + ', tier2: ' + (r.tier2.join(' ') || 'none') + ')\n  ' + excerpt(r.text)));
  if (evaded.length > 40) out.push('', '...and ' + (evaded.length - 40) + ' more in results.json.');
  out.push('');

  out.push('## False alarms on legitimate rewrites (' + alarms.length + ')', '');
  if (!alarms.length) out.push('None.');
  shortest(alarms).slice(0, 20).forEach(r => out.push('- **' + r.seed + '** via `' + r.chain.join(' + ') + '` -> suspicious (' +
    r.tier1.join(' ') + ')\n  ' + excerpt(r.text)));
  out.push('');

  out.push('## How to read a failure', '',
    '1. Open the rewrite and read it as a person would. If it no longer means what the seed meant, the',
    '   transform is wrong and belongs in transforms.cjs, not in the rules.',
    '2. If it does mean the same thing, it is a rule gap. Add it to the matrix as a failing case first,',
    '   then widen the rule, then rerun everything.',
    '3. Fix the shortest chains first: a one-transform escape is a plain gap, while a four-transform',
    '   escape may only be reachable by stacking changes no real sender would stack.', '');
  out.push('## Limits', '',
    '- The rewrites are generated from a fixed list. They cover what that list thought of and nothing else.',
    '- Escaping is measured against this engine on this date with this reference list. Rerunning after a',
    '  rule change gives a different number, so always report the engine version beside the figure.',
    '- A low escape rate is not safety. It says the rules hold under these rewrites, not that the rules',
    '  cover the scams people actually receive.', '');

  return out.join('\n') + '\n';
}

if (require.main === module) process.exitCode = main();
module.exports = { main, rngFrom, generate, verdictOf };
