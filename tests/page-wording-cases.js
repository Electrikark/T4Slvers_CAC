/* Result wording from the third inspection pass: explanations name the evidence that blocked a
   match, steps fit messages from people as well as organizations, and the page never shows the
   store's internal review note. Expectations were decided by hand before the wording changed. */
(function () {
  var add = window.TFS_PHASE2.add;
  var TODAY = '2026-10-19';
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  // The real list with one fictional reviewed record, so Details Match can be reached.
  function reviewedStore() {
    var store = copy(window.TFS_STORE);
    store.orgs.filter(function (o) { return o.id === 'chase'; })[0].humanReview = {
      reviewer: 'Test fixture (fictional record)', date: '2026-10-12', reviewDue: '2099-12-31', sourceUrl: 'https://example.invalid/fixture-record'
    };
    return store;
  }
  function analyze(t, text, store) {
    var r = window.TfsEngine.analyze(text, store || window.TFS_STORE, { declaredChannel: 'text', today: TODAY });
    t.assert(window.TfsEngine.validateResult(r), 'invalid result for "' + text + '"');
    return r;
  }
  function has(list, words) { return list.some(function (line) { return line.indexOf(words) >= 0; }); }

  add('Result wording: evidence, people and reporting', function (t) {
    var TRUSTED_PERSON = 'It’s fine to ask someone you trust, such as a family member, friend or caregiver, to look at it with you.';
    var REPORT = 'You can report it: forward a fake text to 7726 (SPAM), and report fraud at reportfraud.ftc.gov.';

    t.test('W1 An unlisted address next to a matching one is named in the explanation', function () {
      var r = analyze(t, 'Chase: Pay your balance at https://chase.com or at https://quickpay-now.top', reviewedStore());
      t.same(r.assessment, 'insufficient_evidence', 'assessment');
      t.assert(r.description.indexOf('Some contact details match our stored list, but at least one does not.') === 0, 'description: ' + r.description);
      t.assert(r.meaning.indexOf('quickpay-now.top is not on our list for this sender.') === 0, 'meaning: ' + r.meaning);
      var two = analyze(t, 'Chase: Pay at https://quickpay-now.top or https://pay-desk.top', reviewedStore());
      t.assert(two.meaning.indexOf('quickpay-now.top and pay-desk.top are not on our list') === 0, 'plural meaning: ' + two.meaning);
    });

    t.test('W2 A message that names no organization is not answered as if it did', function () {
      var r = analyze(t, 'See you at lunch Sunday. Call me at 916-555-0100 when you leave.');
      t.assert(has(r.nextSteps, 'Contact the person or organization using contact details you had before this message'), 'person-or-organization step missing');
      t.assert(!has(r.nextSteps, 'Contact the organization using'), 'organization-only step');
    });

    t.test('W3 Suspicious results say how to report; other results do not', function () {
      t.assert(analyze(t, window.demoScenarios.bank.input).nextSteps.indexOf(REPORT) >= 0, 'report step missing on Suspicious');
      t.assert(analyze(t, window.demoScenarios.phone.input).nextSteps.indexOf(REPORT) < 0, 'report step on Insufficient Evidence');
    });

    t.test('W4 Every result except Details Match invites a trusted person to help', function () {
      [window.demoScenarios.bank.input, window.demoScenarios.phone.input, 'See you at lunch Sunday.'].forEach(function (text) {
        t.assert(analyze(t, text).nextSteps.indexOf(TRUSTED_PERSON) >= 0, 'trusted-person step missing for "' + text + '"');
      });
      var match = analyze(t, 'Chase: Your statement is ready. View it at https://www.chase.com/statements', reviewedStore());
      t.same(match.assessment, 'details_match', 'fixture should match');
      t.assert(match.nextSteps.indexOf(TRUSTED_PERSON) < 0, 'trusted-person step on Details Match');
    });

    t.test('W5 Details Match warns that a call about the message may not be real', function () {
      var match = analyze(t, 'Chase: Did you make a $742.19 purchase? Reply YES or NO. Details at chase.com', reviewedStore());
      t.same(match.assessment, 'details_match', 'fixture should match');
      t.assert(has(match.actionWarnings, 'If someone calls you about this message, hang up and call the number on your card or statement yourself.'), 'call-back warning missing');
    });

    t.test('W6 Review status is plain words, never the store\'s internal note', function () {
      var r = analyze(t, 'Chase: Your statement is ready at https://chase.com');
      var source = r.checks[0].source;
      t.assert(source.indexOf('No person has reviewed it yet') >= 0, 'plain review status missing: ' + source);
      t.assert(!/Claude|automated check by/i.test(source), 'internal review note shown: ' + source);
    });
  });
})();
