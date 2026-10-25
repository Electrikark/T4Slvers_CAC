/* Intake: which files may enter discovery, and which of their rows.

   Each input is matched against a fixed list of eligible sources (discovery/DECISION.md). Anything
   else is refused with the reason. Rows are selected by split before anything reads their text
   for analysis: a non-dev row contributes only its family ID and a text fingerprint (used to drop
   dev rows that share a family or text with it), is counted, and is then dropped. No ID, text or
   other field of a non-dev row is returned. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const EVAL = path.join(__dirname, '..', '..', 'eval');
const { parseCsv } = require(path.join(EVAL, 'csv.cjs'));
const { HEADER: DEV_HEADER } = require(path.join(EVAL, 'dev-data.cjs'));
const { HEADER: SUPPLIED_HEADER, expectedCodes } = require(path.join(EVAL, 'supplied-data.cjs'));
const { verifyLock } = require(path.join(EVAL, 'dataset.cjs'));
const { textFingerprint, recordDevExposure } = require(path.join(EVAL, 'test-access.cjs'));

const FIXTURE_HEADER = 'id,group_id,split,label,expected_findings,channel,provenance,text'.split(',');
const LABELS = ['fraud', 'legit', 'unlabeled'];
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

class Refusal extends Error {
  constructor(message) { super(message); this.name = 'Refusal'; this.exitCode = 2; }
}

const SELECTION_RULE = {
  'eval-dev': 'Rows with split "dev" only; a dev row is dropped if its family or its text fingerprint also appears in a non-dev row.',
  'eval-supplied': 'Lock and active snapshot verified; rows with split "dev" only; a dev row is dropped if its family or text fingerprint also appears in a non-dev row.',
  'adversarial-seeds': 'Every seed, each checked against the dev-only registry in eval/exposed-elsewhere.cjs.',
  'adversarial-known': 'Every recorded escape and false alarm, each checked against the dev-only registry in eval/exposed-elsewhere.cjs.',
  fixture: 'Rows with split "dev" and FICTIONAL provenance only; same family and text checks as eval data.'
};

const sameHeader = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const rel = (root, file) => path.relative(root, file).split(path.sep).join('/');

// Which eligible source an input is, or a refusal that says why it is not one.
function resolveSource(root, input) {
  const abs = path.resolve(input);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) throw new Refusal(`Input not found: ${input}`);
  const where = rel(root, abs);
  if (where === 'adversarial/seeds.cjs') return { kind: 'adversarial-seeds', abs, rel: where };
  if (where === 'adversarial/known-failures.json') return { kind: 'adversarial-known', abs, rel: where };
  if (/^eval\/data\/[^/]+\.csv$/.test(where) || /^discovery\/fixtures\/[^/]+\.csv$/.test(where)) {
    const rows = parseCsv(fs.readFileSync(abs, 'utf8'));
    const header = rows[0] || [];
    if (where.startsWith('discovery/') && sameHeader(header, FIXTURE_HEADER)) return { kind: 'fixture', abs, rel: where, rows };
    if (where.startsWith('eval/') && sameHeader(header, DEV_HEADER)) return { kind: 'eval-dev', abs, rel: where, rows };
    if (where.startsWith('eval/') && sameHeader(header, SUPPLIED_HEADER)) return { kind: 'eval-supplied', abs, rel: where, rows };
    throw new Refusal(`No eligibility rule for ${where}: its header is not a split-aware format with family IDs ` +
      '(the legacy messages.csv format has no group_id, and its automatic split does not separate families).');
  }
  throw new Refusal(`No eligibility rule for ${where.startsWith('..') ? abs : where}. Eligible: dev rows of eval/data/*.csv ` +
    '(dev or supplied format), adversarial/seeds.cjs, adversarial/known-failures.json, discovery/fixtures/*.csv.');
}

// The split decision, made before any row reaches validation or analysis.
function selectDevRows(rows, counts) {
  const nonDevFamilies = new Set(), nonDevTexts = new Set(), dev = [];
  for (const r of rows) {
    const split = String(r.split || '').trim();
    if (split === 'dev') { dev.push(r); continue; }
    if (split) counts.nonDev++; else counts.missingSplit++;
    if (String(r.group_id || '').trim()) nonDevFamilies.add(r.group_id);
    nonDevTexts.add(textFingerprint(r.text || ''));
  }
  rows.length = 0;
  return dev.filter(r => {
    if (nonDevFamilies.has(r.group_id)) { counts.familySpansSplits++; return false; }
    if (nonDevTexts.has(textFingerprint(r.text || ''))) { counts.duplicatesNonDevText++; return false; }
    return true;
  });
}

function csvRecords(source) {
  const [header, ...cells] = source.rows;
  source.rows = null;
  return cells.map(row => Object.fromEntries(header.map((h, i) => [h, row[i] == null ? '' : row[i]])));
}

function emptyCounts() {
  return { rows: 0, nonDev: 0, missingSplit: 0, familySpansSplits: 0, duplicatesNonDevText: 0, notRegistered: 0, invalid: 0, duplicateDevText: 0, duplicateId: 0 };
}

function verifyActiveSnapshot(root, abs) {
  const activePath = path.join(root, 'eval/data/active-eval.json');
  if (!fs.existsSync(activePath)) return;
  const active = JSON.parse(fs.readFileSync(activePath, 'utf8'));
  if (path.resolve(root, 'eval/data', active.input) === abs && active.sha256 !== sha256(fs.readFileSync(abs))) {
    throw new Refusal('The selected source snapshot changed (eval/data/active-eval.json); refusing to read it.');
  }
}

// Rows of one source, as discovery messages. Non-dev rows never leave this function.
function readSource(root, source) {
  const counts = emptyCounts();
  const bytes = fs.readFileSync(source.abs);
  const info = { kind: source.kind, path: source.rel, sha256: sha256(bytes), selectionRule: SELECTION_RULE[source.kind] };
  let rows = [];
  if (source.kind === 'eval-dev' || source.kind === 'eval-supplied' || source.kind === 'fixture') {
    if (source.kind === 'eval-supplied') {
      verifyActiveSnapshot(root, source.abs);
      try { verifyLock(source.abs); } catch (err) { throw new Refusal(`${source.rel}: ${err.message}`); }
    }
    const records = csvRecords(source);
    counts.rows = records.length;
    rows = selectDevRows(records, counts).map(r => fromCsv(source.kind, r));
    info.provenance = source.kind === 'fixture' ? 'Fictional fixtures written for discovery tests.'
      : source.kind === 'eval-dev' ? 'Local evaluation data (dev format); per-row source: volunteer_shared, public_example or synthetic.'
        : 'Local evaluation data (supplied format); per-row source column.';
    info.exposure = source.kind === 'fixture'
      ? { recorded: false, state: 'fictional fixture; not written to the dev-exposure ledger' }
      : { recorded: false, state: 'pending', mechanism: 'eval/test-access.cjs recordDevExposure → eval/data/exposure-ledger.json' };
  } else {
    const registry = new Set(require(path.join(root, 'eval/exposed-elsewhere.cjs')).exposedTexts(root).map(textFingerprint));
    const seeds = require(path.join(root, 'adversarial/seeds.cjs'));
    const expectOf = new Map(seeds.fraud.map(s => [s.id, s.expect]));
    if (source.kind === 'adversarial-seeds') {
      rows = seeds.fraud.map(s => ({ s, label: 'fraud' })).concat(seeds.legit.map(s => ({ s, label: 'legit' }))).map(({ s, label }) => ({
        id: s.id, group_id: s.id, label, channel: 'text', text: s.text, suppliedTier1: s.expect ? [s.expect] : [],
        provenance: { sourceKind: source.kind, sourceType: 'constructed', bucket: 'synthetic', detail: `seed ${s.id} (${s.category})` },
        priorKnowledge: []
      }));
      info.provenance = 'Constructed seed messages for the rewrite robustness run; not collected messages.';
    } else {
      const known = JSON.parse(bytes.toString('utf8'));
      const ids = new Map();
      const unique = id => { const n = (ids.get(id) || 0) + 1; ids.set(id, n); return n > 1 ? `${id}#${n}` : id; };
      rows = known.escapes.map(e => ({ e, label: 'fraud' })).concat(known.falseAlarms.map(e => ({ e, label: 'legit' }))).map(({ e, label }) => ({
        id: unique(`${e.seed}/${e.chain.join('+')}`), group_id: e.seed, label, channel: 'text', text: e.text,
        suppliedTier1: label === 'fraud' && expectOf.get(e.seed) ? [expectOf.get(e.seed)] : [],
        provenance: { sourceKind: source.kind, sourceType: 'constructed', bucket: 'synthetic', detail: `rewrite of seed ${e.seed} by ${e.chain.join(' → ')}` },
        priorKnowledge: [label === 'fraud'
          ? `Known rewrite escape in adversarial/known-failures.json (engine ${known.engine} gave ${e.got})`
          : `Known rewrite false alarm in adversarial/known-failures.json (${(e.tier1 || []).join(', ')})`]
      }));
      info.provenance = `Constructed rewrites that failed the robustness run (engine ${known.engine}, generator seed ${known.settings.seed}); not collected messages.`;
    }
    counts.rows = rows.length;
    rows = rows.filter(r => registry.has(textFingerprint(r.text)) || (counts.notRegistered++, false));
    info.exposure = { recorded: false, state: 'already registered as dev material by eval/exposed-elsewhere.cjs', mechanism: 'eval/exposed-elsewhere.cjs' };
  }
  return { info, counts, rows };
}

function fromCsv(kind, r) {
  const channel = r.channel === 'sms' ? 'text' : r.channel;
  let provenance;
  if (kind === 'fixture') provenance = { sourceKind: kind, sourceType: 'fictional_fixture', bucket: 'synthetic', detail: r.provenance };
  else if (kind === 'eval-dev') provenance = { sourceKind: kind, sourceType: r.source, bucket: r.source === 'synthetic' ? 'synthetic' : 'real', detail: r.category ? `category ${r.category}` : '' };
  else provenance = { sourceKind: kind, sourceType: 'supplied', bucket: /\bsynthetic\b/i.test(r.source + ' ' + r.notes) ? 'synthetic' : 'real', detail: r.source };
  return {
    id: r.id, group_id: r.group_id, label: r.label, channel, text: r.text,
    suppliedTier1: expectedCodes(r.expected_findings), provenance, priorKnowledge: [],
    _check: kind === 'fixture' ? (/^\s*FICTIONAL/.test(r.provenance) ? '' : 'provenance must start with FICTIONAL')
      : kind === 'eval-dev' && !['volunteer_shared', 'public_example', 'synthetic'].includes(r.source) ? 'invalid source' : ''
  };
}

// Discovery's own row checks. Unlike the legacy evaluator, a fraud row needs no Tier 1 code:
// the concepts this tool looks for are, by definition, ones no code describes yet.
function validRow(r) {
  if (r._check) return r._check;
  if (!String(r.id || '').trim()) return 'id is empty';
  if (!String(r.group_id || '').trim()) return 'family (group_id) is empty';
  if (!LABELS.includes(r.label)) return 'label must be fraud, legit or unlabeled';
  if (!['text', 'email', 'unknown'].includes(r.channel)) return 'channel must be text, email or unknown';
  if (!String(r.text || '').trim()) return 'text is empty';
  return '';
}

function intake(root, inputs) {
  const sources = [], messages = [], ids = new Set(), texts = new Set();
  const resolved = inputs.map(input => resolveSource(root, input));
  for (const source of resolved) {
    const { info, counts, rows } = readSource(root, source);
    const invalidRows = [];
    let selected = 0;
    for (const r of rows) {
      const problem = validRow(r);
      if (problem) { counts.invalid++; invalidRows.push({ id: r.id, reason: problem }); continue; }
      if (ids.has(r.id)) { counts.duplicateId++; continue; }
      const key = textFingerprint(r.text);
      if (texts.has(key)) { counts.duplicateDevText++; continue; }
      ids.add(r.id); texts.add(key); selected++;
      messages.push({
        messageId: r.id, familyId: r.group_id, split: 'dev', provenance: { ...r.provenance, sourcePath: info.path }, suppliedLabel: r.label,
        suppliedTier1: r.suppliedTier1, channel: r.channel, text: r.text, flags: [], priorKnowledge: r.priorKnowledge
      });
    }
    sources.push({ ...info, selected, excluded: counts, invalidDevRows: invalidRows });
  }
  return { sources, messages, selection: selectionSummary(messages) };
}

function selectionSummary(messages) {
  const fam = { real: new Set(), synthetic: new Set() }, msg = { real: 0, synthetic: 0 };
  for (const m of messages) { msg[m.provenance.bucket]++; fam[m.provenance.bucket].add(m.familyId); }
  return {
    selectedIds: messages.map(m => m.messageId).sort(),
    messages: msg, families: { real: fam.real.size, synthetic: fam.synthetic.size }
  };
}

// Dev exposure goes through the evaluator's own ledger, for eval/data sources only.
function recordExposure(root, sources, messages) {
  for (const s of sources) {
    if (s.kind !== 'eval-dev' && s.kind !== 'eval-supplied') continue;
    const mine = messages.filter(m => m.provenance.sourcePath === s.path);
    if (!mine.length) { s.exposure = { ...s.exposure, recorded: false, state: 'no rows selected' }; continue; }
    const file = recordDevExposure(root, mine.map(m => ({ id: m.messageId, group_id: m.familyId, text: m.text })));
    s.exposure = { recorded: true, state: 'recorded', mechanism: s.exposure.mechanism, ledger: rel(root, file), rows: mine.length };
  }
}

module.exports = { Refusal, FIXTURE_HEADER, resolveSource, selectDevRows, intake, recordExposure, sha256 };
