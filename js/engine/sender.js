/* Sender attribution (R03). A sender is named only where a message says who it is from:
   a label ("USPS:", "Chase Alert:"), a direct statement ("This is Medicare"), an affirmative
   "from" ("a notice from the IRS"), or a sign-off on the last non-empty line ("- Chase").
   A name inside a negation, a reporting frame or a payment phrase is not a claim, an address
   is never a claim, and two different surviving names make the sender unknown.
   Exposes TFS.attributeSender(text, orgs) ->
     { orgId, alias, span: { start, end, quote }, pattern } or { orgId: null, reason }.
   Offsets point into the text it was given. */
(function (root) {
  'use strict';
  var T = root.TFS = root.TFS || {};

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  var cache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function compile(orgs) {
    if (cache && cache.has(orgs)) return cache.get(orgs);
    var list = [];
    (orgs || []).forEach(function (org) {
      (org.aliases || []).forEach(function (a) { list.push({ org: org, alias: a, strict: false }); });
      (org.strictAliases || []).forEach(function (a) { list.push({ org: org, alias: a, strict: true }); });
    });
    list.forEach(function (item) {
      var body = escapeRe(String(item.alias).trim()).replace(/\s+/g, '\\s+');
      // Whole words only. The i flag folds ASCII letters; no Unicode normalization happens here.
      item.re = new RegExp('(?<![A-Za-z0-9&])' + body + '(?![A-Za-z0-9&])', 'gi');
    });
    if (cache) cache.set(orgs, list);
    return list;
  }

  // Words that may sit between a name and the colon of a label: "Chase Alert:", "Wells Fargo Fraud Alert:".
  var LABEL_AFTER = /^(?:[ \t]+[A-Za-z][A-Za-z'&.]*){0,3}[ \t]*:/;
  var LINE_START = /(?:^|\n)[ \t>*"'(\[]*(?:from[ \t]*:?[ \t]+)?(?:the[ \t]+)?$/i;
  var DIRECT_BEFORE = /\b(?:this is|we are|we're|it is|it's)\s+(?:(?:a|an|your)\s+(?:\w+\s+){0,2}(?:message|notice|reminder|text|call|alert|notification|update|email|e-mail|letter)\s+from\s+)?(?:the\s+|your\s+)?$/i;
  var FROM_BEFORE = /\b(?:is|are|was|were|comes?|came|sent|message|messages|text|texts|email|e-mail|notice|alert|letter|call|reminder|update|notification|statement)\s+(?:\w+\s+)?from\s+(?:the\s+|your\s+)?$/i;
  var SIGNOFF_LINE = /^[ \t]*(?:[-–—~]+[ \t]*)?(?:(?:sincerely|regards|best regards|kind regards|warm regards|thanks|thank you|best|cheers|respectfully)[ \t]*,?[ \t]*)?(?:the[ \t]+)?$/i;
  var SIGNOFF_TAIL = /(?:^|[\s.!?])[-–—~]+[ \t]*(?:the[ \t]+)?$/;
  var SIGNOFF_AFTER = /^(?:[ \t]+(?:team|support|customer service|customer care|fraud department|fraud team|security team|security|alerts?|services?))?[ \t]*[.!]?[ \t]*$/i;

  // Exclusions read the clause that holds the name.
  var NEGATION = /\b(?:not|isn['’]?t|aren['’]?t|wasn['’]?t|weren['’]?t|never|nor)\b/i;
  var REPORTING = /\b(?:pretend(?:s|ed|ing)? to be|pos(?:e|es|ed|ing) as|claim(?:s|ed|ing)? to be|impersonat\w*|scam{2}ers?|fraudsters?|criminals?|watch (?:out )?for|beware(?: of)?|look out for|fake)\b/i;
  var PAYMENT_BEFORE = /\b(?:with|via|using|through|by|on)\s+(?:the\s+|your\s+)?$/i;

  function clauseAround(text, start, end) {
    var before = text.slice(0, start), after = text.slice(end);
    // A label's colon ends its clause: "Chase: Fraudsters may ask..." is a label, then a warning.
    var cut = Math.max(before.lastIndexOf('.'), before.lastIndexOf('!'), before.lastIndexOf('?'), before.lastIndexOf(';'), before.lastIndexOf(':'), before.lastIndexOf('\n'));
    var stop = after.search(/[.!?;:\n]/);
    return { prefix: text.slice(cut + 1, start), whole: text.slice(cut + 1, stop < 0 ? text.length : end + stop) };
  }

  function lastLineBounds(text) {
    var trimmed = text.replace(/\s+$/, '');
    return { start: trimmed.lastIndexOf('\n') + 1, end: trimmed.length };
  }

  function patternOf(text, start, end, last) {
    var before = text.slice(0, start), after = text.slice(end);
    if (LINE_START.test(before) && LABEL_AFTER.test(after)) return 'label';
    if (DIRECT_BEFORE.test(before)) return 'direct';
    if (FROM_BEFORE.test(before) || (LINE_START.test(before) && /from[ \t]*:?[ \t]+(?:the[ \t]+)?$/i.test(before))) return 'from';
    if (start >= last.start && end <= last.end && SIGNOFF_AFTER.test(text.slice(end, last.end))) {
      var lead = text.slice(last.start, start);
      if (SIGNOFF_LINE.test(lead) || SIGNOFF_TAIL.test(lead)) return 'signoff';
    }
    return null;
  }

  function rejection(text, start, end) {
    var clause = clauseAround(text, start, end);
    if (PAYMENT_BEFORE.test(clause.prefix)) return 'payment_method';
    if (REPORTING.test(clause.whole)) return 'reporting_frame';
    if (NEGATION.test(clause.prefix)) return 'negated';
    return null;
  }

  function attributeSender(text, orgs) {
    text = text == null ? '' : String(text);
    var last = lastLineBounds(text);
    var survivors = [], rejected = null;
    compile(orgs).forEach(function (item) {
      item.re.lastIndex = 0;
      var m;
      while ((m = item.re.exec(text)) !== null) {
        if (item.strict && !/[A-Z]/.test(m[0].charAt(0))) continue;
        var start = m.index, end = start + m[0].length;
        var pattern = patternOf(text, start, end, last);
        var reason = rejection(text, start, end);
        // A name in a reporting frame or payment phrase explains an unknown sender, claim or not.
        if (reason) { rejected = rejected || reason; continue; }
        if (!pattern) continue;
        survivors.push({ orgId: item.org.id, alias: m[0], span: { start: start, end: end, quote: m[0] }, pattern: pattern });
      }
    });
    if (!survivors.length) return { orgId: null, reason: rejected || 'no_claim' };
    var ids = survivors.map(function (s) { return s.orgId; }).filter(function (id, i, all) { return all.indexOf(id) === i; });
    if (ids.length > 1) return { orgId: null, reason: 'competing_claims', candidates: ids };
    // The earliest, then longest, statement of the one organization.
    survivors.sort(function (a, b) { return a.span.start - b.span.start || b.span.end - a.span.end; });
    return survivors[0];
  }

  // Every organization named anywhere, claim or not, for "also mentions" wording.
  function mentionsOf(text, orgs) {
    var seen = {}, list = [];
    compile(orgs).forEach(function (item) {
      item.re.lastIndex = 0;
      var m;
      while ((m = item.re.exec(text)) !== null) {
        if (item.strict && !/[A-Z]/.test(m[0].charAt(0))) continue;
        if (!seen[item.org.id]) { seen[item.org.id] = 1; list.push(item.org); }
        break;
      }
    });
    return list;
  }

  T.attributeSender = attributeSender;
  T.senderMentions = mentionsOf;
})(typeof window !== 'undefined' ? window : globalThis);
