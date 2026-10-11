/* Adapt legacy evidence before presentation drops organization IDs.
   This file assigns evidence categories; only src/assessment.js decides the result. */
(function (root) {
  'use strict';
  var T = root.TFS = root.TFS || {};
  var TIER1 = ['T1-GIFT', 'T1-WIRE', 'T1-REMOTE'];

  function normalizeEvidence(checks, sender, inferred, signals, incomplete) {
    var uncertainty = [];
    var findings = [];
    function finding(ruleId, tier, status, span, support) {
      // Contact extraction has no source offsets. Never infer them from normalized text.
      if (!span) uncertainty.push('finding_span_unavailable:' + ruleId + ':' + findings.length);
      findings.push({ ruleId: ruleId, tier: tier, status: status, span: span || null, support: support });
    }
    if (incomplete) uncertainty.push('input_incomplete');
    if (inferred) uncertainty.push('inferred_sender');
    var contacts = [];
    checks.forEach(function (check, index) {
      if (check.target) {
        contacts.push({
          org: check.orgId || null,
          verification: check.status === 'SUPPORTS' ? 'verified' : 'unresolved',
          checkIndex: index,
          support: check
        });
      }
      if (check.code === 'link_unreadable') uncertainty.push('extraction_failed:' + index);
      if (check.status === 'CONTRADICTS') {
        // Legacy conflicts lack the reviewed closed scope required for T1-DOMAIN.
        finding('legacy_contact:' + check.code, 2, 'established', null, check);
      }
    });
    signals.established.forEach(function (rule) {
      finding(rule.ruleId, TIER1.indexOf(rule.ruleId) >= 0 ? 1 : 2,
        'established', rule.clause, rule);
    });
    signals.unresolved.forEach(function (rule) {
      var gift = ['unclear_gift_payment_purpose', 'competing_card_code_antecedent'].indexOf(rule.id) >= 0;
      finding(gift ? 'T1-GIFT' : rule.id, gift ? 1 : 2, 'unresolved', rule.clause, rule);
      uncertainty.push('risk_unresolved:' + rule.id);
    });
    signals.flags.forEach(function (flag) {
      var support = { id: flag.id, level: flag.level, words: flag.words, start: flag.start, end: flag.end };
      var span = Number.isInteger(flag.start) && Number.isInteger(flag.end)
        ? { start: flag.start, end: flag.end, quote: flag.words } : null;
      // Old severity is display metadata, never sufficient evidence for Tier 1.
      finding(flag.id, 2, 'established', span, support);
    });
    return { sender: sender, contacts: contacts, findings: findings, uncertainty: uncertainty };
  }

  T.normalizeEvidence = normalizeEvidence;
})(typeof window !== 'undefined' ? window : globalThis);
