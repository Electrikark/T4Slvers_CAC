/* Grouping: average-linkage agglomerative clustering on cosine distance, cut at a threshold.

   Why this method: the number of request types is unknown, so nothing here asks for a number of
   groups; a threshold decides, and anything with no close neighbor stays a singleton. Average
   linkage has no inversions, so one run of merges can be cut at any threshold (the sensitivity
   check reuses it). Ties go to the lowest item index, and items arrive in a fixed order, so fixed
   inputs give the same groups in the same runtime.

   Vectors are L2-normalized; distance = 1 − cosine similarity. A similarity is a grouping signal,
   not a probability that anything is fraud. */
'use strict';

const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
const round = x => Math.round(x * 1e4) / 1e4;

// All merges in order: { a, b, height } where a < b are the lowest item index of each cluster.
function agglomerate(vectors, maxHeight = Infinity) {
  const n = vectors.length;
  const D = new Float64Array(n * n);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const d = Math.min(2, Math.max(0, 1 - dot(vectors[i], vectors[j])));
    D[i * n + j] = D[j * n + i] = d;
  }
  const active = new Uint8Array(n).fill(1), size = new Float64Array(n).fill(1);
  const nn = new Int32Array(n).fill(-1), nnd = new Float64Array(n).fill(Infinity);
  const nearest = i => {
    let best = -1, bd = Infinity;
    for (let j = 0; j < n; j++) if (j !== i && active[j] && D[i * n + j] < bd) { bd = D[i * n + j]; best = j; }
    nn[i] = best; nnd[i] = bd;
  };
  for (let i = 0; i < n; i++) nearest(i);
  const merges = [];
  for (let step = 0; step < n - 1; step++) {
    let a = -1;
    for (let i = 0; i < n; i++) if (active[i] && (a < 0 || nnd[i] < nnd[a])) a = i;
    if (a < 0 || nn[a] < 0 || nnd[a] > maxHeight) break;
    const i = Math.min(a, nn[a]), j = Math.max(a, nn[a]), height = D[i * n + j];
    merges.push({ a: i, b: j, height });
    for (let k = 0; k < n; k++) {
      if (!active[k] || k === i || k === j) continue;
      const d = (size[i] * D[i * n + k] + size[j] * D[j * n + k]) / (size[i] + size[j]);
      D[i * n + k] = D[k * n + i] = d;
    }
    size[i] += size[j];
    active[j] = 0;
    nearest(i);
    for (let k = 0; k < n; k++) {
      if (!active[k] || k === i) continue;
      if (nn[k] === i || nn[k] === j) nearest(k);
      else if (D[k * n + i] < nnd[k] || (D[k * n + i] === nnd[k] && i < nn[k])) { nn[k] = i; nnd[k] = D[k * n + i]; }
    }
  }
  return merges;
}

// Cluster label per item (the lowest item index in its cluster) at a distance cutoff.
function cut(n, merges, cutoff) {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = x => { while (parent[x] !== x) x = parent[x] = parent[parent[x]]; return x; };
  for (const m of merges) {
    if (m.height > cutoff + 1e-12) break;
    const ra = find(m.a), rb = find(m.b);
    parent[Math.max(ra, rb)] = Math.min(ra, rb);
  }
  return Array.from({ length: n }, (_, i) => find(i));
}

const choose2 = x => x * (x - 1) / 2;
function adjustedRand(a, b) {
  const n = a.length;
  if (n < 2) return 1;
  const table = new Map(), ra = new Map(), rb = new Map();
  for (let i = 0; i < n; i++) {
    const k = a[i] + '\u0000' + b[i];
    table.set(k, (table.get(k) || 0) + 1);
    ra.set(a[i], (ra.get(a[i]) || 0) + 1);
    rb.set(b[i], (rb.get(b[i]) || 0) + 1);
  }
  const sum = m => [...m.values()].reduce((s, x) => s + choose2(x), 0);
  const index = sum(table), sa = sum(ra), sb = sum(rb), expected = sa * sb / choose2(n), max = (sa + sb) / 2;
  return max === expected ? 1 : (index - expected) / (max - expected);
}

// V-measure of a clustering against reference classes (used for calibration only).
function vMeasure(labels, truth) {
  const n = labels.length;
  const joint = new Map(), cl = new Map(), tr = new Map();
  const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);
  for (let i = 0; i < n; i++) {
    const l = String(labels[i]), t = String(truth[i]);
    bump(joint, l + '\u0000' + t); bump(cl, l); bump(tr, t);
  }
  const H = m => -[...m.values()].reduce((s, x) => s + (x / n) * Math.log(x / n), 0);
  let Hck = 0, Hkc = 0;
  for (const [key, x] of joint) {
    const [l, t] = key.split('\u0000');
    Hck -= (x / n) * Math.log(x / cl.get(l));
    Hkc -= (x / n) * Math.log(x / tr.get(t));
  }
  const Hc = H(tr), Hk = H(cl);
  const h = Hc ? 1 - Hck / Hc : 1, c = Hk ? 1 - Hkc / Hk : 1;
  return { homogeneity: h, completeness: c, v: h + c ? 2 * h * c / (h + c) : 0 };
}

