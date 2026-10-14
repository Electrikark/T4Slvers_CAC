/* Shared Node/browser setup: fictional records and a caller-supplied frozen date.
   This file reads checked-in expectations; it does not load the generator. */
(function (root) {
  'use strict';
  const aliases = {
    'T1-GIFT': 'gift_card_demand', gift_card_payment: 'gift_card_demand', gift_card_disclosure: 'gift_card_demand',
    'T1-CODE': 'code_request', share_code: 'code_request',
    'T1-WIRE': 'wire_demand', crypto_or_wire: 'wire_demand',
    'T1-REMOTE': 'remote_access', remote_access: 'remote_access'
  };
  const verdicts = { suspicious: 'Suspicious', details_match: 'Details Match', insufficient_evidence: 'Insufficient Evidence' };
  function storeFor(state) {
    if (!['none', 'approved', 'rejected', 'expired'].includes(state)) throw new Error('Unknown record state: ' + state);
    const record = { id: 'fictional-chase-domain', kind: 'domain', value: 'chase.com', scope: { type: 'registrable' },
      status: state === 'rejected' ? 'rejected' : 'reviewed', sourceUrl: 'https://example.invalid/fictional-review',
      checkedOn: '2026-10-01', reviewDue: state === 'expired' ? '2026-10-11' : '2026-12-31', reviewedBy: 'Fictional test reviewer' };
    return { version: 'reporting-scope-fictional', shorteners: [], freeMailDomains: [], orgs: [
      { id: 'chase', displayName: 'Chase', aliases: ['chase'], officialDomains: ['chase.com'], officialPhones: [], userContentHosts: [],
        contacts: state === 'none' ? [] : [record] }
    ] };
  }
  function observe(engine, row, evaluationDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(evaluationDate || '')) throw new Error('A frozen evaluation date is required');
    const result = engine.analyze(row.text, storeFor(row.record_state), { declaredChannel: 'text', today: evaluationDate });
    // Tier 1 evidence and its display flag are two representations of one finding.
    // Keep unknown IDs and unresolved evidence: never filter to the expected family.
    const findings = [...new Set(result.evidence.findings.map(f =>
      (f.status === 'established' ? '' : f.status + ':') + (aliases[f.ruleId] || f.ruleId)))].sort();
    const problems = [];
    if (JSON.stringify(findings) !== JSON.stringify(row.expected_findings.slice().sort())) problems.push('findings differ');
    if (verdicts[result.assessment] !== row.expected_verdict) problems.push('verdict differs');
    if (!engine.validateResult(result)) problems.push('invalid result');
    if (result.referenceView.day !== evaluationDate) problems.push('evaluation date lost');
    if (row.record_state === 'approved' && row.expected_findings.length && result.assessment === 'details_match') problems.push('approved record erased demand');
    for (const finding of result.evidence.findings) {
      if (finding.span && row.text.slice(finding.span.start, finding.span.end) !== finding.span.quote) problems.push('source span differs');
    }
    return { id: row.id, context: row.context, family: row.family, passed: problems.length === 0,
      expected_findings: row.expected_findings, expected_verdict: row.expected_verdict,
      actual_findings: findings, actual_verdict: verdicts[result.assessment], problems };
  }
  function evaluate(engine, fixture) {
    return fixture.rows.concat(fixture.hand_rows).map(row => {
      try { return observe(engine, row, fixture.evaluation_date); }
      catch (error) { return { id: row.id, context: row.context, family: row.family, passed: false,
        expected_findings: row.expected_findings, expected_verdict: row.expected_verdict, problems: [error.message] }; }
    });
  }
  const api = { storeFor, observe, evaluate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TFS_SCOPE_SETUP = api;
})(typeof window !== 'undefined' ? window : globalThis);
