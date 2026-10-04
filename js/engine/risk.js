/* Request signals: what a message asks for, separate from who it claims to be.
   Exposes TFS.requestSignals(maskedText) -> { level, flags: [{ id, level, words }] }.
   Every pattern uses bounded gaps ({0,40}) and stays inside one sentence, so it runs in linear time. */
(function (root) {
  'use strict';
  var T = root.TFS = root.TFS || {};

  var GAP = '[^.!?\\n]{0,40}';
  var SHORT_GAP = '[^.!?\\n]{0,25}';

  function re(src) { return new RegExp(src, 'i'); }

  // Each flag: id, level, and patterns. The first pattern that matches supplies the quoted words.
  var FLAGS = [
    { id: 'gift_card_payment', level: 'high', patterns: [
      re('\\b(?:buy|purchase|pay|paid|send|redeem|scratch)\\b' + GAP + '\\b(?:gift ?cards?|itunes cards?|google play cards?|steam cards?|prepaid cards?|vanilla cards?|ebay cards?)\\b'),
      re('\\b(?:gift ?cards?|prepaid cards?)\\b' + GAP + '\\b(?:numbers?|codes?|pins?|back of the card)\\b')
    ] },
    { id: 'crypto_or_wire', level: 'high', patterns: [
      re('\\b(?:bitcoin|btc|crypto(?:currency)?|usdt|tether|ethereum|bitcoin atm|crypto atm|wire transfer|wire the money|western union|moneygram)\\b')
    ] },
    { id: 'share_code', level: 'high', negatable: true, patterns: [
      re('\\b(?:read|tell|give|send|share|provide|reply with|text|forward|say)\\b(?:\\s+(?:us|me|them|him|her|it|back))?\\s+(?:the|your|that|this)?\\s*(?:\\w+\\s+)?(?:code|pin|otp|passcode|password|verification number|security code)\\b')
    ] },
    { id: 'remote_access', level: 'high', patterns: [
      re('\\b(?:anydesk|teamviewer|logmein|ultraviewer|supremo|quick ?assist|remote (?:access|control|desktop|session)|screen ?shar(?:e|ing))\\b')
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

  // Words that cancel a share_code hit when they appear just before the verb: "Never share this code".
  var NEGATION = /\b(?:never|not|don't|dont|won't|cannot|can't)\b/i;

  function requestSignals(text) {
    var flags = [];
    FLAGS.forEach(function (flag) {
      for (var p = 0; p < flag.patterns.length; p++) {
        var m = flag.patterns[p].exec(text);
        if (!m) continue;
        if (flag.negatable) {
          var before = text.slice(Math.max(0, m.index - 25), m.index);
          if (NEGATION.test(before)) {
            // Look for a second, non-negated hit later in the text.
            var rest = text.slice(m.index + m[0].length);
            var again = requestSignals.single(flag.patterns[p], rest);
            if (!again) continue;
            m = again;
          }
        }
        flags.push({ id: flag.id, level: flag.level, words: m[0].trim().slice(0, 80) });
        break;
      }
    });
    var highs = flags.filter(function (f) { return f.level === 'high'; }).length;
    var mediums = flags.filter(function (f) { return f.level === 'medium'; }).length;
    var level = highs > 0 || mediums >= 3 ? 'high' : mediums > 0 ? 'elevated' : 'none';
    return { level: level, flags: flags };
  }

  // One more search for a negatable flag, skipping negated hits, bounded to a few tries.
  requestSignals.single = function (pattern, text) {
    var offset = 0;
    for (var tries = 0; tries < 5; tries++) {
      var slice = text.slice(offset);
      var m = pattern.exec(slice);
      if (!m) return null;
      var abs = offset + m.index;
      var before = text.slice(Math.max(0, abs - 25), abs);
      if (!NEGATION.test(before)) return { 0: m[0], index: abs };
      offset = abs + m[0].length;
    }
    return null;
  };

  T.requestSignals = requestSignals;
  T.FLAG_IDS = FLAGS.map(function (f) { return f.id; });
})(typeof window !== 'undefined' ? window : globalThis);
