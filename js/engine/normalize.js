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

  function normalizeText(input) {
    let text = input == null ? '' : String(input);
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
  function riskView(source) {
    const raw = source == null ? '' : String(source);
    const chars = [], map = [];
    for (let i = 0; i < raw.length; i++) {
      if (INVISIBLE.test(raw[i])) continue;
      chars.push(foldChar(raw[i]));
      map.push(i);
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
  T.riskView = riskView;
  T.sourceSpan = sourceSpan;
  T.MAX_CHARS = MAX_CHARS;
})(typeof window !== 'undefined' ? window : globalThis);
