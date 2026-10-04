/* Stage 4a: link and email checks.
   Host helpers (punycode, registrable domain, lookalike skeleton, edit distance)
   and TFS.checkHost(target, ctx), which applies the rule table from the spec in order:
   the first rule that fires decides the check. */
(function (root) {
  'use strict';
  var T = root.TFS = root.TFS || {};

  /* ---------- Punycode (RFC 3492): turns xn--chse-63d into its Unicode form ---------- */
  var BASE = 36, T_MIN = 1, T_MAX = 26, SKEW = 38, DAMP = 700, INITIAL_BIAS = 72, INITIAL_N = 128;

  function adapt(delta, numPoints, firstTime) {
    delta = firstTime ? Math.floor(delta / DAMP) : delta >> 1;
    delta += Math.floor(delta / numPoints);
    var k = 0;
    while (delta > ((BASE - T_MIN) * T_MAX) >> 1) {
      delta = Math.floor(delta / (BASE - T_MIN));
      k += BASE;
    }
    return Math.floor(k + (BASE - T_MIN + 1) * delta / (delta + SKEW));
  }

  function digitOf(code) {
    if (code >= 48 && code <= 57) return code - 22; // 0-9 -> 26-35
    if (code >= 65 && code <= 90) return code - 65; // A-Z
    if (code >= 97 && code <= 122) return code - 97; // a-z
    return BASE;
  }

  function decodeLabel(input) {
    var output = [];
    var basic = input.lastIndexOf('-');
    if (basic < 0) basic = 0;
    for (var j = 0; j < basic; j++) {
      if (input.charCodeAt(j) >= 0x80) throw new Error('bad punycode');
      output.push(input.charCodeAt(j));
    }
    var n = INITIAL_N, bias = INITIAL_BIAS, i = 0;
    for (var index = basic > 0 ? basic + 1 : 0; index < input.length;) {
      var oldi = i, w = 1;
      for (var k = BASE; ; k += BASE) {
        if (index >= input.length) throw new Error('bad punycode');
        var digit = digitOf(input.charCodeAt(index++));
        if (digit >= BASE) throw new Error('bad punycode');
        i += digit * w;
        var t = k <= bias ? T_MIN : (k >= bias + T_MAX ? T_MAX : k - bias);
        if (digit < t) break;
        w *= BASE - t;
        if (w > 1e9) throw new Error('bad punycode');
      }
      var out = output.length + 1;
      bias = adapt(i - oldi, out, oldi === 0);
      n += Math.floor(i / out);
      i %= out;
      if (n > 0x10FFFF) throw new Error('bad punycode');
      output.splice(i++, 0, n);
    }
    return String.fromCodePoint.apply(null, output);
  }

  // Returns the Unicode form of a host, or null when a label cannot be decoded.
  function toUnicodeHost(host) {
    try {
      return host.split('.').map(function (label) {
        return label.indexOf('xn--') === 0 ? decodeLabel(label.slice(4)) : label;
      }).join('.');
    } catch (err) {
      return null;
    }
  }

  /* ---------- Registrable domain ---------- */
  // Two-part endings where the registrable domain has three labels (bbc.co.uk).
  // A trimmed list; the full Public Suffix List is a later upgrade.
  var MULTI_SUFFIX = {
    'co.uk': 1, 'org.uk': 1, 'ac.uk': 1, 'gov.uk': 1, 'me.uk': 1, 'ltd.uk': 1, 'plc.uk': 1,
    'com.au': 1, 'net.au': 1, 'org.au': 1, 'gov.au': 1, 'edu.au': 1,
    'co.nz': 1, 'org.nz': 1, 'co.jp': 1, 'ne.jp': 1, 'co.in': 1, 'org.in': 1,
    'com.br': 1, 'com.mx': 1, 'co.za': 1, 'com.cn': 1, 'com.sg': 1, 'com.hk': 1, 'com.tw': 1,
    'com.ph': 1, 'com.ng': 1, 'co.kr': 1, 'com.tr': 1, 'com.ar': 1, 'com.co': 1
  };

  function isIp(host) {
    return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.indexOf(':') >= 0 || /^\[.*\]$/.test(host);
  }

  function registrable(host) {
    if (isIp(host)) return host;
    var labels = host.split('.');
    if (labels.length <= 2) return host;
    var lastTwo = labels.slice(-2).join('.');
    return MULTI_SUFFIX[lastTwo] ? labels.slice(-3).join('.') : lastTwo;
  }

  function hostMatches(host, domain) {
    return host === domain || host.slice(-(domain.length + 1)) === '.' + domain;
  }

  /* ---------- Lookalike skeleton ---------- */
  // Characters that look like ASCII letters, mapped to the letter they imitate.
  // Built from the idea behind Unicode TS #39 confusables; a hand-picked subset.
  var CONFUSABLE = {
    'а': 'a', 'е': 'e', 'ё': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y',
    'х': 'x', 'к': 'k', 'м': 'm', 'і': 'i', 'ј': 'j', 'ѕ': 's', 'ԁ': 'd',
    'һ': 'h', 'ӏ': 'l', 'ԛ': 'q', 'ԝ': 'w', 'ɡ': 'g', 'в': 'b', 'н': 'h', 'т': 't',
    'α': 'a', 'ο': 'o', 'ρ': 'p', 'ν': 'v', 'ι': 'i', 'κ': 'k', 'τ': 't',
    'υ': 'u', 'χ': 'x', 'ε': 'e', 'ı': 'i', 'ł': 'l', 'ɩ': 'i', 'ℓ': 'l',
    '0': 'o', '1': 'l', '|': 'l', 'i': 'l', '!': 'l'
  };

  function skeleton(label) {
    var s = String(label || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    var out = '';
    for (var k = 0; k < s.length; k++) {
      var ch = s.charAt(k);
      out += CONFUSABLE.hasOwnProperty(ch) ? CONFUSABLE[ch] : ch;
    }
    // Letter pairs that read as one letter at a glance.
    return out.replace(/rn/g, 'm').replace(/vv/g, 'w').replace(/cl/g, 'd');
  }

  /* ---------- Edit distance (optimal string alignment, a Damerau-Levenshtein variant) ---------- */
  function editDistance(a, b, limit) {
    if (Math.abs(a.length - b.length) > limit) return limit + 1;
    var prev2 = null, prev = [], cur;
    for (var j = 0; j <= b.length; j++) prev.push(j);
    for (var i = 1; i <= a.length; i++) {
      cur = [i];
      var rowMin = i;
      for (var j2 = 1; j2 <= b.length; j2++) {
        var cost = a.charAt(i - 1) === b.charAt(j2 - 1) ? 0 : 1;
        var v = Math.min(prev[j2] + 1, cur[j2 - 1] + 1, prev[j2 - 1] + cost);
        if (prev2 && i > 1 && j2 > 1 && a.charAt(i - 1) === b.charAt(j2 - 2) && a.charAt(i - 2) === b.charAt(j2 - 1)) {
          v = Math.min(v, prev2[j2 - 2] + 1);
        }
        cur.push(v);
        if (v < rowMin) rowMin = v;
      }
      if (rowMin > limit) return limit + 1;
      prev2 = prev;
      prev = cur;
    }
    return prev[b.length];
  }

  /* ---------- Rule helpers ---------- */
  // Official labels too generic to use for lookalike rules (cash.app would flag every cash.* site).
  var GENERIC_LABELS = {
    cash: 1, live: 1, office: 1, meta: 1, forms: 1, cloud: 1, mail: 1, login: 1, secure: 1, account: 1,
    support: 1, help: 1, bank: 1, pay: 1, cms: 1, web: 1, app: 1, online: 1
  };

  function squash(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function orgById(store, id) {
    for (var k = 0; k < store.orgs.length; k++) if (store.orgs[k].id === id) return store.orgs[k];
    return null;
  }

  function officialOrgsFor(store, host) {
    return store.orgs.filter(function (org) {
      return (org.officialDomains || []).some(function (d) { return hostMatches(host, d); });
    });
  }

  // Lookalike tokens for each org: squashed aliases and official labels.
  function brandTokens(org) {
    var seen = {}, list = [];
    (org.aliases || []).concat(org.strictAliases || []).forEach(function (a) {
      var t = squash(a);
      if (t.length >= 3 && !GENERIC_LABELS[t] && !seen[t]) { seen[t] = 1; list.push(t); }
    });
    (org.officialDomains || []).forEach(function (d) {
      var t = squash(d.split('.')[0]);
      if (t.length >= 3 && !GENERIC_LABELS[t] && !seen[t]) { seen[t] = 1; list.push(t); }
    });
    return list;
  }

  function make(status, code, extra) {
    var c = { status: status, code: code };
    for (var key in extra) if (extra.hasOwnProperty(key)) c[key] = extra[key];
    return c;
  }

  /* ---------- The rule table ---------- */
  // target: { kind: 'link' | 'email', raw, host, hostUnicode, userinfo, error }
  // ctx: { store, claimOrg (explicit claim or null) }
  function checkHost(target, ctx) {
    var store = ctx.store, claim = ctx.claimOrg;
    var host = target.host;
    var base = { target: target };

    if (target.error || !host) return make('UNKNOWN', 'link_unreadable', base);
    if (target.hostUnicode === null) return make('UNKNOWN', 'link_unreadable', base);

    var reg = registrable(host);
    base.registrable = reg;

    // Free email accounts: anyone can create one, so they say nothing about the sender.
    if (target.kind === 'email' && (store.freeMailDomains || []).some(function (d) { return hostMatches(host, d); })) {
      return make('UNKNOWN', 'free_email_address', base);
    }

    // 1. Link shorteners hide the destination.
    if (target.kind === 'link' && (store.shorteners || []).some(function (d) { return hostMatches(host, d); })) {
      return make('UNKNOWN', 'shortener_unresolvable', base);
    }

    // 2. Text before an @ in a link is ignored by browsers: https://paypal.com@evil.example
    if (target.userinfo) {
      var info = target.userinfo.toLowerCase();
      var infoSquash = squash(info);
      for (var a = 0; a < store.orgs.length; a++) {
        var org = store.orgs[a];
        var hitDomain = (org.officialDomains || []).filter(function (d) { return info.indexOf(d) >= 0; })[0];
        var hitToken = brandTokens(org).filter(function (t) { return t.length >= 4 && infoSquash.indexOf(t) >= 0; })[0];
        if (hitDomain || hitToken) {
          return make('CONTRADICTS', 'userinfo_trick', merge(base, { strength: 'strong', orgId: org.id, lookalikeOf: hitDomain || org.officialDomains[0] }));
        }
      }
    }

    // 3. Official domains where anyone can publish a page.
    for (var u = 0; u < store.orgs.length; u++) {
      var uh = (store.orgs[u].userContentHosts || []).filter(function (h) { return hostMatches(host, h); })[0];
      if (uh) return make('UNKNOWN', 'user_content_platform', merge(base, { orgId: store.orgs[u].id }));
    }

    // 4 and 5. Official for the claimed organization, or for someone else.
    var owners = officialOrgsFor(store, host);
    if (owners.length) {
      if (!claim) return make('SUPPORTS', 'domain_official', merge(base, { orgId: owners[0].id, implicit: true }));
      if (owners.some(function (o) { return o.id === claim.id; })) return make('SUPPORTS', 'domain_official', merge(base, { orgId: claim.id }));
      return make('CONTRADICTS', 'domain_belongs_to_other_org', merge(base, { strength: 'moderate', orgId: owners[0].id }));
    }

    // 6. An official domain used as the start of a different site: chase.com.account-verify.net
    var dotted = '.' + host + '.';
    for (var s = 0; s < store.orgs.length; s++) {
      var sd = (store.orgs[s].officialDomains || []).filter(function (d) {
        return dotted.indexOf('.' + d + '.') >= 0 || ('.' + host).indexOf('.' + d + '-') >= 0;
      })[0];
      if (sd) return make('CONTRADICTS', 'official_domain_as_subdomain', merge(base, { strength: 'strong', orgId: store.orgs[s].id, lookalikeOf: sd }));
    }

    // 7 to 9. Label rules against every organization.
    var labelAscii = reg.split('.')[0];
    var regUnicode = toUnicodeHost(reg) || reg;
    var labelUnicode = regUnicode.split('.')[0];
    var labelSkeleton = skeleton(labelUnicode);
    var hostLabels = host.split('.');
    var hostLabelsNoTld = hostLabels.slice(0, Math.max(1, hostLabels.length - (MULTI_SUFFIX[hostLabels.slice(-2).join('.')] ? 2 : 1)));

    for (var o = 0; o < store.orgs.length; o++) {
      var cand = store.orgs[o];
      var isClaimed = claim && claim.id === cand.id;
      var domains = cand.officialDomains || [];
      for (var d = 0; d < domains.length; d++) {
        var off = domains[d];
        var offLabel = off.split('.')[0];
        if (offLabel.length < 4 || GENERIC_LABELS[offLabel]) continue;
        // 7a. Same letters to the eye, different characters: chаse.com with a Cyrillic а
        if (labelUnicode !== offLabel && labelSkeleton === skeleton(offLabel)) {
          return make('CONTRADICTS', 'homoglyph', merge(base, { strength: 'strong', orgId: cand.id, lookalikeOf: off }));
        }
        // 7b. Same name, different ending: chase.net
        if (labelUnicode === offLabel && reg !== registrable(off)) {
          return make('CONTRADICTS', 'same_label_other_tld', merge(base, { strength: 'strong', orgId: cand.id, lookalikeOf: off }));
        }
        // 8. One or two letters off: amazom.com
        var minLen = isClaimed ? 4 : 6;
        if (offLabel.length >= minLen && labelAscii.indexOf('xn--') !== 0) {
          var limit = offLabel.length >= 8 ? 2 : 1;
          var dist = editDistance(labelAscii, offLabel, limit);
          if (dist > 0 && dist <= limit) {
            return make('CONTRADICTS', 'typosquat', merge(base, { strength: 'strong', orgId: cand.id, lookalikeOf: off, distance: dist }));
          }
        }
      }
    }

    // 9. A brand name inside someone else's address: chase-secure-login.net, paypal-help.com
    for (var b = 0; b < store.orgs.length; b++) {
      var borg = store.orgs[b];
      var claimedHere = claim && claim.id === borg.id;
      var tokens = brandTokens(borg);
      for (var h = 0; h < hostLabelsNoTld.length; h++) {
        var lab = (toUnicodeHost(hostLabelsNoTld[h]) || hostLabelsNoTld[h]).toLowerCase();
        var parts = lab.split(/[-_0-9]+/);
        // Also read the label as it looks: amaz0n-secure reads as amazon-secure.
        var labLook = skeleton(lab);
        var partsLook = labLook.split(/[-_]+/);
        for (var t = 0; t < tokens.length; t++) {
          var tok = tokens[t];
          var tokLook = skeleton(tok);
          var delimited = parts.indexOf(tok) >= 0 || (tokLook.length >= 4 && partsLook.indexOf(tokLook) >= 0);
          var bigEnough = claimedHere || tok.length >= 6;
          var inside = bigEnough && lab !== tok && (
            (tok.length >= 4 && (lab.indexOf(tok) === 0 || labLook.indexOf(tokLook) === 0)) ||
            (tok.length >= 6 && (lab.slice(-tok.length) === tok || labLook.slice(-tokLook.length) === tokLook)) ||
            (tok.length >= 7 && (lab.indexOf(tok) >= 0 || labLook.indexOf(tokLook) >= 0))
          );
          if (delimited || inside) {
            return make('CONTRADICTS', 'brand_in_foreign_domain', merge(base, { strength: 'strong', orgId: borg.id, lookalikeOf: borg.officialDomains[0], brandWord: tok }));
          }
        }
      }
    }

    // 10. A bare number address with a claim.
    if (claim && isIp(host)) return make('CONTRADICTS', 'ip_host', merge(base, { strength: 'moderate', orgId: claim.id }));

    // 11. A named organization, and an address that is not theirs.
    if (claim) return make('CONTRADICTS', 'not_in_official_list', merge(base, { strength: 'moderate', orgId: claim.id }));

    // 12 and 13. Nothing to compare against.
    return make('UNKNOWN', 'no_claimed_identity', base);
  }

  function merge(a, b) {
    var out = {};
    for (var k in a) if (a.hasOwnProperty(k)) out[k] = a[k];
    for (var k2 in b) if (b.hasOwnProperty(k2)) out[k2] = b[k2];
    return out;
  }

  // Phone numbers written in the text. Absence from a sparse list is never a contradiction.
  function checkPhone(target, ctx) {
    var store = ctx.store, claim = ctx.claimOrg;
    var base = { target: target };
    if (claim) {
      if ((claim.officialPhones || []).indexOf(target.e164) >= 0) return make('SUPPORTS', 'phone_official', merge(base, { orgId: claim.id }));
      return make('UNKNOWN', 'phone_not_on_file', merge(base, { orgId: claim.id }));
    }
    var owner = store.orgs.filter(function (o) { return (o.officialPhones || []).indexOf(target.e164) >= 0; })[0];
    if (owner) return make('SUPPORTS', 'phone_official', merge(base, { orgId: owner.id, implicit: true }));
    return make('UNKNOWN', 'phone_not_on_file', base);
  }

  T.decodeLabel = decodeLabel;
  T.toUnicodeHost = toUnicodeHost;
  T.registrable = registrable;
  T.hostMatches = hostMatches;
  T.skeleton = skeleton;
  T.editDistance = editDistance;
  T.isIp = isIp;
  T.orgById = orgById;
  T.checkHost = checkHost;
  T.checkPhone = checkPhone;
})(typeof window !== 'undefined' ? window : globalThis);
