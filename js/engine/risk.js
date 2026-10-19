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

  const ACTIONS = /\b(?:pick up|go get|buy|get|purchase|purchasing|cover|pay|send|sending|transfer|wire|move|deposit|convert|put|withdraw|go|use|make|read|give|tell|text|share|provide|forward|disclose|reply with|reply|copy|type back|photograph|uncover|install|download|open|add|approve|accept|run|start|allow|grant|call|ring|phone|dial|contact|need)\b/gi;
  const GIFT = /\b(?:gift[ -]?cards?|itunes cards?|google play cards?|steam cards?|vanilla gift cards?|ebay gift cards?|apple (?:prepaid )?store[ -]value cards?|apple prepaid store cards?)\b/i;
  const CODE = /\b(?:numbers?|pins?|(?:redemption )?codes?|redemption strings?|characters(?=[^.!?\n]{0,45}\bscratch panels?))\b/i;
  const BACK_PHOTO = /\b(?:photos?|pictures?|pics?|images?|screenshots?)\s+of\s+(?:the\s+|each\s+|both\s+|all\s+)?backs?\b/i;
  const ACCOUNT_TEXT = /\b(?:login|sign[ -]in|authentication|one[ -]time)\s+(?:text|notice|codes?|passcodes?|otp)\b/i;
  const SECRET = /\b(?:code|pin|otp|passcode|password|verification number|security code)\b/i;
  const WIRE = /\b(?:bitcoin|btc|crypto(?:currency)?|usdt|tether|ethereum|wire (?:transfer|payment)|bank wire|by wire|western union|moneygram)\b/i;
  const REMOTE = /\b(?:anydesk|teamviewer|logmein|ultraviewer|supremo|quick ?assist|remote (?:access|control|desktop|session)|screen[ -]?shar(?:e|ing)|(?:your|the|my) screen)\b/i;
  const REMOTE_TOOL = /\b(?:anydesk|teamviewer|quicksupport|logmein|screenconnect|rustdesk|ultraviewer)\b/i;
  const PURPOSE = /\b(?:payment|pay|fees?|fines?|bills?|debts?|tax(?:es)?|bail|tolls?|(?:restore|release|unlock)(?:\s+\w+){0,3}\s+account)\b/i;
  const REPORT = /\b(?:scam{2}ers?|fraudsters?|criminals?|an example scam|example (?:message|scam)|beware of|watch (?:out )?for|never ask you to|will not ask you to)\b/i;
  // The cue must name the asker, not just occur earlier in the clause. Allow only
  // bounded descriptions and a closed list of modifiers; a new asker breaks the link.
  const REPORT_SUBJECT = /\b(?:scam{2}ers?|fraudsters?|criminals?|scam (?:callers?|texts?|emails?|messages?)|(?:an )?example (?:message|scam)|(?:beware of|watch (?:out )?for)\s+(?:texts?|messages?))(?:\s+(?:posing as|pretending to be|claiming to be|impersonating)\s+(?:the\s+)?(?!(?:we|our|and|who)\b)[a-z][\w-]*(?:\s+(?!(?:we|our|and|who|may|might|will|could|can|would|often|sometimes|usually|also|typically)\b)[a-z][\w-]*){0,2})?(?:\s+who\s+(?:calls?|texts?))?(?:\s+(?:may|might|will|could|can|would|often|sometimes|usually|also|typically)){0,3}\s*$/i;
  // "Ask you to", "tell you that you must", "demand that you", or "request: ...".
  const ASKING = /\b(?:ask(?:s|ing)?|tell(?:s|ing)?|demand(?:s|ing)?|request(?:s|ing)?|instruct(?:s|ing)?|urg(?:e|es|ing)|pressur(?:e|es|ing)|want(?:s|ing)?)\b(?:\s+(?:(?:you|us|me|them|victims|seniors|customers)\s+)?to\s+|\s+(?:(?:you\s+)?that\s+)?you\s+(?:(?:must|should|need to|have to)\s+)?|\s*:\s*)/gi;
  const OWN_NEED = /\b(?:we|i|(?:our|the|your)\s+(?:[a-z][\w-]*\s+){0,2}(?:technician|team|agent|representative|specialist|support team|manager))\s+(?:(?:will|may)\s+)?need(?:s|ed)?\s+you\s+to\s*(?:please\s*)?$/i;
  const NEED_COMPLEMENT = /\bneed(?:s|ed)?\s+you\s+to\s*(?:please\s*)?$/i;

  function ownNeedBefore(prefix) {
    const need = prefix.match(OWN_NEED);
    return !!need && !/\b(?:if|when|unless|posing as|pretending to be|claiming to be|impersonating)\s*$/i.test(prefix.slice(0, need.index));
  }

  function askingBefore(prefix) {
    return [...prefix.matchAll(ASKING)].find(m => /^\s*(?:please\s*)?$/i.test(prefix.slice(m.index + m[0].length)));
  }

  // Recognize the sender positively. An unfamiliar asker is not evidence that
  // the sender made this request. A named subject must begin a statement.
  function senderAsker(prefix, senderLabel) {
    const modifiers = /\s+(?:may|might|will|could|can|would|often|sometimes|usually|also|typically)\s*$/i;
    let subject = prefix.trim();
    for (let i = 0; i < 3 && modifiers.test(subject); i++) subject = subject.replace(modifiers, '').trim();
    const personal = subject.match(/\b(?:we|i|our team)$/i);
    if (personal) return !/\b(?:if|when|unless|posing as|pretending to be|claiming to be|impersonating)\s*$/i.test(subject.slice(0, personal.index));
    const statement = subject.split(/[:,;.!?\n]|\b(?:and|but|however|instead|so)\b/i).pop().trim().toLowerCase();
    return statement === 'chase' || !!senderLabel && statement === senderLabel.toLowerCase();
  }
  const NEGATION = /\b(?:do not|don['’]t|dont|never|must not|will not|won['’]t|cannot|can['’]t)\s+(?:(?:ever|please|just|even|again)\s+){0,3}$/i;
  const PRESSURE = /\b(?:(?:do not|don['’]t|dont)\s+tell\s+(?:mom|dad|mother|father|your family|your bank|the bank|anyone|anybody)|keep (?:this|it) (?:between us|secret)|(?:do not|don['’]t|dont) hang up|stay on the line)\b/i;
  const URGENT = /\b(?:urgent(?:ly)?|right now|now|today|at once|act now|right away|im{2}ediately|asap|within \d{1,3}\s*(?:minutes?|hours?))\b/i;
  const THREAT = /\b(?:arrest(?:ed)?|jail|fines?|account(?:\s+\w+){0,3}\s+(?:closed|closure|locked|loss|compromised|frozen)|(?:freeze|close|lock) (?:this|your) (?:bank )?account|registration (?:suspension|hold)|lose (?:your )?(?:funds|money)|loss of (?:funds|money)|service disconnection|(?:device|computer)(?:\s+\w+){0,3}\s+locked)\b/i;

  // T1-CODE: the secret must be the direct object, after at most a recipient and two modifiers.
  const SECRET_OBJECT = /\b(?:codes?|pins?|otps?|passcodes?|passwords?)\b/i;
  const OBJECT_GAP = /^\s*(?:(?:me|us|them|him|her|back|to me|to us)\s+)?(?:(?:the|your|that|this|those|these|their|any)\s+)?(?:[\w-]+\s+){0,2}$/i;
  // Codes that are not secrets, or that T1-GIFT already judges.
  const NOT_SECRET = /\b(?:promo(?:tional)?|coupon|discount|zip|postal|area|qr|bar|referral|invite|invitation|gift[ -]?cards?|confirmation|tracking|reference|order|booking|pick-?up|voucher|redemption|rewards?|offer|country|dial)\s+$/i;


  const FINANCIAL_ALARM = /\b(?:charges?|(?:payment|debit)\b[^!?\n]{0,60}\b(?:approved|attempted|queued|authorized)|(?:approved|attempted|queued|authorized)\b[^!?\n]{0,40}\b(?:payment|debit)|refunds?|disputes?|suspension|suspended|account(?:\s+\w+){0,3}\s+locked)\b/i;



  // T1-CALLBACK: a device alarm paired with a demand to call. Real security warnings
  // from Microsoft and other vendors do not include a phone number to call.
  const DEVICE_ALARM = /\b(?:(?:device|computer|pc|laptop|mac|system|windows|browser|iphone|phone)\b[^.!?\n]{0,25}\b(?:is|has been|was|are|have been|may be)\s+(?:locked|infected|hacked|compromised|blocked|disabled|at risk)|infected with (?:a |an )?(?:virus|viruses|malware|trojan|spyware)|(?:virus|viruses|malware|trojan|spyware|ransomware)\s+(?:detected|found|alert|warning|infection)|(?:hackers?|someone) (?:has |have )?(?:accessed|hacked|breached) your (?:computer|device|pc|laptop|phone))\b/i;
  // "Fraudsters may say your computer is infected and ask ..." retains its
  // subject. Limit coordination to this alarm form; "and we ask" cannot match.
  const ALARM_COORDINATION = /\bsay\s+(?:your|the)\s+(?:computer|device|pc|laptop|phone|system)\s+is\s+(?:locked|infected|hacked|compromised|blocked)\s+and\s*$/i;
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
    const quotes = /["“][^"”]*["”]|(?<!\w)['‘][\s\S]*?['’](?!\w)/g;
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
      // An SMS wrap after an unfinished asking complement is not a new demand.
      // Keep original positions and line breaks for source spans.
      if (m[0] === '\n' && (askingBefore(text.slice(start, m.index + 1)) || NEED_COMPLEMENT.test(text.slice(start, m.index + 1)))) continue;
      if (text.slice(start, m.index).trim()) clauses.push({ start, end: m.index, text: text.slice(start, m.index) });
      start = m.index + m[0].length;
    }
    if (text.slice(start).trim()) clauses.push({ start, end: text.length, text: text.slice(start) });
    for (const c of clauses) {
      c.reportRanges = reports.filter(r => r.start < c.end && r.end > c.start)
        .map(r => ({ start: Math.max(0, r.start - c.start), end: Math.min(c.text.length, r.end - c.start) }));
      c.inReport = c.reportRanges.some(r => r.start === 0 && r.end === c.text.length);
    }
    return clauses;
  }

  const skip = clause => !clause || clause.inReport;

  function reportingSubject(prefix) {
    const coordination = prefix.match(ALARM_COORDINATION);
    return REPORT_SUBJECT.test(coordination ? prefix.slice(0, coordination.index) : prefix);
  }

  // A cue must be the subject of an asking verb whose complement contains this demand.
  // Commas and a new instruction end that reach; a warning after the demand cannot hide it.
  function reportedAt(clause, demandIndex) {
    if ((clause.reportRanges || []).some(r => demandIndex >= r.start && demandIndex < r.end)) return true;
    const clauseText = clause.text;
    // inReport covers later clauses of a quoted example. Its first clause can start
    // before the opening quote, so preserve that quoted span here as well.
    for (const quote of clauseText.matchAll(/["“][^"”]*(?:["”]|$)/g)) {
      if (demandIndex <= quote.index || demandIndex >= quote.index + quote[0].length) continue;
      const before = clauseText.slice(0, quote.index);
      if (REPORT.test(before) || /\b(?:says?|said|reads?|example|quoted|warning)[^.!?]{0,40}$/i.test(before)) return true;
    }
    const prefix = clauseText.slice(0, demandIndex).replace(/\r?\n/g, ' ');
    const segment = prefix.split(/[,;.!?\n]|\b(?:so|because|since|but|however|instead)\b/i).pop();
    for (const asking of segment.matchAll(ASKING)) {
      if (/\b(?:you must|you need to|you have to|you should)\b/i.test(segment.slice(asking.index + asking[0].length))) continue;
      if (reportingSubject(segment.slice(0, asking.index)) || isNegated(segment, asking.index)) return true;
    }
    return false;
  }

  // Context and antecedents need the same scope check at their own position.
  function unreportedMatch(clause, pattern) {
    if (skip(clause)) return null;
    return [...clause.text.matchAll(new RegExp(pattern.source, 'gi'))]
      .find(hit => !reportedAt(clause, hit.index)) || null;
  }

  // Is the verb after `prefix` an instruction to the reader? "Please send", "Chase: Send",
  // "You must send", "To fix it, send". priorDemand also allows "... and send" after an earlier demand.
  function directAction(prefix, priorDemand, senderLabel) {
    if (NEGATION.test(prefix) || /["“][^"”]*$/.test(prefix)) return false;
    const rest = prefix.replace(/^\s*[^:]{1,60}:\s*/, '');
    const asking = askingBefore(prefix);
    if (asking) return senderAsker(prefix.slice(0, asking.index), senderLabel) && !isNegated(prefix, asking.index);
    // Seeing "need you to" does not identify the sender. Unknown subjects stay
    // quiet even with "please" or an SMS wrap before the action.
    if (NEED_COMPLEMENT.test(prefix)) return ownNeedBefore(prefix);
    if (/^\s*(?:please\s+)?$/i.test(rest)) return true;
    // A short warning/purpose preface does not turn the following imperative
    // into reported speech, even when its comma is omitted in a text message.
    if (/^\s*(?:beware of|to avoid)\s+(?:hackers?|fraudsters?|scam{2}ers?|criminals?|scams?)\s*[:,]?\s*(?:please\s*)?$/i.test(rest)) return true;
    if (/^\s*(?:to|in order to|before|so|due to|because of|after)\s[^,]{1,60},\s*(?:please\s+)?$/i.test(rest)) return true;
    if (/^\s*(?:please\s+)?(?:avoid|prevent|stop|resolve|settle|clear)\b[^.!?\n]{0,60}\bby\s*$/i.test(rest) && !/\b(?:ask|asks|asking|told|tell|tells|says|say|said|never|not)\b/i.test(rest)) return true;
    if (/^\s*to avoid (?:power|service|account) (?:shutoff|closure|disconnection|suspension)\s+(?:please\s+)?$/i.test(rest)) return true;
    if (/\b(?:please|you must|you need to|you have to|you should|can you|could you|would you|will you)\s*$/i.test(rest)) return true;
    if (/^\s*if [^,]{1,140},\s*(?:please\s+)?$/i.test(rest)) return true;
    if (/^\s*in [^,]{1,60},\s*(?:please\s+)?$/i.test(rest)) return true;
    if (/,\s*so\s+(?:please\s+)?$/i.test(rest)) return true;
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
      let pressure = unreportedMatch(own, PRESSURE);
      if (pressure && SECRET.test(own.text.slice(pressure.index + pressure[0].length))) pressure = null;
      const hit = pressure || unreportedMatch(own, URGENT) || unreportedMatch(own, THREAT);
      if (hit && !casual(own.text)) return spanOf(raw, own, hit);
    }
    for (const other of [clauses[index - 1], clauses[index + 1]]) {
      if (skip(other)) continue;
      const text = other.text.trim();
      // Secrecy counts only in the demand's own clause or the clause right after it.
      let hit = other === clauses[index + 1] ? unreportedMatch(other, PRESSURE) : null;
      if (hit && !SECRET.test(other.text) && text.length < 100 &&
          /^(?:(?:please|and)\s+)?(?:(?:do not|don['’]t|dont) tell|keep (?:this|it)|(?:do not|don['’]t|dont) hang up|stay on the line)/i.test(text)) return spanOf(raw, other, hit);
      hit = unreportedMatch(other, URGENT) || unreportedMatch(other, THREAT);
      if (hit && !casual(text) && /^(?:urgent\b|(?:do (?:it|this|that)|this is|you must act|otherwise|or\b|your (?:bank )?account|you will be arrested|your device|your computer|to avoid)\b)/i.test(text)) return spanOf(raw, other, hit);
    }
    return null;
  }

  // The last account secret named in some text, unless it is a promo, household or gift-card code.
  function secretBefore(text) {
    const all = [...text.matchAll(new RegExp(SECRET_OBJECT.source, 'gi'))];
    const last = all[all.length - 1];
    if (!last) return ACCOUNT_TEXT.test(text);
    const before = text.slice(0, last.index);
    return !NOT_SECRET.test(before) && !HOUSEHOLD.test(before) && !HOUSEHOLD_AFTER.test(text.slice(last.index + last[0].length));
  }

  /* ---------- Tier 1 rules ----------
     Each rule looks at one direct demand `d`: { verb, clause, index, tail, near, action, after }
     (tail: text after the verb; near: its first 40 characters; after: tail's offset in the clause). */

  // T1-GIFT: "buy gift cards to pay the fine", "pay with gift cards".
  function giftPayment(d, s) {
    let hit = /^(?:buy|purchase|pay)$/.test(d.verb) && d.near.match(GIFT);
    if (!hit && d.verb === 'pay') {
      const longer = d.tail.slice(0, 80).match(GIFT);
      if (longer && /\b(?:with|using|in)\s+(?:[a-z]+\s+){0,3}$/i.test(d.tail.slice(0, longer.index))) hit = longer;
    }
    if (!hit) return;
    if (d.verb === 'pay' && /\b(?:buy|purchase)\b/i.test(d.tail.slice(0, hit.index))) return;
    const gift = spanOf(s.raw, d.clause, hit, d.after);
    const offset = gift.end - d.clause.start;
    const purpose = d.clause.text.slice(offset).match(/^\s+(?:to (?:pay|cover|settle)\b|(?:as|for)\s+(?:(?:a|the|this|your)\s+)?(?:payment|fees?|fines?|bills?|debts?|tax(?:es)?|bail|tolls?)\b|to (?:restore|release|unlock)(?:\s+\w+){0,3}\s+account\b)/i);
    const context = purpose ? spanOf(s.raw, d.clause, purpose, offset) : null;
    // A birthday purpose cannot cancel a purchase instruction's Tier 2 warning.
    s.flag('gift_card_payment', d.action.start, gift.end);
    if (d.verb === 'pay' || context) {
      s.tier1('T1-GIFT', d, gift, context);
    } else if (PURPOSE.test(d.clause.text)) {
      // "Buy gift cards ... and pay for lunch": a payment nearby, but not clearly for the cards.
      s.unresolved.push({ id: 'unclear_gift_payment_purpose', action: d.action, clause: s.clauseSpan(d.clause), object: gift });
    }
  }

  function giftForSender(d, s) {
    if (!/^(?:buy|purchase|get|pick up|cover)$/.test(d.verb)) return;
    const hit = d.near.match(GIFT);
    if (!hit) return;
    const context = contextMatch(s, /\b(?:reimburse(?:ment)?|pay you back|put it on my tab|for (?:the|our|my) (?:team|project|clients)|for clients|in a meeting|can['’]?t (?:talk|leave)|cannot (?:talk|leave))\b/i, d.index);
    if (!context) return;
    const object = spanOf(s.raw, d.clause, hit, d.after);
    s.flag('gift_card_purchase', d.action.start, object.end);
    s.tier1('T1-GIFT', d, object, context);
  }

  // T1-GIFT: "buy gift cards ... send me the codes". Returns true when it fires.
  function giftCodes(d, s) {
    if (!/^(?:send|read|give|tell|text|share|provide|forward|disclose|reply with|photograph)$/.test(d.verb)) return false;
    const hit = d.tail.slice(0, 100).match(CODE) || d.near.match(BACK_PHOTO) ||
                (d.verb === 'photograph' && d.near.match(/\bbacks?\b/i));
    if (!hit) return false;
    const code = spanOf(s.raw, d.clause, hit, d.after);
    // The gift card can be named in this clause or the one before.
    let cardClause = d.clause, card = unreportedMatch(d.clause, GIFT);
    if (!card && !skip(s.clauses[d.index - 1])) {
      cardClause = s.clauses[d.index - 1];
      card = unreportedMatch(cardClause, GIFT);
    }
    const explicitRequester = /\b(?:me|us|to me|to us|back to me|back to us|to (?:the )?(?:requester|caller))\b/i.test(d.tail.slice(0, 80));
    const otherRecipient = /\b(?:to|with)\s+(?!(?:me|us|this (?:chat|thread)|the (?:requester|caller))\b)/i.test(d.tail.slice(0, 100));
    const toRequester = explicitRequester || (d.verb !== 'photograph' && !otherRecipient);
    // An OTP or credit card nearby makes it unclear which code is meant.
    const competing = /\b(?:otp|one[ -]time|authorization|verification|password|credit card|debit card)\b/i.test(d.clause.text + ' ' + (cardClause === d.clause ? '' : cardClause.text));
    if (card && toRequester && !competing && !/\b(?:checkout|retailer|redeem at)\b/i.test(d.tail)) {
      s.flag('gift_card_disclosure', d.action.start, code.end);
      s.tier1('T1-GIFT', d, code, null, spanOf(s.raw, cardClause, card));
      return true;
    }
    if (card && toRequester && competing) s.unresolved.push({ id: 'competing_card_code_antecedent', action: d.action, clause: s.clauseSpan(d.clause) });
    return false;
  }

  // Find an unreported wire/crypto object on either side of an action, within
  // the same sentence segment. Do not borrow it across commas or connectors.
  function wireInSegment(d, raw) {
    const text = d.clause.text, actionIndex = d.action.start - d.clause.start;
    let start = 0, end = text.length;
    for (const cut of text.matchAll(/[,;.!?\n]|\b(?:so|because|since|but|however|instead)\b/gi)) {
      // Thousands separators and decimal points are part of the amount.
      if (/^[,.]$/.test(cut[0]) && /\d/.test(text[cut.index - 1]) && /\d/.test(text[cut.index + 1])) continue;
      if (cut.index < actionIndex) start = cut.index + cut[0].length;
      else { end = cut.index; break; }
    }
    for (const hit of text.slice(start, end).matchAll(new RegExp(WIRE.source, 'gi'))) {
      if (!reportedAt(d.clause, start + hit.index)) return spanOf(raw, d.clause, hit, start);
    }
    return null;
  }

  // T1-WIRE: crypto or a wire transfer, with pressure tied to it.
  function wireTransfer(d, s) {
    if (!/^(?:pay|send|transfer|wire|use|make|move|deposit|convert|put)$/.test(d.verb)) return;
    if (/^(?:use|make)$/.test(d.verb) && !/^\s+(?:(?:a|the|your)\s+)?(?:bank\s+)?wire\b/i.test(d.tail)) return;
    if (d.verb === 'wire' && /^\s+(?:transfer|payment)\s+(?:confirmation|receipt|notice|status)\b/i.test(d.tail)) return;
    let object;
    let antecedent = null;
    if (/^(?:deposit|put|move)$/.test(d.verb)) object = wireInSegment(d, s.raw);
    else {
      let hit = d.near.match(WIRE);
      if (!hit && d.verb === 'wire') hit = d.near.match(/(?:\$\s*\d[\d,.]*|\b(?:money|funds|payment|balance)\b)/i);
      if (!hit && /^(?:send|transfer)$/.test(d.verb)) {
        const previous = s.clauses[d.index - 1];
        const pronoun = d.near.match(/^\s+(?:it|that payment|that amount)\b/i);
        const priorWire = previous && unreportedMatch(previous, /\b(?:bank )?wire(?: (?:transfer|payment))?\b/i);
        if (pronoun && priorWire && /\$\s*\d/.test(previous.text) && !/\b(?:receipt|confirmation|completed|sent|received)\b/i.test(previous.text)) {
          hit = pronoun;
          antecedent = spanOf(s.raw, previous, priorWire);
        }
      }
      if (hit) object = spanOf(s.raw, d.clause, hit, d.after);
    }
    if (!object) return;
    s.flag('crypto_or_wire', Math.min(d.action.start, object.start), Math.max(d.action.end, object.end));
    // The added movement verbs establish a warning, not new Tier 1 proof.
    if (!/^(?:pay|send|transfer|wire|use|make)$/.test(d.verb)) return;
    const context = tiedPressure(s.clauses, d.index, s.raw);
    if (context) s.tier1('T1-WIRE', d, object, context, antecedent);
  }

  // T1-REMOTE: named tool requests need no pressure; generic remote access retains its pressure check.
  function remoteAccess(d, s) {
    if (!/^(?:install|download|open|add|approve|accept|run|start|allow|grant|share)$/.test(d.verb)) return;
    const named = d.near.match(REMOTE_TOOL);
    if (named && /\b(?:article|guide|documentation|about|website|page)\b/i.test(d.near.slice(0, named.index))) return;
    let object = named && spanOf(s.raw, d.clause, named, d.after);
    let antecedent = null;
    const sessionObject = /\b(?:session(?: id| number)?|connection(?: id| number)?|access|request|id)\b/i;
    if (d.verb === 'share' && !sessionObject.test(d.near)) return;
    if (!object && /^(?:approve|accept|share|allow|grant)$/.test(d.verb)) {
      const session = d.near.match(sessionObject);
      const tool = contextMatch(s, REMOTE_TOOL, d.index);
      if (session && tool) { object = spanOf(s.raw, d.clause, session, d.after); antecedent = tool; }
    }
    if (object) {
      s.flag('remote_access', d.action.start, object.end);
      s.tier1('T1-REMOTE', d, object, null, antecedent);
      return;
    }
    const hit = d.near.match(REMOTE);
    if (!hit) return;
    object = spanOf(s.raw, d.clause, hit, d.after);
    s.flag('remote_access', d.action.start, object.end);
    const context = tiedPressure(s.clauses, d.index, s.raw);
    if (context) s.tier1('T1-REMOTE', d, object, context);
  }

  function contextMatch(s, pattern, index, radius = 1) {
    for (const clause of s.clauses.slice(Math.max(0, index - radius), index + radius + 1)) {
      const hit = unreportedMatch(clause, pattern);
      if (hit && !isNegated(clause.text, hit.index) &&
          !/\b(?:not|no)\s+(?:(?:a|an|any)\s+)?$/i.test(clause.text.slice(0, hit.index))) return spanOf(s.raw, clause, hit);
    }
    return null;
  }

  function emergencyMoney(d, s) {
    if (!/^(?:send|give|transfer|wire|pay|need)$/.test(d.verb)) return;
    const hit = d.near.match(/(?:\b(?:money|funds|bail)\b|[$£€]\s*\d[\d,.]*)/i);
    if (!hit || !/^\s*(?:(?:me|us|him|her|them)\s+)?(?:(?:some|more|the|your|our|my|a little|a bit of)\s+)?$/i.test(d.near.slice(0, hit.index))) return;
    const secrecy = contextMatch(s, /\b(?:(?:don['’]?t|do not) tell (?:mom|dad|mother|father|anyone|anybody|your family)|keep (?:this|it) (?:between us|secret|private))\b/i, d.index, 2);
    const emergency = contextMatch(s, /\b(?:emergency|urgent(?:ly)?|right now|right away|immediately|asap|at once|in trouble|arrested|jail|bail|accident|hospital|stranded|within \d+ (?:minutes?|hours?))\b/i, d.index, 2);
    if (!secrecy || !emergency) return;
    const object = spanOf(s.raw, d.clause, hit, d.after);
    s.flag('secret_emergency_money', d.action.start, object.end);
    s.tier1('T1-COMBO', d, object, emergency, secrecy);
  }

  function financialCallback(d, s) {
    if (!/^(?:call|ring|phone|dial)$/.test(d.verb)) return;
    const alarm = contextMatch(s, FINANCIAL_ALARM, d.index, s.clauses.length);
    if (!alarm) return;
    // Only a number being called qualifies, never an unrelated number elsewhere in the text.
    let numbers = T.extractTargets(d.tail).targets.filter(t => t.kind === 'phone');
    if (TRUSTED_CALL.test(d.tail.slice(0, numbers.length ? numbers[0].at[0] : 100))) return;
    let offset = d.clause.start + d.after;
    if (!numbers.length && /^\s+(?:us|me|this number|the number|that number|it)\b/i.test(d.tail)) {
      numbers = T.extractTargets(s.raw).targets.filter(t => t.kind === 'phone' && s.clauses.some(c =>
        t.at[0] >= c.start && t.at[0] < c.end && !skip(c) && !reportedAt(c, t.at[0] - c.start)));
      offset = 0;
    }
    for (const phone of numbers) {
      const object = span(s.raw, offset + phone.at[0], offset + phone.at[1]);
      s.flag('financial_callback', d.action.start, d.action.end);
      const org = s.options.claimOrg;
      const listed = org && T.listedFor({ orgs: [org] }, phone).length;
      // Retain the Tier 2 finding even for reviewed numbers: the message is not authenticated.
      if (!listed) s.tier1('T1-CALLBACK', d, object, alarm);
    }
  }

  // T1-CALLBACK: "call this number" anywhere in a message that raises a device alarm.
  function techSupportCall(d, s) {
    const hit = /^(?:call|dial|contact)$/.test(d.verb) && d.tail.match(CALL_OBJECT);
    if (!hit || TRUSTED_CALL.test(d.tail.slice(0, 80))) return;
    let alarm = null;
    for (const clause of s.clauses) {
      if (skip(clause)) continue;
      const found = unreportedMatch(clause, DEVICE_ALARM);
      if (found) { alarm = spanOf(s.raw, clause, found); break; }
    }
    if (!alarm) return;
    const number = spanOf(s.raw, d.clause, hit, d.after);
    s.flag('tech_support_call', d.action.start, number.end);
    const phones = T.extractTargets(d.tail).targets.filter(t => t.kind === 'phone');
    const listed = phones.length && s.options.claimOrg && phones.every(phone =>
      T.listedFor({ orgs: [s.options.claimOrg] }, phone).length);
    if (!listed) s.tier1('T1-CALLBACK', d, number, alarm);
  }

  // T1-CODE: give a sign-in code, PIN or password to the requester. No pressure is needed:
  // no organization asks for one this way. Also "read it back to me" after a named code.
  function shareSecret(d, s) {
    if (!/^(?:send|read|give|tell|text|share|provide|forward|disclose|reply with|copy|type back)$/.test(d.verb)) return;
    const previous = s.clauses[d.index - 1];
    const giftContext = unreportedMatch(d.clause, GIFT) || (previous && unreportedMatch(previous, GIFT));
    if (giftContext && !/\b(?:otp|one[ -]time|authorization|verification|password|credit card|debit card)\b/i.test(d.clause.text)) return;
    const accountSecret = /\b(?:(?:bank|account|sign[- ]in|login)(?:\s+[\w-]+){0,2}\s+codes?|passwords?|pins?|otps?)\b/i.test(d.tail);
    if (IN_PERSON.test(d.clause.text) && !accountSecret) return;
    const pronoun = d.verb !== 'reply with' && d.near.match(/^\s+(?:it|them)\b/i);
    const recipient = tail => REQUESTER.test(tail) || /\b(?:here|into this chat|into this thread)\b/i.test(tail);
    if (pronoun && recipient(d.tail.slice(pronoun[0].length, 65))) {
      if (secretBefore(d.clause.text.slice(0, d.action.start - d.clause.start)) || (previous && !previous.inReport && secretBefore(previous.text))) {
        const object = spanOf(s.raw, d.clause, pronoun, d.after);
        s.flag('share_code', d.action.start, object.end);
        s.tier1('T1-CODE', d, object, null);
        return;
      }
    }
    const accountContext = ACCOUNT_TEXT.test(d.clause.text) || (previous && !skip(previous) && ACCOUNT_TEXT.test(previous.text));
    const hit = d.near.match(SECRET_OBJECT) || (accountContext && d.near.match(/\b(?:six|6)(?:[ -](?:digit|number)|\s+digits?|\s+numbers?)\b/i));
    if (!hit) return;
    const gap = d.near.slice(0, hit.index);
    const toRequester = /^(?:read|give|tell|reply with|type back)$/.test(d.verb) || recipient(d.tail.slice(0, 100));
    const household = HOUSEHOLD.test(gap) || HOUSEHOLD_AFTER.test(d.near.slice(hit.index + hit[0].length) + d.tail.slice(40, 70));
    if (OBJECT_GAP.test(gap) && !NOT_SECRET.test(gap) && !household && toRequester) {
      const object = spanOf(s.raw, d.clause, hit, d.after);
      s.flag('share_code', d.action.start, object.end);
      s.tier1('T1-CODE', d, object, null);
    }
  }

  // Finds every direct demand and runs the Tier 1 rules on it, in this order.
  function tier1Signals(text, raw, options) {
    const clauses = clausesOf(text);
    // A label is a claimed sender, not proof of identity or a trusted record.
    const label = text.match(/^\s*([a-z][a-z0-9 &'’-]{0,59}):/i);
    const senderLabel = label ? label[1].trim() : null;
    const s = {
      raw, clauses, options, flags: [], established: [], unresolved: [],
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
        if (reportedAt(clause, m.index)) continue;
        if (!directAction(clause.text.slice(0, m.index), priorDemand, senderLabel) &&
            !(m[0].toLowerCase() === 'need' && /^\s*(?:(?:grandma|grandpa|mom|dad),?\s*)?i\s*$/i.test(clause.text.slice(0, m.index)))) continue;
        priorDemand = true;
        const tail = clause.text.slice(m.index + m[0].length);
        const verb = m[0].toLowerCase();
        const d = { verb: verb === 'purchasing' ? 'purchase' : verb === 'sending' ? 'send' : verb, clause, index, tail, near: tail.slice(0, 40), action: spanOf(raw, clause, m), after: m.index + m[0].length };
        giftPayment(d, s);
        giftForSender(d, s);
        emergencyMoney(d, s);
        const giftCodeFound = giftCodes(d, s);
        wireTransfer(d, s);
        remoteAccess(d, s);
        techSupportCall(d, s);
        financialCallback(d, s);
        if (!giftCodeFound) shareSecret(d, s);
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
    if (/^\s+(?:(?:the|your|this|that|a)\s+)?(?:(?:verification|security|sign-in)\s+)?(?:code|pin|password|passcode|otp)\b/i.test(text.slice(m.index + m[0].length))) return false;
    const parts = text.slice(Math.max(0, m.index - 180), m.index).split(/[.!?;\n]/).filter(p => p.trim());
    const before = parts[parts.length - 1] || '';
    const prior = parts[parts.length - 2] || '';
    const validity = /^\s*valid for \d+ minutes?\s*$/i.test(before) && SECRET_OBJECT.test(prior);
    return !(/^keep (?:this|it) private$/i.test(m[0]) && (SECRET_OBJECT.test(before) || validity));
  }

  function feeWording(text, m, clause) {
    const before = text.slice(clause.start, m.index);
    const after = text.slice(m.index + m[0].length, clause.end);
    return !/\b(?:no|without)\s+(?:(?:a|any|the)\s+)?$/i.test(before) && !/^\s+(?:is|will be)\s+(?:not|never)\s+(?:due|required|charged)\b/i.test(after);
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
    { id: 'pay_fee', level: 'medium', accept: feeWording, patterns: [
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
  function requestSignals(text, raw, options) {
    const s = tier1Signals(text, raw, options);
    let flags = s.flags;
    for (const flag of WORDING_FLAGS) {
      // A Tier 1 rule already reported this signal with its exact action.
      if (flags.some(f => f.id === flag.id)) continue;
      for (const pattern of flag.patterns) {
        const hit = [...text.matchAll(new RegExp(pattern.source, 'gi'))].find(m => {
          const clause = s.clauses.find(c => m.index >= c.start && m.index < c.end);
          if (clause && (clause.inReport || reportedAt(clause, m.index - clause.start))) return false;
          if (flag.negatable && isNegated(text, m.index)) return false;
          return !flag.accept || !clause || flag.accept(text, m, clause);
        });
        if (!hit) continue;
        flags.push({ id: flag.id, level: flag.level, words: raw.slice(hit.index, hit.index + hit[0].length), start: hit.index, end: hit.index + hit[0].length });
        break;
      }
    }
    // A plain code request inside a gift-card code request is the same signal.
    flags = flags.filter(f => f.id !== 'share_code' || !flags.some(g => g.id === 'gift_card_disclosure' && f.start >= g.start && f.end <= g.end));
    // A purchase-only warning is already represented when that same card is
    // the antecedent of a proved disclosure. Keep independently proved payments.
    flags = flags.filter(f => f.id !== 'gift_card_payment' ||
      s.established.some(e => e.ruleId === 'T1-GIFT' && e.action.start === f.start && !e.antecedent) ||
      !s.established.some(e => e.ruleId === 'T1-GIFT' && e.antecedent && e.antecedent.end === f.end));
    const highs = flags.filter(f => f.level === 'high').length;
    const mediums = flags.filter(f => f.level === 'medium').length;
    const level = highs > 0 || mediums >= 3 ? 'high' : mediums > 0 ? 'elevated' : 'none';
    return { level, flags, established: s.established, unresolved: s.unresolved };
  }

  // The rules read a cleaned-up view (T.riskView); every span is then moved back to the original text.
  function sourceSignals(source, options = {}) {
    const raw = source == null ? '' : String(source);
    const view = T.riskView(raw);
    const targets = T.extractTargets(view.text);
    const signals = requestSignals(targets.masked, view.text, options);
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

  // Used by domain checks; the host is masked so path/query words cannot invent a demand.
  T.sourceLinkAction = function (source) {
    const raw = String(source), view = T.riskView(raw);
    const text = T.extractTargets(view.text).masked;
    for (const clause of clausesOf(text)) {
      if (skip(clause)) continue;
      for (const hit of clause.text.matchAll(/\b(?:pay|verify|confirm|reschedule|click)\b/gi)) {
        if (reportedAt(clause, hit.index) || !directAction(clause.text.slice(0, hit.index), true)) continue;
        const start = clause.start + hit.index, end = start + hit[0].length;
        const moved = T.sourceSpan(view, raw, start, end);
        return span(raw, moved.start, moved.end);
      }
    }
    return null;
  };
  T.sourceSignals = sourceSignals;
})(typeof window !== 'undefined' ? window : globalThis);
