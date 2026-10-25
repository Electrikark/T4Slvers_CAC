#!/usr/bin/env node
/* npm run discovery:calibrate
   Chooses the default cutoff on development data by the rule fixed in discovery/DECISION.md:
   on the constructed rewrite families (adversarial/seeds.cjs + adversarial/known-failures.json,
   full messages), the cutoff with the highest V-measure against the seed family; ties go to the
   smaller cutoff. Rewrites of one seed are declared meaning-preserving, so this rewards keeping
   rewordings of one message together and different messages apart. It is a proxy only.
   Prints aggregate numbers; writes no message text. */
'use strict';
const os = require('node:os');
const path = require('node:path');
const { intake } = require('./lib/sources.cjs');
const { createChromiumEmbedder, embedCandidates, DEFAULTS } = require('./lib/embed.cjs');
const { agglomerate, cut, vMeasure, partition } = require('./lib/cluster.cjs');

const ROOT = path.join(__dirname, '..');
const CUTOFFS = Array.from({ length: 13 }, (_, i) => Math.round((0.10 + 0.05 * i) * 100) / 100);

(async () => {
  const { messages, sources } = intake(ROOT, ['adversarial/seeds.cjs', 'adversarial/known-failures.json'].map(p => path.join(ROOT, p)));
  const candidates = messages.map(m => {
    const start = m.text.search(/\S/), end = m.text.replace(/\s+$/, '').length;
    return { candidateId: m.messageId + '#full', messageId: m.messageId, start, end, quote: m.text.slice(start, end), embedding: { status: 'pending', tokens: null, windows: [] } };
  });
  const embedder = await createChromiumEmbedder({ root: ROOT });
  const stats = { hits: 0, misses: 0, rejected: 0 };
  let vectors;
  try {
    vectors = await embedCandidates(candidates, messages, embedder, { tokenLimit: DEFAULTS.tokenLimit, overlapTokens: DEFAULTS.overlapTokens, maxWindows: DEFAULTS.maxWindows },
      process.env.DISCOVERY_CACHE || path.join(ROOT, 'discovery/.cache/embeddings'), stats);
  } finally { await embedder.close(); }
  const kept = messages.filter(m => vectors.has(m.messageId + '#full'));
  const merges = agglomerate(kept.map(m => vectors.get(m.messageId + '#full')));
  const families = kept.map(m => m.familyId);
  const rows = CUTOFFS.map(c => {
    const labels = cut(kept.length, merges, c);
    const parts = partition(labels);
    const v = vMeasure(labels, families);
    const mixed = parts.filter(p => new Set(p.map(i => kept[i].suppliedLabel)).size > 1).length;
    const crossFamily = parts.filter(p => new Set(p.map(i => families[i])).size > 1).length;
    return { cutoff: c, v: v.v, homogeneity: v.homogeneity, completeness: v.completeness, groups: parts.filter(p => p.length > 1).length, singletons: parts.filter(p => p.length === 1).length, crossFamily, mixedLabels: mixed };
  });
  const best = rows.reduce((a, b) => b.v > a.v + 1e-12 ? b : a);
  const fam = new Set(families);
  console.log(`Calibration data: ${kept.length} messages, ${fam.size} seed families (${sources.map(s => `${s.path} ${s.sha256.slice(0, 12)}`).join(', ')}); cache hits ${stats.hits}, misses ${stats.misses}; ${os.platform()}-${os.arch()}, Node ${process.version}`);
  console.log('');
  console.log('| Cutoff | V-measure | Homogeneity | Completeness | Groups | Singletons | Groups spanning families | Groups mixing fraud and legit |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
  const f = x => x.toFixed(3);
  for (const r of rows) console.log(`| ${r.cutoff.toFixed(2)}${r === best ? ' **chosen**' : ''} | ${f(r.v)} | ${f(r.homogeneity)} | ${f(r.completeness)} | ${r.groups} | ${r.singletons} | ${r.crossFamily} | ${r.mixedLabels} |`);
  console.log('');
  console.log(`Rule: highest V-measure, ties to the smaller cutoff → ${best.cutoff.toFixed(2)}`);
})().catch(err => { console.error(err.stack || err); process.exitCode = 1; });
