/* Text cleanup before anything is read.
   normalizeText(): for finding links, addresses and the sender.
   riskView(): for the request rules, with a map back to the original text so quotes stay exact. */
(function (root) {
  'use strict';
  const T = root.TFS = root.TFS || {};

  // Longer input is cut so every check finishes quickly on any device.
  const MAX_CHARS = 20000;
  // Zero-width and other invisible characters, used to hide words from filters.
  const INVISIBLE = /[\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/;
  const INVISIBLE_ALL = new RegExp(INVISIBLE.source, 'g');
  // Control characters and unusual spaces, read as a plain space.
  const SPACE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/;

  /* Screenshot text only. OCR returns one line per row of the picture, so a line break there
     is layout, not meaning: "We ask / you to pay with gift cards" is one sentence. A single
     break becomes a space, and a web address broken after a hyphen ("chase-secure- /
     login.net") or a phone number broken the same way ("1-" / "888-555-0142") is joined again
     exactly as written; nothing is corrected or guessed, so a misread "hitps://" stays as read. Blank
     lines (paragraph breaks) stay. Pasted text never goes through this.
     Returns { text, map }: map[i] is the position of text[i] in the original. */
  const ADDRESS = /^(?:https?:\/\/|www\.)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,24}(?:[\/?#:][^\s]*)?$/i;
  // A U.S. number broken after a hyphen: "Call 1-" / "888-555-0142".
  const PHONE = /^(?:\+?1-)?\(?\d{3}\)?-\d{3}-\d{4}$/;
  function unwrapLayout(source) {
    const raw = source == null ? '' : String(source);
    const chars = [], map = [];
    const isBreak = i => raw[i] === '\n' || (raw[i] === '\r' && raw[i + 1] === '\n');
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (ch === '\r' && raw[i + 1] === '\n') continue;
      if (ch !== '\n') { chars.push(ch); map.push(i); continue; }
      let before = i - 1;
      if (raw[before] === '\r') before--;
      if (raw[before] === '\n' || isBreak(i + 1)) { chars.push(ch); map.push(i); continue; }
      const head = raw.slice(0, before + 1).match(/[^\s]*$/)[0];
      const tail = raw.slice(i + 1).match(/^[^\s]*/)[0];
      const joined = (head + tail).replace(/[.,;:!?)\]]+$/, '');
      if (/[A-Za-z0-9]-$/.test(head) && /^[A-Za-z0-9]/.test(tail) && (ADDRESS.test(joined) || PHONE.test(joined))) continue;
      chars.push(' ');
      map.push(i);
    }
    return { text: chars.join(''), map };
  }

  function normalizeText(input, options = {}) {
    let text = input == null ? '' : String(input);
    if (options.layout) text = unwrapLayout(text).text;
    let truncated = text.length > MAX_CHARS;
    text = text.slice(0, MAX_CHARS)
      // A lone half of a surrogate pair would break the Unicode steps below.
      .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '\uFFFD');
    try {
      text = text.normalize('NFKC');
    } catch (err) {
      // Keep the text as it is if this platform cannot normalize it.
    }
    text = text
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
      .replace(INVISIBLE_ALL, '')
      .replace(/[\u2018\u2019]/g, "'")
      // Undo "defanged" links copied from warnings: hxxps://chase[.]com
      .replace(/\bhxxp(s?):\/\//gi, 'http$1://')
      .replace(/\[\.\]|\(\.\)|\{\.\}|\[dot\]|\(dot\)/gi, '.')
      .replace(/\[:\]/g, ':')
      // Collapse spaces, but keep line breaks: they separate sentences.
      .replace(/[ \t\f\v\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]+/g, ' ')
      .replace(/ *\r?\n[\s]*/g, '\n')
      .trim();
    // Normalizing can lengthen text (one character can become several).
    if (text.length > MAX_CHARS) {
      text = text.slice(0, MAX_CHARS);
      truncated = true;
    }
    return { text, truncated };
  }

  // Cyrillic and Greek letters that copy Latin ones. Folded only inside mixed-script words.
  const LOOKALIKE = {
    'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x', 'к': 'k',
    'і': 'i', 'ј': 'j', 'ѕ': 's', 'ԁ': 'd', 'һ': 'h', 'ԝ': 'w', 'ɡ': 'g',
    'А': 'A', 'В': 'B', 'Е': 'E', 'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O', 'Р': 'P',
    'С': 'C', 'Т': 'T', 'Х': 'X', 'І': 'I', 'Ѕ': 'S',
    'α': 'a', 'ο': 'o', 'ρ': 'p', 'ν': 'v', 'ι': 'i', 'κ': 'k', 'τ': 't', 'υ': 'u', 'ε': 'e'
  };

  function foldChar(ch) {
    const code = ch.charCodeAt(0);
    if (code >= 0xFF01 && code <= 0xFF5E) return String.fromCharCode(code - 0xFEE0); // fullwidth letters
    if (ch === '\u2018' || ch === '\u2019' || ch === '\u02BC') return "'";            // curly apostrophes
    return SPACE.test(ch) ? ' ' : ch;
  }

  // Returns { text, map, identity }: map[i] is the original position of text[i];
  // identity means nothing changed, so positions need no mapping.
  function riskView(source, options = {}) {
    const raw = source == null ? '' : String(source);
    const layout = options.layout ? unwrapLayout(raw) : null;
    const base = layout ? layout.text : raw;
    const chars = [], map = [];
    for (let i = 0; i < base.length; i++) {
      if (INVISIBLE.test(base[i])) continue;
      chars.push(foldChar(base[i]));
      map.push(layout ? layout.map[i] : i);
    }
    // A word mixing Latin letters with lookalikes is read as Latin: "gіft" with a Cyrillic і.
    const text = chars.join('').replace(/[A-Za-zͰ-ϿЀ-ԯɡ]+/g, word =>
      /[A-Za-z]/.test(word) && /[^A-Za-z]/.test(word) ? word.replace(/[^A-Za-z]/g, c => LOOKALIKE[c] || c) : word);
    return { text, map, identity: text === raw };
  }

  // Move a view span back to the source, so quotes show exactly what the person pasted.
  function sourceSpan(view, raw, start, end) {
    if (view.identity) return { start, end };
    const s = view.map[start], e = view.map[end - 1] + 1;
    return { start: s, end: e, quote: raw.slice(s, e) };
  }

  T.normalizeText = normalizeText;
  T.unwrapLayout = unwrapLayout;
  T.riskView = riskView;
  T.sourceSpan = sourceSpan;
  T.MAX_CHARS = MAX_CHARS;
})(typeof window !== 'undefined' ? window : globalThis);
