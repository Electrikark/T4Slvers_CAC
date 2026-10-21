/* Turns labeled messages and engine results into rates a reader can trust.
   Every rate carries a 95% Wilson score interval, because samples here are small. */
'use strict';

const LABELS = ['fraud', 'legit'];
const CHANNELS = ['text', 'email', 'unknown'];
const SPLITS = ['dev', 'test'];
const REQUIRED = ['id', 'label', 'channel', 'source', 'text'];

// Wilson score interval: honest at small n and near 0% or 100%, unlike p ± 1.96·SE.
function wilson(hits, n, z = 1.96) {
  if (!n) return null;
  const p = hits / n, z2 = z * z;
  const centre = (p + z2 / (2 * n)) / (1 + z2 / n);
  const half = (z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  return { rate: p, low: Math.max(0, centre - half), high: Math.min(1, centre + half) };
}

// FNV-1a: a stable 30% test split from the id alone, so it never depends on row order.
function autoSplit(id) {
  let h = 0x811c9dc5;
  for (const ch of String(id)) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h % 10 < 3 ? 'test' : 'dev';
}

// Validates the sheet. Returns { messages, errors, skipped }; any error stops the run.
function readMessages(rows) {
  const errors = [], messages = [];
  let skipped = 0;
  if (!rows.length) return { messages, errors: ['The file has no header row.'], skipped };
  const header = rows[0].map(h => h.trim().toLowerCase());
  const missing = REQUIRED.filter(name => header.indexOf(name) < 0);
  if (missing.length) return { messages, errors: ['Missing column(s): ' + missing.join(', ')], skipped };
  const seenIds = new Map(), seenTexts = new Map();
  rows.slice(1).forEach((cells, index) => {
    const line = index + 2;
    const r = {};
    header.forEach((name, k) => { r[name] = (cells[k] || '').trim(); });
    r.text = (cells[header.indexOf('text')] || '').replace(/^\s+|\s+$/g, '');
    // The template's sample rows must never be counted as real evidence.
    if (/^fictional/i.test(r.source)) { skipped++; return; }
    const where = 'Row ' + line + (r.id ? ' (' + r.id + ')' : '');
    if (!r.id) errors.push(where + ': id is empty');
    else if (seenIds.has(r.id)) errors.push(where + ': id repeats row ' + seenIds.get(r.id));
    else seenIds.set(r.id, line);
    r.label = r.label.toLowerCase();
    r.channel = r.channel.toLowerCase();
    r.split = (r.split || '').toLowerCase();
    if (LABELS.indexOf(r.label) < 0) errors.push(where + ': label must be fraud or legit, not "' + r.label + '"');
    if (CHANNELS.indexOf(r.channel) < 0) errors.push(where + ': channel must be text, email or unknown, not "' + r.channel + '"');
    if (r.split && SPLITS.indexOf(r.split) < 0) errors.push(where + ': split must be dev, test or empty, not "' + r.split + '"');
    if (!r.source) errors.push(where + ': source is empty; every message needs a traceable origin');
    if (!r.text) errors.push(where + ': text is empty');
    else if (seenTexts.has(r.text)) errors.push(where + ': same text as row ' + seenTexts.get(r.text));
    else seenTexts.set(r.text, line);
    r.split = r.split || autoSplit(r.id);
    r.category = r.category || 'uncategorized';
    messages.push(r);
  });
  return { messages, errors, skipped };
}

// fraud: caught (Suspicious) / paused (Insufficient) / REASSURED (Details Match, the worst case).
// legit: matched / paused / FALSE_ALARM (Suspicious).
function outcomeOf(label, assessment) {
  if (label === 'fraud') return { suspicious: 'caught', insufficient_evidence: 'paused', details_match: 'REASSURED' }[assessment];
  return { details_match: 'matched', insufficient_evidence: 'paused', suspicious: 'FALSE_ALARM' }[assessment];
}

function judge(messages, analyze, split = 'all') {
  if (!['all', 'dev', 'test'].includes(split)) throw new Error('split must be all, dev or test');
  if (split !== 'all') messages = messages.filter(m => m.split === split);
  if (!messages.length) throw new Error('No messages in the selected split.');
  if (split === 'test' && !LABELS.every(label => messages.some(m => m.label === label))) {
    throw new Error('The test split needs both fraud and legitimate messages.');
  }
  return messages.map(m => {
    const r = analyze(m.text, m.channel);
    const established = r.evidence.findings.filter(f => f.status === 'established');
    return Object.assign({}, m, {
      assessment: r.assessment,
      outcome: outcomeOf(m.label, r.assessment),
      tier1: established.filter(f => f.tier === 1).map(f => f.ruleId),
      tier2: established.filter(f => f.tier === 2).map(f => f.ruleId),
      // The page's "Warning signs in what it asks" line: alarming even when the label is not Suspicious.
      strongWarning: Boolean(r.requestRisk && r.requestRisk.level === 'high'),
      blockedBy: r.trace.blockedBy
    });
  });
}

function tally(results) {
  const of = label => results.filter(r => r.label === label);
  const fraud = of('fraud'), legit = of('legit');
  const count = (list, a) => list.filter(r => r.assessment === a).length;
  const block = list => ({
    n: list.length,
    suspicious: count(list, 'suspicious'),
    insufficient: count(list, 'insufficient_evidence'),
    match: count(list, 'details_match'),
    warnedOnly: list.filter(r => r.assessment !== 'suspicious' && r.strongWarning).length
  });
  const f = block(fraud), l = block(legit);
  return {
    fraud: f, legit: l,
    rates: {
      // Share of fraud labeled Suspicious.
      caught: wilson(f.suspicious, f.n),
      // Share of fraud that at least told the person to pause (Suspicious or Insufficient).
      paused: wilson(f.suspicious + f.insufficient, f.n),
      // Share of fraud given Details Match: false reassurance. Must be zero.
      reassured: wilson(f.match, f.n),
      // Share of legitimate messages labeled Suspicious.
      falseAlarm: wilson(l.suspicious, l.n),
      // Share of legitimate messages that were labeled Suspicious or shown a high-level warning.
      // A strong warning on an honest message still alarms the reader, so it is counted here too.
      alarmed: wilson(l.suspicious + l.warnedOnly, l.n),
      // Share of legitimate messages that reached Details Match.
      matched: wilson(l.match, l.n)
    }
  };
}

function ruleCounts(results) {
  const counts = {};
  results.forEach(r => {
    new Set(r.tier1.concat(r.tier2)).forEach(id => {
      counts[id] = counts[id] || { fraud: 0, legit: 0 };
      counts[id][r.label]++;
    });
  });
  return Object.keys(counts).sort().map(id => Object.assign({ rule: id }, counts[id]));
}

function byCategory(results) {
  const groups = {};
  results.forEach(r => { (groups[r.category] = groups[r.category] || []).push(r); });
  return Object.keys(groups).sort().map(category => Object.assign({ category }, tally(groups[category])));
}

module.exports = { wilson, autoSplit, readMessages, outcomeOf, judge, tally, ruleCounts, byCategory, REQUIRED };
