/* "I checked it myself": the person's own independent check, recorded after a result.
   The app never confirms a sender. This step reports what the person found out
   through contact details they already had, and it never changes the assessment.
   window.TfsSelfCheck = { METHODS, ANSWERS, outcome(method, answer, result) } */
(function (root) {
  'use strict';

  // How the person checked. Only contact details they had before the message count.
  var METHODS = {
    card: { label: 'I called a number I already had', hint: 'From my card, bill or statement', independent: true,
      did: 'by calling a number you already had' },
    app: { label: 'I used the official app or typed the website', hint: 'Not a link from the message', independent: true,
      did: 'through the official app or a website you typed yourself' },
    known_person: { label: 'I called the person on a number I know', hint: 'For a message from family or a friend', independent: true,
      did: 'by calling a number you already knew for them' },
    message: { label: 'I used a number or link from the message', hint: '', independent: false },
    not_yet: { label: 'I haven’t checked yet', hint: '', independent: false }
  };

  var ANSWERS = {
    confirmed: 'They said they sent it',
    denied: 'They said they did not send it',
    unsure: 'I’m still not sure'
  };

  // Requests that no real organization makes, whoever confirms them.
  var NEVER_NORMAL = {
    'T1-GIFT': 'No real company or government office asks to be paid with gift cards or for gift-card codes.',
    'T1-CODE': 'No real company asks you to read or send a sign-in code, PIN or password to someone.',
    'T1-WIRE': 'Pressure to send cryptocurrency or a wire transfer is a fraud pattern, even when the caller sounds official.',
    'T1-REMOTE': 'No real company needs control of your device because of a message they sent.',
    'T1-CALLBACK': 'Real device warnings do not ask you to call a phone number.'
  };

  var REPORT = 'Forward fake texts to 7726 (SPAM) and report fraud at reportfraud.ftc.gov.';
  var PAID = 'If you already shared information or paid, call your bank right away and ask a trusted person for help.';

  function tier1Rules(result) {
    var seen = [];
    ((result && result.evidence && result.evidence.findings) || []).forEach(function (f) {
      if (f.tier === 1 && f.status === 'established' && seen.indexOf(f.ruleId) < 0) seen.push(f.ruleId);
    });
    return seen;
  }

  // Returns { kind, title, lines }. answer is ignored for methods that end the check early.
  function outcome(method, answer, result) {
    var m = METHODS[method];
    if (!m) throw new Error('Unknown check method: ' + method);
    if (method === 'not_yet') {
      return { kind: 'not_yet', title: 'Take your time',
        lines: ['Call the number on your card, bill or statement, or open the company’s app yourself.',
          'For a message from family, call the number you already have for them.',
          'Then come back and tell us what you found out.'] };
    }
    if (!m.independent) {
      return { kind: 'not_independent', title: 'That check does not count yet',
        lines: ['A number or link from the message can lead straight back to whoever sent it.',
          'Check again using contact details you had before this message arrived.'] };
    }
    if (!Object.prototype.hasOwnProperty.call(ANSWERS, answer)) throw new Error('Unknown check answer: ' + answer);
    if (answer === 'denied') {
      return { kind: 'not_them', title: 'They did not send this message',
        lines: ['Delete it and do not reply or use anything in it.', REPORT, PAID] };
    }
    if (answer === 'unsure') {
      return { kind: 'still_unsure', title: 'Keep pausing',
        lines: ['Do not act on the message until someone you reached on your own confirms it.',
          'It is fine to ask a trusted person to help you check.'] };
    }
    var rules = tier1Rules(result);
    var never = rules.map(function (id) { return NEVER_NORMAL[id]; }).filter(Boolean);
    if (never.length) {
      return { kind: 'confirmed_but_risky', title: 'Be careful: this request is never normal',
        lines: never.concat(['If someone “confirmed” this request, you may have reached the fraudster. Hang up and call the number on your card or statement.']) };
    }
    var lines = ['This confirmation comes from your own check, not from this app.'];
    if (rules.indexOf('T1-DOMAIN') >= 0) {
      lines.push('The link in the message still imitates another website. Do not use it, even if the message itself is real.');
    }
    lines.push(method === 'known_person'
      ? 'Keep talking with them on the number you already know.'
      : 'To act on it, use the official app or a website you type yourself, not the links in the message.');
    return { kind: 'confirmed', title: 'You confirmed this ' + m.did, lines: lines };
  }

  root.TfsSelfCheck = { METHODS: METHODS, ANSWERS: ANSWERS, outcome: outcome };
})(typeof window !== 'undefined' ? window : globalThis);
