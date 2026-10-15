/* Finds what the message contains and who it claims to be from.
   extractTargets(text): links, email addresses and phone numbers, with bounded work per token.
   findClaim(maskedText, store): the organization the message names as its sender, if any. */
// Find contacts, then look for a sender name outside those contacts.
(function (root) {
  'use strict';
  const T = root.TFS = root.TFS || {};

  const MAX_TOKEN = 2048;
  const MAX_TARGETS = 30;
  // Characters that end a token: whitespace, brackets and quotes around links.
  const TOKEN_RE = /[^\s<>"'`()\[\]{}]+/g;
  const FILE_ENDINGS = /^(?:pdf|jpg|jpeg|png|gif|svg|webp|docx?|xlsx?|pptx?|txt|csv|zip|exe|js|css|html?|mp[34]|md)$/i;
  const LEAD_PUNCT = /^[*.,;:!?\-_~]+/;
  const TRAIL_PUNCT = /[.,;:!?*~]+$/;
  // \u00A1-\uFFFF: any non-ASCII letter, for internationalized domain names.
  const BARE_HOST_RE = /^((?:[a-z0-9\u00A1-\uFFFF](?:[a-z0-9\u00A1-\uFFFF-]{0,62})?\.){1,10}([a-z\u00A1-\uFFFF]{2,24}|xn--[a-z0-9-]{1,59}))(?::\d{1,5})?(?:[\/?#].*)?$/i;
  const EMAIL_RE = /^(?:mailto:)?([a-z0-9._%+\-]{1,64})@((?:[a-z0-9\u00A1-\uFFFF-]{1,63}\.){1,10}[a-z\u00A1-\uFFFF]{2,24})$/i;
  // North American numbers: (202) 555-0148, 202.555.0148, +1 202 555 0148.
  const PHONE_RE = /(?<![\w+])(?:\+?1[\s.\-]?)?\(?([2-9]\d{2})\)?[\s.\-]?([2-9]\d{2})[\s.\-]?(\d{4})(?!\d)/g;

  function decodeSafe(s) {
    try { return decodeURIComponent(s); } catch (err) { return s; }
  }

  function parseLink(raw, withScheme) {
    const target = { kind: 'link', raw };
    try {
      const url = new URL(withScheme);
      target.host = url.hostname.toLowerCase().replace(/\.+$/, '');
      target.hostUnicode = T.toUnicodeHost(target.host);
      // Text before an @ in a link ("paypal.com@evil.example") is a known trick; keep it for checking.
      target.userinfo = url.username ? decodeSafe(url.username) + (url.password ? ':' + decodeSafe(url.password) : '') : '';
      target.scheme = url.protocol.replace(':', '');
      target.path = url.pathname || '/';
      // Do not silently turn malformed separators into a partial, trusted host.
      // Never turn malformed separators into a partial host that looks trustworthy.
      if (/[|\\^]/.test(raw)) target.error = 'unreadable';
    } catch (err) {
      target.error = 'unreadable';
    }
    return target;
  }

  function parseEmail(token) {
    const domain = token.match(EMAIL_RE)[2].toLowerCase();
    const target = { kind: 'email', raw: token.replace(/^mailto:/i, ''), host: domain, userinfo: '' };
    try {
      target.host = new URL('http://' + domain).hostname;
    } catch (err) {
      target.error = 'unreadable';
    }
    target.hostUnicode = T.toUnicodeHost(target.host || '');
    return target;
  }

  // One token to a link or email target, or null.
  function parseToken(token) {
    if (/^(?:https?|ftp):\/\//i.test(token)) return parseLink(token, token);
    if (EMAIL_RE.test(token)) return parseEmail(token);
    if (/^www\./i.test(token)) return parseLink(token, 'http://' + token);
    const bare = !token.includes('@') && token.match(BARE_HOST_RE);
    // "report.pdf" is a file name, but an unfamiliar ending like ".top" must still be checked.
    if (bare && !FILE_ENDINGS.test(bare[2])) return parseLink(token, 'http://' + token);
    if (/[.|\\^@]/.test(token) && /(?:https?:|www\.)/i.test(token)) return { kind: 'link', raw: token, error: 'unreadable' };
    return null;
  }

  function extractTargets(text) {
    const targets = [], spans = [], seen = new Set();
    let incomplete = false;
    const add = (key, target) => {
      if (seen.has(key)) return;
      seen.add(key);
      if (targets.length < MAX_TARGETS) targets.push(target);
      else incomplete = true;
    };

    for (const m of text.matchAll(TOKEN_RE)) {
      let token = m[0], start = m.index;
      if (token.length > MAX_TOKEN) {
        incomplete = true;
        spans.push([start, start + token.length]);
        continue;
      }
      var start = m.index;
      var lead = token.match(LEAD_PUNCT);
      if (lead) { token = token.slice(lead[0].length); start += lead[0].length; }
      token = token.replace(TRAIL_PUNCT, '');
      if (!token) continue;
      var target = null;
      if (/^(?:https?|ftp):\/\//i.test(token)) {
        target = parseLink(token, token);
      } else if (EMAIL_RE.test(token)) {
        var em = token.match(EMAIL_RE);
        var domain = em[2].toLowerCase();
        target = { kind: 'email', raw: token.replace(/^mailto:/i, ''), host: domain, userinfo: '' };
        try {
          target.host = new URL('http://' + domain).hostname;
        } catch (err) {
          target.error = 'unreadable';
        }
        target.hostUnicode = T.toUnicodeHost(target.host || '');
      } else if (/^www\./i.test(token)) {
        target = parseLink(token, 'http://' + token);
      } else if (token.indexOf('@') < 0) {
        var bm = token.match(BARE_HOST_RE);
        if (bm) {
          var tld = bm[2].toLowerCase();
          // Host names ignore case. Unfamiliar endings must not vanish from a check.
          if (!FILE_ENDINGS.test(tld)) {
            target = parseLink(token, 'http://' + token);
          }
        }
      }
      if (!target && /[.|\\^@]/.test(token) && /(?:https?:|www\.)/i.test(token)) {
        target = { kind: 'link', raw: token, error: 'unreadable' };
      }
      if (target) {
        // Offsets into the text given to extractTargets (see sourceTargets for the person's text).
        target.at = [start, start + token.length];
        spans.push([start, start + token.length]);
        var key = target.kind + ':' + (target.error ? target.raw : target.host || target.raw) + ':' + (target.userinfo || '');
        if (!seen[key]) {
          seen[key] = 1;
          if (targets.length < MAX_TARGETS) targets.push(target);
          else incomplete = true;
        }
      const lead = token.match(LEAD_PUNCT);
      if (lead) {
        token = token.slice(lead[0].length);
        start += lead[0].length;
      }
      token = token.replace(TRAIL_PUNCT, '');
      const target = token && parseToken(token);
      if (!target) continue;
      spans.push([start, start + token.length]);
      add(`${target.kind}:${target.error ? target.raw : target.host || target.raw}:${target.userinfo || ''}`, target);
    }

    // Blank out links and emails so their digits and names do not count as phones or senders.
    const chars = text.split('');
    for (const [from, to] of spans) chars.fill(' ', from, to);
    const masked = spans.length ? chars.join('') : text;

    PHONE_RE.lastIndex = 0;
    var p;
    while ((p = PHONE_RE.exec(masked)) !== null) {
      var e164 = '+1' + p[1] + p[2] + p[3];
      if (!seen['phone:' + e164]) {
        seen['phone:' + e164] = 1;
        if (targets.length < MAX_TARGETS) {
          var lead = p[0].length - p[0].replace(/^\s+/, '').length;
          var phoneText = p[0].trim();
          targets.push({ kind: 'phone', raw: phoneText, e164: e164, display: '(' + p[1] + ') ' + p[2] + '-' + p[3], at: [p.index + lead, p.index + lead + phoneText.length] });
        } else incomplete = true;
      }
    for (const p of masked.matchAll(PHONE_RE)) {
      const e164 = '+1' + p[1] + p[2] + p[3];
      add('phone:' + e164, { kind: 'phone', raw: p[0].trim(), e164, display: `(${p[1]}) ${p[2]}-${p[3]}` });
    }
    return { targets, masked, incomplete };
  }

  /* ---------- Claim ---------- */
  var GENERIC_CLAIMS = [
  /* ---------- The claimed sender ---------- */
  var compiledCache = new WeakMap();

  const aliasCache = new WeakMap();

  // One case-insensitive pattern per organization name; strict names must start with a capital.
  function aliasPatterns(store) {
    if (aliasCache.has(store)) return aliasCache.get(store);
    const list = [];
    for (const org of store.orgs || []) {
      for (const alias of org.aliases || []) list.push({ org, alias, strict: false });
      for (const alias of org.strictAliases || []) list.push({ org, alias, strict: true });
    }
    for (const item of list) {
      const body = item.alias.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      item.re = new RegExp('(?<![A-Za-z0-9&])' + body + '(?![A-Za-z0-9&])', 'gi');
    }
    aliasCache.set(store, list);
  function compileAliases(store) {
    if (compiledCache.has(store)) return compiledCache.get(store);
    var list = [];
    (store.orgs || []).forEach(function (org) {
      (org.aliases || []).forEach(function (a) { list.push({ org: org, alias: a, strict: false }); });
      (org.strictAliases || []).forEach(function (a) { list.push({ org: org, alias: a, strict: true }); });
    });
    list.forEach(function (item) {
      var body = escapeRe(item.alias.trim()).replace(/\s+/g, '\\s+');
      item.re = new RegExp('(?<![A-Za-z0-9&])' + body + '(?![A-Za-z0-9&])', 'gi');
    });
    compiledCache.set(store, list);
    return list;
  }

  // When no known organization is named, a general description is still worth showing.
  const GENERIC_CLAIMS = [
    { re: /\b(?:your|the)\s+(?:bank|credit union|card issuer)\b/i, label: 'Your bank (not named)' },
    { re: /\b(?:tech(?:nical)?\s+support|customer\s+support|help\s+desk|security\s+team)\b/i, label: 'A support service (not named)' },
    { re: /\b(?:toll|tolls)\b/i, label: 'A toll service (not named)' }
  ];

  // The claimed sender comes only from TFS.attributeSender (sender.js); an address is never a claim.
  function findClaim(masked, store) {
    var orgs = store.orgs || [];
    var attribution = T.attributeSender(masked, orgs);
    var org = attribution.orgId ? orgs.filter(function (o) { return o.id === attribution.orgId; })[0] : null;
    var others = T.senderMentions(masked, orgs).filter(function (o) { return !org || o.id !== org.id; })
      .map(function (o) { return o.displayName; });
    if (org) return { org: org, words: attribution.alias, generic: null, otherMentions: others, attribution: attribution };
    for (var g = 0; g < GENERIC_CLAIMS.length; g++) {
      if (GENERIC_CLAIMS[g].re.test(masked)) return { org: null, generic: GENERIC_CLAIMS[g].label, otherMentions: [], attribution: attribution };
    }
    return { org: null, generic: null, otherMentions: [], attribution: attribution };
  }

  /* Contacts with spans in the person's own text: the same extraction as the risk rules use,
     moved back to source offsets. Every occurrence is listed, repeats included. */
  function sourceTargets(source) {
    var raw = source == null ? '' : String(source);
    var view = T.riskView(raw);
    var found = [], seen = {};
    extractTargets(view.text).targets.forEach(function (target) {
      var moved = T.sourceSpan(view, raw, target.at[0], target.at[1]);
      found.push({ target: target, start: moved.start, end: moved.end, quote: raw.slice(moved.start, moved.end) });
      seen[target.kind + ':' + target.at[0]] = 1;
    });
    // extractTargets keeps the first copy of a repeated contact; find the later copies too.
    found.slice().forEach(function (item) {
      var text = view.text, needle = text.slice(item.target.at[0], item.target.at[1]), from = item.target.at[1], k;
      while (needle && (k = text.indexOf(needle, from)) >= 0) {
        from = k + needle.length;
        var before = text.charAt(k - 1), after = text.charAt(from);
        if (/[\w.@\/-]/.test(before) || /[\w@\/-]/.test(after)) continue;
        if (seen[item.target.kind + ':' + k]) continue;
        seen[item.target.kind + ':' + k] = 1;
        var moved = T.sourceSpan(view, raw, k, from);
        found.push({ target: item.target, start: moved.start, end: moved.end, quote: raw.slice(moved.start, moved.end) });
      }
    });
    found.sort(function (a, b) { return a.start - b.start; });
    return found;
  const SENDER_AFTER = /^\s*(?::|-|\u2013|alert|security|support|team|customer|fraud|account|notice|services?|bank|credit union)/i;
  const SENDER_BEFORE = /(?:\bfrom|\bthis is|\bwe are|\byour)\s+(?:the\s+)?$/i;

  // A name counts as the sender only where senders name themselves: at the start,
  // as a label ("Chase:", "Chase alert"), or after "from" / "this is".
  function senderPosition(text, index, length) {
    const before = text.slice(Math.max(0, index - 35), index);
    // "Pay by Zelle" or "a question about Amazon" names a topic, not a sender.
    if (/\b(?:by|via|using|through|about|with|for|to)\s+$/i.test(before)) return false;
    if (index < 60 && /^\s*$/.test(text.slice(0, index))) return true;
    return SENDER_AFTER.test(text.slice(index + length, index + length + 20)) || SENDER_BEFORE.test(before);
  }

  function findClaim(masked, store) {
    let best = null;
    for (const item of aliasPatterns(store)) {
      for (const m of masked.matchAll(item.re)) {
        if (item.strict && !/[A-Z]/.test(m[0].charAt(0))) continue;
        if (!senderPosition(masked, m.index, m[0].length)) continue;
        // The earliest name wins; at the same spot, the longer name ("Chase Bank" over "Chase").
        if (!best || m.index < best.index || (m.index === best.index && m[0].length > best.length)) {
          best = { org: item.org, index: m.index, length: m[0].length };
        }
      }
    }
    if (best) return { org: best.org, generic: null };
    const generic = GENERIC_CLAIMS.find(g => g.re.test(masked));
    return { org: null, generic: generic ? generic.label : null };
  }

  T.extractTargets = extractTargets;
  T.sourceTargets = sourceTargets;
  T.findClaim = findClaim;
})(typeof window !== 'undefined' ? window : globalThis);
