/* Review logic shared by the review page (browser) and discovery:check (Node): validating a
   findings file and a review export, issue drafts, and the review summary.

   Human decisions and model signals are kept apart: a decision comes only from the review export;
   groups and similarities come only from findings.json. Nothing here fills in a reviewer, a date or
   an outcome. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DiscoveryShared = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const FINDINGS_SCHEMA = 'safety4seniors.discovery.findings';
  const REVIEW_SCHEMA = 'safety4seniors.discovery.review';
  const OUTCOMES = Object.freeze({
    wording_gap: 'Wording gap in an existing rule',
    missing_concept: 'Possible missing risk concept',
    appropriate_uncertainty: 'Appropriate uncertainty or missing external context',
    already_covered: 'Already covered',
    invalid_candidate: 'Invalid candidate or label concern'
  });
  const REVIEW_STATES = ['unreviewed', 'confirmed', 'adjusted', 'split', 'rejected'];
  const METHODS = ['full_message', 'line', 'sentence', 'clause'];
  const EMBEDDING = ['embedded', 'windowed', 'too_long', 'context_only', 'unavailable', 'skipped'];
  const ISSUE_FIELDS = ['currentBehavior', 'whyInsufficient', 'intendedScope', 'controlsLegit', 'controlsNegated', 'controlsReported', 'unknowns'];
  const MAX_TEXT = 20000;

  const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const isStr = x => typeof x === 'string';
  const isInt = x => Number.isInteger(x) && x >= 0;
  const isIso = x => x === null || (isStr(x) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(x) && Number.isFinite(Date.parse(x)));

  function validateFindings(f, options) {
    const max = (options && options.maxErrors) || 50;
    const errors = [];
    const fail = msg => { if (errors.length < max) errors.push(msg); };
    if (!isObj(f)) return { ok: false, errors: ['The file is not a findings object.'] };
    if (f.schema !== FINDINGS_SCHEMA || f.version !== 1) return { ok: false, errors: ['Not a discovery findings file (schema or version does not match).'] };
    for (const k of ['messages', 'candidates', 'groups', 'singletons', 'ungroupable', 'sensitivity']) if (!Array.isArray(f[k])) fail(`${k} must be a list`);
    if (!isObj(f.neighbors)) fail('neighbors must be an object');
    if (!isStr(f.runId)) fail('runId is missing');
    if (errors.length) return { ok: false, errors };
    const messages = new Map();
    for (const m of f.messages) {
      if (!isObj(m) || !isStr(m.messageId) || !isStr(m.text)) { fail('A message is missing its id or text'); continue; }
      if (messages.has(m.messageId)) fail(`Repeated message ${m.messageId}`);
      messages.set(m.messageId, m);
      if (m.split !== 'dev') fail(`${m.messageId} is not a dev row`);
      if (!['fraud', 'legit', 'unlabeled'].includes(m.suppliedLabel)) fail(`${m.messageId}: invalid supplied label`);
      if (!isObj(m.provenance) || !['real', 'synthetic'].includes(m.provenance.bucket)) fail(`${m.messageId}: provenance bucket must be real or synthetic`);
      if (!isStr(m.familyId) || !m.familyId) fail(`${m.messageId}: family is missing`);
      if (!isObj(m.engine)) fail(`${m.messageId}: engine result is missing`);
    }
    const candidates = new Map();
    const groupIds = new Set((f.groups || []).map(g => g && g.groupId));
    for (const c of f.candidates) {
      if (!isObj(c) || !isStr(c.candidateId)) { fail('A candidate is missing its id'); continue; }
      if (candidates.has(c.candidateId)) fail(`Repeated candidate ${c.candidateId}`);
      candidates.set(c.candidateId, c);
      const m = messages.get(c.messageId);
      if (!m) { fail(`${c.candidateId}: unknown message`); continue; }
      const span = (s, what) => {
        if (!isObj(s) || !isInt(s.start) || !isInt(s.end) || s.start >= s.end || s.end > m.text.length) return fail(`${c.candidateId}: ${what} offsets are invalid`);
        if (m.text.slice(s.start, s.end) !== s.quote) fail(`${c.candidateId}: ${what} quote does not match the original at its offsets`);
      };
      span(c, 'candidate');
      span(c.context, 'context');
      if (isObj(c.context) && (c.context.start > c.start || c.context.end < c.end)) fail(`${c.candidateId}: context does not contain the candidate`);
      if (!Array.isArray(c.methods) || !c.methods.length || c.methods.some(x => !METHODS.includes(x))) fail(`${c.candidateId}: invalid methods`);
      if (c.origin !== 'automatic' || c.reviewState !== 'unreviewed') fail(`${c.candidateId}: automatic candidates must be unreviewed`);
      if (!isObj(c.embedding) || !EMBEDDING.includes(c.embedding.status) || !Array.isArray(c.embedding.windows)) fail(`${c.candidateId}: invalid embedding status`);
      else for (const w of c.embedding.windows) span(w, 'window');
      if (c.groupId !== null && !groupIds.has(c.groupId)) fail(`${c.candidateId}: unknown group`);
      if (!isObj(c.coverage) || typeof c.coverage.uncovered !== 'boolean') fail(`${c.candidateId}: coverage is missing`);
    }
    const reach = new Map();
    const place = (id, where) => {
      if (!candidates.has(id)) return fail(`${where} lists unknown candidate ${id}`);
      reach.set(id, (reach.get(id) || 0) + 1);
    };
    for (const g of f.groups) {
      if (!isObj(g) || !Array.isArray(g.members) || !Array.isArray(g.representatives)) { fail('A group is malformed'); continue; }
      g.members.forEach(id => { place(id, g.groupId); if (candidates.has(id) && candidates.get(id).groupId !== g.groupId) fail(`${id}: group mismatch`); });
      g.representatives.forEach(id => { if (!g.members.includes(id)) fail(`${g.groupId}: representative ${id} is not a member`); });
    }
    f.singletons.forEach(id => place(id, 'singletons'));
    f.ungroupable.forEach(id => place(id, 'ungroupable'));
    for (const id of candidates.keys()) if (reach.get(id) !== 1) fail(`${id} is not reachable exactly once (groups, singletons or ungroupable)`);
    for (const [id, list] of Object.entries(f.neighbors)) {
      if (!candidates.has(id) || !Array.isArray(list)) { fail(`neighbors: unknown candidate ${id}`); continue; }
      for (const x of list) if (!isObj(x) || !candidates.has(x.candidateId)) fail(`neighbors of ${id}: unknown candidate`);
    }
    return { ok: errors.length === 0, errors };
  }

  function emptyReview(runId) {
    return { schema: REVIEW_SCHEMA, version: 1, runId, reviewer: '', frozenAt: null, firstGroupedAt: null, baseline: null, effort: { ungroupedMs: 0, groupedMs: 0 }, created: [], decisions: {} };
  }

  function emptyIssue() { return Object.fromEntries(ISSUE_FIELDS.map(k => [k, ''])); }

  function decision(partial) {
    const d = Object.assign({
      reviewState: 'unreviewed', adjusted: null, splitInto: [], outcome: null, evidence: '', nextAction: '',
      knownBeforeRun: '', knownReference: '', issue: emptyIssue(), mode: 'ungrouped', afterFreeze: false, updatedAt: null
    }, partial || {});
    d.issue = Object.assign(emptyIssue(), d.issue || {});
    return d;
  }

  // Every candidate a review can refer to: the run's own plus the reviewer's.
  function candidateIndex(review, findings) {
    const all = new Map(findings.candidates.map(c => [c.candidateId, c]));
    for (const c of (review && Array.isArray(review.created) ? review.created : [])) if (isObj(c) && isStr(c.candidateId) && !all.has(c.candidateId)) all.set(c.candidateId, c);
    return all;
  }

  function validateReview(review, findings) {
    const errors = [];
    const fail = msg => { if (errors.length < 50) errors.push(msg); };
    if (!isObj(review) || review.schema !== REVIEW_SCHEMA || review.version !== 1) return { ok: false, errors: ['Not a discovery review file (schema or version does not match).'] };
    if (review.runId !== findings.runId) return { ok: false, errors: [`This review belongs to run ${review.runId}, not ${findings.runId}.`] };
    if (!isStr(review.reviewer) || review.reviewer.length > 200) fail('reviewer must be text');
    if (!isIso(review.frozenAt)) fail('frozenAt must be an ISO time or null');
    if (review.firstGroupedAt !== undefined && !isIso(review.firstGroupedAt)) fail('firstGroupedAt must be an ISO time or null');
    if (review.baseline !== null && !isObj(review.baseline)) fail('baseline must be an object or null');
    if (!isObj(review.effort) || !(review.effort.ungroupedMs >= 0) || !(review.effort.groupedMs >= 0)) fail('effort must hold two non-negative durations');
    if (!Array.isArray(review.created) || !isObj(review.decisions)) return { ok: false, errors: errors.concat('created must be a list and decisions an object') };
    const messages = new Map(findings.messages.map(m => [m.messageId, m]));
    const auto = new Set(findings.candidates.map(c => c.candidateId));
    const created = new Set();
    for (const c of review.created) {
      const m = isObj(c) && messages.get(c.messageId);
      if (!m || !isStr(c.candidateId) || auto.has(c.candidateId) || created.has(c.candidateId)) { fail('A reviewer candidate has an unknown message or a repeated id'); continue; }
      created.add(c.candidateId);
      if (c.origin !== 'reviewer') fail(`${c.candidateId}: reviewer candidates must say origin "reviewer"`);
      if (!isInt(c.start) || !isInt(c.end) || c.start >= c.end || c.end > m.text.length || m.text.slice(c.start, c.end) !== c.quote) fail(`${c.candidateId}: quote does not match the original at its offsets`);
    }
    const all = candidateIndex(review, findings);
    for (const [id, d] of Object.entries(review.decisions)) {
      const c = all.get(id);
      if (!c) { fail(`Decision for unknown candidate ${id}`); continue; }
      if (!isObj(d)) { fail(`${id}: decision is malformed`); continue; }
      if (!REVIEW_STATES.includes(d.reviewState)) fail(`${id}: invalid review state`);
      if (d.outcome !== null && !Object.prototype.hasOwnProperty.call(OUTCOMES, d.outcome)) fail(`${id}: invalid outcome "${d.outcome}"`);
      if (!['yes', 'no', 'unsure', ''].includes(d.knownBeforeRun)) fail(`${id}: knownBeforeRun must be yes, no, unsure or empty`);
      if (!['ungrouped', 'grouped'].includes(d.mode)) fail(`${id}: mode must be ungrouped or grouped`);
      if (!isIso(d.updatedAt)) fail(`${id}: updatedAt must be an ISO time or null`);
      for (const k of ['evidence', 'nextAction', 'knownReference']) if (!isStr(d[k]) || d[k].length > MAX_TEXT) fail(`${id}: ${k} must be text under ${MAX_TEXT} characters`);
      if (!isObj(d.issue) || ISSUE_FIELDS.some(k => !isStr(d.issue[k]) || d.issue[k].length > MAX_TEXT)) fail(`${id}: issue fields must be text`);
      if (d.reviewState === 'adjusted') {
        const m = messages.get(c.messageId), a = d.adjusted;
        if (!isObj(a) || !isInt(a.start) || !isInt(a.end) || a.start >= a.end || a.end > m.text.length || m.text.slice(a.start, a.end) !== a.quote) fail(`${id}: adjusted quote does not match the original at its offsets`);
      } else if (d.adjusted !== null) fail(`${id}: adjusted span given without the adjusted state`);
      if (!Array.isArray(d.splitInto) || d.splitInto.some(x => !created.has(x))) fail(`${id}: split parts must be reviewer candidates`);
      if (d.reviewState === 'split' && d.splitInto.length < 2) fail(`${id}: a split needs at least two parts`);
    }
    return { ok: errors.length === 0, errors };
  }

  // The span a decision is about: the adjusted one when the reviewer moved it.
  function decidedSpan(d, c) { return d.reviewState === 'adjusted' && d.adjusted ? d.adjusted : { start: c.start, end: c.end, quote: c.quote }; }

  const line = s => String(s || '').trim() || '_(not filled in)_';
  const quoteBlock = s => String(s).split(/\r\n|\r|\n/).map(l => '> ' + l).join('\n');

  function issueDraft(d, c, m) {
    const s = decidedSpan(d, c);
    const e = m.engine || {};
    const t1 = (e.tier1 || []).map(f => `${f.ruleId} (${f.status})`).join(', ') || 'none';
    const t2 = (e.tier2 || []).map(f => `${f.ruleId} (${f.status})`).join(', ') || 'none';
    return [
      `## Draft: ${OUTCOMES[d.outcome] || 'Unclassified'} — ${c.candidateId}`,
      '',
      '_Draft for discussion. Not filed, not a rule change. Built from one human review decision; the grouping is not evidence._',
      '',
      '### Exact request',
      '',
      quoteBlock(s.quote),
      '',
      `- Candidate: \`${c.candidateId}\` (offsets ${s.start}–${s.end}, UTF-16, half-open)`,
      `- Message: \`${m.messageId}\` · family \`${m.familyId}\` · source ${m.provenance.sourceType} (${m.provenance.bucket}) · supplied label ${m.suppliedLabel} · channel ${m.channel}`,
      `- Known before this run: ${d.knownBeforeRun || 'not recorded'}${d.knownReference ? ' — ' + d.knownReference : ''}`,
      '',
      '### Current behavior',
      '',
      `- Engine verdict: ${e.assessment || 'n/a'} · Tier 1: ${t1} · Tier 2: ${t2}`,
      `- Tier 1 spans overlapping this request: ${(c.coverage && c.coverage.tier1.map(x => x.ruleId).join(', ')) || 'none'}`,
      `- Reviewer: ${line(d.issue.currentBehavior)}`,
      '',
      '### Why it is insufficient',
      '',
      line(d.issue.whyInsufficient),
      '',
      '### Evidence',
      '',
      line(d.evidence),
      '',
      '### Intended rule scope or wording change',
      '',
      line(d.issue.intendedScope),
      '',
      '### Controls that must not change',
      '',
      `- Legitimate control: ${line(d.issue.controlsLegit)}`,
      `- Negated control: ${line(d.issue.controlsNegated)}`,
      `- Reported control: ${line(d.issue.controlsReported)}`,
      '',
      '### Unknowns and required validation',
      '',
      line(d.issue.unknowns),
      '',
      '- Separate change with its own regression checks (`npm test`, `npm run robustness:known`) and genuinely separate evaluation.',
      '',
      '### Proposed next action',
      '',
      line(d.nextAction),
      ''
    ].join('\n');
  }

  function summarizeReview(review, findings) {
    const messages = new Map(findings.messages.map(m => [m.messageId, m]));
    const all = candidateIndex(review, findings);
    const byOutcome = {};
    for (const k of Object.keys(OUTCOMES)) byOutcome[k] = { items: 0, families: { real: 0, synthetic: 0 }, familyIds: { real: [], synthetic: [] }, redundantItems: 0 };
    const discoveries = [];
    let decided = 0, afterFreeze = 0;
    const known = { yes: 0, no: 0, unsure: 0, unset: 0 };
    for (const [id, d] of Object.entries(review.decisions)) {
      const c = all.get(id);
      if (!c || !d.outcome) continue;
      decided++;
      if (d.afterFreeze) afterFreeze++;
      const m = messages.get(c.messageId), b = m.provenance.bucket, o = byOutcome[d.outcome];
      o.items++;
      if (!o.familyIds[b].includes(m.familyId)) o.familyIds[b].push(m.familyId);
      if (d.outcome === 'wording_gap' || d.outcome === 'missing_concept') {
        known[d.knownBeforeRun || 'unset']++;
        discoveries.push({ candidateId: id, messageId: m.messageId, familyId: m.familyId, bucket: b, source: m.provenance.sourceType, outcome: d.outcome, quote: decidedSpan(d, c).quote, evidence: d.evidence, nextAction: d.nextAction, knownBeforeRun: d.knownBeforeRun, mode: d.mode, afterFreeze: d.afterFreeze, updatedAt: d.updatedAt });
      }
    }
    for (const o of Object.values(byOutcome)) {
      o.families.real = o.familyIds.real.length;
      o.families.synthetic = o.familyIds.synthetic.length;
      o.redundantItems = o.items - o.families.real - o.families.synthetic;
    }
    const baselineIds = review.baseline && isObj(review.baseline.decisions) ? Object.keys(review.baseline.decisions).filter(id => review.baseline.decisions[id].outcome) : [];
    return {
      runId: findings.runId,
      reviewer: review.reviewer,
      demonstration: Boolean(findings.demonstration),
      candidates: findings.candidates.length + review.created.length,
      decided,
      unresolvedCandidates: findings.candidates.length + review.created.length - decided,
      byOutcome,
      knownBeforeRun: known,
      discoveries,
      baseline: { frozenAt: review.frozenAt, firstGroupedAt: review.firstGroupedAt || null, groupedBeforeFreeze: Boolean(review.firstGroupedAt && (!review.frozenAt || review.firstGroupedAt < review.frozenAt)), decidedAtFreeze: baselineIds.length, decidedAfterFreeze: afterFreeze },
      effort: review.effort,
      mlBenefit: 'unproven'
    };
  }

  function renderSummary(s) {
    const out = ['# Discovery review summary', ''];
    if (s.demonstration) out.push('**Demonstration run on fictional or constructed material. No real-data findings.**', '');
    out.push(`Run \`${s.runId}\` · reviewer: ${s.reviewer ? s.reviewer : 'not recorded'} · candidates ${s.candidates} · with an outcome ${s.decided} · without an outcome ${s.unresolvedCandidates}`, '');
    out.push('Counts are per unique family; items beyond the first in a family are redundant variants, not separate discoveries. Real and synthetic families are never added together.', '');
    out.push('| Outcome | Items | Real families | Synthetic families | Redundant items |', '| --- | --- | --- | --- | --- |');
    for (const [k, label] of Object.entries(OUTCOMES)) {
      const o = s.byOutcome[k];
      out.push(`| ${label} | ${o.items} | ${o.families.real} | ${o.families.synthetic} | ${o.redundantItems} |`);
    }
    out.push('', `Known before this run (wording gaps and missing concepts): yes ${s.knownBeforeRun.yes} · no ${s.knownBeforeRun.no} · unsure ${s.knownBeforeRun.unsure} · not recorded ${s.knownBeforeRun.unset}`, '');
    out.push('## Baseline comparison', '');
    if (s.baseline.frozenAt) {
      out.push(`Ungrouped notes frozen at ${s.baseline.frozenAt} with ${s.baseline.decidedAtFreeze} outcomes. Outcomes set after the freeze: ${s.baseline.decidedAfterFreeze}.`,
        'This is exploratory: the reviewer had already seen the material, so it supports neither a speed nor a causal claim.');
      if (s.baseline.groupedBeforeFreeze) out.push('', 'The grouped view was opened before the freeze, so the frozen notes are not a clean ungrouped baseline.');
    } else out.push('Ungrouped notes were not frozen, so no comparison between the ungrouped queue and the grouped view is possible.');
    const min = ms => (ms / 60000).toFixed(1) + ' min';
    out.push('', `Measured page time: ungrouped ${min(s.effort.ungroupedMs)} · grouped ${min(s.effort.groupedMs)} (visible time in one browser; not a controlled timing).`, '');
    out.push('## ML benefit', '', 'Unproven. This summary counts human decisions; it does not show that grouping found anything the ungrouped queue would not have.', '');
    out.push('## Wording gaps and possible missing concepts (traceable)', '');
    if (!s.discoveries.length) out.push('None recorded.');
    for (const d of s.discoveries) {
      out.push(`- **${OUTCOMES[d.outcome]}** · \`${d.candidateId}\` · message \`${d.messageId}\` · family \`${d.familyId}\` (${d.bucket}, ${d.source}) · decided in ${d.mode} view${d.afterFreeze ? ' after the freeze' : ''}${d.updatedAt ? ' at ' + d.updatedAt : ''}`);
      out.push(`  - Request: ${JSON.stringify(d.quote)}`);
      out.push(`  - Evidence: ${d.evidence || '_(none written)_'}`);
      out.push(`  - Next action: ${d.nextAction || '_(none written)_'}`);
    }
    out.push('');
    return out.join('\n');
  }

  function issueDrafts(review, findings) {
    const messages = new Map(findings.messages.map(m => [m.messageId, m]));
    const all = candidateIndex(review, findings);
    const parts = ['# Issue drafts (not filed)', ''];
    for (const [id, d] of Object.entries(review.decisions)) {
      if (d.outcome !== 'wording_gap' && d.outcome !== 'missing_concept') continue;
      const c = all.get(id);
      if (c) parts.push(issueDraft(d, c, messages.get(c.messageId)));
    }
    if (parts.length === 2) parts.push('No decision is a wording gap or a possible missing concept.', '');
    return parts.join('\n');
  }

  return { FINDINGS_SCHEMA, REVIEW_SCHEMA, OUTCOMES, REVIEW_STATES, ISSUE_FIELDS, validateFindings, emptyReview, decision, validateReview, decidedSpan, issueDraft, summarizeReview, renderSummary, issueDrafts, candidateIndex };
}));