function partition(labels) {
  const groups = new Map();
  labels.forEach((l, i) => { if (!groups.has(l)) groups.set(l, []); groups.get(l).push(i); });
  return [...groups.values()];
}

/* Groups, singletons, per-group stability and the sensitivity table.
   items: [{ candidate, message, vector }] in candidate order. */
function group(items, config) {
  const n = items.length;
  const cutoffs = config.sensitivity;
  const merges = agglomerate(items.map(x => x.vector), Math.max(...cutoffs));
  const at = new Map(cutoffs.map(c => [c, cut(n, merges, c)]));
  const base = at.get(config.cutoff);
  const sim = (i, j) => dot(items[i].vector, items[j].vector);
  const clusters = partition(base).sort((x, y) => y.length - x.length || x[0] - y[0]);
  const groups = [], singletons = [];
  let g = 0;
  for (const members of clusters) {
    if (members.length === 1) { singletons.push(items[members[0]].candidate.candidateId); continue; }
    const id = 'G' + String(++g).padStart(3, '0');
    const central = members.map(i => ({ i, c: members.reduce((s, j) => s + (j === i ? 0 : sim(i, j)), 0) / (members.length - 1) }))
      .sort((x, y) => y.c - x.c || x.i - y.i);
    const reps = [central[0].i], families = new Set([items[central[0].i].message.familyId]);
    for (const { i } of central) {
      if (reps.length >= 3) break;
      if (!families.has(items[i].message.familyId)) { reps.push(i); families.add(items[i].message.familyId); }
    }
    for (const { i } of central) { if (reps.length >= 3) break; if (!reps.includes(i)) reps.push(i); }
    const medoid = central[0].i;
    const fam = { real: new Set(), synthetic: new Set() }, msgs = new Map();
    for (const i of members) {
      fam[items[i].message.provenance.bucket].add(items[i].message.familyId);
      msgs.set(items[i].message.messageId, items[i].message.suppliedLabel);
      items[i].candidate.groupId = id;
      items[i].candidate.similarityToRepresentative = round(sim(i, medoid));
    }
    const labels = { fraud: 0, legit: 0, unlabeled: 0 };
    for (const l of msgs.values()) labels[l]++;
    const stability = {};
    for (const c of cutoffs) {
      if (c === config.cutoff) continue;
      const lab = at.get(c), set = new Set(members);
      const other = new Set(lab.map((l, i) => l === lab[medoid] ? i : -1).filter(i => i >= 0));
      const inter = [...set].filter(i => other.has(i)).length;
      stability[c.toFixed(2)] = round(inter / (set.size + other.size - inter));
    }
    const quote = items[medoid].candidate.quote.replace(/\s+/g, ' ').trim();
    const head = quote.split(' ').slice(0, 8).join(' ');
    groups.push({
      groupId: id,
      provisionalName: `Provisional: “${head}${quote.length > head.length ? '…' : ''}”`,
      members: members.map(i => items[i].candidate.candidateId),
      representatives: reps.map(i => items[i].candidate.candidateId),
      items: members.length,
      messages: msgs.size,
      families: { real: fam.real.size, synthetic: fam.synthetic.size },
      labels,
      uncoveredItems: members.filter(i => items[i].candidate.coverage.uncovered).length,
      singleFamily: fam.real.size + fam.synthetic.size === 1,
      meanSimilarity: round(central.reduce((s, x) => s + x.c, 0) / central.length),
      stability
    });
  }
  const sensitivity = cutoffs.map(c => {
    const parts = partition(at.get(c));
    return { cutoff: c, groups: parts.filter(p => p.length > 1).length, singletons: parts.filter(p => p.length === 1).length, ari: round(adjustedRand(at.get(c), base)) };
  });
  return { groups, singletons, sensitivity };
}

// Nearest legitimate candidates from other families: controls to look at, not labels.
function legitNeighbors(items, k) {
  const legit = items.map((x, order) => ({ ...x, order })).filter(x => x.message.suppliedLabel === 'legit');
  const out = {};
  for (const x of items) {
    const near = legit.filter(y => y.message.familyId !== x.message.familyId)
      .map(y => ({ y, s: dot(x.vector, y.vector) }))
      .sort((p, q) => q.s - p.s || p.y.order - q.y.order)
      .slice(0, k)
      .map(({ y, s }) => ({ candidateId: y.candidate.candidateId, messageId: y.message.messageId, familyId: y.message.familyId, similarity: round(s) }));
    if (near.length) out[x.candidate.candidateId] = near;
  }
  return out;
}

module.exports = { agglomerate, cut, adjustedRand, vMeasure, partition, group, legitNeighbors, dot };
