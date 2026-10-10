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

  T.normalizeText = normalizeText;
  T.MAX_CHARS = MAX_CHARS;
})(typeof window !== 'undefined' ? window : globalThis);
