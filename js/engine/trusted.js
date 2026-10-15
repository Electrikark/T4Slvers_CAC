/* Filtered trusted-reference view (R05).
   Only records that are reviewed, unexpired, complete, unambiguous in scope and free of
   conflicts can support a contact. Everything else is excluded with a reason.
   Lookalike and conflict rules still read the full list: they can only raise a warning,
   never support a match.
   Exposes TFS.buildTrustedView(store, today), TFS.trustedMatches(view, target, orgId)
   and TFS.recordsOf(org, store). */
(function (root) {
  'use strict';
  var T = root.TFS = root.TFS || {};

  var SCOPES = { registrable: 1, host: 1 };
  var REQUIRED = ['sourceUrl', 'checkedOn', 'reviewDue', 'reviewedBy', 'scope'];

  function today() { return new Date().toISOString().slice(0, 10); }

  // A real calendar date in YYYY-MM-DD form.
  function calendarDate(value) {
    var m = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return false;
    var y = +m[1], mo = +m[2], d = +m[3], day = new Date(Date.UTC(y, mo - 1, d));
    return day.getUTCFullYear() === y && day.getUTCMonth() === mo - 1 && day.getUTCDate() === d;
  }

  // Ten digits for a US number: +1 (202) 555-0123 and 2025550123 compare equal.
  function phoneKey(value) {
    var digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 11 && digits.charAt(0) === '1') digits = digits.slice(1);
    return digits.length === 10 ? digits : null;
  }

  function hostKey(value) {
    return String(value || '').toLowerCase().replace(/\.+$/, '');
  }

  function sourceFor(org, domain) {
    var match = (org.sources || []).filter(function (s) { return s.domain === domain; })[0];
    return match || null;
  }

  /* Contact records for one organization.
     org.contacts (when present) lists records explicitly, each with its own status.
     Otherwise records are derived from the legacy fields: an organization's humanReview
     reviews its listed domains and phones together, and a source still marked
     "needs review" keeps that domain in draft. */
  function recordsOf(org) {
    if (Array.isArray(org.contacts)) {
      return org.contacts.map(function (c, k) {
        var r = {};
        for (var key in c) if (Object.prototype.hasOwnProperty.call(c, key)) r[key] = c[key];
        r.id = c.id || org.id + ':contact:' + k;
        r.orgId = org.id;
        return r;
      });
    }
    var review = org.humanReview || null;
    var list = [];
    (org.officialDomains || []).forEach(function (domain) {
      var source = sourceFor(org, domain);
      var pending = source && /^needs review/i.test(source.check || '');
      list.push({
        id: org.id + ':domain:' + domain, orgId: org.id, kind: 'domain', value: domain,
        scope: { type: 'registrable' },
        status: review && !pending ? 'reviewed' : 'draft',
        sourceUrl: (review && review.sourceUrl) || (source && source.url) || null,
        checkedOn: review ? review.date : null,
        reviewDue: review ? review.reviewDue : null,
        reviewedBy: review ? review.reviewer : null
      });
    });
    (org.officialPhones || []).forEach(function (phone) {
      list.push({
        id: org.id + ':phone:' + phone, orgId: org.id, kind: 'phone', value: phone,
        scope: { type: 'host' },
        status: review ? 'reviewed' : 'draft',
        sourceUrl: review ? review.sourceUrl || null : null,
        checkedOn: review ? review.date : null,
        reviewDue: review ? review.reviewDue : null,
        reviewedBy: review ? review.reviewer : null
      });
    });
    return list;
  }

  // Shared platforms where anyone can publish: a whole-domain scope there names no one.
  function sharedPlatform(store, host) {
    var shared = (store.shorteners || []).concat(store.freeMailDomains || []);
    (store.orgs || []).forEach(function (org) { shared = shared.concat(org.userContentHosts || []); });
    return shared.some(function (d) { return T.hostMatches(host, hostKey(d)); });
  }

  function ineligibleReason(record, store, day) {
    if (record.status !== 'reviewed') return 'not_reviewed';
    for (var k = 0; k < REQUIRED.length; k++) {
      var value = record[REQUIRED[k]];
      if (value == null || (typeof value === 'string' && !value.trim())) return 'missing:' + REQUIRED[k];
    }
    if (record.kind !== 'domain' && record.kind !== 'phone') return 'unknown_kind';
    if (!calendarDate(record.checkedOn) || record.checkedOn > day || record.checkedOn < '2020-01-01') return 'invalid_checked_date';
    if (!calendarDate(record.reviewDue)) return 'invalid_review_due';
    if (record.reviewDue < day) return 'expired';
    if (record.kind === 'phone') return phoneKey(record.value) ? null : 'invalid_phone';
    var scope = record.scope;
    if (!scope || !SCOPES[scope.type]) return 'ambiguous_scope';
    var host = hostKey(record.value);
    if (!host || host.indexOf('.') < 0) return 'ambiguous_scope';
    // A whole-domain scope must name the registrable domain itself.
    if (scope.type === 'registrable' && T.registrable(host) !== host) return 'ambiguous_scope';
    // A bare shared-platform root, with no tenant host or path, could be anyone's page.
    if (sharedPlatform(store, host) && !(scope.pathPrefix && scope.pathPrefix.length > 1)) return 'ambiguous_scope';
    return null;
  }

  function overlaps(a, b) {
    if (a.kind !== b.kind) return false;
    if (a.kind === 'phone') return phoneKey(a.value) === phoneKey(b.value);
    var ha = hostKey(a.value), hb = hostKey(b.value);
    return T.hostMatches(ha, hb) || T.hostMatches(hb, ha);
  }

  function buildTrustedView(store, day) {
    day = day || today();
    var trusted = [], excluded = [];
    ((store && store.orgs) || []).forEach(function (org) {
      recordsOf(org).forEach(function (record) {
        var reason = ineligibleReason(record, store, day);
        if (reason) excluded.push({ id: record.id, orgId: record.orgId, reason: reason });
        else trusted.push(record);
      });
    });
    // The same number or host claimed by two organizations supports neither.
    var conflicted = {};
    trusted.forEach(function (a, i) {
      trusted.forEach(function (b, j) {
        if (j > i && a.orgId !== b.orgId && overlaps(a, b)) { conflicted[a.id] = 1; conflicted[b.id] = 1; }
      });
    });
    trusted = trusted.filter(function (r) {
      if (!conflicted[r.id]) return true;
      excluded.push({ id: r.id, orgId: r.orgId, reason: 'conflict' });
      return false;
    });
    trusted.forEach(Object.freeze);
    return Object.freeze({
      version: (store && store.version) || null,
      day: day,
      trusted: Object.freeze(trusted),
      excluded: Object.freeze(excluded)
    });
  }

  function pathOf(target) { return target.path || '/'; }

  // Trusted records that cover this contact. orgId narrows the search to one organization.
  function trustedMatches(view, target, orgId) {
    if (!view || !target || target.error) return [];
    return view.trusted.filter(function (r) {
      if (orgId && r.orgId !== orgId) return false;
      if (target.kind === 'phone') return r.kind === 'phone' && phoneKey(r.value) === phoneKey(target.e164);
      if (r.kind !== 'domain' || !target.host) return false;
      var host = hostKey(target.host), value = hostKey(r.value);
      var hostOk = r.scope.type === 'host' ? host === value : T.hostMatches(host, value);
      if (!hostOk) return false;
      if (r.scope.pathPrefix && target.kind === 'link') return pathOf(target).indexOf(r.scope.pathPrefix) === 0;
      // An email address has no path, so a path-scoped record cannot cover it.
      return !r.scope.pathPrefix;
    });
  }

  // Raw ownership, used only to explain why a listed contact cannot count yet.
  function listedFor(store, target) {
    return ((store && store.orgs) || []).filter(function (org) {
      return recordsOf(org).some(function (r) {
        if (target.kind === 'phone') return r.kind === 'phone' && phoneKey(r.value) === phoneKey(target.e164);
        return r.kind === 'domain' && target.host && T.hostMatches(hostKey(target.host), hostKey(r.value));
      });
    });
  }

  T.buildTrustedView = buildTrustedView;
  T.trustedMatches = trustedMatches;
  T.recordsOf = recordsOf;
  T.listedFor = listedFor;
  T.phoneKey = phoneKey;
})(typeof window !== 'undefined' ? window : globalThis);
