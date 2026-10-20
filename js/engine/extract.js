/* Finds what the message contains and who it claims to be from.
   extractTargets(text): links, email addresses and phone numbers, with bounded work per token.
   findClaim(maskedText, store): the organization the message names as its sender, if any. */
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
  // Numbers this checker cannot read but must not ignore: another country's code
  // (+44 20 7946 0958) or letters in place of digits (1-800-ASK-USPS).
  const FOREIGN_PHONE_RE = /(?<![\w+])\+[2-9][\d\s.\-()]{6,20}\d(?!\d)/g;
  const LETTER_PHONE_RE = /(?<![\w+\-])(?:1[\s.\-]?)?\(?[2-9]\d{2}\)?[\s.\-]?[A-Z0-9]{2,4}[\s.\-]?[A-Z0-9]{2,5}(?![\w\-])/g;

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
      target.path = url.pathname || '/';
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
      const lead = token.match(LEAD_PUNCT);
      if (lead) {
        token = token.slice(lead[0].length);
        start += lead[0].length;
      }
      token = token.replace(TRAIL_PUNCT, '');
      const target = token && parseToken(token);
      if (!target) continue;
      // Offsets into the text given to extractTargets (see sourceTargets for the person's text).
      target.at = [start, start + token.length];
      spans.push([start, start + token.length]);
      add(`${target.kind}:${target.error ? target.raw : target.host || target.raw}:${target.userinfo || ''}`, target);
    }

    // Blank out links and emails so their digits and names do not count as phones or senders.
    const chars = text.split('');
    for (const [from, to] of spans) chars.fill(' ', from, to);
    const masked = spans.length ? chars.join('') : text;

    for (const p of masked.matchAll(PHONE_RE)) {
      const e164 = '+1' + p[1] + p[2] + p[3];
      const lead = p[0].length - p[0].trimStart().length;
      const raw = p[0].trim();
      add('phone:' + e164, { kind: 'phone', raw, e164, display: `(${p[1]}) ${p[2]}-${p[3]}`, at: [p.index + lead, p.index + lead + raw.length] });
    }
    // Unreadable numbers are listed, never guessed at, so the page does not say there is no number.
    const taken = targets.filter(t => t.kind === 'phone').map(t => t.at);
    const unreadable = [...masked.matchAll(FOREIGN_PHONE_RE)].filter(p => {
      const digits = p[0].replace(/\D/g, '').length;
      return digits >= 8 && digits <= 15;
    }).concat([...masked.matchAll(LETTER_PHONE_RE)].filter(p => {
      const after = p[0].replace(/^(?:1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?/, '');
      return /[A-Z]/.test(after) && after.replace(/[^A-Z0-9]/g, '').length === 7;
    }));
    for (const p of unreadable.sort((a, b) => a.index - b.index)) {
      const at = [p.index, p.index + p[0].length];
      if (taken.some(([from, to]) => at[0] < to && from < at[1])) continue;
      taken.push(at);
      add('phone:' + p[0], { kind: 'phone', raw: p[0], e164: null, display: p[0], error: 'unsupported', at });
    }
    return { targets, masked, incomplete };
  }

  /* ---------- The claimed sender ---------- */

  // When no known organization is named, a general description is still worth showing.
  const GENERIC_CLAIMS = [
    { re: /\b(?:your|the)\s+(?:bank|credit union|card issuer)\b/i, label: 'Your bank (not named)' },
    { re: /\b(?:tech(?:nical)?\s+support|customer\s+support|help\s+desk|security\s+team)\b/i, label: 'A support service (not named)' },
    { re: /\b(?:toll|tolls)\b/i, label: 'A toll service (not named)' }
  ];

  // The claimed sender comes only from TFS.attributeSender (sender.js); an address is never a claim.
  function findClaim(masked, store) {
    const orgs = store.orgs || [];
    const attribution = T.attributeSender(masked, orgs);
    const org = attribution.orgId ? orgs.find(o => o.id === attribution.orgId) : null;
    if (org) return { org, generic: null, attribution };
    const generic = GENERIC_CLAIMS.find(g => g.re.test(masked));
    return { org: null, generic: generic ? generic.label : null, attribution };
  }

  /* Contacts with spans in the person's own text: the same extraction as the risk rules use,
     moved back to source offsets. Every occurrence is listed, repeats included. */
  function sourceTargets(source) {
    const raw = source == null ? '' : String(source);
    const view = T.riskView(raw);
    const found = [], seen = new Set();
    const push = (target, from, to) => {
      const moved = T.sourceSpan(view, raw, from, to);
      found.push({ target, start: moved.start, end: moved.end, quote: raw.slice(moved.start, moved.end) });
      seen.add(target.kind + ':' + from);
    };
    for (const target of extractTargets(view.text).targets) push(target, target.at[0], target.at[1]);
    // extractTargets keeps the first copy of a repeated contact; find the later copies too.
    const text = view.text;
    for (const item of found.slice()) {
      const needle = text.slice(item.target.at[0], item.target.at[1]);
      let from = item.target.at[1], k;
      while (needle && (k = text.indexOf(needle, from)) >= 0) {
        from = k + needle.length;
        if (/[\w.@\/-]/.test(text.charAt(k - 1)) || /[\w@\/-]/.test(text.charAt(from))) continue;
        if (seen.has(item.target.kind + ':' + k)) continue;
        push(item.target, k, from);
      }
    }
    return found.sort((a, b) => a.start - b.start);
  }

  T.extractTargets = extractTargets;
  T.sourceTargets = sourceTargets;
  T.findClaim = findClaim;
})(typeof window !== 'undefined' ? window : globalThis);
