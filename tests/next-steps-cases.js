/* Contact advice uses the same reviewed view as contact matching. Fictional records only. */
window.TFS_PHASE2.add('Reviewed next-step advice', function (t) {
  var engine = window.TfsEngine, setup = window.TFS_SCOPE_SETUP;
  var DAY = '2026-10-12';
  var MESSAGE = 'Chase: Your statement is ready. Visit https://chase.com.';
  var CARD = 'Contact Chase using a number you already trust, such as the one on your card, bill or statement.';
  var WEBSITE = 'If you need their website, type chase.com yourself instead of tapping a link.';
  var FALLBACK = 'If you need their website, type a website address you already know, or use their official app.';

  function analyze(store, text) {
    var r = engine.analyze(text || MESSAGE, store, { declaredChannel: 'text', today: DAY });
    t.assert(engine.validateResult(r), 'invalid result');
    t.same(r.referenceView.day, DAY, 'frozen review date');
    return r;
  }
  function fallback(r) {
    t.assert(r.nextSteps.indexOf(CARD) >= 0, 'trusted-number line changed');
    t.assert(r.nextSteps.indexOf(FALLBACK) >= 0, 'missing website fallback');
    t.assert(r.nextSteps.every(function (step) { return !/type chase\.com/i.test(step); }), 'unreviewed website recommended');
  }
  function website(r, domain) {
    t.assert(r.nextSteps.indexOf(CARD) >= 0, 'trusted-number line changed');
    t.assert(r.nextSteps.indexOf(WEBSITE.replace('chase.com', domain || 'chase.com')) >= 0, 'reviewed website missing');
    t.assert(r.nextSteps.indexOf(FALLBACK) < 0, 'fallback alongside reviewed website');
  }

  t.test('NS1 No reviewed record uses the fallback, including drafts and incomplete reviews', function () {
    fallback(analyze(setup.storeFor('none')));
    ['draft', 'missing-source', 'missing-reviewer'].forEach(function (state) {
      var s = setup.storeFor('approved'), record = s.orgs[0].contacts[0];
      if (state === 'draft') record.status = 'draft';
      if (state === 'missing-source') record.sourceUrl = '';
      if (state === 'missing-reviewer') record.reviewedBy = null;
      fallback(analyze(s));
    });
  });

  t.test('NS2 Approved records supply the website independently of raw-list order', function () {
    var s = setup.storeFor('approved');
    website(analyze(s));
    // A raw first entry, another organization's record, or a phone must not win.
    s.orgs[0].officialDomains.unshift('unreviewed.example');
    var other = setup.storeFor('approved').orgs[0];
    other.id = 'other'; other.displayName = 'Other Bank'; other.aliases = ['other bank'];
    other.officialDomains = ['other.example']; other.contacts[0].value = 'other.example';
    other.contacts[0].id = 'other-domain';
    s.orgs.unshift(other);
    var phone = Object.assign({}, s.orgs[1].contacts[0], { id: 'reviewed-phone', kind: 'phone', value: '+12025550123' });
    s.orgs[1].contacts.unshift(phone);
    website(analyze(s));
    // Exact-host records retain their reviewed host; do not broaden to the raw root.
    s = setup.storeFor('approved');
    s.orgs[0].contacts[0].value = 'secure.chase.com';
    s.orgs[0].contacts[0].scope = { type: 'host' };
    website(analyze(s, 'Chase: Your statement is ready.'), 'secure.chase.com');
  });

  t.test('NS3 Rejected records use the fallback', function () {
    fallback(analyze(setup.storeFor('rejected')));
  });

  t.test('NS4 Expired records use the fallback; a review due today is still current', function () {
    fallback(analyze(setup.storeFor('expired')));
    var s = setup.storeFor('approved');
    s.orgs[0].contacts[0].reviewDue = DAY;
    website(analyze(s));
  });

  t.test('NS5 An organization without a reviewed website uses the fallback', function () {
    [[], undefined].forEach(function (domains) {
      var s = setup.storeFor('none');
      if (domains) s.orgs[0].officialDomains = domains;
      else delete s.orgs[0].officialDomains;
      fallback(analyze(s, 'Chase: Your statement is ready.'));
    });
    var s = setup.storeFor('approved');
    s.orgs[0].contacts[0].kind = 'phone';
    s.orgs[0].contacts[0].value = '+12025550123';
    fallback(analyze(s));
    // A review for one path does not authorize recommending the bare website.
    s = setup.storeFor('approved');
    s.orgs[0].contacts[0].scope.pathPrefix = '/reviewed-area';
    fallback(analyze(s));
  });

  t.test('NS6 Two organizations claiming the same website cannot recommend it', function () {
    var s = setup.storeFor('approved'), other = setup.storeFor('approved').orgs[0];
    other.id = 'other'; other.displayName = 'Other Bank'; other.aliases = ['other bank'];
    other.contacts[0].id = 'other-chase-domain';
    s.orgs.push(other);
    var r = analyze(s);
    t.same(r.referenceView.trusted, 0, 'both conflicting records excluded');
    fallback(r);
  });

  t.test('NS7 A scam verdict still recommends the independently reviewed website', function () {
    var r = analyze(setup.storeFor('approved'), 'Chase: Pay with gift cards today. Visit https://chase.com.');
    t.same(r.assessment, 'suspicious', 'real website does not clear the demand');
    website(r);
  });

  t.test('NS8 No advice contains undefined or null, including real-store and implicit senders', function () {
    var results = ['none', 'approved', 'rejected', 'expired'].map(function (state) { return analyze(setup.storeFor(state)); });
    var empty = setup.storeFor('none');
    delete empty.orgs[0].officialDomains;
    results.push(analyze(empty, 'Chase: Your statement is ready.'));
    results.push(analyze(empty, 'Your statement is ready.'));
    var implicit = analyze(setup.storeFor('approved'), 'Visit https://chase.com.');
    t.same(implicit.claimSource, 'implicit', 'implicit sender exercised');
    website(implicit);
    results.push(implicit);
    window.TFS_STORE.orgs.forEach(function (org) {
      var r = analyze(window.TFS_STORE, org.displayName + ': Your statement is ready.');
      t.same(r.referenceView.trusted, 0, 'real records await human review');
      t.assert(r.nextSteps.every(function (step) { return !/type \S+ yourself/.test(step); }), 'unreviewed real-store website recommended');
      results.push(r);
    });
    results.forEach(function (r) {
      t.assert(r.nextSteps.length > 0, 'empty next steps');
      r.nextSteps.forEach(function (step) {
        t.assert(typeof step === 'string' && !/\b(?:undefined|null)\b/i.test(step), 'invalid next step: ' + step);
      });
    });
  });
});
