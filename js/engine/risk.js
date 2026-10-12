/* English request rules, with exact source spans and separate Tier 1 findings.
   Contact tokens are masked at the same offsets before clause detection. */
(function (root) {
  'use strict';
  var T = root.TFS = root.TFS || {};

  var GAP = '[^.!?\\n]{0,40}';
  var SHORT_GAP = '[^.!?\\n]{0,25}';

  function re(src) { return new RegExp(src, 'i'); }

  // Each flag: id, level, and patterns. The first pattern that matches supplies the quoted words.
  var FLAGS = [
    { id: 'share_code', level: 'high', negatable: true, patterns: [
      re('\\b(?:read|tell|give|send|share|provide|reply with|text|forward|say)\\b(?:\\s+(?:us|me|them|him|her|it|back))?\\s+(?:the|your|that|this|their)?\\s*(?:\\w+\\s+)?(?:codes?|pins?|otp|passcodes?|passwords?|verification numbers?|security codes?)\\b')
    ] },
    { id: 'arrest_threat', level: 'high', patterns: [
      re('\\b(?:arrest(?:ed)?|warrant|lawsuit|legal action|jail|deport(?:ed|ation)?)\\b')
    ] },
    { id: 'secrecy', level: 'high', patterns: [
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
    { id: 'login_request', level: 'medium', negatable: true, patterns: [
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

  var ACTIONS = /\b(?:buy|purchase|pay|send|transfer|wire|read|give|tell|text|share|provide|reply with|install|download|run|start|allow|grant|call|dial|contact)\b/gi;
  var GIFT = /\b(?:gift[ -]?cards?|itunes cards?|google play cards?|steam cards?|vanilla gift cards?|ebay gift cards?)\b/i;
  var CODE = /\b(?:numbers?|pins?|(?:redemption )?codes?)\b/i;
  var SECRET = /\b(?:code|pin|otp|passcode|password|verification number|security code)\b/i;
  var WIRE = /\b(?:bitcoin|btc|crypto(?:currency)?|usdt|tether|ethereum|wire (?:transfer|payment)|western union|moneygram)\b/i;
  var REMOTE = /\b(?:anydesk|teamviewer|logmein|ultraviewer|supremo|quick ?assist|remote (?:access|control|desktop|session)|screen[ -]?shar(?:e|ing)|(?:your|the|my) screen)\b/i;
  var PURPOSE = /\b(?:payment|pay|fees?|fines?|bills?|debts?|tax(?:es)?|bail|tolls?|(?:restore|release|unlock)(?:\s+\w+){0,3}\s+account)\b/i;
  var REPORT = /\b(?:scam{2}ers?|fraudsters?|criminals?|an example scam|example (?:message|scam)|beware of|watch (?:out )?for|never ask you to|will not ask you to)\b/i;
  var NEGATION = /\b(?:do not|don['’]t|dont|never|must not|will not|won['’]t|cannot|can['’]t)\s+(?:(?:ever|please|just|even|again)\s+){0,3}$/i;
  var PRESSURE = /\b(?:(?:do not|don['’]t|dont)\s+tell\s+(?:mom|dad|mother|father|your family|your bank|the bank|anyone|anybody)|keep (?:this|it) (?:between us|secret)|(?:do not|don['’]t|dont) hang up|stay on the line)\b/i;
  var URGENT = /\b(?:urgent(?:ly)?|right now|today|at once|act now|right away|im{2}ediately|asap|within \d{1,3}\s*(?:minutes?|hours?))\b/i;
  var THREAT = /\b(?:arrest(?:ed)?|jail|fines?|account(?:\s+\w+){0,3}\s+(?:closed|closure|locked|loss)|lose (?:your )?(?:funds|money)|loss of (?:funds|money)|service disconnection|(?:device|computer)(?:\s+\w+){0,3}\s+locked)\b/i;

  // T1-CODE: the secret must be the direct object, after at most a recipient and two modifiers.
  var SECRET_OBJECT = /\b(?:codes?|pins?|otps?|passcodes?|passwords?)\b/i;
  var OBJECT_GAP = /^\s*(?:(?:me|us|them|him|her|back|to me|to us)\s+)?(?:(?:the|your|that|this|those|these|their|any)\s+)?(?:[\w-]+\s+){0,2}$/i;
  // Codes that are not secrets, or that T1-GIFT already judges.
  var NOT_SECRET = /\b(?:promo(?:tional)?|coupon|discount|zip|postal|area|qr|bar|referral|invite|invitation|gift[ -]?cards?|confirmation|tracking|reference|order|booking|pick-?up|voucher|redemption|rewards?|offer|country|dial)\s+$/i;
  // T1-CALLBACK: a device alarm paired with a demand to call. Real security warnings
  // from Microsoft and other vendors do not include a phone number to call.
  var DEVICE_ALARM = /\b(?:(?:device|computer|pc|laptop|mac|system|windows|browser|iphone|phone)\b[^.!?\n]{0,25}\b(?:is|has been|was|are|have been|may be)\s+(?:locked|infected|hacked|compromised|blocked|disabled|at risk)|infected with (?:a |an )?(?:virus|viruses|malware|trojan|spyware)|(?:virus|viruses|malware|trojan|spyware|ransomware)\s+(?:detected|found|alert|warning|infection)|(?:hackers?|someone) (?:has |have )?(?:accessed|hacked|breached) your (?:computer|device|pc|laptop|phone))\b/i;
  var CALL_OBJECT = /^\s+(?:us\b|me\b|them\b|(?:this|the|our|that) (?:toll[- ]free )?(?:number|helpline|hotline)\b|(?:the |a )?(?:microsoft|windows|apple|google|norton|mcafee|geek squad)?\s*(?:tech(?:nical)? |customer |security )?(?:support|helpline|help desk|helpdesk|technicians?)\b|(?:on |at )?\+?1?[\s.\-]?\(?[2-9]\d{2}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}\b|(?:\w+\s+){0,3}(?:at|on)\s+\+?1?[\s.\-]?\(?[2-9]\d{2}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}\b)/i;
  // Calling a number you already trust is the advice, not the trick.
  var TRUSTED_CALL = /\b(?:back of your card|you (?:already )?(?:trust|know)|on your (?:statement|bill)|official (?:website|site|app))\b/i;

  // Household codes family members share: the wifi password, the garage code.
  var HOUSEHOLD = /\b(?:wi-?fi|wireless|network|router|garage|door|gate|alarm|lockbox|locker|keypad|building|house|guest|bike lock|gym)\s+$/i;
  var HOUSEHOLD_AFTER = /^\s+(?:for|to|of)\s+(?:the\s+|your\s+|our\s+|my\s+)?(?:wi-?fi|wireless|network|router|garage|door|front door|gate|alarm|lockbox|locker|keypad|building|house|bike|gym)\b/i;
  var REQUESTER = /\b(?:me|us|them|him|her|back|to (?:the )?(?:agent|caller|representative|rep|officer|technician|team)|our (?:agent|team|representative|staff))\b/i;
  // Handing a delivery or pickup code to a courier in person is how the code is meant to be used.
  var IN_PERSON = /\b(?:driver|courier|delivery (?:associate|person|agent)|cashier|checkout|front desk)\b/i;

  // The last account secret named in some text, unless it is a promo, household or gift-card code.
  function secretBefore(text) {
    var pattern = new RegExp(SECRET_OBJECT.source, 'gi'), m, last = null;
    while ((m = pattern.exec(text)) !== null) last = m;
    if (!last) return false;
    var before = text.slice(0, last.index);
    return !NOT_SECRET.test(before) && !HOUSEHOLD.test(before) && !HOUSEHOLD_AFTER.test(text.slice(last.index + last[0].length));
  }

  function span(raw, start, end) { return { start: start, end: end, quote: raw.slice(start, end) }; }

  function clausesOf(text) {
    var cuts = /[.!?;\n]|\b(?:but|however|instead)\b/gi;
    var clauses = [], start = 0, m;
    var ranges = [], quotes = /["“]([^"”]*)["”]/g, q;
    while ((q = quotes.exec(text)) !== null) {
      var prefix = text.slice(Math.max(0, q.index - 120), q.index).split(/[.!?;\n]/).pop();
      if (REPORT.test(prefix) || /\b(?:example|warning|says?|said|quoted)\b/i.test(prefix)) ranges.push({ start: q.index, end: q.index + q[0].length });
    }
    while ((m = cuts.exec(text)) !== null) {
      if (m[0] === '.' && /\d/.test(text.charAt(m.index - 1)) && /\d/.test(text.charAt(m.index + 1))) continue;
      if (text.slice(start, m.index).trim()) clauses.push({ start: start, end: m.index, text: text.slice(start, m.index) });
      start = m.index + m[0].length;
    }
    if (text.slice(start).trim()) clauses.push({ start: start, end: text.length, text: text.slice(start) });
    clauses.forEach(function (c) {
      c.inReport = ranges.some(function (r) { return c.start >= r.start && c.start < r.end; });
    });
    return clauses;
  }

  function reported(clause) {
    return REPORT.test(clause) || /\b(?:says?|said|reads?|example|quoted|warning)[^.!?]{0,40}["“]/i.test(clause);
  }

  function negatedAction(prefix) { return NEGATION.test(prefix); }

  function directAction(prefix, priorDemand) {
    if (negatedAction(prefix) || /["“][^"”]*$/.test(prefix)) return false;
    var rest = prefix.replace(/^\s*[^:]{1,60}:\s*/, '');
    if (/^\s*(?:please\s+)?$/i.test(rest)) return true;
    // A leading purpose phrase keeps the imperative: "To fix your computer, tell me your password."
    if (/^\s*(?:to|in order to|before|so)\s[^,]{1,60},\s*(?:please\s+)?$/i.test(rest)) return true;
    if (/\b(?:please|you must|you need to|you have to|you should|can you|could you)\s*$/i.test(rest)) return true;
    if (/\b(?:do not|don['’]t|dont|never)\s+(?:delay|wait|tell(?:\s+\w+){1,3}|hang up)\s*,\s*$/i.test(rest)) return true;
    return priorDemand && /(?:\band|\bthen|,)\s*(?:please\s+)?$/i.test(rest);
  }

  function matchedSpan(raw, clause, hit, offset) {
    var start = clause.start + (offset || 0) + hit.index;
    return span(raw, start, start + hit[0].length);
  }

  function giftPaymentContext(clause, gift, raw) {
    var offset = gift.end - clause.start;
    var hit = clause.text.slice(offset).match(/^\s+(?:to (?:pay|cover|settle)\b|(?:as|for)\s+(?:(?:a|the|this|your)\s+)?(?:payment|fees?|fines?|bills?|debts?|tax(?:es)?|bail|tolls?)\b|to (?:restore|release|unlock)(?:\s+\w+){0,3}\s+account\b)/i);
    return hit ? matchedSpan(raw, clause, hit, offset) : null;
  }

  function tiedContext(clauses, index, action, raw) {
    var own = clauses[index], hit;
    if (!own.inReport && !reported(own.text)) {
      var pressure = own.text.match(PRESSURE);
      if (pressure && SECRET.test(own.text.slice(pressure.index + pressure[0].length))) pressure = null;
      hit = pressure || own.text.match(URGENT) || own.text.match(THREAT);
      if (hit && !/\b(?:meeting|lunch|birthday|weather)\b/i.test(own.text)) return matchedSpan(raw, own, hit);
    }
    for (var d = -1; d <= 1; d += 2) {
      var other = clauses[index + d];
      if (!other || other.inReport || reported(other.text)) continue;
      var text = other.text.trim();
      hit = other.text.match(PRESSURE);
      if (hit && !SECRET.test(other.text) && /^(?:(?:please|and)\s+)?(?:(?:do not|don['’]t|dont) tell|keep (?:this|it)|(?:do not|don['’]t|dont) hang up|stay on the line)/i.test(text) && text.length < 100) return matchedSpan(raw, other, hit);
      hit = other.text.match(URGENT) || other.text.match(THREAT);
      if (hit && /^(?:urgent\b|(?:do (?:it|this|that)|this is|you must act|otherwise|or\b|your account|you will be arrested|your device|your computer|to avoid)\b)/i.test(text) && !/\b(?:meeting|lunch|birthday|weather)\b/i.test(text)) return matchedSpan(raw, other, hit);
    }
    return null;
  }

  function contextualSignals(text, raw) {
    var clauses = clausesOf(text), flags = [], established = [], unresolved = [];
    function flag(id, clause, start, end) {
      if (!flags.some(function (f) { return f.id === id; })) flags.push({ id: id, level: 'high', words: raw.slice(start, end), start: start, end: end });
    }
    function tier1(id, action, clause, object, context, antecedent) {
      var item = { ruleId: id, action: action, clause: span(raw, clause.start, clause.end), object: object, context: context, directDemand: true, negated: false, reported: false };
      if (antecedent) item.antecedent = antecedent;
      established.push(item);
    }
    clauses.forEach(function (clause, index) {
      if (clause.inReport || reported(clause.text)) return;
      var pattern = new RegExp(ACTIONS.source, 'gi'), m, priorDemand = false;
      while ((m = pattern.exec(clause.text)) !== null) {
        var prefix = clause.text.slice(0, m.index);
        if (!directAction(prefix, priorDemand)) continue;
        priorDemand = true;
        var verb = m[0].toLowerCase(), tail = clause.text.slice(m.index + m[0].length), giftDisclosed = false;
        var windowText = tail.slice(0, 40), action = matchedSpan(raw, clause, m), hit;
        if (/^(?:buy|purchase|pay)$/.test(verb) && (hit = windowText.match(GIFT))) {
          var gift = matchedSpan(raw, clause, hit, m.index + m[0].length);
          var paymentContext = giftPaymentContext(clause, gift, raw);
          if (verb === 'pay' || paymentContext) {
            flag('gift_card_payment', clause, action.start, gift.end);
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
            flag('gift_card_disclosure', clause, action.start, code.end);
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
            flag('crypto_or_wire', clause, action.start, wire.end);
            var wireContext = tiedContext(clauses, index, action, raw);
            if (wireContext) tier1('T1-WIRE', action, clause, wire, wireContext);
          }
        }
        if (/^(?:install|download|run|start|allow|grant|share)$/.test(verb) && (hit = windowText.match(REMOTE))) {
          var remote = matchedSpan(raw, clause, hit, m.index + m[0].length);
          flag('remote_access', clause, action.start, remote.end);
          var remoteContext = tiedContext(clauses, index, action, raw);
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
    return { flags: flags, established: established, unresolved: unresolved, clauses: clauses };
  }

  // A login phrase counts only as a demand: "Log in at", "please sign in", "click here to log in",
  // "verify your account by signing in". Notices ("you signed in", "a new sign-in") never match.
  // Signing in at a front desk is a visit, not an account login. The place must end the
  // request ("at the office." / "at the office when you arrive"), so "the office portal" still counts.
  var IN_PERSON_SIGN_IN = /^\s+(?:at|with)\s+(?:the\s+)?(?:front desk|reception(?: desk)?|office|counter|check-in desk|lobby|nurses?['’]? station)(?=\s*(?:[.!?,;\n]|$)|\s+(?:when|before|upon|after|on arrival|and)\b)/i;
  // "Sign-in attempt", "sign in code", "sign in successful": a notice about a sign-in, not a request.
  var LOGIN_NOTICE = /^[ \t]*(?:alerts?|notices?|attempts?|activity|codes?|history|was|has been|detected|confirmed|successful|succeeded|failed|details|information|credentials|problems?|issues?)\b/i;
  // Negation in the same part of the sentence: "No need to sign in", "Do not click links to log in".
  var LOGIN_NEGATION = /\b(?:do not|don['’]t|does not|doesn['’]t|did not|didn['’]t|never|no need|not need|not have to|not required|won['’]t|will not|cannot|can['’]t|without)\b/i;

  // A new instruction between a negation and the login ends that negation's reach:
  // "You do not need to visit a branch because you must log in" is still a login request.
  var NEW_INSTRUCTION = /\b(?:because|since|so|but|and|then|instead|however|otherwise|please|you must|you need to|you have to|you should|must|required)\b/i;
  // "Verify your account by signing in" is an instruction; "You last accessed it by signing in" is not.
  var INSTRUCTION_START = /^\s*(?:please\s+)?(?:verify|confirm|update|restore|unlock|secure|protect|review|check|reactivate|validate|complete|claim|keep|continue|finish|accept|activate|access|view|see|pay|track|reschedule|avoid|prevent|stop|cancel|fix|resolve|reset|change|start|go|get)\b/i;

  function negatesLogin(prefix) {
    var segment = prefix.split(',').pop();
    var pattern = new RegExp(LOGIN_NEGATION.source, 'gi'), m, last = null;
    while ((m = pattern.exec(segment)) !== null) last = m;
    return Boolean(last) && !NEW_INSTRUCTION.test(segment.slice(last.index + last[0].length));
  }

  function loginDemand(prefix, phrase) {
    if (negatesLogin(prefix)) return false;
    if (/^(?:by|after|when|before)\s/i.test(phrase)) {
      var rest = prefix.replace(/^\s*[^:]{1,60}:\s*/, '');
      return INSTRUCTION_START.test(rest) || /\b(?:please|you must|you need to|you have to|you should|required to)\b/i.test(rest);
    }
    if (directAction(prefix, true)) return true;
    return /\b(?:click|tap|press|select|visit|go|use|open|follow)\b[^.!?\n]{0,40}\bto\s*$/i.test(prefix) ||
      /\b(?:please|you must|you need to|you have to|you should|need to|have to|required to)\s*$/i.test(prefix);
  }

  // Negation only governs the action it precedes.
  function isNegated(text, index) {
    var prefix = text.slice(Math.max(0, index - 80), index).split(/[.!?;,\n]|\b(?:but|instead|however|then)\b/i).pop();
    return negatedAction(prefix);
  }

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
          var clause = contextual.clauses.filter(function (c) { return m.index >= c.start && m.index < c.end; })[0];
          if (clause && (clause.inReport || reported(clause.text))) continue;
          if (flag.negatable && isNegated(text, m.index)) continue;
          if (flag.id === 'login_request' && clause && (!loginDemand(text.slice(clause.start, m.index), m[0]) ||
              LOGIN_NOTICE.test(text.slice(m.index + m[0].length, m.index + m[0].length + 30)) ||
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
    });
    flags = flags.filter(function (f) {
      return f.id !== 'share_code' || !flags.some(function (gift) { return gift.id === 'gift_card_disclosure' && f.start >= gift.start && f.end <= gift.end; });
    });
    var highs = flags.filter(function (f) { return f.level === 'high'; }).length;
    var mediums = flags.filter(function (f) { return f.level === 'medium'; }).length;
    var level = highs > 0 || mediums >= 3 ? 'high' : mediums > 0 ? 'elevated' : 'none';
    return { level: level, flags: flags, established: contextual.established, unresolved: contextual.unresolved };
  }

  // Rules read T.riskView text; every reported span must point at the original source.
  function sourceSignals(source) {
    var raw = source == null ? '' : String(source);
    var view = T.riskView(raw);
    var targets = T.extractTargets(view.text);
    var signals = requestSignals(targets.masked, view.text);
    signals.incomplete = targets.incomplete;
    if (view.identity) return signals;
    function move(s) {
      if (!s) return s;
      var moved = T.sourceSpan(view, raw, s.start, s.end);
      return { start: moved.start, end: moved.end, quote: moved.quote };
    }
    signals.flags.forEach(function (f) {
      var moved = move(f);
      f.start = moved.start; f.end = moved.end; f.words = moved.quote;
    });
    signals.established.concat(signals.unresolved).forEach(function (item) {
      ['action', 'clause', 'object', 'context', 'antecedent'].forEach(function (key) {
        if (item[key]) item[key] = move(item[key]);
      });
    });
    return signals;
  }

  T.requestSignals = requestSignals;
  T.sourceSignals = sourceSignals;
  T.FLAG_IDS = ['gift_card_payment', 'gift_card_disclosure', 'crypto_or_wire', 'remote_access'].concat(FLAGS.map(function (f) { return f.id; }));
})(typeof window !== 'undefined' ? window : globalThis);
