/* Rules about what a message asks the reader to do.
   Tier 1 rules (gift cards, wire/crypto, remote access, codes, device-alarm callbacks) need a
   direct, unnegated demand that is not just an example. Wording flags are Tier 2 warning signs.
   Every quote points at the exact characters the person pasted. */
(function (root) {
  'use strict';
  const T = root.TFS = root.TFS || {};

  const GAP = '[^.!?\\n]{0,40}';
  const SHORT_GAP = '[^.!?\\n]{0,25}';
  const re = source => new RegExp(source, 'i');

  /* ---------- Shared patterns ---------- */

  const ACTIONS = /\b(?:buy|purchase|pay|send|transfer|wire|read|give|tell|text|share|provide|reply with|install|download|run|start|allow|grant|call|dial|contact)\b/gi;
  const GIFT = /\b(?:gift[ -]?cards?|itunes cards?|google play cards?|steam cards?|vanilla gift cards?|ebay gift cards?)\b/i;
  const CODE = /\b(?:numbers?|pins?|(?:redemption )?codes?)\b/i;
  const SECRET = /\b(?:code|pin|otp|passcode|password|verification number|security code)\b/i;
  const WIRE = /\b(?:bitcoin|btc|crypto(?:currency)?|usdt|tether|ethereum|wire (?:transfer|payment)|western union|moneygram)\b/i;
  const REMOTE = /\b(?:anydesk|teamviewer|logmein|ultraviewer|supremo|quick ?assist|remote (?:access|control|desktop|session)|screen[ -]?shar(?:e|ing)|(?:your|the|my) screen)\b/i;
  const PURPOSE = /\b(?:payment|pay|fees?|fines?|bills?|debts?|tax(?:es)?|bail|tolls?|(?:restore|release|unlock)(?:\s+\w+){0,3}\s+account)\b/i;
  const REPORT = /\b(?:scam{2}ers?|fraudsters?|criminals?|an example scam|example (?:message|scam)|beware of|watch (?:out )?for|never ask you to|will not ask you to)\b/i;
  const NEGATION = /\b(?:do not|don['’]t|dont|never|must not|will not|won['’]t|cannot|can['’]t)\s+(?:(?:ever|please|just|even|again)\s+){0,3}$/i;
  const PRESSURE = /\b(?:(?:do not|don['’]t|dont)\s+tell\s+(?:mom|dad|mother|father|your family|your bank|the bank|anyone|anybody)|keep (?:this|it) (?:between us|secret)|(?:do not|don['’]t|dont) hang up|stay on the line)\b/i;
  const URGENT = /\b(?:urgent(?:ly)?|right now|today|at once|act now|right away|im{2}ediately|asap|within \d{1,3}\s*(?:minutes?|hours?))\b/i;
  const THREAT = /\b(?:arrest(?:ed)?|jail|fines?|account(?:\s+\w+){0,3}\s+(?:closed|closure|locked|loss)|lose (?:your )?(?:funds|money)|loss of (?:funds|money)|service disconnection|(?:device|computer)(?:\s+\w+){0,3}\s+locked)\b/i;

  // T1-CODE: the secret must be the direct object, after at most a recipient and two modifiers.
  const SECRET_OBJECT = /\b(?:codes?|pins?|otps?|passcodes?|passwords?)\b/i;
  const OBJECT_GAP = /^\s*(?:(?:me|us|them|him|her|back|to me|to us)\s+)?(?:(?:the|your|that|this|those|these|their|any)\s+)?(?:[\w-]+\s+){0,2}$/i;
  // Codes that are not secrets, or that T1-GIFT already judges.
  const NOT_SECRET = /\b(?:promo(?:tional)?|coupon|discount|zip|postal|area|qr|bar|referral|invite|invitation|gift[ -]?cards?|confirmation|tracking|reference|order|booking|pick-?up|voucher|redemption|rewards?|offer|country|dial)\s+$/i;
  // T1-CALLBACK: a device alarm paired with a demand to call. Real security warnings
  // from Microsoft and other vendors do not include a phone number to call.
  const DEVICE_ALARM = /\b(?:(?:device|computer|pc|laptop|mac|system|windows|browser|iphone|phone)\b[^.!?\n]{0,25}\b(?:is|has been|was|are|have been|may be)\s+(?:locked|infected|hacked|compromised|blocked|disabled|at risk)|infected with (?:a |an )?(?:virus|viruses|malware|trojan|spyware)|(?:virus|viruses|malware|trojan|spyware|ransomware)\s+(?:detected|found|alert|warning|infection)|(?:hackers?|someone) (?:has |have )?(?:accessed|hacked|breached) your (?:computer|device|pc|laptop|phone))\b/i;
  const CALL_OBJECT = /^\s+(?:us\b|me\b|them\b|(?:this|the|our|that) (?:toll[- ]free )?(?:number|helpline|hotline)\b|(?:the |a )?(?:microsoft|windows|apple|google|norton|mcafee|geek squad)?\s*(?:tech(?:nical)? |customer |security )?(?:support|helpline|help desk|helpdesk|technicians?)\b|(?:on |at )?\+?1?[\s.\-]?\(?[2-9]\d{2}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}\b|(?:\w+\s+){0,3}(?:at|on)\s+\+?1?[\s.\-]?\(?[2-9]\d{2}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}\b)/i;
  // Calling a number you already trust is the advice, not the trick.
  const TRUSTED_CALL = /\b(?:back of your card|you (?:already )?(?:trust|know)|on your (?:statement|bill)|official (?:website|site|app))\b/i;

  // Household codes family members share: the wifi password, the garage code.
  const HOUSEHOLD = /\b(?:wi-?fi|wireless|network|router|garage|door|gate|alarm|lockbox|locker|keypad|building|house|guest|bike lock|gym)\s+$/i;
  const HOUSEHOLD_AFTER = /^\s+(?:for|to|of)\s+(?:the\s+|your\s+|our\s+|my\s+)?(?:wi-?fi|wireless|network|router|garage|door|front door|gate|alarm|lockbox|locker|keypad|building|house|bike|gym)\b/i;
  const REQUESTER = /\b(?:me|us|them|him|her|back|to (?:the )?(?:agent|caller|representative|rep|officer|technician|team)|our (?:agent|team|representative|staff))\b/i;
  // Handing a delivery or pickup code to a courier in person is how the code is meant to be used.
  const IN_PERSON = /\b(?:driver|courier|delivery (?:associate|person|agent)|cashier|checkout|front desk)\b/i;

  // Login wording (Tier 2).
  const IN_PERSON_SIGN_IN = /^\s+(?:at|with)\s+(?:the\s+)?(?:front desk|reception(?: desk)?|office|counter|check-in desk|lobby|nurses?['’]? station)(?=\s*(?:[.!?,;\n]|$)|\s+(?:when|before|upon|after|on arrival|and)\b)/i;
  // "Sign-in attempt", "sign in code", "sign in successful": a notice about a sign-in, not a request.
  const LOGIN_NOTICE = /^[ \t]*(?:alerts?|notices?|attempts?|activity|codes?|history|was|has been|detected|confirmed|successful|succeeded|failed|details|information|credentials|problems?|issues?)\b/i;
  // Negation in the same part of the sentence: "No need to sign in", "Do not click links to log in".
  const LOGIN_NEGATION = /\b(?:do not|don['’]t|does not|doesn['’]t|did not|didn['’]t|never|no need|not need|not have to|not required|won['’]t|will not|cannot|can['’]t|without)\b/i;

  // A new instruction between a negation and the login ends that negation's reach:
  // "You do not need to visit a branch because you must log in" is still a login request.
  const NEW_INSTRUCTION = /\b(?:because|since|so|but|and|then|instead|however|otherwise|please|you must|you need to|you have to|you should|must|required)\b/i;
  // "Verify your account by signing in" is an instruction; "You last accessed it by signing in" is not.
  const INSTRUCTION_START = /^\s*(?:please\s+)?(?:verify|confirm|update|restore|unlock|secure|protect|review|check|reactivate|validate|complete|claim|keep|continue|finish|accept|activate|access|view|see|pay|track|reschedule|avoid|prevent|stop|cancel|fix|resolve|reset|change|start|go|get)\b/i;

  // Signing in through a route the person already trusts is safety advice, not a lure:
  // "only through the official app", "a website you already know". "This secure link" is not one.
  const SAFE_ROUTE = /^\s+(?:only\s+)?(?:through|in|on|with|using|from|at)\s+(?:the\s+|your\s+)?(?:official\s+app|app\s+you\s+(?:already\s+)?(?:have|trust|know)|(?:website|site|address|number)\s+you\s+(?:already\s+)?(?:know|trust|typed?|type yourself))\b/i;

  /* ---------- Reading clauses ---------- */

  const span = (raw, start, end) => ({ start, end, quote: raw.slice(start, end) });
  // A regex hit inside a clause, as a span of the original text.
  const spanOf = (raw, clause, hit, offset = 0) => span(raw, clause.start + offset + hit.index, clause.start + offset + hit.index + hit[0].length);

  // Splits text at sentence ends, semicolons, line breaks and "but / however / instead".
  // Clauses inside a quoted example ("Fraudsters say: '...'") are marked inReport.
  function clausesOf(text) {
    const reports = [];
    const quotes = /["“]([^"”]*)["”]/g;
    let q;
    while ((q = quotes.exec(text)) !== null) {
      const before = text.slice(Math.max(0, q.index - 120), q.index).split(/[.!?;\n]/).pop();
      if (REPORT.test(before) || /\b(?:example|warning|says?|said|quoted)\b/i.test(before)) reports.push({ start: q.index, end: q.index + q[0].length });
    }
    const clauses = [];
    const cuts = /[.!?;\n]|\b(?:but|however|instead)\b/gi;
    let start = 0, m;
    while ((m = cuts.exec(text)) !== null) {
      // "$4.15" is a number, not the end of a sentence.
      if (m[0] === '.' && /\d/.test(text.charAt(m.index - 1)) && /\d/.test(text.charAt(m.index + 1))) continue;
      if (text.slice(start, m.index).trim()) clauses.push({ start, end: m.index, text: text.slice(start, m.index) });
      start = m.index + m[0].length;
    }
    if (text.slice(start).trim()) clauses.push({ start, end: text.length, text: text.slice(start) });
    for (const c of clauses) c.inReport = reports.some(r => c.start >= r.start && c.start < r.end);
    return clauses;
  }

  const reported = text => REPORT.test(text) || /\b(?:says?|said|reads?|example|quoted|warning)[^.!?]{0,40}["“]/i.test(text);
  const skip = clause => !clause || clause.inReport || reported(clause.text);

  // Is the verb after `prefix` an instruction to the reader? "Please send", "Chase: Send",
  // "You must send", "To fix it, send". priorDemand also allows "... and send" after an earlier demand.
  function directAction(prefix, priorDemand) {
    if (NEGATION.test(prefix) || /["“][^"”]*$/.test(prefix)) return false;
    const rest = prefix.replace(/^\s*[^:]{1,60}:\s*/, '');
    if (/^\s*(?:please\s+)?$/i.test(rest)) return true;
    if (/^\s*(?:to|in order to|before|so)\s[^,]{1,60},\s*(?:please\s+)?$/i.test(rest)) return true;
    if (/\b(?:please|you must|you need to|you have to|you should|can you|could you)\s*$/i.test(rest)) return true;
    if (/\b(?:do not|don['’]t|dont|never)\s+(?:delay|wait|tell(?:\s+\w+){1,3}|hang up)\s*,\s*$/i.test(rest)) return true;
    return priorDemand && /(?:\band|\bthen|,)\s*(?:please\s+)?$/i.test(rest);
  }

  // Negation only reaches the action right after it, within the same part of the sentence.
  function isNegated(text, index) {
    const prefix = text.slice(Math.max(0, index - 80), index).split(/[.!?;,\n]|\b(?:but|instead|however|then)\b/i).pop();
    return NEGATION.test(prefix);
  }

  // Pressure tied to a wire or remote-access demand: in its own clause, or in the clause right next to it.
  function tiedPressure(clauses, index, raw) {
    const own = clauses[index];
    const casual = text => /\b(?:meeting|lunch|birthday|weather)\b/i.test(text);
    if (!skip(own)) {
      let pressure = own.text.match(PRESSURE);
  function tiedContext(clauses, index, raw) {
    var own = clauses[index], hit;
    if (!own.inReport && !reported(own.text)) {
      var pressure = own.text.match(PRESSURE);
      if (pressure && SECRET.test(own.text.slice(pressure.index + pressure[0].length))) pressure = null;
      const hit = pressure || own.text.match(URGENT) || own.text.match(THREAT);
      if (hit && !casual(own.text)) return spanOf(raw, own, hit);
    }
    for (const other of [clauses[index - 1], clauses[index + 1]]) {
      if (skip(other)) continue;
      const text = other.text.trim();
      let hit = other.text.match(PRESSURE);
      if (hit && !SECRET.test(other.text) && text.length < 100 &&
          /^(?:(?:please|and)\s+)?(?:(?:do not|don['’]t|dont) tell|keep (?:this|it)|(?:do not|don['’]t|dont) hang up|stay on the line)/i.test(text)) return spanOf(raw, other, hit);
      hit = other.text.match(URGENT) || other.text.match(THREAT);
      if (hit && !casual(text) && /^(?:urgent\b|(?:do (?:it|this|that)|this is|you must act|otherwise|or\b|your account|you will be arrested|your device|your computer|to avoid)\b)/i.test(text)) return spanOf(raw, other, hit);
    }
    return null;
  }

  // The last account secret named in some text, unless it is a promo, household or gift-card code.
  function secretBefore(text) {
    const all = [...text.matchAll(new RegExp(SECRET_OBJECT.source, 'gi'))];
    const last = all[all.length - 1];
    if (!last) return false;
    const before = text.slice(0, last.index);
    return !NOT_SECRET.test(before) && !HOUSEHOLD.test(before) && !HOUSEHOLD_AFTER.test(text.slice(last.index + last[0].length));
  }

  /* ---------- Tier 1 rules ----------
     Each rule looks at one direct demand `d`: { verb, clause, index, tail, near, action, after }
     (tail: text after the verb; near: its first 40 characters; after: tail's offset in the clause). */

  // T1-GIFT: "buy gift cards to pay the fine", "pay with gift cards".
  function giftPayment(d, s) {
    const hit = /^(?:buy|purchase|pay)$/.test(d.verb) && d.near.match(GIFT);
    if (!hit) return;
    const gift = spanOf(s.raw, d.clause, hit, d.after);
    const offset = gift.end - d.clause.start;
    const purpose = d.clause.text.slice(offset).match(/^\s+(?:to (?:pay|cover|settle)\b|(?:as|for)\s+(?:(?:a|the|this|your)\s+)?(?:payment|fees?|fines?|bills?|debts?|tax(?:es)?|bail|tolls?)\b|to (?:restore|release|unlock)(?:\s+\w+){0,3}\s+account\b)/i);
    const context = purpose ? spanOf(s.raw, d.clause, purpose, offset) : null;
    if (d.verb === 'pay' || context) {
      s.flag('gift_card_payment', d.action.start, gift.end);
      s.tier1('T1-GIFT', d, gift, context);
    } else if (PURPOSE.test(d.clause.text)) {
      // "Buy gift cards ... and pay for lunch": a payment nearby, but not clearly for the cards.
      s.unresolved.push({ id: 'unclear_gift_payment_purpose', action: d.action, clause: s.clauseSpan(d.clause), object: gift });
    }
  }

  // T1-GIFT: "buy gift cards ... send me the codes". Returns true when it fires.
  function giftCodes(d, s) {
    const hit = /^(?:send|read|give|tell|text|share|provide|reply with)$/.test(d.verb) && d.near.match(CODE);
    if (!hit) return false;
    const code = spanOf(s.raw, d.clause, hit, d.after);
    // The gift card can be named in this clause or the one before.
    let cardClause = d.clause, card = d.clause.text.match(GIFT);
    if (!card && !skip(s.clauses[d.index - 1])) {
      cardClause = s.clauses[d.index - 1];
      card = cardClause.text.match(GIFT);
  function contextualSignals(text, raw) {
    var clauses = clausesOf(text), flags = [], established = [], unresolved = [];
    function flag(id, start, end) {
      if (!flags.some(function (f) { return f.id === id; })) flags.push({ id: id, level: 'high', words: raw.slice(start, end), start: start, end: end });
    }
    const toRequester = /\b(?:me|us|to me|to us|back to me|back to us|to (?:the )?(?:requester|caller))\b/i.test(d.tail.slice(0, 65));
    // An OTP or credit card nearby makes it unclear which code is meant.
    const competing = /\b(?:otp|one[ -]time|authorization|verification|password|credit card|debit card)\b/i.test(d.clause.text + ' ' + (cardClause === d.clause ? '' : cardClause.text));
    if (card && toRequester && !competing && !/\b(?:checkout|retailer|redeem at)\b/i.test(d.clause.text)) {
      s.flag('gift_card_disclosure', d.action.start, code.end);
      s.tier1('T1-GIFT', d, code, null, spanOf(s.raw, cardClause, card));
      return true;
    }
    if (card && toRequester && competing) s.unresolved.push({ id: 'competing_card_code_antecedent', action: d.action, clause: s.clauseSpan(d.clause) });
    return false;
  }

  // T1-WIRE: crypto or a wire transfer, with pressure tied to it.
  function wireTransfer(d, s) {
    if (!/^(?:pay|send|transfer|wire)$/.test(d.verb)) return;
    let hit = d.near.match(WIRE);
    if (!hit && d.verb === 'wire') hit = d.near.match(/(?:\$\s*\d[\d,.]*|\b(?:money|funds|payment)\b)/i);
    if (!hit) return;
    const object = spanOf(s.raw, d.clause, hit, d.after);
    s.flag('crypto_or_wire', d.action.start, object.end);
    const context = tiedPressure(s.clauses, d.index, s.raw);
    if (context) s.tier1('T1-WIRE', d, object, context);
  }

  // T1-REMOTE: install or allow remote-control software, with pressure tied to it.
  function remoteAccess(d, s) {
    const hit = /^(?:install|download|run|start|allow|grant|share)$/.test(d.verb) && d.near.match(REMOTE);
    if (!hit) return;
    const object = spanOf(s.raw, d.clause, hit, d.after);
    s.flag('remote_access', d.action.start, object.end);
    const context = tiedPressure(s.clauses, d.index, s.raw);
    if (context) s.tier1('T1-REMOTE', d, object, context);
  }

  // T1-CALLBACK: "call this number" anywhere in a message that raises a device alarm.
  function techSupportCall(d, s) {
    const hit = /^(?:call|dial|contact)$/.test(d.verb) && d.tail.match(CALL_OBJECT);
    if (!hit || TRUSTED_CALL.test(d.tail.slice(0, 80))) return;
    let alarm = null;
    for (const clause of s.clauses) {
      if (skip(clause)) continue;
      const found = clause.text.match(DEVICE_ALARM);
      if (found) { alarm = spanOf(s.raw, clause, found); break; }
    }
    if (!alarm) return;
    const number = spanOf(s.raw, d.clause, hit, d.after);
    s.flag('tech_support_call', d.action.start, number.end);
    s.tier1('T1-CALLBACK', d, number, alarm);
  }

  // T1-CODE: give a sign-in code, PIN or password to the requester. No pressure is needed:
  // no organization asks for one this way. Also "read it back to me" after a named code.
  function shareSecret(d, s) {
    if (!/^(?:send|read|give|tell|text|share|provide|reply with)$/.test(d.verb) || IN_PERSON.test(d.clause.text)) return;
    const pronoun = d.verb !== 'reply with' && d.near.match(/^\s+(?:it|them)\b/i);
    if (pronoun && REQUESTER.test(d.tail.slice(pronoun[0].length, 65))) {
      const previous = s.clauses[d.index - 1];
      if (secretBefore(d.clause.text.slice(0, d.action.start - d.clause.start)) || (previous && !previous.inReport && secretBefore(previous.text))) {
        const object = spanOf(s.raw, d.clause, pronoun, d.after);
        s.flag('share_code', d.action.start, object.end);
        s.tier1('T1-CODE', d, object, null);
        return;
      }
    }
    const hit = d.near.match(SECRET_OBJECT);
    if (!hit) return;
    const gap = d.near.slice(0, hit.index);
    const toRequester = /^(?:read|give|tell|reply with)$/.test(d.verb) || REQUESTER.test(d.tail.slice(0, 65));
    const household = HOUSEHOLD.test(gap) || HOUSEHOLD_AFTER.test(d.near.slice(hit.index + hit[0].length) + d.tail.slice(40, 70));
    if (OBJECT_GAP.test(gap) && !NOT_SECRET.test(gap) && !household && toRequester) {
      const object = spanOf(s.raw, d.clause, hit, d.after);
      s.flag('share_code', d.action.start, object.end);
      s.tier1('T1-CODE', d, object, null);
    }
  }

  // Finds every direct demand and runs the Tier 1 rules on it, in this order.
  function tier1Signals(text, raw) {
    const clauses = clausesOf(text);
    const s = {
      raw, clauses, flags: [], established: [], unresolved: [],
      clauseSpan: clause => span(raw, clause.start, clause.end),
      flag(id, start, end) {
        if (!this.flags.some(f => f.id === id)) this.flags.push({ id, level: 'high', words: raw.slice(start, end), start, end });
      },
      tier1(ruleId, d, object, context, antecedent) {
        const item = { ruleId, action: d.action, clause: this.clauseSpan(d.clause), object, context };
        if (antecedent) item.antecedent = antecedent;
        this.established.push(item);
      }
    };
    clauses.forEach((clause, index) => {
      if (skip(clause)) return;
      let priorDemand = false;
      for (const m of clause.text.matchAll(new RegExp(ACTIONS.source, 'gi'))) {
        if (!directAction(clause.text.slice(0, m.index), priorDemand)) continue;
        priorDemand = true;
        const tail = clause.text.slice(m.index + m[0].length);
        const d = { verb: m[0].toLowerCase(), clause, index, tail, near: tail.slice(0, 40), action: spanOf(raw, clause, m), after: m.index + m[0].length };
        giftPayment(d, s);
        const giftCodeFound = giftCodes(d, s);
        wireTransfer(d, s);
        remoteAccess(d, s);
        techSupportCall(d, s);
        if (!giftCodeFound) shareSecret(d, s);
        var verb = m[0].toLowerCase(), tail = clause.text.slice(m.index + m[0].length), giftDisclosed = false;
        var windowText = tail.slice(0, 40), action = matchedSpan(raw, clause, m), hit;
        if (/^(?:buy|purchase|pay)$/.test(verb) && (hit = windowText.match(GIFT))) {
          var gift = matchedSpan(raw, clause, hit, m.index + m[0].length);
          var paymentContext = giftPaymentContext(clause, gift, raw);
          if (verb === 'pay' || paymentContext) {
            flag('gift_card_payment', action.start, gift.end);
            tier1('T1-GIFT', action, clause, gift, paymentContext);
          } else if (PURPOSE.test(clause.text)) {
            unresolved.push({ id: 'unclear_gift_payment_purpose', action: action, clause: span(raw, clause.start, clause.end), object: gift });
          }
        }
        if (/^(?:send|read|give|tell|text|share|provide|reply with)$/.test(verb) && (hit = windowText.match(CODE))) {
          var code = matchedSpan(raw, clause, hit, m.index + m[0].length);
          var giftHit = clause.text.match(GIFT), giftClause = clause;
          if (!giftHit && clauses[index - 1] && !clauses[index - 1].inReport && !reported(clauses[index - 1].text)) {
            giftClause = clauses[index - 1]; giftHit = giftClause.text.match(GIFT);
          }
          var recipient = /\b(?:me|us|to me|to us|back to me|back to us|to (?:the )?(?:requester|caller))\b/i.test(tail.slice(0, 65));
          var competing = /\b(?:otp|one[ -]time|authorization|verification|password|credit card|debit card)\b/i.test(clause.text + ' ' + (giftClause === clause ? '' : giftClause.text));
          if (giftHit && recipient && !competing && !/\b(?:checkout|retailer|redeem at)\b/i.test(clause.text)) {
            var antecedent = matchedSpan(raw, giftClause, giftHit);
            flag('gift_card_disclosure', action.start, code.end);
            tier1('T1-GIFT', action, clause, code, null, antecedent);
            giftDisclosed = true;
          } else if (giftHit && recipient && competing) {
            unresolved.push({ id: 'competing_card_code_antecedent', action: action, clause: span(raw, clause.start, clause.end) });
          }
        }
        if (/^(?:pay|send|transfer|wire)$/.test(verb)) {
          hit = windowText.match(WIRE);
          if (!hit && verb === 'wire') hit = windowText.match(/(?:\$\s*\d[\d,.]*|\b(?:money|funds|payment)\b)/i);
          if (hit) {
            var wire = matchedSpan(raw, clause, hit, m.index + m[0].length);
            flag('crypto_or_wire', action.start, wire.end);
            var wireContext = tiedContext(clauses, index, raw);
            if (wireContext) tier1('T1-WIRE', action, clause, wire, wireContext);
          }
        }
        if (/^(?:install|download|run|start|allow|grant|share)$/.test(verb) && (hit = windowText.match(REMOTE))) {
          var remote = matchedSpan(raw, clause, hit, m.index + m[0].length);
          flag('remote_access', action.start, remote.end);
          var remoteContext = tiedContext(clauses, index, raw);
          if (remoteContext) tier1('T1-REMOTE', action, clause, remote, remoteContext);
        }
        if (/^(?:call|dial|contact)$/.test(verb) && (hit = tail.match(CALL_OBJECT)) && !TRUSTED_CALL.test(tail.slice(0, 80))) {
          var alarm = null;
          for (var a = 0; a < clauses.length && !alarm; a++) {
            if (clauses[a].inReport || reported(clauses[a].text)) continue;
            var found = clauses[a].text.match(DEVICE_ALARM);
            if (found) alarm = matchedSpan(raw, clauses[a], found);
          }
          if (alarm) {
            var number = matchedSpan(raw, clause, hit, m.index + m[0].length);
            flag('tech_support_call', clause, action.start, number.end);
            tier1('T1-CALLBACK', action, clause, number, alarm);
          }
        }
        // "Read it back to me" after "we sent you a verification code": the pronoun takes the code.
        if (!giftDisclosed && /^(?:send|read|give|tell|text|share|provide)$/.test(verb) && (hit = windowText.match(/^\s+(?:it|them)\b/i)) && REQUESTER.test(tail.slice(hit[0].length, 65)) && !IN_PERSON.test(clause.text)) {
          var named = secretBefore(clause.text.slice(0, m.index)) || (clauses[index - 1] && !clauses[index - 1].inReport && secretBefore(clauses[index - 1].text));
          if (named) {
            var pronoun = matchedSpan(raw, clause, hit, m.index + m[0].length);
            flag('share_code', clause, action.start, pronoun.end);
            tier1('T1-CODE', action, clause, pronoun, null);
            continue;
          }
        }
        // No context is needed: no organization asks for a sign-in code, PIN or password this way.
        if (!giftDisclosed && /^(?:send|read|give|tell|text|share|provide|reply with)$/.test(verb) && (hit = windowText.match(SECRET_OBJECT))) {
          var gap = windowText.slice(0, hit.index);
          var toRequester = /^(?:read|give|tell|reply with)$/.test(verb) || REQUESTER.test(tail.slice(0, 65));
          var household = HOUSEHOLD.test(gap) || HOUSEHOLD_AFTER.test(windowText.slice(hit.index + hit[0].length) + tail.slice(40, 70));
          if (OBJECT_GAP.test(gap) && !NOT_SECRET.test(gap) && !household && toRequester && !IN_PERSON.test(clause.text)) {
            var secret = matchedSpan(raw, clause, hit, m.index + m[0].length);
            flag('share_code', clause, action.start, secret.end);
            tier1('T1-CODE', action, clause, secret, null);
          }
        }
      }
    });
    return s;
  }

  /* ---------- Wording flags (Tier 2) ---------- */

  function shareCodeDemand(text, m, clause) {
    const prefix = text.slice(clause.start, m.index);
    return directAction(prefix, /\b(?:please|call|read|send|share)\b/i.test(prefix));
  }

  // "Never share your code" is advice to protect a code, not a demand to keep something secret.
  function notCodeAdvice(text, m) {
    return !/^\s+(?:(?:the|your|this|that|a)\s+)?(?:(?:verification|security|sign-in)\s+)?(?:code|pin|password|passcode|otp)\b/i.test(text.slice(m.index + m[0].length));
  }

  // A login phrase counts only as a request: "Log in at", "please sign in", "click here to log in",
  // "verify your account by signing in". Notices, advice and front-desk visits stay quiet.
  function loginRequest(text, m, clause) {
    const after = text.slice(m.index + m[0].length);
    if (LOGIN_NOTICE.test(after.slice(0, 30)) || SAFE_ROUTE.test(after.slice(0, 60)) || IN_PERSON_SIGN_IN.test(after.slice(0, 60))) return false;
    const prefix = text.slice(clause.start, m.index);
    // A new instruction between a negation and the login ends the negation's reach.
    const segment = prefix.split(',').pop();
    const negations = [...segment.matchAll(new RegExp(LOGIN_NEGATION.source, 'gi'))];
    const last = negations[negations.length - 1];
    if (last && !NEW_INSTRUCTION.test(segment.slice(last.index + last[0].length))) return false;
    // "Before/when signing in" frames advice; "by/after signing in" names the means of an instruction.
    if (/^(?:when|before)\s/i.test(m[0])) return false;
    if (/^(?:by|after)\s/i.test(m[0])) {
      const rest = prefix.replace(/^\s*[^:]{1,60}:\s*/, '');
      return INSTRUCTION_START.test(rest) || /\b(?:please|you must|you need to|you have to|you should|required to)\b/i.test(rest);
    }
    return directAction(prefix, true) ||
      /\b(?:click|tap|press|select|visit|go|use|open|follow)\b[^.!?\n]{0,40}\bto\s*$/i.test(prefix) ||
      /\b(?:please|you must|you need to|you have to|you should|need to|have to|required to)\s*$/i.test(prefix);
  }

  // Each flag: id, level, and patterns; the first pattern that matches supplies the quoted words.
  // negatable: skip a hit right after "do not / never". accept: an extra check on the hit.
  const WORDING_FLAGS = [
    // Only a direct request; a gift-card code request is reported by T1-GIFT instead.
    { id: 'share_code', level: 'high', negatable: true, accept: shareCodeDemand, patterns: [
      re('\\b(?:read|tell|give|send|share|provide|reply with|text|forward|say)\\b(?:\\s+(?:us|me|them|him|her|it|back))?\\s+(?:the|your|that|this|their)?\\s*(?:\\w+\\s+)?(?:codes?|pins?|otp|passcodes?|passwords?|verification numbers?|security codes?)\\b')
    ] },
    { id: 'arrest_threat', level: 'high', patterns: [
      re('\\b(?:arrest(?:ed)?|warrant|lawsuit|legal action|jail|deport(?:ed|ation)?)\\b')
    ] },
    { id: 'secrecy', level: 'high', accept: notCodeAdvice, patterns: [
      re("\\b(?:do not|don't|dont|never)\\s+(?:tell|inform|mention (?:this|it) to|share this with)\\s+(?:anyone|anybody|your (?:family|bank|kids|children|grandchildren|spouse)|the bank|bank staff|the teller|a teller|mom|dad|mother|father|grandma|grandpa)\\b"),
      re('\\bkeep (?:this|it) (?:confidential|secret|between us|private)\\b'),
      re('\\bbetween (?:you and me|us)\\b')
    ] },
    { id: 'family_emergency', level: 'medium', patterns: [
      re('\\b(?:grandma|grandpa|grandmother|grandfather|it\'s me|it is me)\\b[\\s\\S]{0,80}?\\b(?:in trouble|in jail|accident|hospital|arrested|bail|stuck|lawyer)\\b')
    ] },
    // The opening of the "Hi Mom, new number" impersonation, before any request appears.
    { id: 'new_number', level: 'medium', patterns: [
      re("\\b(?:this is my new (?:phone |cell )?number|(?:i (?:got|have) a|my) new (?:phone|cell)? ?number|i (?:lost|dropped|broke) my (?:old )?phone|my (?:old )?phone (?:is )?(?:broken|broke|lost))\\b")
    ] },
    { id: 'pay_fee', level: 'medium', patterns: [
      re('\\bpay\\b' + GAP + '\\b(?:fees?|fines?|deposit|penalty|penalties|tolls?|charges?)\\b'),
      re('\\b(?:processing|support|service|release|unlock|redelivery|delivery|customs|reactivation) fee\\b')
    ] },
    { id: 'urgency', level: 'medium', patterns: [
      re('\\b(?:urgent(?:ly)?|act now|right away|at once|im{2}ediately|asap|final notice|last (?:warning|notice|chance)|expires? today|within \\d{1,3} ?(?:hours?|hrs?|minutes?|mins?|days?))\\b')
    ] },
    { id: 'account_locked', level: 'medium', patterns: [
      re('\\baccount\\b' + '[^.!?\\n]{0,30}' + '\\b(?:locked|suspended|limited|disabled|compromised|on hold|frozen|closed|restricted|deactivated)\\b'),
      re('\\b(?:locked|suspended|frozen|restricted)\\s+(?:your\\s+)?account\\b')
    ] },
    { id: 'device_alarm', level: 'medium', patterns: [
      re('\\b(?:device|computer|pc|phone|laptop|system)\\b' + '[^.!?\\n]{0,20}' + '\\b(?:is|has been|was)\\s+(?:locked|infected|hacked|compromised|blocked)\\b'),
      re('\\b(?:virus|malware|trojan|spyware)\\s+(?:detected|found|alert)\\b')
    ] },
    { id: 'credential_request', level: 'medium', patterns: [
      re('\\b(?:verify|confirm|update|validate|re-?enter|provide|enter)\\b' + SHORT_GAP + '\\b(?:password|passcode|pin|ssn|social security(?: number)?|card (?:number|details)|bank (?:details|information|account)|login|identity|account(?: details| information)?)\\b')
    ] },
    // A request to sign in, usually through the message's own link. Tier 2: it blocks Details Match.
    { id: 'login_request', level: 'medium', negatable: true, accept: loginRequest, patterns: [
      re('\\b(?:log|sign)\\s*-?\\s*(?:in|on)(?:to)?\\b'),
      re('\\b(?:by|after|when|before)\\s+(?:logging|signing)\\s*-?\\s*(?:in|on)(?:to)?\\b')
    ] },
    { id: 'prize_refund', level: 'medium', patterns: [
      re("\\b(?:you(?:'ve| have)? won|winner|claim your (?:prize|reward|refund|gift)|sweepstakes|lottery|overpaid|refund (?:is )?(?:pending|available|due))\\b")
    ] },
    { id: 'callback_now', level: 'medium', patterns: [
      re('\\bcall (?:us|this number|back|now|right away)\\b'),
      re('\\bcall\\b' + GAP + '\\bnow\\b')
    ] },
    { id: 'peer_payment', level: 'medium', patterns: [
      re('\\b(?:send|pay|transfer)\\b' + '[^.!?\\n]{0,30}' + '\\b(?:zelle|venmo|cash ?app)\\b'),
      re('\\b(?:zelle|venmo|cash ?app)\\b' + '[^.!?\\n]{0,30}' + '\\b(?:send|pay|transfer|payment)\\b')
    ] }
  ];

  // Runs on text with contacts masked out; `raw` is the same text unmasked, for quotes.
  function requestSignals(text, raw) {
    const s = tier1Signals(text, raw);
    let flags = s.flags;
    for (const flag of WORDING_FLAGS) {
      // A Tier 1 rule already reported this signal with its exact action.
      if (flags.some(f => f.id === flag.id)) continue;
      for (const pattern of flag.patterns) {
        const hit = [...text.matchAll(new RegExp(pattern.source, 'gi'))].find(m => {
          const clause = s.clauses.find(c => m.index >= c.start && m.index < c.end);
          if (clause && (clause.inReport || reported(clause.text))) return false;
          if (flag.negatable && isNegated(text, m.index)) return false;
          return !flag.accept || !clause || flag.accept(text, m, clause);
        });
  function requestSignals(text, source) {
    var raw = typeof source === 'string' ? source : text;
    var contextual = contextualSignals(text, raw);
    var flags = contextual.flags;
    FLAGS.forEach(function (flag) {
      // A contextual rule already reported this signal with its exact action.
      if (flags.some(function (f) { return f.id === flag.id; })) return;
      for (var p = 0; p < flag.patterns.length; p++) {
        var pattern = new RegExp(flag.patterns[p].source, 'gi');
        var hit = null, m;
        while ((m = pattern.exec(text)) !== null) {
          var clause = contextual.clauses.find(function (c) { return m.index >= c.start && m.index < c.end; });
          if (clause && (clause.inReport || reported(clause.text))) continue;
          if (flag.negatable && isNegated(text, m.index)) continue;
          if (flag.id === 'login_request' && clause && (!loginDemand(text.slice(clause.start, m.index), m[0]) ||
              LOGIN_NOTICE.test(text.slice(m.index + m[0].length, m.index + m[0].length + 30)) ||
              SAFE_ROUTE.test(text.slice(m.index + m[0].length, m.index + m[0].length + 60)) ||
              IN_PERSON_SIGN_IN.test(text.slice(m.index + m[0].length, m.index + m[0].length + 60)))) continue;
          if (flag.id === 'share_code' && clause && !directAction(text.slice(clause.start, m.index), /\b(?:please|call|read|send|share)\b/i.test(text.slice(clause.start, m.index)))) continue;
          // Advice to protect a code is not a demand to hide a payment or conversation.
          if (flag.id === 'secrecy' && /^\s+(?:(?:the|your|this|that|a)\s+)?(?:(?:verification|security|sign-in)\s+)?(?:code|pin|password|passcode|otp)\b/i.test(text.slice(m.index + m[0].length))) continue;
          hit = m;
          break;
        }
        if (!hit) continue;
        flags.push({ id: flag.id, level: flag.level, words: raw.slice(hit.index, hit.index + hit[0].length), start: hit.index, end: hit.index + hit[0].length });
        break;
      }
    }
    // A plain code request inside a gift-card code request is the same signal.
    flags = flags.filter(f => f.id !== 'share_code' || !flags.some(g => g.id === 'gift_card_disclosure' && f.start >= g.start && f.end <= g.end));
    const highs = flags.filter(f => f.level === 'high').length;
    const mediums = flags.filter(f => f.level === 'medium').length;
    const level = highs > 0 || mediums >= 3 ? 'high' : mediums > 0 ? 'elevated' : 'none';
    return { level, flags, established: s.established, unresolved: s.unresolved };
    });
    flags = flags.filter(function (f) {
      return f.id !== 'share_code' || !flags.some(function (gift) { return gift.id === 'gift_card_disclosure' && f.start >= gift.start && f.end <= gift.end; });
    });
    var hasHigh = flags.some(function (f) { return f.level === 'high'; });
    var mediums = flags.filter(function (f) { return f.level === 'medium'; }).length;
    var level = hasHigh || mediums >= 3 ? 'high' : mediums > 0 ? 'elevated' : 'none';
    return { level: level, flags: flags, established: contextual.established, unresolved: contextual.unresolved };
  }

  // The rules read a cleaned-up view (T.riskView); every span is then moved back to the original text.
  function sourceSignals(source) {
    const raw = source == null ? '' : String(source);
    const view = T.riskView(raw);
    const targets = T.extractTargets(view.text);
    const signals = requestSignals(targets.masked, view.text);
    signals.incomplete = targets.incomplete;
    if (view.identity) return signals;
    const move = s => {
      const start = view.map[s.start], end = view.map[s.end - 1] + 1;
      return span(raw, start, end);
    };
    for (const f of signals.flags) {
      const moved = move(f);
      Object.assign(f, { start: moved.start, end: moved.end, words: moved.quote });
    }
    for (const item of signals.established.concat(signals.unresolved)) {
      for (const key of ['action', 'clause', 'object', 'context', 'antecedent']) if (item[key]) item[key] = move(item[key]);
    }
    return signals;
  }

  T.sourceSignals = sourceSignals;
})(typeof window !== 'undefined' ? window : globalThis);
