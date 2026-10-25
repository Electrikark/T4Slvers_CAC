/* Engine replay: each selected message through the app's own engine (eval/engine.cjs), with an
   explicit reference date and the message's channel. Nothing here decides a verdict; it only
   copies out what the engine found and where, and checks every span against the original. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { loadEngine, FILES } = require('../../eval/engine.cjs');

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function engineFingerprint(root) {
  const files = {};
  for (const file of FILES.concat(['src/assessment.js', 'eval/engine.cjs'])) files[file] = sha256(fs.readFileSync(path.join(root, file)));
  return {
    files,
    combined: sha256(JSON.stringify(files)),
    store: files['data/store.js'],
    policy: files['data/policies.js'],
    assessment: files['src/assessment.js'],
    gate: files['js/assessment-gate.js']
  };
}

// A span the engine reported, kept only with its offsets, and marked exact when slicing the
// original at those offsets gives back the engine's quote.
function span(text, s) {
  if (!s || !Number.isInteger(s.start) || !Number.isInteger(s.end)) return null;
  return { start: s.start, end: s.end, quote: String(s.quote), exact: text.slice(s.start, s.end) === s.quote };
}

function summarize(r, text, valid) {
  const findings = (r.evidence && r.evidence.findings) || [];
  const evidence = [], seen = new Set();
  const add = (kind, ruleId, s) => {
    if (!s) return;
    const key = [kind, ruleId, s.start, s.end].join('|');
    if (seen.has(key)) return;
    seen.add(key);
    evidence.push({ kind, ruleId, start: s.start, end: s.end, quote: s.quote, exact: s.exact });
  };
  for (const f of findings) {
    const kind = f.tier === 1 ? 'tier1' : 'tier2';
    add(kind, f.ruleId, span(text, f.span));
    for (const part of ['action', 'object', 'antecedent', 'context']) {
      if (f.support && f.support[part]) add(kind + ':' + part, f.ruleId, span(text, f.support[part]));
    }
  }
  for (const flag of (r.requestRisk && r.requestRisk.flags) || []) add('request-flag', flag.id, span(text, { start: flag.start, end: flag.end, quote: flag.words }));
  for (const c of (r.evidence && r.evidence.contacts) || []) {
    const t = c.support && c.support.target;
    if (t && Array.isArray(t.at)) add('contact', c.support.code, span(text, { start: t.at[0], end: t.at[1], quote: t.raw }));
  }
  if (r.senderAttribution && r.senderAttribution.span) add('sender', r.senderAttribution.orgId, span(text, r.senderAttribution.span));

  const unresolved = ((r.requestRisk && r.requestRisk.unresolved) || []).map(u => ({ kind: 'request', id: u.id, span: span(text, u.action || u.clause) }))
    .concat(((r.evidence && r.evidence.uncertainty) || []).map(u => ({ kind: 'uncertainty', id: String(u), span: null })))
    .concat(((r.policy && r.policy.uncertainty) || []).map(u => ({ kind: 'policy', id: String(u.policyId || u.id || u), span: null })));
  return {
    assessment: r.assessment,
    rules: (r.trace && r.trace.rules) || [],
    blockedBy: (r.trace && r.trace.blockedBy) || [],
    tier1: findings.filter(f => f.tier === 1).map(f => ({ ruleId: f.ruleId, status: f.status, span: span(text, f.span) })),
    tier2: findings.filter(f => f.tier === 2).map(f => ({ ruleId: f.ruleId, status: f.status, level: (f.support && f.support.level) || null, span: span(text, f.span) })),
    unresolved,
    checks: (r.checks || []).map(c => ({ status: c.status, code: c.code, target: c.target || null })),
    evidence,
    truncated: Boolean(r.truncated),
    incomplete: Boolean(r.incomplete),
    valid
  };
}

function replay(root, messages, options) {
  const loaded = (options.engineLoader || loadEngine)(root, { today: options.today });
  let policyVersion = null, failures = 0;
  for (const m of messages) {
    let r;
    try { r = loaded.analyze(m.text, m.channel); } catch (err) {
      failures++;
      m.engine = { assessment: null, error: String(err && err.message || err), rules: [], blockedBy: [], tier1: [], tier2: [], unresolved: [], checks: [], evidence: [], truncated: false, incomplete: true, valid: false };
      continue;
    }
    policyVersion = policyVersion || (r.policy && r.policy.version) || null;
    m.engine = summarize(r, m.text, Boolean(loaded.engine.validateResult && loaded.engine.validateResult(r)));
    if (m.engine.truncated) m.flags.push('engine_truncated');
  }
  return {
    version: loaded.engine.version, storeVersion: loaded.store.version, policyVersion,
    reviewedOrgs: loaded.reviewedOrgs, failures
  };
}

module.exports = { replay, engineFingerprint, summarize };
