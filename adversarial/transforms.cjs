/* Layer 1: rewrites only. No engine, no expected results, no randomness of its own.

   Every transform here must keep what the message MEANS to a person reading it.
   That is the whole basis of the test: if meaning is unchanged, the verdict must be
   unchanged, so any verdict that does change is a rule gap and not a judgment call.

   Each transform declares `preserves`:
     'all'   - safe on any message, fraud or legitimate.
     'fraud' - safe only on a message that already makes a demand. Adding "Please act
               today" to a pharmacy reminder would change what that reminder is, so
               these never run on legitimate controls.

   `why` is the argument that the rewrite keeps meaning. It is printed in the report,
   because a reader has to be able to check that claim rather than take it on trust.

   Deliberately NOT here: turning a demand into a reported demand ("Fraudsters may ask
   you to pay with gift cards"). That changes who is asking, so the verdict SHOULD
   change. It belongs in tests/reporting-scope, which checks it with hand-written
   expectations. */
'use strict';

/* ---------- small helpers ---------- */

// Words the rules read. Rewrites aim at these, because a rewrite far from any rule
// proves nothing: it would pass whether the rules were good or absent.
const KEYWORDS = [
  'gift cards', 'gift card', 'giftcards', 'itunes cards', 'google play cards',
  'verification code', 'verification codes', 'codes', 'code', 'pins', 'pin', 'passcode',
  'wire transfer', 'bitcoin', 'crypto', 'western union', 'zelle', 'venmo',
  'anydesk', 'teamviewer', 'remote access', 'screen share',
  'purchase', 'buy', 'send', 'pay', 'install', 'download', 'share', 'text', 'call',
  'photos of the backs', 'backs'
];

// Cyrillic and Greek letters that copy Latin ones, the same set js/engine/normalize.js folds.
const LOOKALIKE = { a: 'а', e: 'е', o: 'о', p: 'р', c: 'с', y: 'у', x: 'х', k: 'к', i: 'і', s: 'ѕ', d: 'ԁ', h: 'һ' };

function findKeyword(text, rng) {
  const lower = text.toLowerCase();
  const hits = [];
  for (const word of KEYWORDS) {
    let from = 0, at;
    while ((at = lower.indexOf(word, from)) >= 0) {
      const before = at === 0 ? ' ' : lower[at - 1];
      const after = at + word.length >= lower.length ? ' ' : lower[at + word.length];
      if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) hits.push({ at, length: word.length });
      from = at + 1;
    }
  }
  if (!hits.length) return null;
  // Longest hit wins at a position, so "gift cards" is preferred over "cards".
  hits.sort((a, b) => a.at - b.at || b.length - a.length);
  const kept = hits.filter((h, i) => i === 0 || h.at >= hits[i - 1].at + hits[i - 1].length);
  return kept[Math.floor(rng() * kept.length)];
}

const splice = (text, at, length, replacement) => text.slice(0, at) + replacement + text.slice(at + length);
const pick = (rng, list) => list[Math.floor(rng() * list.length)];

// A word is only de-capitalized when its capital came from starting a sentence. An acronym or a
// product name carries its own capitals ("USPS", "AnyDesk"), so it keeps them mid-sentence.
function lowerFirst(text) {
  const word = text.match(/^[A-Za-z][\w-]*/);
  if (!word || /[A-Z]/.test(word[0].slice(1))) return text;
  return text[0].toLowerCase() + text.slice(1);
}

// Sentence-ish pieces, used by the structure rewrites below.
function sentences(text) {
  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  return parts.length > 1 ? parts : null;
}

/* ---------- encoding: the characters change, the reading does not ---------- */

