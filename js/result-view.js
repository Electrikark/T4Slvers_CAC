/* Presentation only. Keep every supported behavior; group only by protective action.
   Never change the engine assessment, evidence, or trace. */
(function (root) {
  'use strict';
  const ACTIONS = {
    codes: ['Keep the code private', 'Do not send or read out a sign-in code, PIN, or password. Contact the service through its official app or a number you already have.'],
    gifts: ['Keep gift cards and their codes', 'Do not buy gift cards for this request or share their numbers or codes. Check with the person using a number you already know.'],
    money: ['Pause before paying', 'Do not send money until you check the request through a contact method you already trust. For a family emergency, call the person on their saved number.'],
    device: ['Keep control of your device', 'Do not install remote-access software or let the requester control your device. Use a support contact you already trust.'],
    private: ['Protect your personal details', 'Do not enter passwords, card details, or personal information through the message. Open the official app or a website you already know.'],
    contact: ['Check through another route', 'Do not use links, reply addresses, or phone numbers in this message. Use an official app or contact details you had before it arrived.'],
    pressure: ['Pause and check with someone you trust', 'Take your time. Talk to someone you already know; do not keep the request secret. Use a number you already have.']
  };
  const FLAGS = {
    share_code: ['codes', 'Asks you to share a code or password'],
    gift_card_purchase: ['gifts', 'Asks you to buy gift cards for the requester'],
    gift_card_payment: ['gifts', 'Asks for payment with gift cards'],
    gift_card_disclosure: ['gifts', 'Asks you to share gift-card numbers or codes'],
    crypto_or_wire: ['money', 'Requests payment by cryptocurrency or wire transfer'],
    peer_payment: ['money', 'Requests money through a payment app'],
    pay_fee: ['money', 'Requests a fee or fine'],
    secret_emergency_money: ['money', 'Requests emergency money and asks you to keep it secret'],
    family_emergency: ['contact', 'Claims a family member is in trouble'],
    new_number: ['contact', 'Claims someone you know has a new phone number'],
    remote_access: ['device', 'Asks for access to or control of your device'],
    credential_request: ['private', 'Asks for personal or login details'],
    login_request: ['private', 'Asks you to sign in to an account'],
    financial_callback: ['contact', 'Asks you to call about a payment or account alert'],
    tech_support_call: ['contact', 'Asks you to call about a device alarm'],
    callback_now: ['contact', 'Asks you to call a number'],
    device_alarm: ['contact', 'Claims there is a problem with your device'],
    account_locked: ['contact', 'Claims an account is locked or suspended'],
    prize_refund: ['contact', 'Mentions a prize or refund'],
    urgency: ['pressure', 'Pressures you to act quickly'],
    secrecy: ['pressure', 'Asks you to keep it secret'],
    arrest_threat: ['pressure', 'Threatens arrest or legal action']
  };
  const RULES = {
    'T1-GIFT': 'gifts', 'T1-WIRE': 'money', 'T1-CODE': 'codes',
    'T1-REMOTE': 'device', 'T1-CALLBACK': 'contact', 'T1-DOMAIN': 'contact',
    'T1-COMBO': 'money', 'T1-POLICY': 'contact'
  };
  const POLICY_ACTIONS = {
    request_code_disclosure: 'codes', request_personal_data: 'private',
    request_payment_gift_card: 'gifts', request_payment_wire_crypto: 'money',
    request_remote_access: 'device', request_move_money: 'money'
  };
  const unique = list => [...new Set(list)];
  function titleForMatch(result) {
    const names = { link: 'Website address', email: 'Email domain', phone: 'Phone number' };
    const kinds = unique(result.evidence.contacts.map(c => c.support.target.kind));
    return kinds.map((kind, i) => {
      const count = result.evidence.contacts.filter(c => c.support.target.kind === kind).length;
      const name = names[kind] || 'Contact detail';
      return (i ? name.toLowerCase() : name) + (count > 1 ? (kind === 'link' ? 'es' : 's') : '');
    }).join(' and ') + (result.evidence.contacts.length === 1 ? ' matches' : ' match') + ' our records';
  }
  function build(result, text) {
    const groups = new Map();
    const add = (key, reason, words, sourceId) => {
      if (!groups.has(key)) groups.set(key, { id: key, title: (ACTIONS[key] || ACTIONS.contact)[0], action: (ACTIONS[key] || ACTIONS.contact)[1], reasons: [], quotes: [], sources: [] });
      const group = groups.get(key);
      if (reason && !group.reasons.includes(reason)) group.reasons.push(reason);
      if (words && !group.quotes.includes(words)) group.quotes.push(words);
      if (sourceId) group.sources.push(sourceId);
    };
    for (const flag of result.requestRisk.flags) {
      const entry = FLAGS[flag.id];
      add(entry ? entry[0] : 'contact', entry ? entry[1] : flag.label, flag.words, 'flag:' + flag.id);
    }
    for (const [index, finding] of result.evidence.findings.entries()) {
      const flag = FLAGS[finding.ruleId];
      const policyAction = finding.ruleId === 'T1-POLICY' && finding.support && POLICY_ACTIONS[finding.support.action];
      const key = policyAction || RULES[finding.ruleId] || (flag && flag[0]) || 'contact';
      const group = groups.get(key);
      const words = finding.span && finding.span.quote || finding.support && finding.support.target && finding.support.target.raw;
      const contact = finding.support && finding.support.target && result.evidence.contacts.find(c =>
        c.support.code === finding.support.code && c.support.target.raw === finding.support.target.raw);
      const contactDetail = contact && result.checks[contact.checkIndex].detail;
      // Established rules often duplicate a wording flag. Preserve coverage and its exact quote.
      const reason = finding.status === 'unresolved'
        ? 'A possible risky request could not be resolved from this text'
        : contactDetail || (finding.ruleId === 'T1-DOMAIN' ? 'An address uses a known imitation pattern'
        : finding.ruleId === 'T1-POLICY' ? 'The request conflicts with a reviewed policy for its claimed sender'
        : group && group.reasons.length ? null : result.description);
      add(key, reason, words, 'finding:' + index + ':' + finding.ruleId);
    }
    const limits = ['We cannot verify who sent this message. This check can miss scams.'];
    if (result.claimSource === 'implicit') limits.push('An address points to a listed organization, but the message does not explicitly name it as the sender.');
    for (const check of result.checks) {
      if (check.status === 'SUPPORTS') continue;
      // Contact gaps and input uncertainty change interpretation and always stay visible.
      if (check.code === 'ocr_text_unverified') continue;
      if (check.code === 'risk_unresolved') { limits.push(check.detail); continue; }
      if (check.status === 'CONTRADICTS') add('contact', check.detail, check.target, 'check:' + check.code);
      else limits.push(check.detail);
    }
    const matched = result.assessment === 'details_match';
    if (matched) {
      for (const check of result.checks.filter(c => c.status === 'SUPPORTS')) add('contact', check.detail, null, 'check:' + check.code);
      groups.get('contact').action += ' If someone calls about this message, hang up and call a number you already trust.';
      limits.push('Matching written details do not prove that a message is real. Pages, redirects, and hidden links were not checked.');
    }
    if (!groups.size) add('contact', 'No warning pattern was found in this text. That does not establish that the message is safe.', null, 'no-pattern');
    const risky = result.requestRisk.flags.length > 0 || result.assessment === 'suspicious';
    return {
      title: matched ? titleForMatch(result) : risky ? 'This message has warning signs' : 'There isn’t enough information',
      label: result.assessment === 'suspicious' ? 'Strong warning' : matched ? 'Written details only' : 'Check before acting',
      groups: [...groups.values()], limits: unique(limits.filter(Boolean)),
      description: matched ? 'Only the details named below matched reviewed records.' : risky ? 'Check what it asks you to do, then take the protective steps below.' : 'Use another contact method before acting on this message.',
      screenshot: result.inputSource === 'screenshot'
    };
  }
  root.TfsResultView = { build, titleForMatch };
})(typeof window !== 'undefined' ? window : globalThis);
