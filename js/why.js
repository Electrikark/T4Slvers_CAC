/* Picks the "Why this is a warning sign" explanations for a result. No drawing here: app.js
   shows them with textContent. Exposes TFS.whyItems(result, why, text).
   Each item carries `words`: the words in this message the reason is about (the request, the
   warning wording, or the lookalike address), so the reason is tied to what was found.
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

  function whyItems(result, why, text) {
    if (!result || !why) return [];
    const findings = (result.evidence && result.evidence.findings) || [];
    const rules = [...new Set(findings.filter(f => f.status === 'established' && f.tier === 1).map(f => f.ruleId))];
    const items = [];
    const seen = new Set();
    const add = (key, entry, words) => {
      if (!entry || items.length >= MAX) return;
      // The same explanation text never appears twice.
      if (seen.has(entry.why)) return;
      seen.add(entry.why);
      items.push({ key, why: entry.why, official: entry.official || null, also: entry.also || null, words: words || null });
    };
    // The words in this message that the reason is about: the request itself (from its verb to
    // its object, the same words the numbered mark covers), else the finding's own span or address.
    const established = (result.requestRisk && result.requestRisk.established) || [];
    const wordsFor = id => {
      const e = established.find(x => x.ruleId === id && x.action);
      if (e && typeof text === 'string') {
        const end = e.object && e.object.start >= e.action.start ? e.object.end : e.action.end;
        const words = text.slice(e.action.start, end).trim();
        if (words) return words;
      }
      const f = findings.find(x => x.status === 'established' && x.ruleId === id && ((x.span && x.span.quote.trim()) || (x.support && x.support.target && x.support.target.raw)));
      return f ? ((f.span && f.span.quote.trim()) || f.support.target.raw) : null;
    };
    rules.forEach(id => add(id, why.rules[id], wordsFor(id)));
    const flags = ((result.requestRisk && result.requestRisk.flags) || []).slice()
      .sort((a, b) => (LEVEL[a.level] ?? 3) - (LEVEL[b.level] ?? 3));
    for (const f of flags) {
      if (COVERED_BY[f.id] && rules.includes(COVERED_BY[f.id])) continue;
      add(f.id, why.flags[f.id], f.words || null);
    }
    return items;
  }

  T.whyItems = whyItems;
})(typeof window !== 'undefined' ? window : globalThis);