const encoding = [
  {
    id: 'zero-width',
    family: 'encoding',
    preserves: 'all',
    why: 'A zero-width space is invisible on screen, so the reader sees the same word.',
    apply(text, rng) {
      const hit = findKeyword(text, rng);
      if (!hit || hit.length < 2) return null;
      const cut = hit.at + 1 + Math.floor(rng() * (hit.length - 1));
      return splice(text, cut, 0, '​');
    }
  },
  {
    id: 'lookalike-letters',
    family: 'encoding',
    preserves: 'all',
    why: 'Cyrillic lookalikes are drawn the same as the Latin letters they replace.',
    apply(text, rng) {
      const hit = findKeyword(text, rng);
      if (!hit) return null;
      const word = text.slice(hit.at, hit.at + hit.length);
      const swappable = [...word].map((ch, i) => (LOOKALIKE[ch.toLowerCase()] ? i : -1)).filter(i => i >= 0);
      if (!swappable.length) return null;
      const i = pick(rng, swappable);
      const swapped = word.slice(0, i) + LOOKALIKE[word[i].toLowerCase()] + word.slice(i + 1);
      return splice(text, hit.at, hit.length, swapped);
    }
  },
  {
    id: 'fullwidth',
    family: 'encoding',
    preserves: 'all',
    why: 'Fullwidth forms are the same letters in a wider cell.',
    apply(text, rng) {
      const hit = findKeyword(text, rng);
      if (!hit) return null;
      const wide = [...text.slice(hit.at, hit.at + hit.length)]
        .map(ch => (ch >= '!' && ch <= '~' ? String.fromCharCode(ch.charCodeAt(0) + 0xFEE0) : ch)).join('');
      return splice(text, hit.at, hit.length, wide);
    }
  },
  {
    id: 'defanged-link',
    family: 'encoding',
    preserves: 'all',
    why: 'hxxps:// and [.] are how a safety newsletter prints a live address; a reader restores it on sight.',
    apply(text) {
      if (!/https?:\/\//i.test(text)) return null;
      return text.replace(/https?:\/\//i, m => 'hxxp' + (/s/i.test(m) ? 's' : '') + '://').replace(/\.(?=[a-z]{2,24}\b)/i, '[.]');
    }
  },
  {
    id: 'shout-case',
    family: 'encoding',
    preserves: 'all',
    why: 'Capitals change loudness, not words.',
    apply(text, rng) {
      const hit = findKeyword(text, rng);
      if (!hit) return null;
      const word = text.slice(hit.at, hit.at + hit.length);
      const shouted = word.toUpperCase();
      return shouted === word ? null : splice(text, hit.at, hit.length, shouted);
    }
  },
  {
    id: 'inner-spacing',
    family: 'encoding',
    preserves: 'all',
    why: 'A hyphen, one space or two between the halves of a term is typing, not meaning.',
    apply(text, rng) {
      const hit = findKeyword(text, rng);
      if (!hit) return null;
      const word = text.slice(hit.at, hit.at + hit.length);
      if (!/[ -]/.test(word)) return null;
      const respaced = word.replace(/[ -]/, pick(rng, ['-', '  ', ' ']));
      return respaced === word ? null : splice(text, hit.at, hit.length, respaced);
    }
  },
  {
    id: 'nbsp',
    family: 'encoding',
    preserves: 'all',
    why: 'A non-breaking space prints as a space.',
    apply(text, rng) {
      const spaces = [...text.matchAll(/ /g)].map(m => m.index);
      if (!spaces.length) return null;
      return splice(text, pick(rng, spaces), 1, ' ');
    }
  }
];

/* ---------- layout: where the lines break ---------- */

const layout = [
  {
    id: 'sms-wrap',
    family: 'layout',
    preserves: 'all',
    why: 'A phone wraps a long text at a space; nobody reads the break as a new sentence.',
    apply(text, rng) {
      const spaces = [...text.matchAll(/ /g)].map(m => m.index).filter(i => i > 8 && i < text.length - 8);
      if (!spaces.length) return null;
      return splice(text, pick(rng, spaces), 1, '\n');
    }
  },
  {
    id: 'crlf-wrap',
    family: 'layout',
    preserves: 'all',
    why: 'Same break, Windows line ending.',
    apply(text, rng) {
      const spaces = [...text.matchAll(/ /g)].map(m => m.index).filter(i => i > 8 && i < text.length - 8);
      if (!spaces.length) return null;
      return splice(text, pick(rng, spaces), 1, '\r\n');
    }
  },
  {
    id: 'clause-punctuation',
    family: 'layout',
    preserves: 'all',
    why: 'A full stop, a semicolon and an exclamation mark all end the same clause.',
    apply(text, rng) {
      const stops = [...text.matchAll(/\. /g)].map(m => m.index);
      if (!stops.length) return null;
      const at = pick(rng, stops);
      const mark = pick(rng, ['; ', '! ', ' - ', ', ']);
      const rest = text.slice(at + 2);
      if (!rest) return null;
      // After a semicolon, a dash or a comma the next word is no longer sentence-initial,
      // so it loses its capital. Leaving it capitalized would be a typo, not a rewrite.
      const lowered = mark === '! ' ? rest : lowerFirst(rest);
      return text.slice(0, at) + mark + lowered;
    }
  },
  {
    id: 'join-clauses',
    family: 'layout',
    preserves: 'all',
    why: 'Two sentences joined by "and" say what the two sentences said.',
    apply(text, rng) {
      const stops = [...text.matchAll(/\. (?=[A-Z])/g)].map(m => m.index);
      if (!stops.length) return null;
      const at = pick(rng, stops);
      const rest = text.slice(at + 2);
      return text.slice(0, at) + ', and ' + lowerFirst(rest);
    }
  }
];

/* ---------- wording: different words, same request ---------- */

// Each pair must be a true swap in this setting. "Buy" and "purchase" name one act.
const SYNONYMS = [
  [/\bbuy\b/i, 'purchase'], [/\bpurchase\b/i, 'buy'], [/\bpick up\b/i, 'go get'],
  [/\bsend\b/i, 'forward'], [/\btext\b/i, 'message'], [/\bshare\b/i, 'give'],
  [/\binstall\b/i, 'download'], [/\bcall\b/i, 'phone'],
  [/\bgift cards?\b/i, 'Apple cards'], [/\bverification code\b/i, 'security PIN'],
  [/\bcodes?\b/i, 'numbers'], [/\bwire transfer\b/i, 'bank wire'], [/\bbitcoin\b/i, 'crypto'],
  [/\bthe backs\b/i, 'the back panels'], [/\bright away\b/i, 'at once'], [/\btoday\b/i, 'right now']
];

const wording = [
  {
    id: 'synonym',
    family: 'wording',
    preserves: 'all',
    why: 'Each pair names one act in this setting; the request asked for is the same.',
    apply(text, rng) {
      const usable = SYNONYMS.filter(([pattern]) => pattern.test(text));
      if (!usable.length) return null;
      const [pattern, replacement] = pick(rng, usable);
      return text.replace(pattern, m => (/^[A-Z]/.test(m) ? replacement[0].toUpperCase() + replacement.slice(1) : replacement));
    }
  },
  {
    id: 'politeness',
    family: 'wording',
    preserves: 'all',
    why: 'A courtesy word in front of an instruction leaves the instruction standing.',
    apply(text, rng) {
      const verbs = [...text.matchAll(/(^|[.!?;]\s+|\bto\s+)(buy|purchase|send|pay|install|share|text|call|read|give|forward|download|go)\b/gi)];
      if (!verbs.length) return null;
      const hit = pick(rng, verbs);
      const at = hit.index + hit[1].length;
      const word = pick(rng, ['please', 'kindly', 'just']);
      const sentenceStart = hit[1] === '' || /[.!?;]/.test(hit[1]);
      // At the start of a sentence the courtesy word takes the capital and the verb gives it up.
      const lead = sentenceStart ? word[0].toUpperCase() + word.slice(1) : word;
      const verb = sentenceStart ? hit[2].toLowerCase() : hit[2];
      return splice(text, at, hit[2].length, lead + ' ' + verb);
    }
  },
  {
    id: 'contraction',
    family: 'wording',
    preserves: 'all',
    why: 'A contraction and its long form are the same words.',
    apply(text) {
      const pairs = [[/\bdo not\b/i, "don't"], [/\bdon't\b/i, 'do not'], [/\bcannot\b/i, "can't"],
        [/\bcan't\b/i, 'cannot'], [/\bwill not\b/i, "won't"], [/\byou are\b/i, "you're"]];
      for (const [pattern, replacement] of pairs) if (pattern.test(text)) return text.replace(pattern, replacement);
      return null;
    }
  },
  {
    id: 'greeting',
    family: 'wording',
    preserves: 'all',
    why: 'An opening line adds no request and removes none.',
    apply(text, rng) {
      return pick(rng, ['Hi there. ', 'Hello. ', 'Good morning. ', 'Dear customer, ']) + text;
    }
  },
  {
    id: 'signature',
    family: 'wording',
    preserves: 'all',
    why: 'A closing line adds no request and removes none.',
    apply(text, rng) {
      return text.trimEnd() + pick(rng, [' Thank you.', ' - Support Team', ' Regards, Customer Care.', ' Ref 88421.']);
    }
  },
  {
    id: 'filler-sentence',
    family: 'wording',
    preserves: 'all',
    why: 'A neutral sentence between the parts carries no request of its own.',
    apply(text, rng) {
      const parts = sentences(text);
      if (!parts) return null;
      const filler = pick(rng, ['This is a courtesy notice.', 'We value your business.', 'Reference number 4471.', 'No action is needed on other items.']);
      const at = 1 + Math.floor(rng() * (parts.length - 1));
      parts.splice(at, 0, filler);
      return parts.join(' ');
    }
  }
];

/* ---------- scope pressure: the sender still asks, with warning words nearby ---------- */

/* These are the shape of the defect already repaired once: a cue word near a real demand.
   Meaning is preserved because the SENDER is still the one asking. Whether the rules agree
   is the question, which is why these stay in and are reported as their own family. */
const scope = [
  {
    id: 'warning-prefix',
    family: 'scope',
    preserves: 'fraud',
    why: 'The sender still makes the demand; a warning sentence in front does not retract it.',
    apply(text, rng) {
      return pick(rng, ['Beware of fraudsters. ', 'Fraud warning. ', 'Watch out for scam callers. ']) + text;
    }
  },
  {
    id: 'warning-suffix',
    family: 'scope',
    preserves: 'fraud',
    why: 'The sender still makes the demand; a warning sentence after it does not retract it.',
    apply(text, rng) {
      return text.trimEnd() + pick(rng, [' Beware of hackers.', ' Criminals are active in your area.', ' Never share details with scammers.']);
    }
  },
  {
    id: 'purpose-clause',
    family: 'scope',
    preserves: 'fraud',
    why: '"To avoid fraudsters, do X" is still the sender telling the reader to do X.',
    apply(text, rng) {
      const verbs = [...text.matchAll(/(^|[.!?;]\s+)(Buy|Purchase|Send|Pay|Install|Share|Text|Call|Read|Forward|Download)\b/g)];
      if (!verbs.length) return null;
      const hit = pick(rng, verbs);
      const at = hit.index + hit[1].length;
      const lead = pick(rng, ['To avoid fraudsters, ', 'To stay safe from criminals, ', 'For your protection against scam texts, ']);
      return splice(text, at, hit[2].length, lead + hit[2].toLowerCase());
    }
  },
  {
    id: 'own-request',
    family: 'scope',
    preserves: 'fraud',
    why: 'Naming the asker as the sender is the same demand with its subject stated.',
    apply(text, rng) {
      const verbs = [...text.matchAll(/(^|[.!?;]\s+)(Buy|Purchase|Send|Pay|Install|Share|Text|Read|Forward|Download)\b/g)];
      if (!verbs.length) return null;
      const hit = pick(rng, verbs);
      const at = hit.index + hit[1].length;
      const lead = pick(rng, ['we ask you to ', 'we need you to ', 'our team requests that you ', 'we urge you to ']);
      const head = lead[0].toUpperCase() + lead.slice(1);
      return splice(text, at, hit[2].length, (hit[1] === '' ? head : lead) + hit[2].toLowerCase());
    }
  },
  {
    id: 'urgency',
    family: 'scope',
    preserves: 'fraud',
    why: 'Pressure added to a demand leaves the demand in place.',
    apply(text, rng) {
      return text.trimEnd() + pick(rng, [' Act today.', ' This is urgent.', ' Please do this within 30 minutes.']);
    }
  }
];

const TRANSFORMS = [].concat(encoding, layout, wording, scope);
const BY_ID = Object.fromEntries(TRANSFORMS.map(t => [t.id, t]));
const FAMILIES = [...new Set(TRANSFORMS.map(t => t.family))];

module.exports = { TRANSFORMS, BY_ID, FAMILIES, KEYWORDS, findKeyword };
