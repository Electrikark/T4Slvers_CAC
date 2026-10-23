/* Picks the "Why this is a warning sign" explanations for a result. No drawing here: app.js
   shows them with textContent. Exposes TFS.whyItems(result, why).
   Order: every Tier 1 rule found, in the order found; then wording warnings whose reason is
   not already covered, highest level first. At most 3, so the reason stays readable. */
(function (root) {
  'use strict';
  const T = root.TFS = root.TFS || {};
  const MAX = 3;
  // A wording warning that repeats a Tier 1 rule's reason adds nothing.
  const COVERED_BY = {
    gift_card_payment: 'T1-GIFT', gift_card_disclosure: 'T1-GIFT', gift_card_purchase: 'T1-GIFT',
    crypto_or_wire: 'T1-WIRE', remote_access: 'T1-REMOTE', share_code: 'T1-CODE',
    tech_support_call: 'T1-CALLBACK', device_alarm: 'T1-CALLBACK', financial_callback: 'T1-CALLBACK', callback_now: 'T1-CALLBACK',
    secret_emergency_money: 'T1-COMBO', secrecy: 'T1-COMBO', family_emergency: 'T1-COMBO'
  };
  const LEVEL = { high: 0, medium: 1, low: 2 };

  function whyItems(result, why) {
    if (!result || !why) return [];
    const findings = (result.evidence && result.evidence.findings) || [];
    const rules = [...new Set(findings.filter(f => f.status === 'established' && f.tier === 1).map(f => f.ruleId))];
    const items = [];
    const seen = new Set();
    const add = (key, entry) => {
      if (!entry || items.length >= MAX) return;
      // The same explanation text never appears twice.
      if (seen.has(entry.why)) return;
      seen.add(entry.why);
      items.push({ key, why: entry.why, official: entry.official || null, also: entry.also || null });
    };
    rules.forEach(id => add(id, why.rules[id]));
    const flags = ((result.requestRisk && result.requestRisk.flags) || []).slice()
      .sort((a, b) => (LEVEL[a.level] ?? 3) - (LEVEL[b.level] ?? 3));
    for (const f of flags) {
      if (COVERED_BY[f.id] && rules.includes(COVERED_BY[f.id])) continue;
      add(f.id, why.flags[f.id]);
    }
    return items;
  }

  T.whyItems = whyItems;
})(typeof window !== 'undefined' ? window : globalThis);
