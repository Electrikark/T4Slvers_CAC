/* Plain-language wording, keyed by reason code and flag id.
   Rules for every string here: short sentences, no jargon, and never the words
   "safe", "verified" or "legitimate" (invariant 4 in the spec). */
(function (root) {
  'use strict';
  var T = root.TFS = root.TFS || {};

  function orgName(org) { return org ? org.displayName : 'the sender'; }
  function primary(org) { return org && org.officialDomains && org.officialDomains[0]; }
  function shown(target) {
    if (!target) return '';
    if (target.kind === 'phone') return target.display;
    if (target.kind === 'email') return target.raw;
    return target.hostUnicode && target.hostUnicode !== target.host ? target.hostUnicode + ' (' + target.host + ')' : target.host || target.raw;
  }

  // check -> one or two sentences for "What we found".
  function checkDetail(check, ctx) {
    var t = shown(check.target);
    var org = check.orgId ? T.orgById(ctx.store, check.orgId) : null;
    var claim = ctx.claimOrg;
    switch (check.code) {
      case 'domain_official':
        return targetDescription(check.target) + ' matches a website address on file for ' + orgName(org) + '. ' + (check.target.kind === 'email' ? 'This does not prove the email came from that sender.' : 'The page, redirects, and sender have not been checked.');
      case 'phone_official':
        return t + ' is on our list of official numbers for ' + orgName(org) + '.';
      case 'shortener_unresolvable':
        return t + ' is a short link. This offline checker does not resolve its destination.';
      case 'user_content_platform':
        return t + ' belongs to ' + orgName(org) + ', but anyone can publish a page there, so it does not show who sent this.';
      case 'userinfo_trick':
        return 'This link is built to look like ' + check.lookalikeOf + ', but browsers ignore everything before the @ sign. It really goes to ' + check.registrable + '.';
      case 'domain_belongs_to_other_org':
        return 'The message says it is from ' + orgName(claim) + ', but ' + t + ' belongs to ' + orgName(org) + '.';
      case 'official_domain_as_subdomain':
        return t + ' starts with ' + check.lookalikeOf + ', but the real website is ' + check.registrable + '. The end of an address decides where it goes.';
      case 'homoglyph':
        return t + ' looks like ' + check.lookalikeOf + ', but some of its letters are different characters that only look the same.';
      case 'same_label_other_tld':
        return t + ' uses the same name as ' + check.lookalikeOf + ' with a different ending. That address is not on our list.';
      case 'typosquat':
        return t + ' is ' + (check.distance === 1 ? 'one letter' : 'two letters') + ' away from ' + check.lookalikeOf + '. Copycat sites use small spelling changes.';
      case 'brand_in_foreign_domain':
        return t + ' contains the name "' + check.brandWord + '", but it is not one of the official addresses we have for ' + orgName(org) + '.';
      case 'ip_host':
        return 'This link goes to a number address (' + t + ') instead of a named website. Large organizations do not ask you to sign in that way.';
      case 'not_in_official_list':
        return t + ' is not on our list for ' + orgName(org) + '. Our list may be incomplete, so this alone does not establish a conflict.';
      case 'reference_needs_review':
        return t + ' is listed for ' + orgName(org) + ', but its source record still needs review. We cannot count it as a match.';
      case 'input_incomplete':
        return 'Part of this input exceeds the checker’s limits. A partial check cannot establish a full match. Paste a shorter message or one complete link.';
      case 'risk_unresolved':
        return 'A requested action has more than one possible meaning. This uncertainty blocks a contact-details match.';
      case 'phone_not_on_file':
        return t + ' is not on our list' + (org ? ' for ' + orgName(org) : '') + '. That alone does not mean it is fake.';
      case 'free_email_address':
        return t + ' is a free email account. Anyone can create one with any name.';
      case 'no_claimed_identity':
        return 'The message does not name an organization we know, and ' + t + ' is not on our list.';
      case 'link_unreadable':
        return 'We could not read this link: ' + check.target.raw;
      case 'nothing_to_check':
        return 'There is no link, email address or phone number in this message to check.';
      default:
        return 'No details for this check.';
    }
  }

  function targetDescription(target) {
    return target.kind === 'email' ? 'The domain after @ in ' + shown(target) : shown(target);
  }

  function checkSource(check, ctx) {
    var org = check.orgId ? T.orgById(ctx.store, check.orgId) : null;
    var listed = org ? 'Local list: ' + org.displayName + ' → ' + org.officialDomains.join(', ') : '';
    var version = ' (list version ' + (ctx.store.version || 'unknown') + ')';
    var review = org && org.verifiedBy ? '. Review status: ' + org.verifiedBy : '';
    switch (check.code) {
      case 'domain_official':
      case 'domain_belongs_to_other_org':
      case 'not_in_official_list':
      case 'reference_needs_review':
      case 'user_content_platform':
      case 'brand_in_foreign_domain':
      case 'typosquat':
      case 'same_label_other_tld':
      case 'homoglyph':
      case 'official_domain_as_subdomain':
      case 'userinfo_trick':
        return (listed || 'Reference list') + version + review;
      case 'phone_official':
      case 'phone_not_on_file':
        return 'Reference list of official phone numbers' + version;
      case 'shortener_unresolvable':
        return 'List of known link shorteners' + version;
      case 'free_email_address':
        return 'List of free email providers' + version;
      default:
        return 'Tech for Silvers checker';
    }
  }

  var FLAG_WARNINGS = {
    gift_card_payment: 'Do not send gift card numbers to someone demanding payment. Contact the organization independently.',
    gift_card_disclosure: 'Do not send or read gift-card numbers, PINs, or codes to the requester. Check with the person through a number you already trust.',
    crypto_or_wire: 'Requests to pay with cryptocurrency, a crypto ATM or a wire transfer are a frequent scam pattern.',
    share_code: 'Keep sign-in codes private. Do not read or send them to a caller, even if they say they work for your bank.',
    remote_access: 'Do not let anyone you did not contact yourself control your computer or phone.',
    arrest_threat: 'A threat of arrest or legal action is a reason to pause and contact the office independently.',
    secrecy: 'Being told to keep something secret from your family or your bank is a warning sign.',
    family_emergency: 'If someone says they are family and in trouble, check with that person through a number you already know.',
    pay_fee: 'Be careful with surprise fees, fines or tolls that must be paid through a link.',
    urgency: 'Pressure to act fast is a warning sign. Take your time.',
    account_locked: 'Messages about a locked or suspended account are often used to rush people.',
    device_alarm: 'Do not call a number shown in an unexpected device-warning pop-up. Use a support contact you already trust.',
    credential_request: 'Do not enter passwords, card numbers or your Social Security number from a link in a message.',
    prize_refund: 'Prizes and refunds you did not expect are a frequent lure.',
    callback_now: 'Call back only on a number you already trust, not the one in the message.',
    peer_payment: 'Payments by Zelle, Venmo or Cash App are hard to get back. Only send money to people you know.'
  };

  var FLAG_LABELS = {
    gift_card_payment: 'Payment with gift cards',
    gift_card_disclosure: 'Sending gift-card numbers or codes',
    crypto_or_wire: 'Payment by crypto or wire transfer',
    share_code: 'Sharing a code or password',
    remote_access: 'Control of your device',
    arrest_threat: 'A threat of arrest or legal action',
    secrecy: 'Keeping it secret',
    family_emergency: 'A family member in trouble',
    pay_fee: 'Paying a fee or fine',
    urgency: 'Acting fast',
    account_locked: 'A locked or suspended account',
    device_alarm: 'An alarm about your device',
    credential_request: 'Confirming personal or login details',
    prize_refund: 'A prize or refund',
    callback_now: 'Calling a number now',
    peer_payment: 'Sending money by app'
  };

  function describe(result, ctx) {
    var codes = result.checks.map(function (c) { return c.code; });
    if (result.assessment === 'suspicious') {
      return {
        description: 'The message asks for an action that meets a concrete risk rule.',
        meaning: 'Matching contact details cannot cancel this action warning. Check independently before acting.'
      };
    }
    if (result.assessment === 'details_match') {
      return {
        description: 'Contact details match our stored list. We have not verified who sent this message.',
        meaning: 'This checks written address details only. It does not confirm the sender or inspect pages, redirects, or hidden links. A real address can be copied into a deceptive message.'
      };
    }
    var meaning = 'Missing information is not a sign that a message is fake, and it is not a sign that it is real either.';
    if (codes.indexOf('input_incomplete') >= 0) meaning = 'Some input was not inspected. Check a shorter message before drawing a conclusion.';
    else if (codes.indexOf('shortener_unresolvable') >= 0) meaning = 'The destination remains unknown because this app does not follow links.';
    else if (codes.indexOf('nothing_to_check') >= 0) meaning = 'Without a link, email address or phone number, there is nothing to compare. Judge it by what it asks you to do.';
    else if (codes.indexOf('phone_not_on_file') >= 0) meaning = 'This prototype has no reviewed phone list. A missing number proves nothing about the caller.';
    else if (codes.indexOf('user_content_platform') >= 0) meaning = 'A page on a site where anyone can publish does not show who made it.';
    if (result.requestRisk.flags.length || result.requestRisk.unresolved.length) meaning = 'Risk signals remain in the requested action. Matching contact details cannot clear those signals.';
    if (result.checks.some(function (c) { return c.status === 'CONTRADICTS'; })) meaning += ' Contact details also conflict with our stored list. That conflict blocks a match. This checker cannot resolve it from the available evidence.';
    return { description: 'We do not have enough reliable evidence for a complete assessment.', meaning: meaning };
  }

  function warnings(result, ctx) {
    var list = [];
    var flagWarnings = result.requestRisk.flags.map(function (f) { return FLAG_WARNINGS[f.id]; });
    if (result.assessment !== 'details_match') list.push("Don't use any contact information from this message, including links, email addresses, or phone numbers. Contact the organization using a website, app, statement, or number you already trust.");
    if (result.assessment !== 'details_match' && result.checks.some(function (c) { return c.code === 'nothing_to_check'; }) && (flagWarnings.length || result.requestRisk.unresolved.length)) list.push('Do not act on this request until you check independently.');
    list = list.concat(flagWarnings);
    if (result.assessment === 'details_match' && !flagWarnings.length) list.push('Even when details match, never share passwords or codes.');
    return list;
  }

  function nextSteps(result, ctx) {
    var org = ctx.claimOrg || ctx.implicitOrg;
    var steps = [];
    var codes = result.checks.map(function (c) { return c.code; });
    if (codes.indexOf('shortener_unresolvable') >= 0) steps.push('Do not tap the short link. Ask a trusted person to help, or contact the organization directly.');
    if (org) {
      steps.push('Contact ' + org.displayName + ' using a number you already trust, such as the one on your card, bill or statement.');
      steps.push('If you need their website, type ' + primary(org) + ' yourself instead of tapping a link.');
    } else if (result.requestRisk.flags.some(function (f) { return f.id === 'family_emergency'; })) {
      steps.push('Call the family member using a number you already know before responding or sending anything.');
    } else {
      steps.push('Contact the organization using contact details you already trust, not the ones in the message.');
    }
    if (result.requestRisk.level !== 'none') steps.push('If you already shared information or paid, call your bank right away and ask a trusted person for help.');
    return steps;
  }

  function channel(targets) {
    var n = { link: 0, email: 0, phone: 0 };
    targets.forEach(function (t) { n[t.kind] += 1; });
    var parts = [];
    if (n.link) parts.push(n.link + (n.link === 1 ? ' link' : ' links'));
    if (n.email) parts.push(n.email + (n.email === 1 ? ' email address' : ' email addresses'));
    if (n.phone) parts.push(n.phone + (n.phone === 1 ? ' phone number' : ' phone numbers'));
    if (!parts.length) return 'Message text with no links or numbers';
    return parts.join(', ') + ' in a message';
  }

  T.copy = {
    shown: shown,
    checkDetail: checkDetail,
    checkSource: checkSource,
    describe: describe,
    warnings: warnings,
    nextSteps: nextSteps,
    channel: channel,
    FLAG_WARNINGS: FLAG_WARNINGS,
    FLAG_LABELS: FLAG_LABELS
  };
})(typeof window !== 'undefined' ? window : globalThis);
