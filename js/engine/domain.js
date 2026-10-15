/* Checks each link and email address against the organization list.
   checkHost() runs a fixed rule table in order; the first rule that fires decides.
   Helpers: punycode decoding, the registrable part of a host, lookalike letters, edit distance. */
// Check website and email hosts in order; the first matching rule wins.
(function (root) {
  'use strict';
  const T = root.TFS = root.TFS || {};

  /* ---------- Punycode (RFC 3492): xn--chse-63d.com back into its Unicode letters ---------- */
  const BASE = 36, T_MIN = 1, T_MAX = 26, SKEW = 38, DAMP = 700, INITIAL_BIAS = 72, INITIAL_N = 128;

  function adapt(delta, numPoints, firstTime) {
    delta = firstTime ? Math.floor(delta / DAMP) : delta >> 1;
    delta += Math.floor(delta / numPoints);
    let k = 0;
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
    const bad = () => { throw new Error('bad punycode'); };
    const basic = Math.max(0, input.lastIndexOf('-'));
    const output = [];
    for (let j = 0; j < basic; j++) {
      if (input.charCodeAt(j) >= 0x80) bad();
      output.push(input.charCodeAt(j));
    }
    let n = INITIAL_N, bias = INITIAL_BIAS, i = 0;
    for (let index = basic > 0 ? basic + 1 : 0; index < input.length;) {
      const oldi = i;
      let w = 1;
      for (let k = BASE; ; k += BASE) {
        if (index >= input.length) bad();
        const digit = digitOf(input.charCodeAt(index++));
        if (digit >= BASE) bad();
        i += digit * w;
        const t = k <= bias ? T_MIN : k >= bias + T_MAX ? T_MAX : k - bias;
        if (digit < t) break;
        w *= BASE - t;
        if (w > 1e9) bad();
      }
      const out = output.length + 1;
      bias = adapt(i - oldi, out, oldi === 0);
      n += Math.floor(i / out);
      i %= out;
      if (n > 0x10FFFF) bad();
      output.splice(i++, 0, n);
    }
    return String.fromCodePoint(...output);
  }

  // The Unicode form of a host, or null when a label cannot be decoded.
  function toUnicodeHost(host) {
    try {
      return host.split('.').map(label => label.startsWith('xn--') ? decodeLabel(label.slice(4)) : label).join('.');
    } catch (err) {
      return null;
    }
  }

  /* ---------- Host helpers ---------- */

  // Two-part endings where the registrable domain has three labels (bbc.co.uk).
  // A trimmed list; the full Public Suffix List would be a later upgrade.
  const MULTI_SUFFIX = new Set([
    'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'me.uk', 'ltd.uk', 'plc.uk',
    'com.au', 'net.au', 'org.au', 'gov.au', 'edu.au',
    'co.nz', 'org.nz', 'co.jp', 'ne.jp', 'co.in', 'org.in',
    'com.br', 'com.mx', 'co.za', 'com.cn', 'com.sg', 'com.hk', 'com.tw',
    'com.ph', 'com.ng', 'co.kr', 'com.tr', 'com.ar', 'com.co'
  ]);

  const isIp = host => /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.includes(':') || /^\[.*\]$/.test(host);

  // The part of a host someone registers: login.chase.com -> chase.com, news.bbc.co.uk -> bbc.co.uk.
  function registrable(host) {
    if (isIp(host)) return host;
    const labels = host.split('.');
    if (labels.length <= 2) return host;
    return labels.slice(MULTI_SUFFIX.has(labels.slice(-2).join('.')) ? -3 : -2).join('.');
  }

  // True for the domain itself and any of its subdomains.
  const hostMatches = (host, domain) => host === domain || host.endsWith('.' + domain);

  // amazon.com.au is a country form of amazon.com, not a glued-on fake.
  function countryForm(host, domain) {
    const tail = ('.' + host).slice(-(domain.length + 4));
    return tail.slice(0, domain.length + 1) === '.' + domain && /^\.[a-z]{2}$/.test(tail.slice(domain.length + 1));
  }

  /* ---------- Lookalikes ---------- */

  // Characters that look like ASCII letters, mapped to the letter they imitate
  // (a hand-picked subset of the Unicode confusables idea).
  const CONFUSABLE = {
    'а': 'a', 'е': 'e', 'ё': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y',
    'х': 'x', 'к': 'k', 'м': 'm', 'і': 'i', 'ј': 'j', 'ѕ': 's', 'ԁ': 'd',
    'һ': 'h', 'ӏ': 'l', 'ԛ': 'q', 'ԝ': 'w', 'ɡ': 'g', 'в': 'b', 'н': 'h', 'т': 't',
    'α': 'a', 'ο': 'o', 'ρ': 'p', 'ν': 'v', 'ι': 'i', 'κ': 'k', 'τ': 't',
    'υ': 'u', 'χ': 'x', 'ε': 'e', 'ı': 'i', 'ł': 'l', 'ɩ': 'i', 'ℓ': 'l',
    '0': 'o', '1': 'l', '|': 'l', 'i': 'l', '!': 'l'
  };

  // How a label looks at a glance: accents dropped, lookalikes swapped, "rn" read as "m".
  function skeleton(label) {
    const s = String(label || '').normalize('NFD').replace(/[\u0300-\u036F]/g, '').toLowerCase();
    return [...s].map(ch => CONFUSABLE[ch] || ch).join('')
      .replace(/rn/g, 'm').replace(/vv/g, 'w').replace(/cl/g, 'd');
  }

  // Edit distance where swapping two neighbors counts as one change; stops early past `limit`.
  function editDistance(a, b, limit) {
    if (Math.abs(a.length - b.length) > limit) return limit + 1;
    let before = null;
    let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const row = [i];
      let rowMin = i;
      for (let j = 1; j <= b.length; j++) {
        let v = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (before && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, before[j - 2] + 1);
        row.push(v);
        rowMin = Math.min(rowMin, v);
      }
      if (rowMin > limit) return limit + 1;
      before = previous;
      previous = row;
    }
    return previous[b.length];
  }

  /* ---------- Organizations ---------- */

  // Official names too generic for lookalike rules (cash.app would flag every cash.* site).
  const GENERIC_LABELS = new Set(['cash', 'live', 'office', 'meta', 'forms', 'cloud', 'mail', 'login', 'secure', 'account',
    'support', 'help', 'bank', 'pay', 'cms', 'web', 'app', 'online']);

  const squash = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const orgById = (store, id) => store.orgs.find(org => org.id === id) || null;
  function orgById(store, id) {
    for (var k = 0; k < store.orgs.length; k++) if (store.orgs[k].id === id) return store.orgs[k];
    return null;
  }

  // Raw ownership from the full list. It can name a conflict or a pending record; only the
  // trusted view (TFS.trustedMatches) can turn ownership into support.
  function officialOrgsFor(store, host) {
    return store.orgs.filter(function (org) {
      var domains = (org.officialDomains || []).concat((org.contacts || []).filter(function (c) { return c.kind === 'domain'; }).map(function (c) { return c.value; }));
      return domains.some(function (d) { return hostMatches(host, d); });
    });
    return store.orgs.find(function (org) { return org.id === id; }) || null;
  }

  // The words a lookalike would copy: the organization's names and the first part of its domains.
  function brandTokens(org) {
    const words = (org.aliases || []).concat(org.strictAliases || []).map(squash)
      .concat((org.officialDomains || []).map(d => squash(d.split('.')[0])));
    return [...new Set(words)].filter(t => t.length >= 3 && !GENERIC_LABELS.has(t));
  }

  /* A record supports a contact only after a person has reviewed it: humanReview names the
     reviewer and the date. An automated check alone leaves the contact unresolved, so an
     unreviewed list fails closed (no Details Match) instead of open. Conflicts are unaffected. */
  function humanReviewed(org) {
    const review = org && org.humanReview;
    return Boolean(review && typeof review.reviewer === 'string' && review.reviewer.trim() && realReviewDate(review.date));
  function make(status, code, base, extra = {}) {
    return { status, code, ...base, ...extra };
  }

  // A real calendar date (no 2026-02-30), not in the future, and not before this project existed.
  function realReviewDate(value) {
    const m = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return false;
    const [y, month, d] = [+m[1], +m[2], +m[3]];
    const day = new Date(Date.UTC(y, month - 1, d));
    if (day.getUTCFullYear() !== y || day.getUTCMonth() !== month - 1 || day.getUTCDate() !== d) return false;
    return y >= 2020 && day.getTime() <= Date.now();
  }

  const check = (status, code, extra) => ({ status, code, ...extra });
  const supported = (org, code, extra) => humanReviewed(org) ? check('SUPPORTS', code, extra) : check('UNKNOWN', 'reference_needs_review', extra);

  /* ---------- The rule table ----------
     target: { kind: 'link' | 'email', raw, host, hostUnicode, userinfo, error }
     ctx: { store, claimOrg } (claimOrg is the named sender, or null) */
  function checkHost(target, ctx) {
    const { store } = ctx;
    const claim = ctx.claimOrg;
    const host = target.host;
    if (target.error || !host || target.hostUnicode === null) return check('UNKNOWN', 'link_unreadable', { target });
    const reg = registrable(host);
    const base = { target, registrable: reg };
    const on = list => (list || []).some(d => hostMatches(host, d));

    // Free email accounts: anyone can create one, so they say nothing about the sender.
    if (target.kind === 'email' && on(store.freeMailDomains)) return check('UNKNOWN', 'free_email_address', base);

    // 1. Link shorteners hide the destination.
    if (target.kind === 'link' && on(store.shorteners)) return check('UNKNOWN', 'shortener_unresolvable', base);

    // 2. Browsers ignore text before an @ in a link: https://paypal.com@evil.example
    if (target.userinfo) {
      const info = target.userinfo.toLowerCase();
      for (const org of store.orgs) {
        const domain = (org.officialDomains || []).find(d => info.includes(d));
        const token = brandTokens(org).find(t => t.length >= 4 && squash(info).includes(t));
        if (domain || token) return check('CONTRADICTS', 'userinfo_trick', { ...base, strength: 'strong', orgId: org.id, lookalikeOf: domain || org.officialDomains[0] });
      }
    }

    // 3. Official sites where anyone can publish a page.
    const platform = store.orgs.find(org => on(org.userContentHosts));
    if (platform) return check('UNKNOWN', 'user_content_platform', { ...base, orgId: platform.id });
      var info = target.userinfo.toLowerCase();
      var infoSquash = squash(info);
      for (var a = 0; a < store.orgs.length; a++) {
        var org = store.orgs[a];
        var hitDomain = (org.officialDomains || []).find(function (d) { return info.indexOf(d) >= 0; });
        var hitToken = brandTokens(org).find(function (t) { return t.length >= 4 && infoSquash.indexOf(t) >= 0; });
        if (hitDomain || hitToken) {
          return make('CONTRADICTS', 'userinfo_trick', base, { strength: 'strong', orgId: org.id, lookalikeOf: hitDomain || org.officialDomains[0] });
        }
      }
    }

    // 3. Official domains where anyone can publish a page.
    for (var u = 0; u < store.orgs.length; u++) {
      var hasUserContent = (store.orgs[u].userContentHosts || []).some(function (h) { return hostMatches(host, h); });
      if (hasUserContent) return make('UNKNOWN', 'user_content_platform', base, { orgId: store.orgs[u].id });
    }

    // 4 and 5. Official for the named sender, or for someone else.
    const owners = store.orgs.filter(org => on(org.officialDomains));
    if (owners.length) {
      const listed = owners.find(o => claim && o.id === claim.id) || owners[0];
      if ((listed.sources || []).some(source => hostMatches(host, source.domain) && /^needs review/i.test(source.check || ''))) {
        return check('UNKNOWN', 'reference_needs_review', { ...base, orgId: listed.id });
      }
      if (!claim) return supported(owners[0], 'domain_official', { ...base, orgId: owners[0].id, implicit: true });
      if (owners.some(o => o.id === claim.id)) return supported(claim, 'domain_official', { ...base, orgId: claim.id });
      return check('CONTRADICTS', 'domain_belongs_to_other_org', { ...base, strength: 'moderate', orgId: owners[0].id });
    }

    // 6. An official domain glued onto a different site: chase.com.account-verify.net
    const dotted = '.' + host + '.';
    for (const org of store.orgs) {
      const glued = (org.officialDomains || []).find(d => !countryForm(host, d) &&
        (dotted.includes('.' + d + '.') || ('.' + host).includes('.' + d + '-')));
      if (glued) return check('CONTRADICTS', 'official_domain_as_subdomain', { ...base, strength: 'strong', orgId: org.id, lookalikeOf: glued });
      var listedOwner = owners.find(function (o) { return claim && o.id === claim.id; }) || owners[0];
      var pendingSource = (listedOwner.sources || []).some(function (source) {
        return hostMatches(host, source.domain) && /^needs review/i.test(source.check || '');
      });
      if (pendingSource) return make('UNKNOWN', 'reference_needs_review', merge(base, { orgId: listedOwner.id }));
      if (!claim) return supported(ctx, owners[0], target, 'domain_official', merge(base, { orgId: owners[0].id, implicit: true }));
      if (owners.some(function (o) { return o.id === claim.id; })) return supported(ctx, claim, target, 'domain_official', merge(base, { orgId: claim.id }));
      return make('CONTRADICTS', 'domain_belongs_to_other_org', merge(base, { strength: 'moderate', orgId: owners[0].id }));
    }

    // 6. An official domain used as the start of a different site: chase.com.account-verify.net
    // A country form of the same name (amazon.com.au) is not this trick; the label rules judge it.
    var dotted = '.' + host + '.';
    for (var s = 0; s < store.orgs.length; s++) {
      var sd = (store.orgs[s].officialDomains || []).filter(function (d) {
        if (countryForm(host, d)) return false;
        return dotted.indexOf('.' + d + '.') >= 0 || ('.' + host).indexOf('.' + d + '-') >= 0;
      });
      if (sd) return make('CONTRADICTS', 'official_domain_as_subdomain', base, { strength: 'strong', orgId: store.orgs[s].id, lookalikeOf: sd });
    }

    // 7 and 8. The main name compared with every organization's official names.
    const labelAscii = reg.split('.')[0];
    const labelUnicode = (toUnicodeHost(reg) || reg).split('.')[0];
    const labelLook = skeleton(labelUnicode);
    for (const org of store.orgs) {
      for (const official of org.officialDomains || []) {
        const name = official.split('.')[0];
        if (name.length < 4 || GENERIC_LABELS.has(name)) continue;
        const lookalike = { ...base, strength: 'strong', orgId: org.id, lookalikeOf: official };
        // 7a. Same letters to the eye, different characters: chаse.com with a Cyrillic а
        if (labelUnicode !== name && labelLook === skeleton(name)) return check('CONTRADICTS', 'homoglyph', lookalike);
        // 7b. Same name, different ending: chase.net
        if (labelUnicode === name && reg !== registrable(official)) return check('CONTRADICTS', 'same_label_other_tld', lookalike);
        // 8. One or two letters off: amazom.com (shorter names only when that organization is the named sender)
        const minLength = claim && claim.id === org.id ? 4 : 6;
        if (name.length >= minLength && !labelAscii.startsWith('xn--')) {
          const limit = name.length >= 8 ? 2 : 1;
          const distance = editDistance(labelAscii, name, limit);
          if (distance > 0 && distance <= limit) return check('CONTRADICTS', 'typosquat', { ...lookalike, distance });
        if (labelUnicode !== offLabel && labelSkeleton === skeleton(offLabel)) {
          return make('CONTRADICTS', 'homoglyph', base, { strength: 'strong', orgId: cand.id, lookalikeOf: off });
        }
        // 7b. Same name, different ending: chase.net
        if (labelUnicode === offLabel && reg !== registrable(off)) {
          return make('CONTRADICTS', 'same_label_other_tld', base, { strength: 'strong', orgId: cand.id, lookalikeOf: off });
        }
        // 8. One or two letters off: amazom.com
        var minLen = isClaimed ? 4 : 6;
        if (offLabel.length >= minLen && labelAscii.indexOf('xn--') !== 0) {
          var limit = offLabel.length >= 8 ? 2 : 1;
          var dist = editDistance(labelAscii, offLabel, limit);
          if (dist > 0 && dist <= limit) {
            return make('CONTRADICTS', 'typosquat', base, { strength: 'strong', orgId: cand.id, lookalikeOf: off, distance: dist });
          }
        }
      }
    }

    // 9. A brand name inside someone else's address: chase-secure-login.net, paypal-help.com
    const hostLabels = host.split('.');
    const labels = hostLabels.slice(0, Math.max(1, hostLabels.length - (MULTI_SUFFIX.has(hostLabels.slice(-2).join('.')) ? 2 : 1)));
    for (const org of store.orgs) {
      const named = claim && claim.id === org.id;
      for (const label of labels) {
        const lab = (toUnicodeHost(label) || label).toLowerCase();
        const parts = lab.split(/[-_0-9]+/);
        // Also read the label as it looks: amaz0n-secure reads as amazon-secure.
        const look = skeleton(lab);
        const lookParts = look.split(/[-_]+/);
        for (const token of brandTokens(org)) {
          const tokenLook = skeleton(token);
          const separate = parts.includes(token) || (tokenLook.length >= 4 && lookParts.includes(tokenLook));
          const inside = (named || token.length >= 6) && lab !== token && (
            (token.length >= 4 && (lab.startsWith(token) || look.startsWith(tokenLook))) ||
            (token.length >= 6 && (lab.endsWith(token) || look.endsWith(tokenLook))) ||
            (token.length >= 7 && (lab.includes(token) || look.includes(tokenLook))));
          if (separate || inside) {
            return check('CONTRADICTS', 'brand_in_foreign_domain', { ...base, strength: 'strong', orgId: org.id, lookalikeOf: org.officialDomains[0], brandWord: token });
          }
        }
      }
    }

    // 10. A bare number address, from a named sender.
    if (claim && isIp(host)) return check('CONTRADICTS', 'ip_host', { ...base, strength: 'moderate', orgId: claim.id });
    // 11. A named sender and an address not on its list. A limited list cannot prove a conflict.
    if (claim) return check('UNKNOWN', 'not_in_official_list', { ...base, orgId: claim.id });
    // 12. No named sender and nothing to compare against.
    return check('UNKNOWN', 'no_claimed_identity', base);
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
            return make('CONTRADICTS', 'brand_in_foreign_domain', base, { strength: 'strong', orgId: borg.id, lookalikeOf: borg.officialDomains[0], brandWord: tok });
          }
        }
      }
    }

    // 10. A bare number address with a claim.
    if (claim && isIp(host)) return make('CONTRADICTS', 'ip_host', base, { strength: 'moderate', orgId: claim.id });

    // 11. A named organization, and an address that is not theirs.
    // A limited list cannot establish that an unfamiliar site conflicts with a sender.
    if (claim) return make('UNKNOWN', 'not_in_official_list', base, { orgId: claim.id });

    // 12 and 13. Nothing to compare against.
    return make('UNKNOWN', 'no_claimed_identity', base);
  }

  function countryForm(host, domain) {
    var tail = ('.' + host).slice(-(domain.length + 4));
    return tail.slice(0, domain.length + 1) === '.' + domain && /^\.[a-z]{2}$/.test(tail.slice(domain.length + 1));
  }

  /* A contact is supported only by a record in the trusted view: reviewed, unexpired,
     complete, unambiguous and conflict-free (see trusted.js). Anything else leaves the
     contact unresolved, so an unreviewed list fails closed (no Details Match). */
  function supported(ctx, org, target, code, extra) {
    var view = ctx.trusted || T.buildTrustedView({ orgs: [] });
    return T.trustedMatches(view, target, org.id).length
      ? make('SUPPORTS', code, extra) : make('UNKNOWN', 'reference_needs_review', extra);
  }

  function merge(a, b) {
    var out = {};
    for (var k in a) if (a.hasOwnProperty(k)) out[k] = a[k];
    for (var k2 in b) if (b.hasOwnProperty(k2)) out[k2] = b[k2];
    return out;
  }

  // Phone numbers. Missing from a sparse list is never a conflict.
  function checkPhone(target, ctx) {
    var store = ctx.store, claim = ctx.claimOrg;
    var base = { target: target };
    var listed = T.listedFor(store, target);
    if (claim) {
      if (listed.some(function (o) { return o.id === claim.id; })) return supported(ctx, claim, target, 'phone_official', merge(base, { orgId: claim.id }));
      return make('UNKNOWN', 'phone_not_on_file', merge(base, { orgId: claim.id }));
    }
    var matches = T.trustedMatches(ctx.trusted, target);
    if (matches.length) return make('SUPPORTS', 'phone_official', merge(base, { orgId: matches[0].orgId, implicit: true }));
    if (listed.length) return make('UNKNOWN', 'reference_needs_review', merge(base, { orgId: listed[0].id }));
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
    const claim = ctx.claimOrg;
    const listsNumber = org => (org.officialPhones || []).includes(target.e164);
    if (claim) {
      return listsNumber(claim)
        ? supported(claim, 'phone_official', { target, orgId: claim.id })
        : check('UNKNOWN', 'phone_not_on_file', { target, orgId: claim.id });
      if ((claim.officialPhones || []).indexOf(target.e164) >= 0) return make('SUPPORTS', 'phone_official', base, { orgId: claim.id });
      return make('UNKNOWN', 'phone_not_on_file', base, { orgId: claim.id });
    }
    var owner = store.orgs.find(function (o) { return (o.officialPhones || []).indexOf(target.e164) >= 0; });
    if (owner) return make('SUPPORTS', 'phone_official', base, { orgId: owner.id, implicit: true });
      if ((claim.officialPhones || []).indexOf(target.e164) >= 0) return supported(claim, 'phone_official', merge(base, { orgId: claim.id }));
      return make('UNKNOWN', 'phone_not_on_file', merge(base, { orgId: claim.id }));
    }
    const owner = ctx.store.orgs.find(listsNumber);
    return owner
      ? supported(owner, 'phone_official', { target, orgId: owner.id, implicit: true })
      : check('UNKNOWN', 'phone_not_on_file', { target });
  }

  Object.assign(T, { toUnicodeHost, orgById, checkHost, checkPhone, humanReviewed });
})(typeof window !== 'undefined' ? window : globalThis);
