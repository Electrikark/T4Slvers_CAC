/* Stages 2 and 3: extract targets (links, email addresses, phone numbers) and find the claim.
   Exposes TFS.extractTargets(text) and TFS.findClaim(maskedText, store).
   Works token by token with bounded lengths, so hostile input cannot make it slow. */
(function (root) {
  'use strict';
  var T = root.TFS = root.TFS || {};

  var MAX_TOKEN = 2048;
  var MAX_TARGETS = 30;
  // Characters that end a token: whitespace, brackets and quotes around links.
  var TOKEN_RE = /[^\s<>"'`()\[\]{}]+/g;
  var FILE_ENDINGS = /^(?:pdf|jpg|jpeg|png|gif|svg|webp|docx?|xlsx?|pptx?|txt|csv|zip|exe|js|css|html?|mp[34]|md)$/i;
  var LEAD_PUNCT = /^[*.,;:!?\-_~]+/;
  var TRAIL_PUNCT = /[.,;:!?*~]+$/;
  var BARE_HOST_RE = /^((?:[a-z0-9¡-￿](?:[a-z0-9¡-￿-]{0,62})?\.){1,10}([a-z¡-￿]{2,24}|xn--[a-z0-9-]{1,59}))(?::\d{1,5})?(?:[\/?#].*)?$/i;
  var EMAIL_RE = /^(?:mailto:)?([a-z0-9._%+\-]{1,64})@((?:[a-z0-9¡-￿-]{1,63}\.){1,10}[a-z¡-￿]{2,24})$/i;
  var PHONE_RE = /(?<![\w+])(?:\+?1[\s.\-]?)?\(?([2-9]\d{2})\)?[\s.\-]?([2-9]\d{2})[\s.\-]?(\d{4})(?!\d)/g;

  function parseLink(raw, withScheme) {
    var target = { kind: 'link', raw: raw };
    try {
      var url = new URL(withScheme);
      var host = url.hostname.toLowerCase().replace(/\.+$/, '');
      target.host = host;
      target.hostUnicode = T.toUnicodeHost(host);
      target.userinfo = url.username ? decodeSafe(url.username) + (url.password ? ':' + decodeSafe(url.password) : '') : '';
      target.scheme = url.protocol.replace(':', '');
      target.path = url.pathname || '/';
      // Do not silently turn malformed separators into a partial, trusted host.
      if (/[|\\^]/.test(raw)) target.error = 'unreadable';
    } catch (err) {
      target.error = 'unreadable';
    }
    return target;
  }

  function decodeSafe(s) {
    try { return decodeURIComponent(s); } catch (err) { return s; }
  }

  function extractTargets(text) {
    var targets = [];
    var spans = [];
    var seen = {};
    var incomplete = false;
    var m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(text)) !== null) {
      var token = m[0];
      if (token.length > MAX_TOKEN) {
        incomplete = true;
        spans.push([m.index, m.index + token.length]);
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
      }
    }

    // Blank out links and emails so their digits and names do not count as phones or claims.
    var masked = text;
    if (spans.length) {
      var chars = text.split('');
      spans.forEach(function (sp) { for (var k = sp[0]; k < sp[1]; k++) chars[k] = ' '; });
      masked = chars.join('');
    }

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
    }
    return { targets: targets, masked: masked, incomplete: incomplete };
  }

  /* ---------- Claim ---------- */
  var GENERIC_CLAIMS = [
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
  }

  T.extractTargets = extractTargets;
  T.sourceTargets = sourceTargets;
  T.findClaim = findClaim;
})(typeof window !== 'undefined' ? window : globalThis);
