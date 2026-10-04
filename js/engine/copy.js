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
    return target.hostUnicode && target.hostUnicode !== target.host ? target.hostUnicode : target.host;
  }

  // check -> one or two sentences for "What we found".
  function checkDetail(check, ctx) {
    var t = shown(check.target);
    var org = check.orgId ? T.orgById(ctx.store, check.orgId) : null;
    var claim = ctx.claimOrg;
    switch (check.code) {
      case 'domain_official':
        return t + ' is one of the official addresses we have on file for ' + orgName(org) + '.';
      case 'phone_official':
        return t + ' is on our list of official numbers for ' + orgName(org) + '.';
      case 'shortener_unresolvable':
        return t + ' is a link shortener. It hides where the link really goes, and this app cannot follow it without opening it.';
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
        return t + ' uses the same name as ' + check.lookalikeOf + ' with a different ending. It is not an official address.';
      case 'typosquat':
        return t + ' is ' + (check.distance === 1 ? 'one letter' : 'two letters') + ' away from ' + check.lookalikeOf + '. Copycat sites use small spelling changes.';
      case 'brand_in_foreign_domain':
        return t + ' contains the name "' + check.brandWord + '", but it is not one of the official addresses we have for ' + orgName(org) + '.';
      case 'ip_host':
        return 'This link goes to a number address (' + t + ') instead of a named website. Large organizations do not ask you to sign in that way.';
      case 'not_in_official_list':
        return t + ' is not one of the official addresses we have on file for ' + orgName(org) + ' (' + org.officialDomains.join(', ') + ').';
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

  function checkSource(check, ctx) {
    var org = check.orgId ? T.orgById(ctx.store, check.orgId) : null;
    var listed = org ? 'Reference list: ' + org.displayName + ' → ' + org.officialDomains.join(', ') : '';
    var version = ' (list version ' + (ctx.store.version || 'unknown') + ')';
    switch (check.code) {
      case 'domain_official':
      case 'domain_belongs_to_other_org':
      case 'not_in_official_list':
      case 'user_content_platform':
      case 'brand_in_foreign_domain':
      case 'typosquat':
      case 'same_label_other_tld':
      case 'homoglyph':
      case 'official_domain_as_subdomain':
      case 'userinfo_trick':
        return (listed || 'Reference list') + version;
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
    gift_card_payment: 'Real companies and government offices never ask for payment in gift cards.',
    crypto_or_wire: 'Requests to pay with cryptocurrency, a crypto ATM or a wire transfer are a frequent scam pattern.',
    share_code: 'Never read or send a sign-in code to anyone. Your bank will not ask you for it.',
    remote_access: 'Do not let anyone you did not contact yourself control your computer or phone.',
    arrest_threat: 'Government offices do not threaten arrest by text, email or phone call.',
    secrecy: 'Being told to keep something secret from your family or your bank is a warning sign.',
    family_emergency: 'If someone says they are family and in trouble, hang up and call that person on the number you already know.',
    pay_fee: 'Be careful with surprise fees, fines or tolls that must be paid through a link.',
    urgency: 'Pressure to act fast is a warning sign. Take your time.',
    account_locked: 'Messages about a locked or suspended account are often used to rush people.',
    device_alarm: 'Real warnings from your device do not give you a phone number to call.',
    credential_request: 'Do not enter passwords, card numbers or your Social Security number from a link in a message.',
    prize_refund: 'Prizes and refunds you did not expect are a frequent lure.',
    callback_now: 'Call back only on a number you already trust, not the one in the message.',
    peer_payment: 'Payments by Zelle, Venmo or Cash App are hard to get back. Only send money to people you know.'
  };

  var FLAG_LABELS = {
    gift_card_payment: 'Payment with gift cards',
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
    var org = ctx.claimOrg || ctx.implicitOrg;
    var name = org ? org.displayName : null;
    var codes = result.checks.map(function (c) { return c.code; });
    if (result.state === 'mismatch') {
      if (result.strength === 'strong') {
        return {
          description: 'A link or address in this message imitates ' + (name || 'a known organization') + '.',
          meaning: 'Scammers copy familiar names and addresses. The real address is what counts, and this one does not match.'
        };
      }
      return {
        description: 'This message does not match the official addresses we have on file' + (name ? ' for ' + name : '') + '.',
        meaning: 'Our list can be missing an address, so treat this as a strong warning sign rather than proof.'
      };
    }
    if (result.state === 'match') {
      return {
        description: 'Every link and number in this message is on our list for ' + name + '.',
        meaning: 'Matching details do not make every request OK. Scammers sometimes include real links or numbers to look believable.'
      };
    }
    var meaning = 'Missing information is not a sign that a message is fake, and it is not a sign that it is real either.';
    if (codes.indexOf('shortener_unresolvable') >= 0) meaning = 'A short link hides its destination. Checking it would mean opening it, which is the step to avoid.';
    else if (codes.indexOf('nothing_to_check') >= 0) meaning = 'Without a link, email address or phone number, there is nothing to compare. Judge it by what it asks you to do.';
    else if (codes.indexOf('phone_not_on_file') >= 0) meaning = 'Our list of phone numbers is small. A number missing from it proves nothing either way.';
    else if (codes.indexOf('user_content_platform') >= 0) meaning = 'A page on a site where anyone can publish does not show who made it.';
    return { description: 'We do not have enough information to check who sent this.', meaning: meaning };
  }

  function warnings(result, ctx) {
    var list = [];
    var flagWarnings = result.requestRisk.flags.map(function (f) { return FLAG_WARNINGS[f.id]; });
    if (result.state === 'match' && flagWarnings.length) {
      list.push('Even though the details match, this message asks for something risky.');
    }
    if (result.state === 'mismatch') list.push('Do not open the link, call the number, or reply to this message.');
    if (result.state === 'unknown') list.push('Pause before opening links or sharing personal details.');
    list = list.concat(flagWarnings);
    if (result.state === 'match' && !flagWarnings.length) list.push('Even when details match, never share passwords or codes.');
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
