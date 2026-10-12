/* Adapt legacy evidence before presentation drops organization IDs.
   This file assigns evidence categories; only src/assessment.js decides the result. */
(function (root) {
  'use strict';
  var T = root.TFS = root.TFS || {};
  var TIER1 = root.TfsAssessment.TIER1_RULES;
  // Address tricks with no innocent reading, whatever the list misses: text before @ in a link,
  // an official domain glued to another site, and letters swapped for lookalikes.
  var DOMAIN_TRICKS = ['userinfo_trick', 'official_domain_as_subdomain', 'homoglyph'];
  // Words that turn a brand-named address into a sign-in or payment lure. Measured against real
  // brand domains missing from the list (wellsfargoemail.com, facebookmail.com): none qualify.
  var LURE = /^(?:secure|security|login|signin|verify|verification|account|accounts|update|alert|alerts|support|helpdesk|billing|payment|payments|refund|unlock|locked|suspended|confirm|recovery|restore|reset|fraud|toll|tolls|redelivery|tracking|parcel|reward|rewards|prize|wallet)$/;

  // A brand name and a lure word as separate parts of one address: chase-secure-login.net.
  function brandLure(check) {
    var host = check.target && check.target.host;
    if (check.code !== 'brand_in_foreign_domain' || !host || !check.brandWord) return false;
    var parts = host.split('.').slice(0, -1).join('.').split(/[-_.]+/);
    return parts.indexOf(check.brandWord) >= 0 && parts.some(function (p) { return LURE.test(p); });
  }

  function domainTier1(check) {
    return check.strength === 'strong' && (DOMAIN_TRICKS.indexOf(check.code) >= 0 || brandLure(check));
  }

  function normalizeEvidence(checks, sender, inferred, signals, incomplete, policyFindings) {
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
        // Other conflicts stay Tier 2: real brand domains missing from the list produce them.
        if (domainTier1(check)) finding('T1-DOMAIN', 1, 'established', null, check);
        else finding('legacy_contact:' + check.code, 2, 'established', null, check);
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
    // A reviewed policy the message breaks (policy.js). Unresolved when its detector is unsure.
    (policyFindings || []).forEach(function (p) {
      finding('T1-POLICY', 1, p.status, p.spans.action, p);
      if (p.status !== 'established') uncertainty.push('policy_unresolved:' + p.policyId);
    });
    return { sender: sender, contacts: contacts, findings: findings, uncertainty: uncertainty };
  }

  T.normalizeEvidence = normalizeEvidence;
})(typeof window !== 'undefined' ? window : globalThis);
