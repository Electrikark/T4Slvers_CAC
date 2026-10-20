/* Repairs found by the engine inspection (docs/decisions/engine-defect-repairs.md).
   Expectations were decided by hand before each fix. R1–R4 and R6 use the real
   (unreviewed) list or fictional records; R5 checks the annotation model. */
(function () {
  var add = window.TFS_PHASE2.add;
  function engine() { return window.TfsEngine; }
  function analyze(t, text, store) {
    var r = engine().analyze(text, store || window.TFS_STORE, { declaredChannel: 'text' });
    t.assert(engine().validateResult(r), 'invalid result for "' + text + '"');
    return r;
  }
  function flagIds(r) { return r.requestRisk.flags.map(function (f) { return f.id; }); }
  function tier1(r) {
    return r.evidence.findings.filter(function (f) { return f.tier === 1 && f.status === 'established'; }).map(function (f) { return f.ruleId; });
  }
  function words(r) { return [r.description, r.meaning].concat(r.actionWarnings, r.nextSteps, r.checks.map(function (c) { return c.detail; })).join(' '); }

  add('Repair R1: code advice is not secrecy', function (t) {
    t.test('R1a "Do not share this" after a named code is advice, not secrecy', function () {
      [
        'Your verification code is 482913. Do not share this with anyone.',
        'Your PIN is 4417. Don’t share this with anybody.',
        'Here is your one-time password: 5521. Never share this with anyone.',
        'Use code 7730 to sign in, do not share this with anyone.'
      ].forEach(function (text) {
        var r = analyze(t, text);
        t.assert(flagIds(r).indexOf('secrecy') < 0, 'secrecy flagged for "' + text + '"');
        t.assert(r.assessment !== 'suspicious', 'suspicious for "' + text + '"');
      });
    });
    t.test('R1b Secrecy without a named code is still flagged', function () {
      [
        'Please wire $800 to help me. Don’t tell Mom.',
        'I need $500 for bail. Keep this between us.',
        'I need $500 for bail. Do not share this with anyone.',
        // A code two sentences back does not reach the secrecy line.
        'Your code is 4417. I need money for bail. Do not share this with anyone.'
      ].forEach(function (text) {
        t.assert(flagIds(analyze(t, text)).indexOf('secrecy') >= 0, 'secrecy missed for "' + text + '"');
      });
    });
  });

  add('Repair R2: similar-looking addresses', function (t) {
    var SOFT = function (a, b) { return a + ' looks similar to ' + b + '. We can’t tell whether it belongs to them.'; };
    t.test('R2a Tier 2 similarity uses softer wording and names no implicit sender', function () {
      [
        ['Visit https://medicaid.gov for your renewal.', 'medicaid.gov', 'medicare.gov', 'Medicare'],
        ['Visit https://mymedicare.gov to see your claims.', 'mymedicare.gov', 'medicare.gov', 'Medicare'],
        ['Switch to usmobile.com today.', 'usmobile.com', 't-mobile.com', 'T-Mobile'],
        ['Your bill is at https://connect.comcast.net.', 'connect.comcast.net', 'comcast.com', 'Comcast']
      ].forEach(function (row) {
        var r = analyze(t, row[0]);
        // The rules still run; only the wording and the sender inference change.
        t.assert(r.checks.some(function (c) { return c.status === 'CONTRADICTS' && c.target === row[1]; }), 'similarity check missing for ' + row[1]);
        t.same(tier1(r), [], 'no Tier 1 for ' + row[1]);
        t.assert(r.actionWarnings.indexOf(SOFT(row[1], row[2])) >= 0, 'soft wording missing for ' + row[1]);
        t.assert(words(r).indexOf('Do not open or reply to ' + row[1]) < 0, 'hard warning for ' + row[1]);
        t.same(r.claimSource, 'none', 'implicit sender from a lookalike ' + row[1]);
        t.same(r.claimedIdentity, 'Not stated', 'claimed identity for ' + row[1]);
        t.assert(r.nextSteps.join(' ').indexOf(row[3]) < 0, 'next steps name ' + row[3] + ' for ' + row[1]);
      });
    });
    t.test('R2b Tier 1 address tricks keep the strong warning', function () {
      [
        ['Chase: sign in at https://chаse.com', 'chаse.com (xn--chse-63d.com)'],
        ['Chase: confirm at https://chase.com.account-verify.net', 'chase.com.account-verify.net'],
        ['Chase: Sign in at chase-secure-login.net to restore access.', 'chase-secure-login.net']
      ].forEach(function (row) {
        var r = analyze(t, row[0]);
        t.assert(tier1(r).indexOf('T1-DOMAIN') >= 0, 'T1-DOMAIN missing for ' + row[1]);
        t.assert(r.actionWarnings.some(function (w) { return w.indexOf('Do not open or reply to ' + row[1] + '.') === 0; }), 'strong warning missing for ' + row[1]);
        t.assert(words(r).indexOf('looks similar to') < 0, 'soft wording on a Tier 1 trick ' + row[1]);
      });
    });
    t.test('R2c A reviewed address still names its implicit sender', function () {
      var r = analyze(t, 'Visit https://chase.com.', window.TFS_SCOPE_SETUP.storeFor('approved'));
      t.same(r.claimSource, 'implicit', 'implicit sender from a reviewed address');
    });
  });

  add('Repair R3: requests after a name or "Grandma,"', function (t) {
    var setup = window.TFS_SCOPE_SETUP;
    function scoped(text, state) {
      var r = engine().analyze(text, setup.storeFor(state), { declaredChannel: 'text', today: '2026-10-12' });
      t.assert(engine().validateResult(r), 'invalid result for "' + text + '"');
      return r;
    }
    t.test('R3a Addressed gift-card and code requests are Tier 1', function () {
      [
        ['Grandma, buy me gift cards for my birthday and text me the codes', 'T1-GIFT', 'gift cards'],
        ['Grandpa, purchase two Google Play cards and send me the codes.', 'T1-GIFT', 'Google Play cards'],
        ['Maria, buy 3 Apple gift cards and text me the numbers on the back.', 'T1-GIFT', 'gift cards'],
        ['Grandma,\nbuy me gift cards and send me the codes', 'T1-GIFT', 'gift cards'],
        ['Mom, send me the code that just came to your phone.', 'T1-CODE', null],
        ['Hi Mom, please read me the code from the text you just got.', 'T1-CODE', null]
      ].forEach(function (row) {
        ['none', 'approved'].forEach(function (state) {
          var r = scoped(row[0], state);
          t.same(r.assessment, 'suspicious', state + ' record, "' + row[0] + '"');
          var found = r.requestRisk.established.filter(function (e) { return e.ruleId === row[1]; });
          t.assert(found.length, row[1] + ' missing for "' + row[0] + '"');
          // The disclosure points at the gift cards named earlier, and every span is the person's text.
          if (row[2]) t.assert(found.some(function (e) { return e.antecedent && e.antecedent.quote === row[2]; }), 'gift-card antecedent for "' + row[0] + '"');
          r.evidence.findings.forEach(function (f) {
            if (f.span) t.same(row[0].slice(f.span.start, f.span.end), f.span.quote, 'source span in "' + row[0] + '"');
          });
        });
      });
    });
    t.test('R3b An approved contact never turns an addressed demand into Details Match', function () {
      var r = scoped('Chase: Grandma, buy me gift cards and text me the codes. Visit https://chase.com.', 'approved');
      t.same(r.assessment, 'suspicious', 'approved record with a demand');
    });
    t.test('R3c Negated, reported and ordinary family messages stay quiet', function () {
      [
        'Grandma, don’t buy gift cards for anyone who calls and asks for the codes.',
        'Grandma, never send anyone the codes from gift cards.',
        'A scam text might say "Grandma, buy me gift cards and text me the codes."',
        'Mom, I bought you a gift card for your birthday. The code is on the back.',
        'Grandma, thanks for the birthday card, the kids loved it, send my love to Grandpa.',
        'Mom, call me when you land.',
        'Dad, the garage code is 4412, don’t forget it.'
      ].forEach(function (text) {
        ['none', 'approved'].forEach(function (state) {
          var r = scoped(text, state);
          t.same(tier1(r), [], 'Tier 1 for "' + text + '"');
          t.assert(r.assessment !== 'suspicious', 'suspicious for "' + text + '"');
        });
      });
    });
  });

  add('Repair R4: named askers come from the list', function (t) {
    t.test('R4a A listed organization asking for a code is T1-CODE, as Chase already was', function () {
      [
        'Amazon asks you to read the code back to us.',
        'PayPal asks you to read the code back to us.',
        'Chase asks you to read the code back to us.'
      ].forEach(function (text) {
        [window.TFS_STORE, window.TFS_FIXTURE_STORE].forEach(function (store) {
          var r = analyze(t, text, store);
          t.assert(tier1(r).indexOf('T1-CODE') >= 0, 'T1-CODE missing for "' + text + '" (' + store.version + ')');
        });
      });
    });
    t.test('R4b Unlisted, reporting, negated and conditional askers stay quiet', function () {
      [
        'My neighbor asks you to read the code back to us.',
        'Scammers posing as Amazon ask you to read the code back to them.',
        'Amazon never asks you to read the code back to us.',
        'If Amazon asks you to read the code back, hang up.'
      ].forEach(function (text) {
        t.same(tier1(analyze(t, text)), [], 'Tier 1 for "' + text + '"');
      });
    });
  });

  add('Repair R5: lookalike letters in annotations', function (t) {
    t.test('R5a A link with a Cyrillic letter gets its T1-DOMAIN note on the pasted link', function () {
      var text = 'Chase: sign in at https://chаse.com';
      var r = analyze(t, text);
      var m = window.TFS.annotate(text, r, window.TFS_STORE);
      var note = m.notes.filter(function (n) { return n.ruleId === 'T1-DOMAIN'; })[0];
      t.assert(note, 'T1-DOMAIN note missing');
      t.same(note.kind, 'strong', 'note kind');
      var mark = m.highlights.filter(function (h) { return h.notes.indexOf(note.n) >= 0; })[0];
      t.assert(mark, 'no highlight carries the T1-DOMAIN note');
      t.same(mark.text, 'https://chаse.com', 'highlight covers the pasted link');
    });
    t.test('R5b The plain official address is not given the lookalike note', function () {
      var text = 'Chase: sign in at https://chаse.com or https://chase.com';
      var m = window.TFS.annotate(text, analyze(t, text), window.TFS_STORE);
      m.highlights.forEach(function (h) {
        if (h.text === 'https://chase.com') t.assert(h.ruleIds.indexOf('T1-DOMAIN') < 0, 'official address marked as a lookalike');
      });
    });
  });

  add('Repair R6: phone numbers this checker cannot read', function (t) {
    t.test('R6a International and lettered numbers are listed as unreadable, not missing', function () {
      [
        ['Call +44 20 7946 0958', '+44 20 7946 0958'],
        ['Call 1-800-ASK-USPS', '1-800-ASK-USPS'],
        ['USPS: Call 1-800-ASK-USPS about your parcel.', '1-800-ASK-USPS']
      ].forEach(function (row) {
        var r = analyze(t, row[0]);
        var codes = r.checks.map(function (c) { return c.code; });
        t.assert(codes.indexOf('nothing_to_check') < 0, 'said nothing to check for "' + row[0] + '"');
        var phone = r.checks.filter(function (c) { return c.code === 'phone_unreadable'; })[0];
        t.assert(phone, 'unreadable phone check missing for "' + row[0] + '"');
        t.same(phone.status, 'UNKNOWN', 'unreadable phone status');
        t.same(phone.target, row[1], 'shown number');
        t.assert(words(r).indexOf('There is no link, email address or phone number') < 0, 'false "nothing to check" wording');
        t.assert(r.assessment !== 'details_match', 'Details Match with an unreadable number');
        t.assert(r.evidence.uncertainty.some(function (u) { return /^extraction_failed:/.test(u); }), 'unreadable number not recorded as uncertainty');
      });
    });
    t.test('R6b U.S. numbers, codes, amounts and dates are unchanged', function () {
      t.same(analyze(t, 'Call 202-555-0123').checks.map(function (c) { return c.code; }), ['phone_not_on_file'], 'U.S. number');
      [
        'Your verification code is 482913.',
        'Your total is $1,250.00, due 10/19/2026.',
        'Order 123456789 has shipped.',
        'Meet me at 4 PM, room 1204.'
      ].forEach(function (text) {
        t.same(analyze(t, text).checks.map(function (c) { return c.code; }), ['nothing_to_check'], 'checks for "' + text + '"');
      });
    });
  });
})();
