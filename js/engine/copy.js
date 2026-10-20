/* All the plain-language wording the person reads.
   For every string: short sentences, no jargon, and never "safe", "verified" or "legitimate". */
(function (root) {
  'use strict';
  const T = root.TFS = root.TFS || {};

  const orgName = org => org ? org.displayName : 'the sender';

  // How a contact is written back to the person: the Unicode form of a lookalike host shows its trick.
  function shown(target) {
    if (!target) return '';
    if (target.kind === 'phone') return target.display;
    if (target.kind === 'email') return target.raw;
    return target.hostUnicode && target.hostUnicode !== target.host ? `${target.hostUnicode} (${target.host})` : target.host || target.raw;
  }

  // One or two sentences per check, for "What we found".
  function checkDetail(check, ctx) {
    const t = shown(check.target);
    const org = check.orgId ? T.orgById(ctx.store, check.orgId) : null;
    switch (check.code) {
      case 'domain_official':
        return check.target.kind === 'email'
          ? `The domain after @ in ${t} matches a website address on file for ${orgName(org)}. This does not prove the email came from that sender.`
          : `${t} matches a website address on file for ${orgName(org)}. The page, redirects, and sender have not been checked.`;
      case 'phone_official':
        return `${t} is on our list of official numbers for ${orgName(org)}.`;
      case 'shortener_unresolvable':
        return `${t} is a short link. This offline checker does not resolve its destination.`;
      case 'user_content_platform':
        return `${t} belongs to ${orgName(org)}, but anyone can publish a page there, so it does not show who sent this.`;
      case 'userinfo_trick':
        return `This link is built to look like ${check.lookalikeOf}, but browsers ignore everything before the @ sign. It really goes to ${check.registrable}.`;
      case 'domain_belongs_to_other_org':
        return `The message says it is from ${orgName(ctx.claimOrg)}, but ${t} belongs to ${orgName(org)}.`;
      case 'official_domain_as_subdomain':
        return `${t} starts with ${check.lookalikeOf}, but the real website is ${check.registrable}. The end of an address decides where it goes.`;
      case 'homoglyph':
        return `${t} looks like ${check.lookalikeOf}, but some of its letters are different characters that only look the same.`;
      case 'same_label_other_tld':
        return `${t} uses the same name as ${check.lookalikeOf} with a different ending. That address is not on our list.`;
      case 'typosquat':
        return `${t} is ${check.distance === 1 ? 'one letter' : 'two letters'} away from ${check.lookalikeOf}. Copycat sites use small spelling changes.`;
      case 'brand_in_foreign_domain':
        return `${t} contains the name "${check.brandWord}", but it is not one of the official addresses we have for ${orgName(org)}.`;
      case 'ip_host':
        return `This link goes to a number address (${t}) instead of a named website. Large organizations do not ask you to sign in that way.`;
      case 'not_in_official_list':
        return `${t} is not on our list for ${orgName(org)}. Our list may be incomplete, so this alone does not establish a conflict.`;
      case 'reference_needs_review':
        return `${t} is listed for ${orgName(org)}, but its source record still needs review. We cannot count it as a match.`;
      case 'input_incomplete':
        return 'Part of this input exceeds the checker’s limits. A partial check cannot establish a full match. Paste a shorter message or one complete link.';
      case 'risk_unresolved':
        return 'A requested action has more than one possible meaning. This uncertainty blocks a contact-details match.';
      case 'phone_not_on_file':
        return `${t} is not on our list${org ? ' for ' + orgName(org) : ''}. That alone does not mean it is fake.`;
      case 'free_email_address':
        return `${t} is a free email account. Anyone can create one with any name.`;
      case 'no_claimed_identity':
        return `The message does not name an organization we know, and ${t} is not on our list.`;
      case 'phone_unreadable':
        return `${t} looks like a phone number, but this checker reads only U.S. and Canadian numbers written in digits. It was not compared with any list.`;
      case 'link_unreadable':
        return 'We could not read this link: ' + check.target.raw;
      case 'nothing_to_check':
        return 'There is no link, email address or phone number in this message to check.';
      default:
        return 'No details for this check.';
    }
  }

  const ADDRESS_CODES = ['domain_official', 'domain_belongs_to_other_org', 'not_in_official_list', 'reference_needs_review',
    'user_content_platform', 'brand_in_foreign_domain', 'typosquat', 'same_label_other_tld', 'homoglyph',
    'official_domain_as_subdomain', 'userinfo_trick'];

  // Where a check's facts came from, for "About this check".
  function checkSource(check, ctx) {
    const version = ` (list version ${ctx.store.version || 'unknown'})`;
    if (ADDRESS_CODES.includes(check.code)) {
      const org = check.orgId ? T.orgById(ctx.store, check.orgId) : null;
      const listed = org ? `Local list: ${org.displayName} → ${org.officialDomains.join(', ')}` : 'Reference list';
      return listed + version + (org && org.verifiedBy ? '. Review status: ' + org.verifiedBy : '');
    }
    if (check.code === 'phone_official' || check.code === 'phone_not_on_file') return 'Reference list of official phone numbers' + version;
    if (check.code === 'shortener_unresolvable') return 'List of known link shorteners' + version;
    if (check.code === 'free_email_address') return 'List of free email providers' + version;
    return 'Tech for Silvers checker';
  }

  // Each wording warning: its short label, and the advice shown under "What to do next".
  const FLAGS = {
    gift_card_payment: { label: 'Payment with gift cards', advice: 'Do not send gift card numbers to someone demanding payment. Contact the organization independently.' },
    gift_card_disclosure: { label: 'Sending gift-card numbers or codes', advice: 'Do not send or read gift-card numbers, PINs, or codes to the requester. Check with the person through a number you already trust.' },
    crypto_or_wire: { label: 'Payment by crypto or wire transfer', advice: 'Requests to pay with cryptocurrency, a crypto ATM or a wire transfer are a frequent scam pattern.' },
    tech_support_call: { label: 'Calling a number about a device alarm', advice: 'Real device warnings do not ask you to call a phone number. Do not call it. Use a support contact you already trust.' },
    share_code: { label: 'Sharing a code or password', advice: 'Keep sign-in codes private. Do not read or send them to a caller, even if they say they work for your bank.' },
    remote_access: { label: 'Control of your device', advice: 'Do not let anyone you did not contact yourself control your computer or phone.' },
    arrest_threat: { label: 'A threat of arrest or legal action', advice: 'A threat of arrest or legal action is a reason to pause and contact the office independently.' },
    secrecy: { label: 'Keeping it secret', advice: 'Being told to keep something secret from your family or your bank is a warning sign.' },
    family_emergency: { label: 'A family member in trouble', advice: 'If someone says they are family and in trouble, check with that person through a number you already know.' },
    new_number: { label: 'A new phone number for someone you know', advice: 'If someone says they have a new number, call the number you already have for them before you reply or send anything.' },
    pay_fee: { label: 'Paying a fee or fine', advice: 'Be careful with surprise fees, fines or tolls that must be paid through a link.' },
    urgency: { label: 'Acting fast', advice: 'Pressure to act fast is a warning sign. Take your time.' },
    account_locked: { label: 'A locked or suspended account', advice: 'Messages about a locked or suspended account are often used to rush people.' },
    device_alarm: { label: 'An alarm about your device', advice: 'Do not call a number shown in an unexpected device-warning pop-up. Use a support contact you already trust.' },
    credential_request: { label: 'Confirming personal or login details', advice: 'Do not enter passwords, card numbers or your Social Security number from a link in a message.' },
    login_request: { label: 'Signing in to an account', advice: 'Do not sign in through a link or address in a message. Open the official app or type a website you already know.' },
    prize_refund: { label: 'A prize or refund', advice: 'Prizes and refunds you did not expect are a frequent lure.' },
    callback_now: { label: 'Calling a number now', advice: 'Call back only on a number you already trust, not the one in the message.' },
    peer_payment: { label: 'Sending money by app', advice: 'Payments by Zelle, Venmo or Cash App are hard to get back. Only send money to people you know.' }
  };

  // Plain words for each Tier 1 rule, used to name the request itself.
  const RULE_ASKS = {
    'T1-GIFT': 'asks you to pay with gift cards or share gift-card codes',
    'T1-WIRE': 'pressures you to send cryptocurrency or a wire transfer',
    'T1-REMOTE': 'pressures you to let someone control your device',
    'T1-CODE': 'asks you to give a sign-in code, PIN or password to the sender',
    'T1-DOMAIN': 'uses a link or address built to imitate a known organization',
    'T1-CALLBACK': 'warns about your device and pressures you to call a number',
    'T1-POLICY': 'does something its claimed sender has said it never does'
  };

  // What each policy action means, for notes about a broken organization policy.
  const POLICY_ACTIONS = {
    link_present: 'include a link',
    request_code_disclosure: 'ask for a code this way',
    request_personal_data: 'ask for personal or account details this way',
    request_payment_gift_card: 'ask for payment with gift cards',
    request_payment_wire_crypto: 'ask for payment by wire transfer or cryptocurrency',
    request_remote_access: 'ask to control your device',
    threaten_arrest_or_penalty: 'threaten arrest or penalties this way',
    request_move_money: 'ask you to move money',
    any_contact_on_channel: 'contact people this way'
  };

  // Fixed template per policy finding: the organization's own words, then what this message does.
  function policyNote(finding, store) {
    const org = T.orgById(store, finding.orgId);
    const name = org ? org.displayName : 'This organization';
    if (finding.action === 'link_present' && finding.serviceLabel) return `${name} says its ${finding.serviceLabel} never contain a link. This one does.`;
    return `${name} says it will never ${POLICY_ACTIONS[finding.action] || 'send a message like this'}. This message does.`;
  }

  const joinPhrases = list => list.length < 2 ? list.join('') : list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
  const conflicts = result => result.checks.filter(c => c.status === 'CONTRADICTS');

  // Why the evidence is insufficient, by the first matching reason.
  const GAP_MEANINGS = [
    ['input_incomplete', 'Some input was not inspected. Check a shorter message before drawing a conclusion.'],
    ['shortener_unresolvable', 'The destination remains unknown because this app does not follow links.'],
    ['nothing_to_check', 'Without a link, email address or phone number, there is nothing to compare. Judge it by what it asks you to do.'],
    ['phone_unreadable', 'This checker could not read a phone number in this message, so it could not compare it with any list.'],
    ['phone_not_on_file', 'This prototype has no reviewed phone list. A missing number proves nothing about the caller.'],
    ['user_content_platform', 'A page on a site where anyone can publish does not show who made it.'],
    ['reference_needs_review', 'Our list has this address, but no person has reviewed that record yet. Until someone does, it cannot count as a match.']
  ];

  // The sentence under the result title, and "What this means".
  function describe(result) {
    const codes = result.checks.map(c => c.code);
    const anySupport = result.checks.some(c => c.status === 'SUPPORTS');
    if (result.assessment === 'suspicious') {
      const asks = [];
      for (const f of result.evidence.findings) {
        const phrase = f.tier === 1 && f.status === 'established' && RULE_ASKS[f.ruleId];
        if (phrase && !asks.includes(phrase)) asks.push(phrase);
      }
      return {
        description: `This message ${asks.length ? joinPhrases(asks) : 'asks for a high-risk action'}. ${asks.length > 1 ? 'These are frequent fraud patterns.' : 'This is a frequent fraud pattern.'}`,
        meaning: anySupport
          ? 'A contact detail matches our stored list, but that cannot cancel this warning. Real addresses can be copied into a fake message. Check independently before acting.'
          : 'Check independently before acting. Use a phone number or website you already trust.'
      };
    }
    if (result.assessment === 'details_match') {
      return {
        description: 'Contact details match our stored list. We have not verified who sent this message.',
        meaning: 'This checks written address details only. It does not confirm the sender or inspect pages, redirects, or hidden links. A real address can be copied into a deceptive message.'
      };
    }
    const risky = result.requestRisk.flags.length || result.requestRisk.unresolved.length;
    const conflict = conflicts(result).length > 0;
    let description = 'We do not have enough reliable evidence for a complete assessment.';
    if (conflict) description = 'A contact detail in this message does not match our stored list. We cannot give a complete assessment.';
    else if (risky) description = 'The message contains warning signs, and we cannot give a complete assessment.';
    const gap = GAP_MEANINGS.find(([code]) => codes.includes(code));
    let meaning = gap ? gap[1] : 'Missing information is not a sign that a message is fake, and it is not a sign that it is real either.';
    if (risky) {
      meaning = anySupport
        ? 'Warning signs remain in what the message asks. Matching contact details cannot clear those signs.'
        : 'Warning signs remain in what the message asks. Judge it by those signs, not by how official it looks.';
    }
    if (conflict) meaning += ' Contact details also conflict with our stored list. That conflict blocks a match. This checker cannot resolve it from the available evidence.';
    return { description, meaning };
  }

  // The warnings, most important first: the first one is shown right under the result.
  function warnings(result, ctx) {
    const list = [];
    const flagAdvice = result.requestRisk.flags.map(f => FLAGS[f.id].advice);
    const matched = result.assessment === 'details_match';
    if (!matched) list.push("Don't use any contact information from this message, including links, email addresses, or phone numbers. Contact the person or organization using a website, app, statement, or number you already trust.");
    // Name each lookalike address so the person knows exactly what not to open. Only an address
    // trick (T1-DOMAIN) gets that warning: a merely similar name can be a real, unrelated site
    // (medicaid.gov is two letters from medicare.gov), so it gets plainer words.
    const tricks = result.evidence.findings.filter(f => f.ruleId === 'T1-DOMAIN').map(f => f.support);
    for (const c of result.evidence.contacts.map(contact => contact.support)) {
      if (c.status !== 'CONTRADICTS' || c.strength !== 'strong') continue;
      if (tricks.includes(c)) list.push(`Do not open or reply to ${shown(c.target)}. It looks like a known address but is not on our list for that organization.`);
      else if (c.lookalikeOf) list.push(`${shown(c.target)} looks similar to ${c.lookalikeOf}. We can’t tell whether it belongs to them.`);
    }
    if (!matched && result.checks.some(c => c.code === 'nothing_to_check') && (flagAdvice.length || result.requestRisk.unresolved.length)) {
      list.push('Do not act on this request until you check independently.');
    }
    for (const f of result.policy ? result.policy.findings : []) {
      if (f.status === 'established') list.push(policyNote(f, ctx.store) + ' Do not use anything in it.');
    }
    list.push(...flagAdvice);
    if (matched && !flagAdvice.length) list.push('Even when details match, never share passwords or codes.');
    return list;
  }

  // Recommend only this organization's reviewed website, without widening a path scope.
  function trustedDomain(ctx, org) {
    const record = ctx.trusted && ctx.trusted.trusted.find(r =>
      r.orgId === org.id && r.kind === 'domain' && typeof r.value === 'string' && r.value.trim() &&
      (!r.scope.pathPrefix || r.scope.pathPrefix === '/'));
    return record ? record.value : null;
  }

  function nextSteps(result, ctx) {
    const org = ctx.claimOrg || ctx.implicitOrg;
    const steps = [];
    if (result.checks.some(c => c.code === 'shortener_unresolvable')) steps.push('Do not tap the short link. Ask a trusted person to help, or contact the organization directly.');
    if (org) {
      steps.push(`Contact ${org.displayName} using a number you already trust, such as the one on your card, bill or statement.`);
      const domain = trustedDomain(ctx, org);
      steps.push(domain
        ? `If you need their website, type ${domain} yourself instead of tapping a link.`
        : 'If you need their website, type a website address you already know, or use their official app.');
    } else if (result.requestRisk.flags.some(f => f.id === 'family_emergency' || f.id === 'new_number')) {
      steps.push('Call the family member using a number you already know before responding or sending anything.');
    } else {
      steps.push('Contact the organization using contact details you already trust, not the ones in the message.');
    }
    if (result.requestRisk.level !== 'none') steps.push('If you already shared information or paid, call your bank right away and ask a trusted person for help.');
    return steps;
  }

  // "1 link, 2 phone numbers in a message"
  function channel(targets) {
    const count = kind => targets.filter(t => t.kind === kind).length;
    const parts = [['link', 'link', 'links'], ['email', 'email address', 'email addresses'], ['phone', 'phone number', 'phone numbers']]
      .map(([kind, one, many]) => [count(kind), one, many])
      .filter(([n]) => n)
      .map(([n, one, many]) => `${n} ${n === 1 ? one : many}`);
    return parts.length ? parts.join(', ') + ' in a message' : 'Message text with no links or numbers';
  }

  T.copy = { shown, checkDetail, checkSource, describe, warnings, nextSteps, channel, policyNote, FLAGS };
})(typeof window !== 'undefined' ? window : globalThis);
