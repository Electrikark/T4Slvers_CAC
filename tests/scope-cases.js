/* Reporting scope: a warning word cannot erase an independent demand.
   These cases exercise the real engine and assert both findings and assessment. */
window.TFS_PHASE2.add('Reporting scope', function (t) {
  var cases = [
    { id: 'RS1', text: 'Fraudsters may ask you to pay with gift cards.',
      flags: [], rules: [], assessment: 'insufficient_evidence' },
    { id: 'RS2', text: 'Watch for texts telling you to wire money.',
      flags: [], rules: [], assessment: 'insufficient_evidence' },
    { id: 'RS3', text: 'To avoid fraudsters, pay with gift cards.',
      flags: ['gift_card_payment'], rules: ['T1-GIFT'], assessment: 'suspicious' },
    { id: 'RS4', text: 'Criminals are active, so send the fee by wire.',
      flags: ['crypto_or_wire'], rules: [], assessment: 'insufficient_evidence' },
    { id: 'RS5', text: 'Beware of scams. Pay with gift cards today.',
      flags: ['gift_card_payment'], rules: ['T1-GIFT'], assessment: 'suspicious' },
    { id: 'RS6', text: 'Pay with gift cards today, beware of fraudsters.',
      flags: ['gift_card_payment'], rules: ['T1-GIFT'], assessment: 'suspicious' },
    { id: 'RS7', text: 'To avoid fraudsters, pay by wire transfer.',
      flags: ['crypto_or_wire'], rules: [], assessment: 'insufficient_evidence' },
    { id: 'RS8', text: 'Pay by wire transfer today, beware of fraudsters.',
      flags: ['crypto_or_wire'], rules: ['T1-WIRE'], assessment: 'suspicious' }
  ];

  function check(c) {
    var r = window.TfsEngine.analyze(c.text, window.TFS_STORE, { declaredChannel: 'text' });
    t.same(r.requestRisk.flags.map(function (f) { return f.id; }).sort(), c.flags.slice().sort(), c.text + ' flags');
    t.same(r.requestRisk.established.map(function (f) { return f.ruleId; }).filter(function (id, i, all) {
      return all.indexOf(id) === i;
    }).sort(), c.rules.slice().sort(), c.text + ' Tier 1 rules');
    t.same(r.assessment, c.assessment, c.text + ' assessment');
    t.assert(window.TfsEngine.validateResult(r), c.text + ' invalid result');
    r.requestRisk.flags.forEach(function (f) {
      t.same(c.text.slice(f.start, f.end), f.words, 'flag source span');
    });
    r.requestRisk.established.forEach(function (finding) {
      ['action', 'clause', 'object', 'context', 'antecedent'].forEach(function (key) {
        var s = finding[key];
        if (s) t.same(c.text.slice(s.start, s.end), s.quote, key + ' source span');
      });
    });
  }

  cases.forEach(function (c) { t.test(c.id + ' ' + c.text, function () { check(c); }); });

  t.test('RS9 A listed Chase address cannot cancel a gift-card demand', function () {
    check({ text: 'Chase: To avoid fraudsters, pay with gift cards. Visit https://chase.com.',
      flags: ['gift_card_payment'], rules: ['T1-GIFT'], assessment: 'suspicious' });
  });
  t.test('RS10 Asking verbs, inflections and modals keep reported demands quiet', function () {
    ['ask', 'tell', 'demand', 'request', 'instruct', 'urge', 'pressure', 'want'].forEach(function (verb) {
      var ing = verb.replace(/e$/, '') + 'ing';
      ['Fraudsters ' + verb, 'A fraudster ' + verb + 's', 'Watch for texts ' + ing].forEach(function (lead) {
        check({ text: lead + ' you to please pay with gift cards.',
          flags: [], rules: [], assessment: 'insufficient_evidence' });
      });
      ['may', 'might', 'will', 'often', 'could'].forEach(function (modal) {
        check({ text: 'Fraudsters ' + modal + ' ' + verb + ' you to please pay with gift cards.',
          flags: [], rules: [], assessment: 'insufficient_evidence' });
      });
    });
    ['Fraudsters demand: please pay with gift cards.',
      'Fraudsters tell you that you must pay with gift cards.',
      'Fraudsters request that you pay with gift cards.',
      'Fraudsters want you to pay with gift cards and please send me the codes.'].forEach(function (text) {
      check({ text: text, flags: [], rules: [], assessment: 'insufficient_evidence' });
    });
  });
  t.test('RS11 Negated asking stays quiet and cannot erase a later demand', function () {
    ['We never ask you to please pay with gift cards.', 'We will not ask you to pay with gift cards.'].forEach(function (text) {
      check({ text: text, flags: [], rules: [], assessment: 'insufficient_evidence' });
    });
    check({ text: 'We never ask you to pay with gift cards, so pay with gift cards today.',
      flags: ['gift_card_payment'], rules: ['T1-GIFT'], assessment: 'suspicious' });
  });
  t.test('RS12 A reporting verb cannot reach across an independent instruction', function () {
    ['Fraudsters ask you to read the warning, so pay with gift cards.',
      'Fraudsters ask you to read the warning and you must pay with gift cards.',
      'To avoid fraudsters asking for money, pay with gift cards.',
      'Pay with gift cards, beware of fraudsters asking for money.'].forEach(function (text) {
      check({ text: text, flags: ['gift_card_payment'], rules: ['T1-GIFT'], assessment: 'suspicious' });
    });
  });
  t.test('RS13 Quoted multi-sentence examples stay quiet', function () {
    check({ text: 'Fraudsters say "Pay with gift cards. Wire money today."',
      flags: [], rules: [], assessment: 'insufficient_evidence' });
  });
  t.test('RS14 Scope also applies to login, code, remote-access and callback demands', function () {
    [
      { text: 'Log in at the link, beware of fraudsters.', flags: ['login_request'], rules: [], assessment: 'insufficient_evidence' },
      { text: 'Send me the code, beware of fraudsters.', flags: ['share_code'], rules: ['T1-CODE'], assessment: 'suspicious' },
      { text: 'Install AnyDesk today, beware of fraudsters.', flags: ['remote_access'], rules: ['T1-REMOTE'], assessment: 'suspicious' },
      { text: 'Your computer is infected, beware of fraudsters. Call us.', flags: ['tech_support_call', 'device_alarm', 'callback_now'], rules: ['T1-CALLBACK'], assessment: 'suspicious' }
    ].forEach(check);
  });
  t.test('RS15 Reported pressure and alarms cannot qualify a separate demand', function () {
    check({ text: 'Fraudsters ask you to wire money today, please install AnyDesk.',
      flags: ['remote_access'], rules: [], assessment: 'insufficient_evidence' });
    check({ text: 'Fraudsters ask you to say your computer is infected. Call us.',
      flags: ['callback_now'], rules: [], assessment: 'insufficient_evidence' });
  });
  t.test('RS16 Gift-card antecedents are checked at the card, not the whole clause', function () {
    check({ text: 'Fraudsters ask you to buy gift cards. Read me the code.',
      flags: ['share_code'], rules: ['T1-CODE'], assessment: 'suspicious' });
    check({ text: 'Buy gift cards, beware of fraudsters. Send me the codes.',
      flags: ['gift_card_disclosure'], rules: ['T1-GIFT'], assessment: 'suspicious' });
  });
  t.test('RS17 An asking verb alone does not make a demand reported', function () {
    check({ text: 'We ask you to please pay with gift cards.',
      flags: ['gift_card_payment'], rules: ['T1-GIFT'], assessment: 'suspicious' });
    check({ text: 'We ask you to please pay with gift cards, beware of fraudsters.',
      flags: ['gift_card_payment'], rules: ['T1-GIFT'], assessment: 'suspicious' });
  });
  t.test('RS18 A later login demand survives an earlier report in the same clause', function () {
    check({ text: 'Fraudsters ask you to please log in at a fake site, please log in at this link.',
      flags: ['login_request'], rules: [], assessment: 'insufficient_evidence' });
  });

  [
    { id: 'RS19', text: 'Due to the holiday we ask you to please pay with gift cards today.',
      flags: ['gift_card_payment'], rules: ['T1-GIFT'], assessment: 'suspicious' },
    { id: 'RS20', text: 'Due to fraudsters we ask you to please pay with gift cards today.',
      flags: ['gift_card_payment'], rules: ['T1-GIFT'], assessment: 'suspicious' },
    { id: 'RS21', text: 'Fraudsters are active and Chase asks you to please send the fee by wire transfer today.',
      flags: ['crypto_or_wire'], rules: ['T1-WIRE'], assessment: 'suspicious' },
    { id: 'RS22', text: 'Fraudsters may ask you to please pay with gift cards today.',
      flags: [], rules: [], assessment: 'insufficient_evidence' },
    { id: 'RS23', text: 'Scammers often ask you to please pay with gift cards today.',
      flags: [], rules: [], assessment: 'insufficient_evidence' }
  ].forEach(function (c) { t.test(c.id + ' ' + c.text, function () { check(c); }); });

  t.test('RS24 A new asker breaks the reporting link', function () {
    ['Fraudsters are active and we ask', 'Fraudsters are active and our team asks',
      'Fraudsters may call but Chase asks', 'Watch for messages while our team asks'].forEach(function (lead) {
      check({ text: lead + ' you to please pay with gift cards today.',
        flags: ['gift_card_payment'], rules: ['T1-GIFT'], assessment: 'suspicious' });
    });
  });
  t.test('RS25 Only the listed subject modifiers keep the asking link', function () {
    ['may', 'might', 'will', 'could', 'can', 'would', 'often', 'sometimes', 'usually', 'also', 'typically',
      'may also', 'who call', 'who calls', 'who text', 'who texts', 'who call will sometimes'].forEach(function (modifier) {
      check({ text: 'Fraudsters ' + modifier + ' ask you to please pay with gift cards.',
        flags: [], rules: [], assessment: 'insufficient_evidence' });
    });
    check({ text: 'Fraudsters appear to ask you to please pay with gift cards.',
      flags: ['gift_card_payment'], rules: ['T1-GIFT'], assessment: 'suspicious' });
  });
  t.test('RS26 Existing warning and negation examples remain quiet', function () {
    ['Fraudsters may ask you to pay with gift cards.',
      'Scammers often tell victims to buy gift cards.',
      'Watch out for messages asking you to install AnyDesk.',
      'Chase will never ask you to read back a code.',
      'Fraudsters will ask you, sometimes politely, to pay with gift cards.'].forEach(function (text) {
      check({ text: text, flags: [], rules: [], assessment: 'insufficient_evidence' });
    });
  });

  ['Due to fraudsters', 'Due to delays', 'Because of fraudsters', 'Because of delays',
    'After fraudsters call', 'After the holiday'].forEach(function (lead, index) {
    t.test('RS' + (27 + index) + ' ' + lead + ' introduces a direct demand', function () {
      check({ text: 'Chase: ' + lead + ', pay with gift cards. Visit https://chase.com.',
        flags: ['gift_card_payment'], rules: ['T1-GIFT'], assessment: 'suspicious' });
    });
  });
  t.test('RS33 Introductory phrases do not cancel negation', function () {
    ['Due to fraudsters', 'Because of delays', 'After the holiday'].forEach(function (lead) {
      check({ text: lead + ', never pay with gift cards.',
        flags: [], rules: [], assessment: 'insufficient_evidence' });
    });
  });
  t.test('RS34 Described warning subjects and recipient nouns remain reported', function () {
    ['Scammers posing as Chase may ask you to',
      'Fraudsters pretending to be the IRS may demand that you',
      'Scam callers may ask you to', 'Criminals often ask victims to',
      'Scammers claiming to be Chase may ask seniors to',
      'Scammers impersonating Chase may ask customers to'].forEach(function (lead) {
      check({ text: lead + ' please pay with gift cards.',
        flags: [], rules: [], assessment: 'insufficient_evidence' });
    });
  });
  t.test('RS35 A subject description cannot swallow a new asker', function () {
    ['Scammers posing as Chase are active and we ask',
      'Fraudsters pretending to be the IRS are active and Chase asks',
      'Scammers impersonating Chase and our team ask'].forEach(function (lead) {
      check({ text: lead + ' you to pay with gift cards.',
        flags: ['gift_card_payment'], rules: ['T1-GIFT'], assessment: 'suspicious' });
    });
  });
  t.test('RS36 A coordinated alarm report retains its asker until a new subject', function () {
    // The alarm is said, not asked: its existing Tier 2 flag remains; the callback is reported.
    check({ text: 'Fraudsters may say your computer is infected and ask you to call them at (888) 555-0199.',
      flags: ['device_alarm'], rules: [], assessment: 'insufficient_evidence' });
    check({ text: 'Fraudsters may say your computer is infected and we ask you to call us at (888) 555-0199.',
      flags: ['tech_support_call', 'device_alarm', 'callback_now'], rules: ['T1-CALLBACK'], assessment: 'suspicious' });
  });
});
