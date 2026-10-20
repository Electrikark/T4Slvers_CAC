/* Turns the two readings into one standard form the gate understands:
   { sender, contacts, findings, uncertainty }. This file sorts evidence into tiers;
   only src/assessment.js decides the result. */
(function (root) {
  'use strict';
  const T = root.TFS = root.TFS || {};
  const TIER1 = root.TfsAssessment.TIER1_RULES;

  // Address tricks with no innocent reading, even when our list is missing a real domain:
  // text before @ in a link, an official domain glued to another site, swapped lookalike letters.
  const DOMAIN_TRICKS = ['userinfo_trick', 'official_domain_as_subdomain', 'homoglyph'];
  // Words that turn a brand-named address into a sign-in or payment lure. Checked against real
  // brand domains missing from the list (wellsfargoemail.com, facebookmail.com): none qualify.
  const LURE = /^(?:secure|security|login|signin|verify|verification|account|accounts|update|alert|alerts|support|helpdesk|billing|payment|payments|refund|unlock|locked|suspended|confirm|recovery|restore|reset|fraud|toll|tolls|redelivery|tracking|parcel|reward|rewards|prize|wallet)$/;
  const UNCLEAR_GIFT = ['unclear_gift_payment_purpose', 'competing_card_code_antecedent'];

  // A brand name and a lure word as separate parts of one address: chase-secure-login.net.
  // The brand part is read the way the brand match read it, so amaz0n-secure.com counts too.
  function brandLure(check) {
    const host = check.target && check.target.host;
    if (check.code !== 'brand_in_foreign_domain' || !host || !check.brandWord) return false;
    const parts = host.split('.').slice(0, -1).join('.').split(/[-_.]+/);
    const brand = T.skeleton(check.brandWord);
    return parts.some(p => p === check.brandWord || T.skeleton(T.toUnicodeHost(p) || p) === brand) && parts.some(p => LURE.test(p));
  }

  const isDomainTrick = check => check.strength === 'strong' && (DOMAIN_TRICKS.includes(check.code) || brandLure(check));

  function normalizeEvidence(checks, sender, inferred, signals, incomplete, policyFindings) {
    const contacts = [], findings = [], uncertainty = [];
    function finding(ruleId, tier, status, span, support) {
      // Contact checks carry no position in the original text, and none is guessed.
      if (!span) uncertainty.push(`finding_span_unavailable:${ruleId}:${findings.length}`);
      findings.push({ ruleId, tier, status, span: span || null, support });
    }
    if (incomplete) uncertainty.push('input_incomplete');
    if (inferred) uncertainty.push('inferred_sender');

    checks.forEach((check, index) => {
      if (check.target) {
        contacts.push({ org: check.orgId || null, verification: check.status === 'SUPPORTS' ? 'verified' : 'unresolved', checkIndex: index, support: check });
      }
      if (check.code === 'link_unreadable' || check.code === 'phone_unreadable') uncertainty.push('extraction_failed:' + index);
      // Other conflicts stay Tier 2: real brand domains missing from the list produce them too.
      if (check.status === 'CONTRADICTS') {
        if (isDomainTrick(check)) finding('T1-DOMAIN', 1, 'established', null, check);
        else finding('legacy_contact:' + check.code, 2, 'established', null, check);
      }
    });
    signals.established.forEach(rule => finding(rule.ruleId, TIER1.includes(rule.ruleId) ? 1 : 2, 'established', rule.clause, rule));
    signals.unresolved.forEach(rule => {
      const gift = UNCLEAR_GIFT.includes(rule.id);
      finding(gift ? 'T1-GIFT' : rule.id, gift ? 1 : 2, 'unresolved', rule.clause, rule);
      uncertainty.push('risk_unresolved:' + rule.id);
    });
    // Severity is for display only; a word-level warning is never enough for Tier 1.
    signals.flags.forEach(flag => {
      const span = Number.isInteger(flag.start) && Number.isInteger(flag.end) ? { start: flag.start, end: flag.end, quote: flag.words } : null;
      finding(flag.id, 2, 'established', span, { id: flag.id, level: flag.level, words: flag.words, start: flag.start, end: flag.end });
    });
    // A reviewed policy the message breaks (policy.js). Unresolved when its detector is unsure.
    for (const p of policyFindings || []) {
      finding('T1-POLICY', 1, p.status, p.spans.action, p);
      if (p.status !== 'established') uncertainty.push('policy_unresolved:' + p.policyId);
    }
    return { sender, contacts, findings, uncertainty };
  }

  T.normalizeEvidence = normalizeEvidence;
  T.isDomainTrick = isDomainTrick;
})(typeof window !== 'undefined' ? window : globalThis);
