/* Copy-and-paste practice on help.html. It only compares the practice box with the practice
   message on the page. It never runs the checker, never gives a verdict, and saves nothing.
   Without JavaScript the practice box still works for pasting; only the feedback is missing. */
(function () {
  'use strict';
  const source = document.getElementById('practice-source');
  const box = document.getElementById('practice-box');
  const test = document.getElementById('practice-test');
  const clear = document.getElementById('practice-clear');
  const result = document.getElementById('practice-result');
  if (!source || !box || !test || !clear || !result) return;

  // Copying can turn curly quotes straight, add spaces or line breaks, or drop the last full
  // stop's spacing. None of that is the reader's mistake, so compare without it.
  const tidy = text => text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/[ \s]+/g, ' ').trim();
  let pasted = false;

  function feedback() {
    const want = tidy(source.textContent);
    const got = tidy(box.value);
    let text;
    if (!got) {
      text = 'The box is empty. Press and hold inside the box, then tap “Paste”.';
    } else if (got === want) {
      text = pasted ? 'It worked. The whole practice message is in the box.'
        : 'The words match. If you typed them, that works too. To practise pasting, empty the box and paste the message.';
    } else if (got.includes(want)) {
      text = 'The whole message is there, plus some extra words. That is fine. In the checker, delete any words that are not part of the message.';
    } else if (want.includes(got)) {
      text = 'Part of the message is in the box, but some of it is missing. Copy it again and make the highlight cover all of it, from “PRACTICE” to “desk.”';
    } else {
      text = 'This does not look like the practice message. Empty the box, then copy the practice message again.';
    }
    result.textContent = text;
  }

  box.addEventListener('paste', () => { pasted = true; });
  box.addEventListener('input', () => { if (!box.value) pasted = false; result.textContent = ''; });
  test.addEventListener('click', feedback);
  clear.addEventListener('click', () => {
    box.value = '';
    pasted = false;
    result.textContent = '';
    box.focus();
  });
  test.hidden = false;
  clear.hidden = false;
}());
