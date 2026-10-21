/* Phase 2 A: the filtered trusted-reference view (R05). Fictional records only. */
window.TFS_PHASE2.add('Trusted reference view', function (t) {
  var T = window.TFS, engine = window.TfsEngine;
  var DAY = '2026-10-12';

  function rec(kind, value, extra) {
    var r = { kind: kind, value: value, scope: { type: kind === 'phone' ? 'host' : 'registrable' }, status: 'reviewed',
      sourceUrl: 'https://example.invalid/fixture-record', checkedOn: '2026-10-01', reviewDue: '2099-12-31',
      reviewedBy: 'Test fixture (fictional record)' };
    for (var k in extra || {}) r[k] = extra[k];
    return r;
  }
  function org(id, name, domains, contacts) {
    return { id: id, displayName: name, aliases: [name.toLowerCase()], officialDomains: domains, officialPhones: [], userContentHosts: [], contacts: contacts };
  }
  function store(orgs) { return { version: 'trusted-fixture', shorteners: ['bit.ly'], freeMailDomains: ['gmail.com'], orgs: orgs }; }
  function analyze(text, s) { return engine.analyze(text, s, { declaredChannel: 'text', today: DAY }); }
  function codes(r) { return r.checks.map(function (c) { return c.code; }); }
  function reasonOf(view, id) { return (view.excluded.filter(function (x) { return x.id === id; })[0] || {}).reason; }

  t.test('A1 Draft, expired and incomplete records are excluded, each with its reason', function () {
    var s = store([org('example-bank', 'Example Bank', [], [
      rec('domain', 'example.com', { id: 'draft', status: 'draft' }),
      rec('domain', 'example.net', { id: 'expired', reviewDue: '2026-10-11' }),
      rec('domain', 'example.org', { id: 'no-source', sourceUrl: '' }),
      rec('domain', 'example.info', { id: 'no-reviewer', reviewedBy: null }),
      rec('domain', 'example.biz', { id: 'no-due', reviewDue: undefined }),
      rec('domain', 'example.dev', { id: 'ok' })
    ])]);
    var view = T.buildTrustedView(s, DAY);
    t.same(reasonOf(view, 'draft'), 'not_reviewed', 'draft');
    t.same(reasonOf(view, 'expired'), 'expired', 'expired');
    t.same(reasonOf(view, 'no-source'), 'missing:sourceUrl', 'no source');
    t.same(reasonOf(view, 'no-reviewer'), 'missing:reviewedBy', 'no reviewer');
    t.same(reasonOf(view, 'no-due'), 'missing:reviewDue', 'no review-due date');
    t.same(view.trusted.map(function (r) { return r.id; }), ['ok'], 'only the complete record is trusted');
    t.assert(view.excluded.every(function (x) { return typeof x.reason === 'string' && x.reason; }), 'every exclusion has a reason');
  });

  t.test('A2 A record due today is still in date; the day after, it is not', function () {
    var s = store([org('example-bank', 'Example Bank', [], [rec('domain', 'example.com', { id: 'due', reviewDue: DAY })])]);
    t.same(T.buildTrustedView(s, DAY).trusted.length, 1, 'due today');
    t.same(reasonOf(T.buildTrustedView(s, '2026-10-13'), 'due'), 'expired', 'day after');
  });

  t.test('A3 An empty trusted view produces no SUPPORTS checks', function () {
    // Every record is a draft: the view is empty, whatever the message says.
    var s = store([org('example-bank', 'Example Bank', ['example.com'], [
      rec('domain', 'example.com', { status: 'draft' }), rec('phone', '+12025550123', { status: 'draft' })
    ])]);
    t.same(T.buildTrustedView(s, DAY).trusted.length, 0, 'view is empty');
    ['Example Bank: Your statement is ready. Visit https://example.com.',
      'Example Bank: Call 202-555-0123 about your card.',
      'Visit https://secure.example.com/login today.',
      'Call 202-555-0123.'].forEach(function (text) {
      var r = analyze(text, s);
      t.assert(engine.validateResult(r), 'invalid result for ' + text);
      t.assert(r.checks.every(function (c) { return c.status !== 'SUPPORTS'; }), 'SUPPORTS from an empty view: ' + text);
      t.assert(r.assessment !== 'details_match', 'Details Match from an empty view: ' + text);
    });
    // The check functions themselves cannot support without a trusted record.
    var reviewed = store([org('example-bank', 'Example Bank', ['example.com'], [rec('domain', 'example.com')])]);
    var target = T.extractTargets('https://example.com').targets[0];
    var empty = T.buildTrustedView({ orgs: [] }, DAY);
    t.same(T.checkHost(target, { store: reviewed, trusted: empty, claimOrg: reviewed.orgs[0] }).status, 'UNKNOWN', 'checkHost with empty view');
  });

  t.test('A4 Reviewed phone plus draft link for the same organization: the phone matches, the link does not', function () {
    var s = store([org('example-bank', 'Example Bank', ['example.com'], [
      rec('phone', '+12025550123'), rec('domain', 'example.com', { status: 'draft' })
    ])]);
    var r = analyze('Example Bank: Call 202-555-0123 or visit https://example.com.', s);
    var byKind = {};
    r.evidence.contacts.forEach(function (c) { byKind[c.support.target.kind] = c; });
    t.same(byKind.phone.support.status, 'SUPPORTS', 'phone');
    t.same(byKind.phone.verification, 'verified', 'phone verification');
    t.same(byKind.link.support.code, 'reference_needs_review', 'link code');
    t.same(byKind.link.verification, 'unresolved', 'link verification');
    t.same(r.assessment, 'insufficient_evidence', 'one unresolved contact blocks a match');
  });

  t.test('A5 A number claimed by two organizations matches neither', function () {
    var s = store([
      org('example-bank', 'Example Bank', ['example.com'], [rec('phone', '+12025550123'), rec('domain', 'example.com')]),
      org('sample-union', 'Sample Union', ['example.org'], [rec('phone', '(202) 555-0123'), rec('domain', 'example.org')])
    ]);
    var view = T.buildTrustedView(s, DAY);
    t.same(view.excluded.filter(function (x) { return x.reason === 'conflict'; }).map(function (x) { return x.orgId; }).sort(), ['example-bank', 'sample-union'], 'both excluded as conflict');
    ['Example Bank: Call 202-555-0123.', 'Sample Union: Call 202-555-0123.', 'Call 202-555-0123.'].forEach(function (text) {
      var r = analyze(text, s);
      t.assert(r.checks.every(function (c) { return c.status !== 'SUPPORTS'; }), 'conflicted number matched: ' + text);
    });
    // Their unconflicted websites still match.
    t.same(analyze('Example Bank: Visit https://example.com.', s).checks[0].status, 'SUPPORTS', 'website unaffected');
  });

  t.test('A6 secure.example.com matches an example.com scope; example.com.account-verify.top does not', function () {
    var s = store([org('example-bank', 'Example Bank', ['example.com'], [rec('domain', 'example.com')])]);
    var view = T.buildTrustedView(s, DAY);
    function host(url) { return T.extractTargets(url).targets[0]; }
    t.same(T.trustedMatches(view, host('https://secure.example.com/login')).length, 1, 'subdomain inside scope');
    t.same(T.trustedMatches(view, host('https://example.com.account-verify.top/login')).length, 0, 'glued domain');
    t.same(T.trustedMatches(view, host('https://notexample.com')).length, 0, 'suffix without a dot');
    var r = analyze('Example Bank: Visit https://example.com.account-verify.top/login now.', s);
    t.assert(r.checks.every(function (c) { return c.status !== 'SUPPORTS'; }), 'glued domain supported');
    t.same(analyze('Example Bank: Visit https://secure.example.com.', s).checks[0].status, 'SUPPORTS', 'subdomain in analysis');
  });

  t.test('A7 Exact-host and path scopes stay inside their bounds', function () {
    var s = store([org('example-bank', 'Example Bank', ['example.com'], [
      rec('domain', 'secure.example.com', { scope: { type: 'host' } }),
      rec('domain', 'example.net', { scope: { type: 'registrable', pathPrefix: '/example-bank' } })
    ])]);
    var view = T.buildTrustedView(s, DAY);
    function n(url) { return T.trustedMatches(view, T.extractTargets(url).targets[0]).length; }
    t.same(n('https://secure.example.com/a'), 1, 'exact host');
    t.same(n('https://www.secure.example.com/a'), 0, 'deeper host is outside an exact scope');
    t.same(n('https://example.net/example-bank/help'), 1, 'inside path');
    t.same(n('https://example.net/someone-else'), 0, 'outside path');
  });

  t.test('A8 Ambiguous scopes are excluded', function () {
    var s = store([org('example-bank', 'Example Bank', [], [
      rec('domain', 'secure.example.com', { id: 'sub-as-whole' }),
      rec('domain', 'bit.ly', { id: 'shared-root' }),
      rec('domain', 'example.com', { id: 'no-scope', scope: null }),
      rec('domain', 'example.org', { id: 'odd-scope', scope: { type: 'anything' } })
    ])]);
    var view = T.buildTrustedView(s, DAY);
    ['sub-as-whole', 'shared-root'].forEach(function (id) { t.same(reasonOf(view, id), 'ambiguous_scope', id); });
    t.same(reasonOf(view, 'no-scope'), 'missing:scope', 'no scope');
    t.same(reasonOf(view, 'odd-scope'), 'ambiguous_scope', 'unknown scope type');
  });

  t.test('A9 Future check dates and impossible dates never enter the view', function () {
    var s = store([org('example-bank', 'Example Bank', [], [
      rec('domain', 'example.com', { id: 'future', checkedOn: '2026-10-13' }),
      rec('domain', 'example.org', { id: 'impossible', checkedOn: '2026-02-30' }),
      rec('domain', 'example.net', { id: 'bad-due', reviewDue: '2099-02-30' })
    ])]);
    var view = T.buildTrustedView(s, DAY);
    t.same(reasonOf(view, 'future'), 'invalid_checked_date', 'future');
    t.same(reasonOf(view, 'impossible'), 'invalid_checked_date', 'impossible');
    t.same(reasonOf(view, 'bad-due'), 'invalid_review_due', 'bad due date');
  });

  t.test('A10 The real list has no trusted records yet, and every exclusion says why', function () {
    var view = T.buildTrustedView(window.TFS_STORE, DAY);
    t.same(view.trusted.length, 0, 'no record of the real list is reviewed by a person yet');
    t.assert(view.excluded.length > 0 && view.excluded.every(function (x) { return x.reason === 'not_reviewed'; }), 'unexpected exclusion reason');
    var r = engine.analyze('Chase: Your statement is ready. Visit https://chase.com.', window.TFS_STORE, { declaredChannel: 'text' });
    t.same(r.referenceView.trusted, 0, 'result reports the trusted count');
    t.same(codes(r), ['reference_needs_review'], 'listed but unreviewed');
  });

  t.test('A11 Lookalike detection still reads the full list', function () {
    // The view only controls support; a draft list must still name a copycat address.
    var s = store([org('example-bank', 'Example Bank', ['examplebank.com'], [rec('domain', 'examplebank.com', { status: 'draft' })])]);
    var r = analyze('Example Bank: Sign in at https://examplebank.com.secure-check.top now.', s);
    t.assert(r.checks.some(function (c) { return c.status === 'CONTRADICTS'; }), 'lookalike lost with an empty view');
    t.same(r.assessment, 'suspicious', 'glued official domain stays Tier 1');
  });

  t.test('A12 An organization-wide review covers its draft contacts, and only those', function () {
    var review = { reviewer: 'Test fixture (fictional record)', date: '2026-10-01', reviewDue: '2099-12-31', sourceUrl: 'https://example.invalid/org-review' };
    var o = org('example-bank', 'Example Bank', [], [
      rec('domain', 'examplebank.com', { id: 'draft', status: 'draft', reviewedBy: null }),
      rec('domain', 'examplebank.net', { id: 'own', reviewedBy: 'Someone else', sourceUrl: 'https://example.invalid/own-page' }),
      rec('domain', 'examplebank.org', { id: 'rejected', status: 'rejected' })
    ]);
    o.humanReview = review;
    var view = T.buildTrustedView(store([o]), DAY);
    var byId = function (id) { return view.trusted.filter(function (x) { return x.id === id; })[0]; };
    t.assert(byId('draft') && byId('draft').reviewedBy === review.reviewer && byId('draft').sourceUrl === review.sourceUrl, 'draft contact takes the organization review');
    t.assert(byId('own') && byId('own').reviewedBy === 'Someone else' && byId('own').sourceUrl === 'https://example.invalid/own-page', 'a reviewed contact keeps its own fields');
    t.same(reasonOf(view, 'rejected'), 'not_reviewed', 'a rejected contact stays out');
    var noSource = org('example-bank', 'Example Bank', [], [rec('domain', 'examplebank.com', { id: 'draft', status: 'draft' })]);
    noSource.humanReview = { reviewer: review.reviewer, date: review.date, reviewDue: review.reviewDue };
    t.same(reasonOf(T.buildTrustedView(store([noSource]), DAY), 'draft'), 'missing:sourceUrl', 'a review without its own source page does not count');
    var expired = org('example-bank', 'Example Bank', [], [rec('domain', 'examplebank.com', { id: 'draft', status: 'draft' })]);
    expired.humanReview = { reviewer: review.reviewer, date: '2026-07-01', reviewDue: '2026-09-29', sourceUrl: review.sourceUrl };
    t.same(reasonOf(T.buildTrustedView(store([expired]), DAY), 'draft'), 'expired', 'an expired organization review stops counting');
  });
});
