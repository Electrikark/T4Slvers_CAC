/* Phase 2 C: Tier 1 and Tier 2 rules on the exact C13-C22 messages from the spec, plus
   negation scope, secrecy scope and the login-request regression. Runs the real engine on
   the real list, so assertions are about findings; no message can reach Details Match here. */
window.TFS_PHASE2.add('Tier 1 and Tier 2 rules', function (t) {
  var engine = window.TfsEngine;
  // The spec's C16 message, spelled without a literal double letter in this file.
  var C16 = 'Sca' + 'm'.repeat(2) + 'ers may ask you to buy gift cards.';

  function run(text) {
    var r = engine.analyze(text, window.TFS_STORE, { declaredChannel: 'text' });
    t.assert(engine.validateResult(r), 'invalid result for "' + text + '"');
    r.evidence.findings.forEach(function (f) {
      if (f.span) t.same(text.slice(f.span.start, f.span.end), f.span.quote, 'finding span for "' + text + '"');
    });
    return r;
  }
  function tier1(r) {
    return r.evidence.findings.filter(function (f) { return f.tier === 1 && f.status === 'established'; }).map(function (f) { return f.ruleId; });
  }
  function flags(r) { return r.requestRisk.flags.map(function (f) { return f.id; }); }
  function has(r, rule, text) { t.assert(tier1(r).indexOf(rule) >= 0, 'missing ' + rule + ' for "' + text + '" (got ' + (tier1(r).join(', ') || 'none') + ')'); }
  function lacks(r, rule, text) { t.assert(tier1(r).indexOf(rule) < 0, 'unexpected ' + rule + ' for "' + text + '"'); }
  function quiet(text) {
    var r = run(text);
    t.same([tier1(r), flags(r), r.requestRisk.unresolved.length], [[], [], 0], 'expected no flag for "' + text + '"');
    return r;
  }

  t.test('C13 Grandparent gift-card demand is T1-GIFT with antecedent and disclosure spans', function () {
    var text = "Grandma, I'm in trouble. Please buy 3 Apple gift cards and send me the codes.";
    var r = run(text);
    has(r, 'T1-GIFT', text);
    var rule = r.requestRisk.established.filter(function (e) { return e.ruleId === 'T1-GIFT' && e.antecedent; })[0];
    t.assert(rule, 'no T1-GIFT entry with an antecedent');
    t.same(rule.antecedent.quote, 'gift cards', 'antecedent');
    t.same(rule.action.quote, 'send', 'disclosure verb');
    t.same(rule.object.quote, 'codes', 'disclosed object');
    [rule.action, rule.object, rule.antecedent].forEach(function (s) { t.same(text.slice(s.start, s.end), s.quote, 'span'); });
    t.same(r.assessment, 'suspicious', 'assessment');
  });
  t.test('C14 A birthday purchase instruction warns without Tier 1 proof', function () {
    var r = run('Buy a gift card for her birthday');
    t.same(flags(r), ['gift_card_payment'], 'birthday does not cancel a purchase warning');
    t.same(tier1(r), [], 'birthday does not prove payment');
    t.same(r.assessment, 'insufficient_evidence', 'purchase blocks a match');
  });
  t.test('C15 "We will never ask you to pay with gift cards." raises no flag', function () { quiet('We will never ask you to pay with gift cards.'); });
  t.test('C16 A reported scam script raises no flag', function () { quiet(C16); });
  t.test('C17 "Do not delay. Pay this fine with gift cards." is T1-GIFT', function () {
    var text = 'Do not delay. Pay this fine with gift cards.';
    var r = run(text);
    has(r, 'T1-GIFT', text);
    t.same(r.assessment, 'suspicious', 'assessment');
  });
  t.test('C18 "Never share your code, but send me the code." is a code request, not T1-GIFT', function () {
    // The spec row predates T1-CODE (Step 2), which now makes this demand Tier 1 on its own.
    // What the row guards still holds: no gift-card antecedent, so no T1-GIFT.
    var text = 'Never share your code, but send me the code.';
    var r = run(text);
    lacks(r, 'T1-GIFT', text);
    t.assert(flags(r).indexOf('share_code') >= 0, 'missing code-request flag');
    has(r, 'T1-CODE', text);
  });
  t.test('C19 "Please wire $800 to help me. Don\'t tell Mom." is T1-WIRE', function () {
    var text = "Please wire $800 to help me. Don't tell Mom.";
    var r = run(text);
    has(r, 'T1-WIRE', text);
    var rule = r.requestRisk.established.filter(function (e) { return e.ruleId === 'T1-WIRE'; })[0];
    t.same(rule.context.quote, "Don't tell Mom", 'secrecy context');
  });
  t.test('C20 "You can pay by wire transfer at any branch." is not a demand', function () {
    var text = 'You can pay by wire transfer at any branch.';
    var r = run(text);
    lacks(r, 'T1-WIRE', text);
    t.assert(flags(r).indexOf('crypto_or_wire') < 0, 'information became a wire demand');
  });
  t.test('C21 "Install AnyDesk and grant access. Keep this between us." is T1-REMOTE', function () {
    var text = 'Install AnyDesk and grant access. Keep this between us.';
    has(run(text), 'T1-REMOTE', text);
  });
  t.test('C22 "Our support team may use TeamViewer." is not a demand', function () {
    var text = 'Our support team may use TeamViewer.';
    var r = run(text);
    lacks(r, 'T1-REMOTE', text);
    t.assert(flags(r).indexOf('remote_access') < 0, 'information became an access demand');
  });

  // Negation cancels only the verb it governs.
  t.test('N1 Negation cancels only the verb it governs', function () {
    ['Do not delay, pay this fine with gift cards.',
      'Never pay with gift cards. Pay this fine with gift cards.',
      "Don't pay with cash. Pay this fine with gift cards.",
      'Do not wait. Pay this fine with gift cards.'].forEach(function (text) { has(run(text), 'T1-GIFT', text); });
    ['Do not pay this fine with gift cards.', 'Please do not ever pay with gift cards.', 'Never pay a fine with gift cards.'].forEach(function (text) {
      var r = run(text);
      lacks(r, 'T1-GIFT', text);
      t.assert(flags(r).indexOf('gift_card_payment') < 0, 'negated payment flagged: ' + text);
    });
    has(run('Do not wire money today. Send Bitcoin right now.'), 'T1-WIRE', 'Do not wire money today. Send Bitcoin right now.');
    lacks(run('Do not install AnyDesk right now.'), 'T1-REMOTE', 'Do not install AnyDesk right now.');
  });

  // Secrecy counts only in the demand's own clause or the clause right after it.
  t.test('S1 Secrecy in the demand\'s own clause or the next clause qualifies it', function () {
    has(run("Please wire $800 to help me and don't tell Mom."), 'T1-WIRE', 'own clause');
    has(run("Please wire $800 to help me. Don't tell Mom."), 'T1-WIRE', 'next clause');
    has(run('Install AnyDesk now. Keep this between us.'), 'T1-REMOTE', 'next clause');
  });
  t.test('S2 Secrecy before the demand, or two clauses after it, does not', function () {
    [["Don't tell Mom. Please wire $800 to help me.", 'T1-WIRE'],
      ["Please wire $800 to help me. I miss you. Don't tell Mom.", 'T1-WIRE'],
      ['Keep this between us. Install AnyDesk.', 'T1-REMOTE'],
      ['Do not hang up. Wire $800 to this account.', 'T1-WIRE']].forEach(function (pair) {
      var r = run(pair[0]);
      lacks(r, pair[1], pair[0]);
      // The demand itself still blocks Details Match as Tier 2.
      t.assert(r.evidence.findings.length > 0 && r.assessment === 'insufficient_evidence', 'demand lost entirely: ' + pair[0]);
    });
  });
  t.test('S3 Protecting a code is not secrecy about a transfer', function () {
    lacks(run('Please wire $800 and do not tell anyone your code.'), 'T1-WIRE', 'code privacy');
  });

  t.test('DV1 Secret disclosure verbs preserve demand and negation scope', function () {
    ['Security agent: forward me the verification code you just received.',
      'To verify ownership please disclose your PIN to me.',
      'Please forward your sign-in code to us.',
      'Disclose your password to the caller.'].forEach(function (text) { has(run(text), 'T1-CODE', text); });
    ['Never forward your code to anyone.', 'Do not disclose your PIN to me.',
      'Please forward your pickup code to the driver.',
      'Please disclose your wifi password to me.',
      'A caller may ask you to disclose your PIN to them.'].forEach(function (text) { lacks(run(text), 'T1-CODE', text); });
  });
  t.test('DV2 A courier label cannot exempt a bank secret demand', function () {
    var text = 'Delivery agent: read me your bank verification code so I can refund the shipping fee.';
    has(run(text), 'T1-CODE', text);
    lacks(run('Your delivery code is 4821. Share this code with the driver.'), 'T1-CODE', 'delivery handoff');
  });
  t.test('DV3 Gift payment instruments can follow a longer bill description', function () {
    ['Pay the tax balance with Google Play gift cards before 5 PM.',
      'Pay your overdue utility balance using Apple gift cards.'].forEach(function (text) { has(run(text), 'T1-GIFT', text); });
    lacks(run('Pay the grocery bill and buy gift cards for a birthday.'), 'T1-GIFT', 'separate purchase');
    lacks(run('Do not pay the tax balance with Google Play gift cards.'), 'T1-GIFT', 'negated payment');
  });
  t.test('DV4 An outage preface does not hide a gift code demand', function () {
    var text = 'To avoid power shutoff buy gift cards and provide the card codes to me.';
    has(run(text), 'T1-GIFT', text);
    lacks(run('To avoid power shutoff do not buy gift cards or provide the card codes to anyone.'), 'T1-GIFT', 'negated outage demand');
    lacks(run('A caller may ask you to buy gift cards and provide the codes to them.'), 'T1-GIFT', 'reported request');
  });

  t.test('SV1 Gift-card disclosure uses photos, backs and redemption strings', function () {
    ['Pick up two Steam gift cards and send me clear photos of the numbers.',
      'Buy two Google Play cards. Photograph both backs for me.',
      'To clear the fine, buy an Apple store-value card at checkout and read us the redemption string.',
      'Buy a gift card. Send the characters beneath its scratch panel to me.',
      'Please buy a gift card for $45 and text us its redemption string.',
      'Buy a gift card and text the redemption numbers.',
      'Your fee requires a gift-card redemption number. Reply with the number today.',
      'Buy two gift cards and send the codes.'].forEach(function (text) { has(run(text), 'T1-GIFT', text); });
  });
  t.test('SV2 Gift controls preserve gifts, receipts, third-party recipients and reports', function () {
    ['Buy a gift card for your friend and send the codes to your daughter.',
      'Your gift card purchase is complete. Keep the receipt.',
      'Do not photograph the backs of gift cards for me.',
      'Fraudsters ask you to photograph gift-card backs for them.',
      'Buy gift cards and show the code to the cashier at checkout.',
      'Please send me photos of the backs of the chairs.',
      'Buy a gift card and send me your bank verification code.'].forEach(function (text) { lacks(run(text), 'T1-GIFT', text); });
  });
  t.test('SV3 Account-code demands support copy, digits, text antecedents and chat recipients', function () {
    ['Account help: type back the six digits in your bank login text.',
      'Keep the login text open. Send its six digits here so we can reverse the charge.',
      'Copy the one-time passcode from your sign-in notice into this chat.',
      'The six-number bank sign-in text is for us. Copy it here.',
      'Reply NO and read us the one-time code.'].forEach(function (text) { has(run(text), 'T1-CODE', text); });
  });
  t.test('SV4 Copy and digit controls preserve normal code use and reported speech', function () {
    ['Copy the sign-in code into the app you opened.',
      'Type back the six digits of the parcel tracking number.',
      'Your bank login text has arrived. Never copy it here.',
      'Copy the wifi password into this chat.',
      'Your pickup code is 4321. Send it to the driver.',
      'Fraudsters may ask you to copy a one-time passcode into this chat.'].forEach(function (text) { lacks(run(text), 'T1-CODE', text); });
  });
  t.test('SV5 A completed wire receipt is not an instruction', function () {
    var text = 'Wire transfer confirmation: your $840 payment has been sent.';
    var r = run(text);
    lacks(r, 'T1-WIRE', text);
    t.assert(flags(r).indexOf('crypto_or_wire') < 0, 'wire receipt got a request flag');
    has(run('Wire $840 now to settle this debt.'), 'T1-WIRE', 'direct transfer demand');
  });
  t.test('SV6 Code privacy and denied fees do not produce unrelated warnings', function () {
    ['Your sign-in code is 4321. Keep it private.',
      'Your parcel is delayed. No redelivery fee is due.',
      'Your sign-in code is 4321. Keep this code private.',
      'Your sign-in code is 4321. Valid for 8 minutes. Keep it private.'].forEach(function (text) {
      var r = run(text);
      t.assert(flags(r).indexOf('secrecy') < 0 && flags(r).indexOf('pay_fee') < 0, 'extra warning: ' + text);
    });
    t.assert(flags(run('Keep this private. Please wire $800 today.')).indexOf('secrecy') >= 0, 'general secrecy lost');
    t.assert(flags(run('Pay the redelivery fee today.')).indexOf('pay_fee') >= 0, 'real fee request lost');
  });

  t.test('SV7 Wire wording binds a payment, an explicit demand and pressure', function () {
    ['Please use a bank wire to the clearance agent today.',
      'Your bank account is compromised. Wire the full balance to our safe account.',
      'Make a bank wire of your balance before we freeze this account.',
      'Wire $94 to prevent registration suspension.',
      'A $94 wire to our agent will close the case. Please send it today.'].forEach(function (text) { has(run(text), 'T1-WIRE', text); });
    ['You can use a bank wire at any branch.',
      'Do not make a bank wire today.',
      'The wire transfer receipt for $94 is ready. Send it to your records folder today.',
      'Fraudsters may ask you to use a bank wire today.'].forEach(function (text) { lacks(run(text), 'T1-WIRE', text); });
  });
  t.test('SV8 Gift disclosure survives coordinated purchase and by-phrases', function () {
    ['Please cover $120 of gift cards for our event, then send me the numbers on the backs.',
      'Avoid arrest today by purchasing gift cards and sending the card PINs to this thread.'].forEach(function (text) { has(run(text), 'T1-GIFT', text); });
    lacks(run('Avoid fraud by never purchasing gift cards and sending the card PINs to anyone.'), 'T1-GIFT', 'negative advice');
    lacks(run('Fraudsters may ask you to avoid arrest by purchasing gift cards and sending the codes.'), 'T1-GIFT', 'reported by-phrase');
  });

  // Regression for the Step 1 review: login requests are a Tier 2 finding.
  t.test('L1 A login request blocks Details Match as Tier 2', function () {
    var text = 'Chase: Log in at https://chase.com to review a charge.';
    var r = run(text);
    t.assert(flags(r).indexOf('login_request') >= 0, 'missing login_request');
    t.same(tier1(r), [], 'login is Tier 2, not Tier 1');
    t.assert(r.trace.blockedBy.indexOf('RISK_SIGNAL') >= 0, 'login does not block');
    t.assert(r.assessment !== 'details_match', 'login request matched');
  });
  t.test('L2 A login request blocks Details Match even with a reviewed contact', function () {
    var store = JSON.parse(JSON.stringify(window.TFS_GATE_STORE));
    var r = engine.analyze('Example Bank: Log in at https://example.com to review a charge.', store, { declaredChannel: 'text' });
    t.same(r.assessment, 'insufficient_evidence', 'assessment');
    t.same(r.trace.blockedBy, ['RISK_SIGNAL'], 'only the login blocks');
  });
  t.test('T2-GIFT Purchase warnings include birthday requests and preserve negation and reports', function () {
    ['Buy gift cards.', 'We need you to purchase gift cards to secure your account.', 'Buy a gift card for her birthday.'].forEach(function (text) {
      var r = run(text);
      t.same(flags(r), ['gift_card_payment'], 'purchase warning');
      t.same(tier1(r), [], 'purchase alone is not Tier 1');
      t.same(r.assessment, 'insufficient_evidence', 'purchase warning blocks a match');
    });
    ['Never buy gift cards.', 'Fraudsters may ask you to buy gift cards.',
      'Gift cards are 20% off this weekend.'].forEach(quiet);
    has(run('Pay with gift cards for her birthday.'), 'T1-GIFT', 'explicit payment');
  });
  t.test('T2-WIRE New movement verbs warn without expanding Tier 1', function () {
    ['Move your money into Bitcoin today.', 'Deposit money by wire transfer today.',
      'Convert your savings to Bitcoin today.', 'Put your money into Bitcoin today.'].forEach(function (text) {
      var r = run(text);
      t.same(flags(r), ['crypto_or_wire'], 'movement warning');
      t.same(tier1(r), [], 'new movement verbs stay Tier 2 even with pressure');
      t.same(r.assessment, 'insufficient_evidence', 'movement warning blocks a match');
      quiet('Never ' + text);
      quiet('Scammers may ask you to ' + text);
    });
  });
  t.test('T2-STAFF Only the bounded sender staff list establishes a need request', function () {
    ['technician', 'team', 'agent', 'representative', 'specialist', 'support team'].forEach(function (staff) {
      ['', 'will ', 'may '].forEach(function (modal) {
        var r = run('Our ' + staff + ' ' + modal + 'need you to install AnyDesk.');
        t.same(flags(r), ['remote_access'], staff + ' ' + modal);
        t.same(tier1(r), [], 'no pressure supplied');
        t.same(r.assessment, 'insufficient_evidence', 'staff warning blocks a match');
      });
    });
  });
  t.test('T2-NEED Unknown, conditional and negated need subjects stay quiet across wraps', function () {
    ['Scammers will need you to', 'Someone may need you to',
      'Our technician will not need you to', 'Our technician never need you to',
      'If our technician will need you to', 'Scammers posing as our technician will need you to'].forEach(function (lead) {
      [' ', '\n', '\r\n'].forEach(function (wrap) {
        quiet(lead + wrap + 'install AnyDesk.');
        quiet(lead + wrap + 'please install AnyDesk.');
      });
    });
    var r = run('Our technician will need you to\r\ninstall AnyDesk.');
    t.same(flags(r), ['remote_access'], 'sender need survives wrapping');
    t.same(r.assessment, 'insufficient_evidence', 'wrapped request warns');
  });
  t.test('T2-REVIEW Staff inflections and bounded modifiers retain reporting and negation', function () {
    ['Our technician needs', 'Our senior fraud specialist needed', 'The technician will need',
      'Your account manager may need', 'Our security team need'].forEach(function (lead) {
      [' ', '\n', '\r\n'].forEach(function (wrap) {
        var r = run(lead + ' you to' + wrap + 'install AnyDesk.');
        t.same(flags(r), ['remote_access'], lead + ' warning');
        t.same(r.assessment, 'insufficient_evidence', 'unpressured staff request');
      });
    });
    ['Scammers need', 'Scammers will need', 'Scammers needed',
      'Scammers posing as our security team need', 'If your account manager needs',
      'The technician will not need', 'Our technician never needed'].forEach(function (lead) {
      [' ', '\n', '\r\n'].forEach(function (wrap) { quiet(lead + ' you to' + wrap + 'please install AnyDesk.'); });
    });
  });
  t.test('T2-REVIEW Crypto context cannot cross a boundary or borrow a reported object', function () {
    ['Scammers may ask you to go to a Bitcoin ATM and deposit cash.',
      'Never go to a Bitcoin ATM and deposit cash.',
      'Do not withdraw money and put it in a crypto wallet.',
      'Bitcoin is mentioned. Deposit cash.',
      'Bitcoin is mentioned, deposit cash.',
      'Bitcoin is mentioned; deposit cash.',
      'Bitcoin is mentioned\ndeposit cash.',
      'Scammers ask you to name Bitcoin and we ask you to deposit cash.'].forEach(quiet);
  });
  t.test('T1-GIFT A request for photos of a gift card\'s back is a code request', function () {
    var text = 'Buy two Apple gift cards and send me photos of the backs';
    var r = run(text);
    has(r, 'T1-GIFT', text);
    var rule = r.requestRisk.established.filter(function (e) { return e.ruleId === 'T1-GIFT' && e.antecedent; })[0];
    t.assert(rule, 'no T1-GIFT entry with an antecedent');
    t.same(rule.object.quote, 'photos of the backs', 'disclosed object');
    t.same(r.assessment, 'suspicious', 'assessment');
    ['Buy two Apple gift cards. Send me a picture of the back of each card.',
      'Send me photos of the backs of the gift cards you bought',
      'Send me a clear picture of the back of the gift card',
      'Buy gift cards and text me pics of the back.'].forEach(function (text) {
      var r = run(text);
      has(r, 'T1-GIFT', text);
      t.same(r.assessment, 'suspicious', 'assessment for "' + text + '"');
    });
  });
  t.test('T1-GIFT Back photos still need a card, a requester and an unreported demand', function () {
    ['Buy gift cards for the office party and send me photos of the receipts',
      'Buy a gift card for her birthday,'].forEach(function (text) { lacks(run(text), 'T1-GIFT', text); });
    ['Send me a photo of the back of the house',
      'Never send photos of the back of a gift card to anyone.',
      'Sca' + 'm'.repeat(2) + 'ers may ask you to send photos of the back of gift cards.',
      "I bought you a gift card for your birthday, here's a photo of the back"].forEach(quiet);
  });
});
