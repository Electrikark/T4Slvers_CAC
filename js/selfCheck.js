/* "I checked it myself": the person's own independent check, recorded after a result.
   The app never confirms a sender. This step reports what the person found out
   through contact details they already had, and it never changes the assessment.
   window.TfsSelfCheck = { METHODS, ANSWERS, methodsFor(result), outcome(method, answer, result) } */
(function (root) {
  'use strict';

  // How the person checked. Only contact details they had before the message count.
  const METHODS = {
    card: { label: 'I called a number I already had', hint: 'From my card, bill or statement', independent: true,
      did: 'by calling a number you already had' },
    // Typing an address does not make it independent: it must be one they knew before the message.
    app: { label: 'I used the official app or a website I already knew', hint: 'One I knew before this message arrived', independent: true,
      did: 'through the official app or a website you already knew' },
    known_person: { label: 'I called the person on a number I know', hint: 'For a message from family or a friend', independent: true,
      did: 'by calling a number you already knew for them' },
    message: { label: 'I used a number, link or address from the message', hint: 'Even if I typed it in myself', independent: false },
    not_yet: { label: 'I haven’t checked yet', hint: '', independent: false }
  };

  const ANSWERS = {
    confirmed: 'They said they sent it',
    denied: 'They said they did not send it',
    unsure: 'I’m still not sure'
  };

  // Requests that no real organization makes, whoever confirms them.
  const NEVER_NORMAL = {
    'T1-GIFT': 'No real company or government office asks to be paid with gift cards or for gift-card codes.',
    'T1-CODE': 'No real company asks you to read or send a sign-in code, PIN or password to someone.',
    'T1-WIRE': 'Pressure to send cryptocurrency or a wire transfer is a fraud pattern, even when the caller sounds official.',
    'T1-REMOTE': 'No real company needs control of your device because of a message they sent.',
    'T1-CALLBACK': 'Real device warnings do not ask you to call a phone number.'
  };

  // Report before deleting: a deleted text can no longer be forwarded.
  const REPORT = 'First, report it: forward a fake text to 7726 (SPAM), and report fraud at reportfraud.ftc.gov.';
  const PAID = 'If you already shared information or paid, call your bank right away and ask a trusted person for help.';

  const tier1Rules = result => [...new Set(((result && result.evidence && result.evidence.findings) || [])
    .filter(f => f.tier === 1 && f.status === 'established').map(f => f.ruleId))];

  // The choices, with this message's own contact details named in the one that does not count.
  function methodsFor(result) {
    const addresses = [...new Set(((result && result.checks) || []).map(c => c.target).filter(Boolean))];
    return Object.entries(METHODS).map(([id, m]) => ({
      id,
      label: m.label,
      hint: id === 'message' && addresses.length ? `Such as ${addresses.slice(0, 2).join(' or ')}, even if I typed it in myself` : m.hint,
      independent: m.independent
    }));
  }

  // Returns { kind, title, lines }. answer is ignored for methods that end the check early.
  function outcome(method, answer, result) {
    const m = METHODS[method];
    if (!m) throw new Error('Unknown check method: ' + method);
    if (method === 'not_yet') {
      return { kind: 'not_yet', title: 'Take your time',
        lines: ['Call the number on your card, bill or statement, or open the company’s app yourself.',
          'For a message from family, call the number you already have for them.',
          'Then come back and tell us what you found out.'] };
    }
    if (!m.independent) {
      return { kind: 'not_independent', title: 'That check does not count yet',
        lines: ['A number, link or address from the message can lead straight back to whoever sent it, even if you typed it in yourself.',
          'Check again using contact details you had before this message arrived.'] };
    }
    if (!Object.prototype.hasOwnProperty.call(ANSWERS, answer)) throw new Error('Unknown check answer: ' + answer);
    if (answer === 'denied') {
      return { kind: 'not_them', title: 'They did not send this message',
        lines: [REPORT, 'Then delete it. Do not reply or use anything in it.', PAID] };
    }
    if (answer === 'unsure') {
      return { kind: 'still_unsure', title: 'Keep pausing',
        lines: ['Do not act on the message until someone you reached on your own confirms it.',
          'It is fine to ask a trusted person to help you check.'] };
    }
    const rules = tier1Rules(result);
    const never = rules.map(id => NEVER_NORMAL[id]).filter(Boolean);
    if (never.length) {
      return { kind: 'confirmed_but_risky', title: 'Be careful: this request is never normal',
        lines: never.concat(['If someone “confirmed” this request, you may have reached the fraudster. Hang up and call the number on your card or statement.']) };
    }
    const lines = ['This confirmation comes from your own check, not from this app.'];
    if (rules.includes('T1-DOMAIN')) {
      lines.push('The link in the message still imitates another website. Do not use it, even if the message itself is real.');
    }
    lines.push(method === 'known_person'
      ? 'Keep talking with them on the number you already know.'
      : 'To act on it, use the official app or a website you already knew, not anything in the message.');
    return { kind: 'confirmed', title: 'You confirmed this ' + m.did, lines };
  }

  root.TfsSelfCheck = { METHODS, ANSWERS, methodsFor, outcome };
})(typeof window !== 'undefined' ? window : globalThis);
