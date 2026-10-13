/* Stage 1: normalize. Pure text cleanup before anything is extracted.
   Exposes TFS.normalizeText(input) -> { text, truncated }. */
(function (root) {
  'use strict';
  var T = root.TFS = root.TFS || {};

  // Longer input is cut so every check finishes quickly on any device.
  var MAX_CHARS = 20000;

  function normalizeText(input) {
    var text = input == null ? '' : String(input);
    var truncated = false;
    if (text.length > MAX_CHARS) {
      text = text.slice(0, MAX_CHARS);
      truncated = true;
    }
    // Replace lone surrogate halves so later Unicode steps cannot fail.
    text = text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '�');
    try {
      text = text.normalize('NFKC');
    } catch (err) {
      // Keep the raw text if the platform cannot normalize it.
    }
    text = text
      // Control characters and null bytes.
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
      // Zero-width and invisible formatting characters used to hide words from filters.
      .replace(/[­​-‏‪-‮⁠-⁯﻿]/g, '')
      .replace(/[‘’]/g, "'")
      // Undo "defanged" links that people paste from warnings: hxxps://chase[.]com
      .replace(/\bhxxp(s?):\/\//gi, 'http$1://')
      .replace(/\[\.\]|\(\.\)|\{\.\}|\[dot\]|\(dot\)/gi, '.')
      .replace(/\[:\]/g, ':')
      // Collapse spaces but keep line breaks as sentence boundaries.
      .replace(/[ \t\f\v   -   　]+/g, ' ')
      .replace(/ *\r?\n[\s]*/g, '\n')
      .trim();
    // Unicode expansion can make normalized text longer than the original input.
    if (text.length > MAX_CHARS) { text = text.slice(0, MAX_CHARS); truncated = true; }
    return { text: text, truncated: truncated };
  }

  /* Risk rules need the person's original offsets, so they cannot use normalizeText.
     riskView folds only what changes how words read, and keeps a map back to the source:
     map[i] is the source index of view character i. */
  var INVISIBLE = /[\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/;
  var SPACE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/;
  // Cyrillic and Greek letters that copy Latin ones. Folded only inside mixed-script words.
  var LOOKALIKE = {
    'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x', 'к': 'k',
    'і': 'i', 'ј': 'j', 'ѕ': 's', 'ԁ': 'd', 'һ': 'h', 'ԝ': 'w', 'ɡ': 'g',
    'А': 'A', 'В': 'B', 'Е': 'E', 'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O', 'Р': 'P',
    'С': 'C', 'Т': 'T', 'Х': 'X', 'І': 'I', 'Ѕ': 'S',
    'α': 'a', 'ο': 'o', 'ρ': 'p', 'ν': 'v', 'ι': 'i', 'κ': 'k', 'τ': 't', 'υ': 'u', 'ε': 'e'
  };

  function foldChar(ch) {
    var code = ch.charCodeAt(0);
    if (code >= 0xFF01 && code <= 0xFF5E) return String.fromCharCode(code - 0xFEE0);
    if (ch === '\u2018' || ch === '\u2019' || ch === '\u02BC') return "'";
    if (SPACE.test(ch)) return ' ';
    return ch;
  }

  function riskView(source) {
    var raw = source == null ? '' : String(source);
    var out = [], map = [];
    for (var i = 0; i < raw.length; i++) {
      var ch = raw.charAt(i);
      if (INVISIBLE.test(ch)) continue;
      out.push(foldChar(ch));
      map.push(i);
    }
    // A word mixing Latin letters with lookalikes is read as Latin: "gіft" with a Cyrillic і.
    var text = out.join('').replace(/[A-Za-z\u0370-\u03FF\u0400-\u052F\u0261]+/g, function (word) {
      if (!/[A-Za-z]/.test(word) || !/[^A-Za-z]/.test(word)) return word;
      return word.replace(/[^A-Za-z]/g, function (c) { return LOOKALIKE[c] || c; });
    });
    return { text: text, map: map, identity: text === raw };
  }

  // Move a view span back to the source, so quotes show exactly what the person pasted.
  function sourceSpan(view, raw, start, end) {
    if (view.identity) return { start: start, end: end };
    var s = view.map[start], e = view.map[end - 1] + 1;
    return { start: s, end: e, quote: raw.slice(s, e) };
  }

  T.normalizeText = normalizeText;
  T.riskView = riskView;
  T.sourceSpan = sourceSpan;
  T.MAX_CHARS = MAX_CHARS;
})(typeof window !== 'undefined' ? window : globalThis);
