/* Request candidates: exact spans of each message for a person to review.

   Deliberately broad. Every message gets its full text, each line, each sentence and, where a
   sentence joins parts with ";", ", and", "and then", "also" and the like, each part. None of this
   uses the engine's demand verbs, and it runs on every message, including those the rules already
   flag, so a second request next to a caught one is still offered for review.

   The splitter is a convenience, not a claim about grammar ("Dr. Smith" splits). A reviewer can
   adjust, split or reject any candidate, and the full message is always a candidate.

   Offsets: UTF-16 code units into the original string, half-open [start, end). Boundaries fall
   only on ASCII punctuation and whitespace, so a surrogate pair is never cut. */
'use strict';

const LINE = /\r\n|\r|\n/g;
// End of a sentence: . ! ? or … (repeated), any closing quotes or brackets, then space or line end.
const SENTENCE_END = /[.!?…]+["'’”)\]]*(?=\s|$)/g;
// Clause joins: the connector word starts the next clause. ", then" and "and then" cut once.
const CLAUSE_JOIN = /\s*;\s+|,\s+(?=(?:and|but|then|also|so|plus|or)\b)|(?<!,|\band|\bthen)\s+(?=(?:and then|and also|then also|then|also|plus)\b)/gi;
const MIN_CLAUSE_WORDS = 3;

function trimmed(text, start, end) {
  while (start < end && /\s/.test(text[start])) start++;
  while (end > start && /\s/.test(text[end - 1])) end--;
  return start < end ? { start, end } : null;
}

// Lines, and sentences within lines. kind "line" when a unit is a whole line of a multi-line message.
function sentenceUnits(text) {
  const units = [], lines = [];
  let from = 0;
  for (const m of text.matchAll(LINE)) { lines.push([from, m.index]); from = m.index + m[0].length; }
  lines.push([from, text.length]);
  const multiline = lines.length > 1;
  for (const [ls, le] of lines) {
    const line = trimmed(text, ls, le);
    if (!line) continue;
    const parts = [];
    let s = ls;
    for (const m of text.slice(ls, le).matchAll(SENTENCE_END)) {
      const end = ls + m.index + m[0].length;
      const t = trimmed(text, s, end);
      if (t) parts.push(t);
      s = end;
    }
    const rest = trimmed(text, s, le);
    if (rest) parts.push(rest);
    for (const p of parts) units.push({ ...p, kind: multiline && p.start === line.start && p.end === line.end ? 'line' : 'sentence' });
  }
  return units;
}

const words = s => (s.match(/[\p{L}\p{N}]+/gu) || []).length;

function clauseUnits(text, unit) {
  const cuts = [];
  const body = text.slice(unit.start, unit.end);
  for (const m of body.matchAll(CLAUSE_JOIN)) cuts.push({ end: unit.start + m.index, next: unit.start + m.index + m[0].length });
  if (!cuts.length) return [];
  let parts = [], s = unit.start;
  for (const c of cuts) { parts.push([s, c.end]); s = c.next; }
  parts.push([s, unit.end]);
  parts = parts.map(([a, b]) => trimmed(text, a, b)).filter(Boolean);
  // Fragments too short to be a request are joined back to their neighbor.
  const merged = [];
  for (const p of parts) {
    const prev = merged[merged.length - 1];
    if (prev && (words(text.slice(p.start, p.end)) < MIN_CLAUSE_WORDS || words(text.slice(prev.start, prev.end)) < MIN_CLAUSE_WORDS)) prev.end = p.end;
    else merged.push({ ...p });
  }
  return merged.length > 1 ? merged : [];
}

const overlaps = (a, s) => s && s.start < a.end && s.end > a.start;
const overlapShare = (a, s) => Math.round(1000 * (Math.min(a.end, s.end) - Math.max(a.start, s.start)) / (a.end - a.start)) / 1000;

function coverage(c, engine) {
  const tier1 = (engine.tier1 || []).filter(f => overlaps(c, f.span)).map(f => ({ ruleId: f.ruleId, status: f.status, overlap: overlapShare(c, f.span) }));
  const tier2 = (engine.tier2 || []).filter(f => overlaps(c, f.span)).map(f => ({ ruleId: f.ruleId, status: f.status, overlap: overlapShare(c, f.span) }));
  return {
    tier1, tier2,
    messageLevelTier1: (engine.tier1 || []).filter(f => !f.span && f.status === 'established').map(f => f.ruleId),
    uncovered: !tier1.some(f => f.status === 'established')
  };
}

function buildCandidates(message) {
  const text = message.text;
  const byRange = new Map();
  const add = (s, kind) => {
    if (!s) return;
    const key = s.start + '-' + s.end;
    if (!byRange.has(key)) byRange.set(key, { start: s.start, end: s.end, methods: new Set() });
    byRange.get(key).methods.add(kind);
  };
  const units = sentenceUnits(text);
  add(trimmed(text, 0, text.length), 'full_message');
  for (const u of units) {
    add(u, u.kind);
    for (const c of clauseUnits(text, u)) add(c, 'clause');
  }
  const ordered = [...byRange.values()].sort((a, b) => a.start - b.start || b.end - a.end);
  const order = ['full_message', 'line', 'sentence', 'clause'];
  // A multi-sentence message's full text is kept as context for review, not grouped with spans.
  const distinctUnits = new Set(units.map(u => u.start + '-' + u.end)).size;
  return ordered.map(c => {
    const prev = units.filter(u => u.end <= c.start).pop();
    const next = units.find(u => u.start >= c.end);
    const context = { start: prev ? Math.min(prev.start, c.start) : c.start, end: next ? Math.max(next.end, c.end) : c.end };
    const methods = order.filter(k => c.methods.has(k));
    const contextOnly = methods.length === 1 && methods[0] === 'full_message' && distinctUnits > 1;
    return {
      candidateId: `${message.messageId}#${c.start}-${c.end}`,
      messageId: message.messageId,
      familyId: message.familyId,
      start: c.start, end: c.end, quote: text.slice(c.start, c.end),
      context: { ...context, quote: text.slice(context.start, context.end) },
      methods, origin: 'automatic', reviewState: 'unreviewed',
      coverage: coverage(c, message.engine || {}),
      relatedEvidence: ((message.engine && message.engine.evidence) || []).map((e, i) => overlaps(c, e) ? i : -1).filter(i => i >= 0),
      embedding: { status: contextOnly ? 'context_only' : 'pending', tokens: null, windows: [] },
      groupId: null, similarityToRepresentative: null
    };
  });
}

module.exports = { sentenceUnits, clauseUnits, buildCandidates, coverage };
