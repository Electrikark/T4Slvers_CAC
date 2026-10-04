/* Stages 2 and 3: extract targets (links, email addresses, phone numbers) and find the claim.
   Exposes TFS.extractTargets(text) and TFS.findClaim(maskedText, store).
   Works token by token with bounded lengths, so hostile input cannot make it slow. */
(function (root) {
  'use strict';
  var T = root.TFS = root.TFS || {};

  var MAX_TOKEN = 2048;
  // Endings accepted for bare domains typed without https:// (with a scheme, any ending counts).
  // Two-letter country endings are accepted too. File types such as .pdf or .jpg are not on the list.
  var BARE_TLDS = {
    com: 1, org: 1, net: 1, edu: 1, gov: 1, mil: 1, info: 1, biz: 1, io: 1, app: 1, dev: 1, xyz: 1, top: 1,
    online: 1, site: 1, shop: 1, store: 1, club: 1, live: 1, link: 1, click: 1, help: 1, support: 1,
    services: 1, security: 1, page: 1, website: 1, tech: 1, cloud: 1, icu: 1, vip: 1, buzz: 1, life: 1,
    world: 1, today: 1, news: 1, email: 1, center: 1, digital: 1, network: 1, solutions: 1, finance: 1,
    bank: 1, money: 1, pay: 1, delivery: 1, express: 1, gle: 1, microsoft: 1, google: 1, amazon: 1
  };

  // Characters that end a token: whitespace, brackets and quotes around links.
  var TOKEN_RE = /[^\s<>"'`()\[\]{}|\\^]+/g;
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
    var m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(text)) !== null) {
      var token = m[0];
      if (token.length > MAX_TOKEN) continue;
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
          // A capitalized ending after a word (locked.Sign, ready.Today) is a missing space, not a link.
          var capitalEnding = /[A-Z]/.test(bm[2]) && !/^www\./i.test(token) && !/[\/?#]/.test(token);
          if (!capitalEnding && (BARE_TLDS[tld] || /^[a-z]{2}$/.test(tld) || tld.indexOf('xn--') === 0 || /[^\x00-\x7F]/.test(tld))) {
            target = parseLink(token, 'http://' + token);
          }
        }
      }
      if (target) {
        spans.push([start, start + token.length]);
        var key = target.kind + ':' + (target.host || target.raw) + ':' + (target.userinfo || '');
        if (!seen[key]) {
          seen[key] = 1;
          targets.push(target);
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
        targets.push({ kind: 'phone', raw: p[0].trim(), e164: e164, display: '(' + p[1] + ') ' + p[2] + '-' + p[3] });
      }
    }
    return { targets: targets, masked: masked };
  }

  /* ---------- Claim ---------- */
  var compiledCache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function compileAliases(store) {
    if (compiledCache && compiledCache.has(store)) return compiledCache.get(store);
    var list = [];
    (store.orgs || []).forEach(function (org) {
      (org.aliases || []).forEach(function (a) { list.push({ org: org, alias: a, strict: false }); });
      (org.strictAliases || []).forEach(function (a) { list.push({ org: org, alias: a, strict: true }); });
    });
    list.forEach(function (item) {
      var body = escapeRe(item.alias.trim()).replace(/\s+/g, '\\s+');
      item.re = new RegExp('(?<![A-Za-z0-9&])' + body + '(?![A-Za-z0-9&])', 'gi');
    });
    if (compiledCache) compiledCache.set(store, list);
    return list;
  }

  var GENERIC_CLAIMS = [
    { re: /\b(?:your|the)\s+(?:bank|credit union|card issuer)\b/i, label: 'Your bank (not named)' },
    { re: /\b(?:tech(?:nical)?\s+support|customer\s+support|help\s+desk|security\s+team)\b/i, label: 'A support service (not named)' },
    { re: /\b(?:toll|tolls)\b/i, label: 'A toll service (not named)' }
  ];

  var SENDER_AFTER = /^\s*(?::|-|\u2013|alert|security|support|team|customer|fraud|account|notice|services?|bank|credit union)/i;
  var SENDER_BEFORE = /(?:\bfrom|\bthis is|\bwe are|\byour)\s+(?:the\s+)?$/i;

  function senderPosition(text, index, length) {
    if (index < 60) return true;
    if (SENDER_AFTER.test(text.slice(index + length, index + length + 20))) return true;
    return SENDER_BEFORE.test(text.slice(Math.max(0, index - 20), index));
  }

  function findClaim(masked, store) {
    var best = null;
    var mentions = {};
    compileAliases(store).forEach(function (item) {
      item.re.lastIndex = 0;
      var m;
      while ((m = item.re.exec(masked)) !== null) {
        if (item.strict && !/[A-Z]/.test(m[0].charAt(0))) continue;
        mentions[item.org.id] = item.org;
        // A name counts as the sender only where senders name themselves: near the start,
        // as a label ("Chase:", "Chase alert"), or after "from" / "this is".
        if (!senderPosition(masked, m.index, m[0].length)) continue;
        if (!best || m.index < best.index || (m.index === best.index && m[0].length > best.length)) {
          best = { org: item.org, index: m.index, length: m[0].length, words: m[0] };
        }
      }
    });
    var others = Object.keys(mentions).filter(function (id) { return !best || id !== best.org.id; })
      .map(function (id) { return mentions[id].displayName; });
    if (best) return { org: best.org, words: best.words, generic: null, otherMentions: others };
    for (var g = 0; g < GENERIC_CLAIMS.length; g++) {
      if (GENERIC_CLAIMS[g].re.test(masked)) return { org: null, generic: GENERIC_CLAIMS[g].label, otherMentions: [] };
    }
    return { org: null, generic: null, otherMentions: [] };
  }

  T.extractTargets = extractTargets;
  T.findClaim = findClaim;
})(typeof window !== 'undefined' ? window : globalThis);
