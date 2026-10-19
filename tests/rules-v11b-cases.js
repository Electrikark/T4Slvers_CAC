/* Oct 18 follow-up fixes for F2, F3 and F4, written before the code change.
   Constructed cases, not dev or test corpus rows. */
window.TFS_PHASE2.add('Rule fixes v1.1b', function (t) {
  var engine = window.TfsEngine, store = window.TFS_STORE;
  function analyze(text) {
    var r = engine.analyze(text, store, { declaredChannel: 'text', today: '2026-10-18' });
    t.assert(engine.validateResult(r), 'invalid result: ' + text);
    r.requestRisk.established.forEach(function (f) {
      ['action', 'object', 'clause', 'context', 'antecedent'].forEach(function (key) {
        if (f[key]) t.same(text.slice(f[key].start, f[key].end), f[key].quote, key + ' exact source');
      });
    });
    return r;
  }
  function has(r, rule) { return r.evidence.findings.some(function (f) { return f.ruleId === rule && f.tier === 1 && f.status === 'established'; }); }
  function positive(rule, text) {
    t.test(rule + ' catches: ' + text, function () {
      var r = analyze(text);
      t.assert(has(r, rule), 'missing ' + rule);
      t.same(r.assessment, 'suspicious', 'assessment');
    });
  }
  function negative(text) {
    t.test('stays non-suspicious: ' + text, function () {
      t.assert(analyze(text).assessment !== 'suspicious', 'legitimate control became suspicious');
    });
  }

  // F2b: order, renewal and subscription charges with a denial or cancel cue.
  ['Amazon: Your order of iPhone 15 for $1,299 has been placed. If you did not place this order call 1-888-555-0177 immediately.',
    'Your annual renewal of $399.99 was charged today. To cancel and get a refund call 1-805-555-0133.',
    'Norton: your subscription auto-renewed for $289. If you did not authorize this, call 1-844-555-0161.',
    'Charge of $732.69 was attempted at Target on your card. Not yours, 866-555-0156'
  ].forEach(function (text) { positive('T1-CALLBACK', text); });
  ['Your order #4471 has shipped. Questions? Call 1-800-555-0123.',
    'Your subscription renews on Nov 3. Manage it in the app.',
    'Thanks for your purchase! Questions about your order? Call 1-888-555-0190.',
    'If you did not place this order, call the number on the back of your card.',
    'Your order was placed. Not you? Sign in to the app you already use to review it.'
  ].forEach(negative);

  // F3b: purchase for the sender. An excuse or an outside purpose qualifies;
  // a pay-back promise qualifies only when no personal occasion is named.
  ['I’m in a meeting, can you grab 3 Google Play cards for a client? Will reimburse you today.',
    'Can you go get some gift cards? I will reimburse later.',
    'I’m in a meeting and need help getting some Amazon Gift Cards.',
    'Please pick up five Apple gift cards for the staff. I’m tied up on a call.'
  ].forEach(function (text) { positive('T1-GIFT', text); });
  ['Can you pick up a Target gift card for Grandma’s birthday? I’ll pay you back Sunday.',
    'Could you grab an Amazon gift card for the wedding? I will reimburse you.',
    'Can you get a Starbucks gift card for your teacher for Christmas? I’ll pay you back.',
    'I need help getting a gift card balance checked.'
  ].forEach(negative);

  // F4b: money that is needed (not only requested), wider secrecy and emergency words.
  ['Grandpa it’s Josh, I got arrested and need $3000 for bail right now. Please don’t tell my parents.',
    'Grandma, this is Sam. I was in an accident and need bail money. Please don’t tell Dad yet.',
    'Grandma, it’s me. I’m in a terrible mess and need money today. Please don’t tell Mom; I’ll explain later.',
    'Gran please help. I need money before tonight and can’t talk. Keep this between us until I get home.'
  ].forEach(function (text) { positive('T1-COMBO', text); });
  ['Don’t tell Mom about the surprise party, can you send $20 for the cake?',
    'Keep this between us, but Dad’s birthday is coming. Can you chip in $30 for his gift? Need it by Friday!',
    'I don’t need money, just call me. Don’t tell Mom I was in an accident, I’m fine.',
    'Scammers say "I need money for bail, don’t tell your parents."',
    'I need money for groceries this week. Don’t tell anyone, it’s embarrassing.'
  ].forEach(negative);
});
