// The practice on learn.html: one made-up message at a time, two choices, then what to notice.
// The messages and their answers are plain HTML written by scripts/build-learn.cjs, so they all
// show without this file. Nothing the reader chooses is stored or sent. Text is set with
// textContent only.

// What the reader is told about their choice. Never "wrong": pausing is always allowed.
const FEEDBACK = {
  'true:pause': 'You would pause. That is right for this one.',
  'true:ordinary': 'This one is easy to miss. That is what it is made for.',
  'false:ordinary': 'You are right. This one looks ordinary.',
  'false:pause': 'Pausing is never wrong. This one looks ordinary, though.'
};

const items = () => [...document.querySelectorAll('.practice-item')];

function show(index, focus) {
  items().forEach((item, i) => { item.hidden = i !== index; });
  const item = items()[index];
  if (focus) item.querySelector('.practice-count').focus();
}

function choose(item, button) {
  for (const other of item.querySelectorAll('.practice-choices button')) other.setAttribute('aria-pressed', String(other === button));
  const feedback = item.querySelector('.practice-feedback');
  feedback.textContent = FEEDBACK[item.dataset.scam + ':' + button.dataset.choice];
  feedback.hidden = false;
  item.querySelector('.practice-answer').open = true;
  item.querySelector('.practice-next').hidden = false;
  feedback.focus();
}

function next(index) {
  if (index + 1 < items().length) return show(index + 1, true);
  items().forEach(item => { item.hidden = true; });
  document.getElementById('practice-done').hidden = false;
  document.getElementById('practice-done-title').focus();
}

// Back to the first message, with every choice and answer cleared.
function startAgain() {
  for (const item of items()) {
    for (const button of item.querySelectorAll('.practice-choices button')) button.setAttribute('aria-pressed', 'false');
    const feedback = item.querySelector('.practice-feedback');
    feedback.textContent = '';
    feedback.hidden = true;
    item.querySelector('.practice-answer').open = false;
    item.querySelector('.practice-next').hidden = true;
  }
  document.getElementById('practice-done').hidden = true;
  show(0, true);
}

function start() {
  const list = items();
  if (!list.length) return;
  list.forEach((item, index) => {
    item.querySelector('.practice-count').tabIndex = -1;
    item.querySelector('.practice-choices').hidden = false;
    for (const button of item.querySelectorAll('.practice-choices button')) button.addEventListener('click', () => choose(item, button));
    item.querySelector('.practice-next').addEventListener('click', () => next(index));
    // Choosing is optional: opening "What to notice" without choosing also lets the reader go on.
    item.querySelector('.practice-answer').addEventListener('toggle', event => {
      if (event.target.open) item.querySelector('.practice-next').hidden = false;
    });
  });
  document.getElementById('practice-again').addEventListener('click', startAgain);
  document.getElementById('practice').classList.add('one-at-a-time');
  show(0, false);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
