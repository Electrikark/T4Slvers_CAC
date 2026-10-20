/* Second inspection pass (docs/decisions/engine-defect-repairs.md, A1–A5 and B1–B10).
   Group names carry the inspection's item IDs. Expectations were decided by hand before
   each fix. The page copy (B7) and contrast (B9) checks read files, so they run in Node only. */
(function () {
  var add = window.TFS_PHASE2.add;
  function engine() { return window.TfsEngine; }
  function analyze(t, text, store, options) {
    var o = { declaredChannel: 'text' };
    for (var k in options || {}) o[k] = options[k];
    var r = engine().analyze(text, store || window.TFS_STORE, o);
    t.assert(engine().validateResult(r), 'invalid result for "' + text + '"');
    return r;
  }
  function tier1(r) {
    return r.evidence.findings.filter(function (f) { return f.tier === 1 && f.status === 'established'; }).map(function (f) { return f.ruleId; });
  }
  function flagIds(r) { return r.requestRisk.flags.map(function (f) { return f.id; }); }
  function codes(r) { return r.checks.map(function (c) { return c.code; }); }
  function allWords(r) { return [r.description, r.meaning].concat(r.actionWarnings, r.nextSteps, r.checks.map(function (c) { return c.detail + ' ' + c.source; })).join(' '); }
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function orgCopy(id) { return copy(window.TFS_STORE.orgs.filter(function (o) { return o.id === id; })[0]); }

  add('Repair A1: neutral wording for similar addresses', function (t) {
    t.test('A1a Detail and description say "similar", not copycat or conflict', function () {
      [
        ['Visit https://medicaid.gov for your renewal.', 'medicaid.gov', 'medicare.gov'],
        ['Switch to usmobile.com today.', 'usmobile.com', 't-mobile.com'],
        ['Your bill is at https://connect.comcast.net.', 'connect.comcast.net', 'comcast.com']
      ].forEach(function (row) {
        var r = analyze(t, row[0]);
        var detail = row[1] + ' is similar to ' + row[2] + '. We can’t tell whether it belongs to them.';
        t.assert(r.checks.some(function (c) { return c.detail === detail; }), 'neutral detail missing for ' + row[1]);
        t.assert(allWords(r).indexOf('Copycat') < 0, 'copycat wording for ' + row[1]);
        t.assert(allWords(r).indexOf('does not match our stored list') < 0, 'conflict wording for ' + row[1]);
        t.assert(r.description.indexOf('similar to an address on our list') >= 0, 'similarity description for ' + row[1]);
      });
    });
    t.test('A1b Address tricks and other-organization conflicts keep their wording', function () {
      var r = analyze(t, 'Chase: sign in at https://chаse.com');
      t.assert(r.checks.some(function (c) { return c.detail.indexOf('only look the same') >= 0; }), 'homoglyph detail changed');
      t.assert(r.description.indexOf('similar to an address') < 0, 'Tier 1 description softened');
      r = analyze(t, 'Chase: pay at https://paypal.com', window.TFS_FIXTURE_STORE);
      t.assert(r.description.indexOf('does not match our stored list') >= 0, 'other-organization conflict softened');
    });
  });

  add('Repair A2: "The IRS asks you to"', function (t) {
    t.test('A2a A leading "the" or "your" before a listed name still names the asker', function () {
      ['The IRS asks you to pay the balance with gift cards.', 'IRS asks you to pay the balance with gift cards.',
        'Your Chase Bank asks you to read the code back to us.'].forEach(function (text) {
        t.assert(tier1(analyze(t, text)).length, 'no Tier 1 for "' + text + '"');
      });
    });
    t.test('A2b Reporting and conditional askers stay quiet', function () {
      ['Scammers posing as the IRS ask you to pay the balance with gift cards.',
        'If the IRS asks you to pay the balance with gift cards, hang up.'].forEach(function (text) {
        t.same(tier1(analyze(t, text)), [], 'Tier 1 for "' + text + '"');
      });
    });
  });

  add('Repair A3/A4: toll-free numbers with letters', function (t) {
    t.test('A3 Mixed-case lettered toll-free numbers are listed as unreadable', function () {
      [['Call 1-800-Flowers to claim your free bouquet.', '1-800-Flowers'],
        ['Call 1-800-ASK-USPS', '1-800-ASK-USPS'],
        ['Text 888-Get-Cash now.', '888-Get-Cash']].forEach(function (row) {
        var r = analyze(t, row[0]);
        t.assert(r.checks.some(function (c) { return c.code === 'phone_unreadable' && c.target === row[1]; }), 'unreadable number missing for "' + row[0] + '"');
      });
    });
    t.test('A4 Order references and ordinary words are not phone numbers', function () {
      ['Your order ref is 300 XK4 9921. Thanks for shopping.', 'We have 800 Clients nationwide.',
        'Serving 800 clients a day.', 'Meet at 800 Main St.', 'Flight UA 2345 boards at gate B12.'].forEach(function (text) {
        t.same(codes(analyze(t, text)), ['nothing_to_check'], 'checks for "' + text + '"');
      });
    });
  });

  add('Repair A5: addressed openers, deliberate scope', function (t) {
    t.test('A5a A name or a short interjection before an imperative still addresses the reader', function () {
      ['Jamie, read me the code from your phone.', 'Yes, send me the code.'].forEach(function (text) {
        t.assert(tier1(analyze(t, text)).indexOf('T1-CODE') >= 0, 'T1-CODE missing for "' + text + '"');
      });
    });
    t.test('A5b Notes, reminders and reports after a capitalized word stay quiet', function () {
      ['Note, scammers may ask you to send the code.', 'Remember, never send the code.',
        'Reminder, we will never ask you to read the code.', 'Warning, criminals ask victims to send the code.'].forEach(function (text) {
        t.same(tier1(analyze(t, text)), [], 'Tier 1 for "' + text + '"');
      });
    });
  });

  add('Repair B1: negated or educational arrest wording', function (t) {
    t.test('B1a Advice about arrest threats is not itself a threat', function () {
      ['SSA will never threaten you with arrest. Hang up and report it at oig.ssa.gov.',
        'The IRS will not threaten you with arrest or deportation.',
        'Scammers may threaten you with arrest.',
        'Government agencies never call to threaten arrest.'].forEach(function (text) {
        var r = analyze(t, text);
        t.assert(flagIds(r).indexOf('arrest_threat') < 0, 'arrest_threat for "' + text + '"');
        t.assert(r.requestRisk.level !== 'high', 'high risk for "' + text + '"');
      });
    });
    t.test('B1b Real threats stay flagged', function () {
      ['Pay today or you will be arrested.', 'If you do not pay, a warrant will be issued for your arrest.',
        'If you do not pay a warrant will be issued.', 'Don’t ignore this notice or you will be arrested.',
        'We never send reminders, but a warrant will be issued today.'].forEach(function (text) {
        t.assert(flagIds(analyze(t, text)).indexOf('arrest_threat') >= 0, 'arrest_threat missing for "' + text + '"');
      });
    });
  });

  add('Repair B2: .zip and .mov addresses', function (t) {
    t.test('B2a An address ending in .zip or .mov is checked when it is written as a website', function () {
      [['Microsoft: Your Office license expired. Renew at microsoft-office-renew.zip today.', 'microsoft-office-renew.zip'],
        ['Visit renew.zip to keep your license.', 'renew.zip'],
        ['Your invoice: billing.account.zip', 'billing.account.zip'],
        ['Download it from update.zip/setup now.', 'update.zip'],
        ['Watch the video at clip.mov', 'clip.mov']].forEach(function (row) {
        var r = analyze(t, row[0]);
        t.assert(codes(r).indexOf('nothing_to_check') < 0, 'no link found in "' + row[0] + '"');
        t.assert(r.checks.some(function (c) { return c.target === row[1]; }), row[1] + ' not checked');
      });
      var r = analyze(t, 'Microsoft: Your Office license expired. Renew at microsoft-office-renew.zip today.');
      t.assert(tier1(r).indexOf('T1-DOMAIN') >= 0 || r.checks.some(function (c) { return c.status === 'CONTRADICTS'; }), 'Microsoft lookalike not flagged');
    });
    t.test('B2b File names stay quiet', function () {
      ['I attached photos.zip for you.', 'Open report.pdf before the meeting.', 'The file holiday-photos.zip is in your inbox.',
        'See README.md for details.', 'I saved it as clip.mov on my laptop.'].forEach(function (text) {
        t.same(codes(analyze(t, text)), ['nothing_to_check'], 'checks for "' + text + '"');
      });
    });
  });

  add('Repair B3: why a listed record cannot count', function (t) {
    var DAY = '2026-10-12';
    var REVIEW = { reviewer: 'Fictional test reviewer', date: '2026-10-01', reviewDue: '2026-12-31', sourceUrl: 'https://example.invalid/review' };
    function storeWith(org) { var s = copy(window.TFS_STORE); s.orgs = s.orgs.map(function (o) { return o.id === org.id ? org : o; }); return s; }
    function detailFor(r, host) { return r.checks.filter(function (c) { return c.target === host; })[0]; }
    t.test('B3a An unreviewed record still says it needs review', function () {
      var r = analyze(t, 'Chase: see https://chase.com', null, { today: DAY });
      t.assert(detailFor(r, 'chase.com').detail.indexOf('still needs review') >= 0, 'unreviewed wording');
    });
    t.test('B3b An expired review says so', function () {
      var org = orgCopy('chase');
      org.humanReview = copy(REVIEW); org.humanReview.reviewDue = '2026-10-11';
      (org.sources || []).forEach(function (s) { s.check = 'Reviewed'; });
      var r = analyze(t, 'Chase: see https://chase.com', storeWith(org), { today: DAY });
      var c = detailFor(r, 'chase.com');
      t.same(c.code, 'reference_needs_review', 'code unchanged');
      t.assert(c.detail.indexOf('review') >= 0 && c.detail.indexOf('expired') >= 0, 'expired wording: ' + c.detail);
      t.assert(c.detail.indexOf('still needs review') < 0, 'expired record called unreviewed');
    });
    t.test('B3c A conflict says two organizations list it', function () {
      var a = orgCopy('chase'), b = orgCopy('bankofamerica');
      a.humanReview = copy(REVIEW); b.humanReview = copy(REVIEW);
      (a.sources || []).concat(b.sources || []).forEach(function (s) { s.check = 'Reviewed'; });
      b.officialDomains = b.officialDomains.concat(['chase.com']);
      var s = storeWith(a); s.orgs = s.orgs.map(function (o) { return o.id === b.id ? b : o; });
      var c = detailFor(analyze(t, 'Chase: see https://chase.com', s, { today: DAY }), 'chase.com');
      t.assert(c.detail.indexOf('another organization') >= 0, 'conflict wording: ' + c.detail);
    });
    t.test('B3d A record missing review details says so', function () {
      var org = orgCopy('chase');
      org.humanReview = copy(REVIEW); delete org.humanReview.sourceUrl;
      (org.sources || []).forEach(function (s) { s.check = 'Reviewed'; delete s.url; });
      var c = detailFor(analyze(t, 'Chase: see https://chase.com', storeWith(org), { today: DAY }), 'chase.com');
      t.assert(c.detail.indexOf('missing review details') >= 0, 'missing-field wording: ' + c.detail);
    });
    t.test('B3e A human review is shown as the review status', function () {
      var org = orgCopy('chase');
      org.humanReview = copy(REVIEW);
      (org.sources || []).forEach(function (s) { s.check = 'Reviewed'; });
      var c = detailFor(analyze(t, 'Chase: see https://chase.com', storeWith(org), { today: DAY }), 'chase.com');
      t.same(c.status, 'SUPPORTS', 'reviewed record supports');
      t.assert(c.source.indexOf('Reviewed by Fictional test reviewer on 2026-10-01') >= 0, 'review status: ' + c.source);
      t.assert(c.source.indexOf('awaiting human review') < 0, 'automated status shown after a human review');
    });
    t.test('B3f Reviewed DMV and EDD records can support a contact (they were ambiguous_scope as ca.gov)', function () {
      [['cadmv', 'DMV: renew at https://www.dmv.ca.gov', 'www.dmv.ca.gov'], ['caedd', 'EDD: sign in at https://edd.ca.gov', 'edd.ca.gov']].forEach(function (row) {
        var org = orgCopy(row[0]);
        org.humanReview = copy(REVIEW);
        (org.sources || []).forEach(function (s) { s.check = 'Reviewed'; });
        var s = storeWith(org);
        var view = window.TFS.buildTrustedView(s, DAY);
        t.same(view.excluded.filter(function (x) { return x.orgId === row[0]; }), [], row[0] + ' excluded');
        var c = detailFor(analyze(t, row[1], s, { today: DAY }), row[2]);
        t.same([c.status, c.code], ['SUPPORTS', 'domain_official'], row[0] + ' contact');
      });
      t.same(window.TFS.registrable('dmv.ca.gov'), 'dmv.ca.gov', 'ca.gov is a two-part ending');
      t.same(window.TFS.registrable('evil.dmv.ca.gov'), 'dmv.ca.gov', 'subdomain of a ca.gov site');
    });
  });

  add('Repair B4: lookalike letters with a lure word', function (t) {
    t.test('B4a amaz0n-secure.com is an address trick', function () {
      var r = analyze(t, 'Amazon: verify your account at https://amaz0n-secure.com/login within 24 hours');
      t.same(r.assessment, 'suspicious', 'assessment');
      t.assert(tier1(r).indexOf('T1-DOMAIN') >= 0, 'T1-DOMAIN missing');
    });
    t.test('B4b A lookalike brand without a lure word stays Tier 2', function () {
      var r = analyze(t, 'Amazon: see https://amaz0n-deals.com');
      t.same(tier1(r), [], 'Tier 1 without a lure word');
    });
  });

  add('Repair B5: notices are not demands', function (t) {
    var setup = window.TFS_SCOPE_SETUP;
    function scoped(text) {
      var r = engine().analyze(text, setup.storeFor('approved'), { declaredChannel: 'text', today: '2026-10-12' });
      t.assert(engine().validateResult(r), 'invalid result');
      return r;
    }
    t.test('B5a Received, completed and sent notices have no wire finding', function () {
      ['Chase: Deposit received: $500 by wire transfer. Visit https://chase.com.',
        'Chase: Transfer completed: $500 by wire transfer. Visit https://chase.com.',
        'Chase: Deposit of $500 by wire received. Visit https://chase.com.',
        'Chase: Payment sent: $500 by wire transfer. Visit https://chase.com.'].forEach(function (text) {
        var r = scoped(text);
        t.same(flagIds(r), [], 'flags for "' + text + '"');
        t.same(r.assessment, 'details_match', 'assessment for "' + text + '"');
      });
    });
    t.test('B5b Instructions to deposit or transfer stay flagged', function () {
      ['Chase: Deposit $500 by wire today. Visit https://chase.com.',
        'Chase: Transfer $500 by wire transfer today. Visit https://chase.com.'].forEach(function (text) {
        var r = scoped(text);
        t.assert(flagIds(r).indexOf('crypto_or_wire') >= 0, 'wire flag missing for "' + text + '"');
        t.assert(r.assessment !== 'details_match', 'Details Match for "' + text + '"');
      });
    });
  });

  add('Repair B6: long input stays fast', function (t) {
    t.test('B6 20,000 characters of "we ask you to send " finish within 1.5 seconds', function () {
      var text = new Array(1100).join('we ask you to send ').slice(0, 20000);
      var start = performance.now();
      analyze(t, text);
      var ms = performance.now() - start;
      t.assert(ms < 1500, 'took ' + Math.round(ms) + ' ms');
    });
  });

  add('Repair B8: lookalike email addresses', function (t) {
    t.test('B8 An email with a lookalike letter shows its encoded domain', function () {
      var r = analyze(t, 'Chase: reply to support@chаse.com');
      t.assert(r.checks.some(function (c) { return c.target === 'support@chаse.com (support@xn--chse-63d.com)'; }), 'encoded email missing: ' + r.checks.map(function (c) { return c.target; }).join(', '));
      r = analyze(t, 'Chase: reply to support@chase.com');
      t.assert(r.checks.some(function (c) { return c.target === 'support@chase.com'; }), 'plain email changed');
    });
  });

  add('Repair B10: demo verdicts and the real list\'s "chase"', function (t) {
    // The fixture store (tests/cases.js) lists "chase" as a plain alias, so lowercase "chase"
    // is a sender there. data/store.js lists it as a strict alias: only "Chase" counts.
    var CHANNEL = { Text: 'text', Email: 'email', 'Not sure': 'unknown' };
    var EXPECTED = { bank: 'suspicious', code: 'suspicious', phone: 'insufficient_evidence', support: 'suspicious',
      toll: 'suspicious', family: 'suspicious', delivery: 'insufficient_evidence' };
    t.test('B10a Every demo gives its hand-decided verdict on the real list', function () {
      t.same(Object.keys(window.demoScenarios).sort(), Object.keys(EXPECTED).sort(), 'demo list');
      Object.keys(EXPECTED).forEach(function (key) {
        var demo = window.demoScenarios[key];
        var r = analyze(t, demo.input, window.TFS_STORE, { declaredChannel: CHANNEL[demo.channelLabel], policies: window.TFS_POLICIES });
        t.same(r.assessment, EXPECTED[key], 'demo ' + key);
      });
    });
    t.test('B10b Lowercase "chase" names no sender on the real list', function () {
      var a = window.TFS.attributeSender('chase: your statement is ready.', window.TFS_STORE.orgs);
      t.same(a.orgId, null, 'lowercase chase');
      t.same(window.TFS.attributeSender('Chase: your statement is ready.', window.TFS_STORE.orgs).orgId, 'chase', 'capitalized Chase');
    });
  });
})();
