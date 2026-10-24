/* Courtesy words in front of an instruction (found by adversarial/run.cjs, Oct 23 2026).
   "Kindly send", "Just send" and "Please just send" are the same instruction as "Please send",
   so each must get exactly the verdict, rules and wording flags that "Please" gets.
   The controls check that a courtesy word does not create a request where there is none:
   advice, a negated request, a quoted example, a reported request, and "just" or "kindly"
   after a subject ("I just sent", "They kindly sent"). */
window.TFS_PHASE2.add('Polite wording', function (t) {
  var engine = window.TfsEngine;
  function run(text) {
    var r = engine.analyze(text, window.TFS_FIXTURE_STORE, { declaredChannel: 'text', today: '2026-10-22' });
    t.assert(engine.validateResult(r), 'invalid result: ' + text);
    r.evidence.findings.forEach(function (f) {
      if (f.span) t.same(text.slice(f.span.start, f.span.end), f.span.quote, 'original evidence');
    });
    return r;
  }
  function summary(r) {
    return {
      assessment: r.assessment,
      rules: Array.from(new Set(r.trace.rules)).sort(),
      flags: r.requestRisk.flags.map(function (f) { return f.id; }).sort()
    };
  }
  // The "Please" message must itself be Suspicious with the named rule, so a pair can never pass
  // by both sides being quiet.
  function samePolite(id, please, rule, variants) {
    t.test(id + ' ' + please, function () {
      var base = summary(run(please));
      t.same(base.assessment, 'suspicious', 'the "please" form is caught');
      t.assert(base.rules.indexOf(rule) >= 0, 'the "please" form fires ' + rule);
      variants.forEach(function (text) { t.same(summary(run(text)), base, text); });
    });
  }
  function quiet(id, text) {
    t.test(id + ' ' + text, function () {
      var r = summary(run(text));
      t.assert(r.assessment !== 'suspicious', 'not Suspicious: ' + text);
      t.same(r.rules, [], 'no Tier 1 rule: ' + text);
    });
  }

  samePolite('PW01', 'Grandma, I am in trouble. Please buy 3 Apple gift cards and send me the codes.', 'T1-GIFT', [
    'Grandma, I am in trouble. Kindly buy 3 Apple gift cards and send me the codes.',
    'Grandma, I am in trouble. Just buy 3 Apple gift cards and send me the codes.',
    'Grandma, I am in trouble. Please just buy 3 Apple gift cards and send me the codes.'
  ]);
  samePolite('PW02', 'Grandma, please buy 3 Apple gift cards and send me the codes.', 'T1-GIFT', [
    'Grandma, kindly buy 3 Apple gift cards and send me the codes.',
    'Grandma, just buy 3 Apple gift cards and send me the codes.'
  ]);
  samePolite('PW03', 'Please read me the verification code we just texted you.', 'T1-CODE', [
    'Kindly read me the verification code we just texted you.',
    'Just read me the verification code we just texted you.'
  ]);
  samePolite('PW04', 'Your computer is infected. Please install AnyDesk so our technician can fix it.', 'T1-REMOTE', [
    'Your computer is infected. Kindly install AnyDesk so our technician can fix it.',
    'Your computer is infected. Just install AnyDesk so our technician can fix it.'
  ]);
  samePolite('PW05', 'IRS final notice: your tax debt is overdue. Please send the payment by wire transfer today to avoid arrest.', 'T1-WIRE', [
    'IRS final notice: your tax debt is overdue. Kindly send the payment by wire transfer today to avoid arrest.',
    'IRS final notice: your tax debt is overdue. Just send the payment by wire transfer today to avoid arrest.',
    'IRS final notice: your tax debt is overdue. Please just send the payment by wire transfer today to avoid arrest.',
    'IRS final notice: your tax debt is overdue. Kindly please send the payment by wire transfer today to avoid arrest.'
  ]);
  samePolite('PW06', 'IRS final notice: Could you send the payment by wire transfer today to avoid arrest.', 'T1-WIRE', [
    'IRS final notice: Could you kindly send the payment by wire transfer today to avoid arrest.',
    'IRS final notice: Would you be so kind as to send the payment by wire transfer today to avoid arrest.',
    'IRS final notice: I would appreciate it if you could send the payment by wire transfer today to avoid arrest.',
    'IRS final notice: I’d appreciate it if you would send the payment by wire transfer today to avoid arrest.'
  ]);
  samePolite('PW07', 'Our technician needs you to please download AnyDesk now.', 'T1-REMOTE', [
    'Our technician needs you to kindly download AnyDesk now.',
    'Our technician needs you to just download AnyDesk now.'
  ]);
  // A text message wrapped right after the courtesy word.
  samePolite('PW09', 'Our technician needs you to please\ndownload AnyDesk now.', 'T1-REMOTE', [
    'Our technician needs you to kindly\ndownload AnyDesk now.'
  ]);
  samePolite('PW10', 'Amazon asks you to please\nbuy gift cards for the refund and send the codes.', 'T1-GIFT', [
    'Amazon asks you to kindly\nbuy gift cards for the refund and send the codes.'
  ]);
  samePolite('PW08', 'Your computer is locked. Please call Microsoft support at 1-888-555-0199 now.', 'T1-CALLBACK', [
    'Your computer is locked. Kindly call Microsoft support at 1-888-555-0199 now.',
    'Your computer is locked. Just call Microsoft support at 1-888-555-0199 now.'
  ]);

  // Advice and ordinary requests.
  quiet('PW20', 'Kindly call the number on the back of your card if you have questions.');
  quiet('PW21', 'Just text me when you get home from the store.');
  quiet('PW22', 'Kindly read the attached newsletter before Sunday.');
  // Negated.
  quiet('PW23', 'Never kindly send money by wire transfer to anyone who calls you.');
  quiet('PW24', 'Do not just send the payment by wire transfer because someone calls.');
  quiet('PW25', 'We will never ask you to kindly read us a verification code.');
  // Quoted and reported.
  quiet('PW26', 'Scammers say: "Kindly buy 3 Apple gift cards and send me the codes."');
  quiet('PW27', 'Fraudsters may ask you to kindly install AnyDesk.');
  quiet('PW28', 'Fraudsters may ask you to just send the payment by wire transfer.');
  // A subject before "just" or "kindly": a statement, not an instruction.
  quiet('PW29', 'I just sent the payment by wire transfer this morning, thanks!');
  quiet('PW30', 'I just read the code you mailed me and it worked.');
  quiet('PW31', 'They kindly sent us the wire transfer receipt yesterday.');
  quiet('PW32', 'I went to the bank and just sent the payment by wire transfer.');
  quiet('PW33', 'I want to just send you the birthday money by wire transfer.');
});
