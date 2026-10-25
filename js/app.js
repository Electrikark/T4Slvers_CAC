/* The page: reads the form, shows results, and runs the "I checked it myself" step.
   The engine decides everything; this file only displays it.
   Nothing typed here is stored or sent anywhere. */
const byId = id => document.getElementById(id);
const CHANNELS = ['text', 'email', 'unknown'];
const MAX_CHARS = window.TFS.MAX_CHARS;

let chosenChannel = null;
let shownResult = null;

// The label line says in plain words what the title means and does not mean.
const RESULT_STYLES = {
  suspicious: { css: 'mismatch', symbol: '!' },
  details_match: { css: 'match', symbol: '=' },
  insufficient_evidence: { css: 'unknown', symbol: '?' }
};
// Same words as the annotation labels, so one state has one name.
const CHECK_LABELS = { SUPPORTS: 'On our reviewed list', CONTRADICTS: 'Details conflict', UNKNOWN: 'Still unresolved' };

function textElement(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

// Shows one screen and moves keyboard and screen-reader focus to its heading.
function showScreen(name) {
  byId('home').hidden = name !== 'home';
  byId('result').hidden = name !== 'result';
  byId('checker-limits').hidden = name !== 'home';
  byId('demo-tools').hidden = name !== 'home';
  byId(name === 'home' ? 'home-title' : 'result-title').focus();
}

/* ---------- The form ---------- */

function showError(text, field) {
  byId('error').textContent = text;
  field.setAttribute('aria-invalid', 'true');
  field.focus();
}

function clearError() {
  byId('error').textContent = '';
  for (const id of ['message', 'channel-question', ...CHANNELS.map(c => `channel-${c}`)]) byId(id).removeAttribute('aria-invalid');
}

function updateCount() {
  const count = byId('message').value.length;
  byId('character-count').textContent = `${count.toLocaleString()} / ${MAX_CHARS.toLocaleString()} characters`;
  byId('character-count').classList.toggle('over-limit', count > MAX_CHARS);
}

function chooseChannel(channel) {
  chosenChannel = channel;
  for (const option of CHANNELS) {
    byId(`channel-${option}`).setAttribute('aria-pressed', String(option === channel));
    byId(`channel-${option}`).classList.toggle('active', option === channel);
  }
  clearError();
}

function clearExampleNote() {
  byId('example-loaded').textContent = '';
  byId('example-loaded').hidden = true;
}

function checkMessage(event) {
  event.preventDefault();
  clearError();
  const text = byId('message').value;
  if (!text.trim()) return showError('Paste a message or link first.', byId('message'));
  if (text.length > MAX_CHARS) {
    return showError(`This is too long to check fully. Paste ${MAX_CHARS.toLocaleString()} characters or fewer, or one complete link.`, byId('message'));
  }
  if (!chosenChannel) {
    byId('channel-question').setAttribute('aria-invalid', 'true');
    return showError('Choose Text, Email, or Not sure before checking.', byId('channel-text'));
  }
  try {
    const result = window.TfsEngine.analyze(text, window.TFS_STORE, { declaredChannel: chosenChannel, policies: window.TFS_POLICIES,
      inputSource: byId('submission-form').dataset.inputSource === 'screenshot' ? 'screenshot' : 'pasted_text' });
    // Never show a result whose parts disagree; fail with a plain message instead.
    if (!window.TfsEngine.validateResult(result)) throw new Error('Invalid result');
    showResult(result, text);
  } catch {
    // The same input fails the same way again, so give protective advice instead of "try again".
    showScreen('home');
    showError('We couldn’t finish checking this message. That doesn’t mean it is harmless. Don’t use any links or numbers in it, and ask someone you trust to look at it with you.', byId('message'));
  }
}

// Clears everything the last person entered or saw, for a shared workshop device.
function startOver() {
  byId('submission-form').reset();
  clearResult();
  chooseChannel(null);
  clearExampleNote();
  updateCount();
  byId('demo-tools').open = false;
  showScreen('home');
}

function loadExample(id) {
  startOver();
  const example = window.demoScenarios[id];
  byId('message').value = example.input;
  updateCount();
  byId('example-loaded').textContent = `Loaded: ${example.label}. Example channel: ${example.channelLabel}. Choose that channel before checking.`;
  byId('example-loaded').hidden = false;
  byId('check-button').focus();
}

/* ---------- The result ---------- */

function checkItem(check) {
  const item = byId('check-template').content.firstElementChild.cloneNode(true);
  item.classList.add(check.status.toLowerCase());
  item.querySelector('.check-label').textContent = CHECK_LABELS[check.status];
  item.querySelector('.check-detail').textContent = check.detail;
  item.querySelector('.source').textContent = check.source;
  return item;
}

function signalItem(flag, result) {
  const item = document.createElement('li');
  item.append(textElement('span', flag.label, 'check-label'), textElement('p', `“${flag.words}”`, 'quote'));
  // For gift-card codes, name the card the request refers to.
  const rule = result.requestRisk.established.find(e => e.antecedent && e.action.start === flag.start);
  if (rule) item.append(textElement('p', `The request refers to “${rule.antecedent.quote}” in this message.`, 'source'));
  return item;
}

// The person's own message with each finding marked. Text nodes only: pasted markup stays text.
function showAnnotations(text, result) {
  const model = window.TFS.annotate(text, result, window.TFS_STORE);
  window.TFS.renderAnnotations(document, model, byId('annotated'), byId('annotation-notes'));
  // The main warning already sits under the result, so it is not repeated here.
  byId('annotated-section').hidden = model.notes.length === 0;
  return model;
}

// "Why this is a warning sign": a plain reason for each rule found, tied to the words in this
// message and to their numbered mark, with an official quote and its page.
function showWhy(result, model, text) {
  const why = window.TFS_WHY;
  const items = why && window.TFS.whyItems ? window.TFS.whyItems(result, why, text) : [];
  byId('why-section').hidden = items.length === 0;
  byId('why-draft').hidden = !why || Boolean(why.approvedBy);
  byId('why-list').replaceChildren(...items.map(item => {
    const li = textElement('li', item.why);
    if (item.words) {
      const words = textElement('p', 'In your message: “' + item.words + '”', 'why-words');
      const note = model && model.notes.find(n => n.ruleId === item.key);
      if (note) {
        const mark = textElement('a', 'See mark ' + note.n, 'why-mark');
        mark.href = '#annotation-' + note.id;
        words.append(' ', mark);
      }
      li.append(words);
    }
    for (const quote of [item.official, item.also].filter(Boolean)) {
      const source = why.sources[quote.source];
      // Every source in data/why.js is an FTC publication (MilitaryConsumer.gov is run with the FTC).
      const p = textElement('p', 'The FTC says: “' + quote.quote + '”', 'why-quote');
      if (source) {
        const link = textElement('a', source.title, 'why-source');
        link.href = source.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        p.append(' ', link);
      }
      li.append(p);
    }
    if (!item.official) li.append(textElement('p', 'Tech for Silvers advice', 'why-source'));
    return li;
  }));
}

function showResult(result, text) {
  byId('ocr-result-note').hidden = result.inputSource !== 'screenshot';
  const style = RESULT_STYLES[result.assessment];
  const risk = result.requestRisk.level;
  const view = window.TfsResultView.build(result, text);
  byId('result-banner').className = `result-banner ${style.css}${risk !== 'none' ? ' risky' : ''}`;
  byId('state-symbol').textContent = style.symbol;
  // "Suspicious" already is the strong warning; only an unresolved result needs the risk named.
  byId('state-label').textContent = view.label;
  byId('result-title').textContent = view.title;
  byId('result-description').textContent = view.description;
  byId('result-scope').textContent = view.limits[0];
  byId('identity').textContent = result.claimedIdentity;
  byId('channel').textContent = result.channel;
  byId('inspected').textContent = result.inspected;
  byId('meaning').textContent = result.meaning;

  // The most important warning sits right under the result, also on small screens.
  const [lead, ...otherWarnings] = result.actionWarnings;
  byId('action-lead').textContent = lead;
  byId('action-note').classList.toggle('high-risk', risk === 'high');
  byId('action-groups').replaceChildren(...view.groups.map(group => {
    const item = textElement('li', '', 'action-group');
    item.dataset.action = group.id;
    item.append(textElement('h3', group.title));
    const reasons = textElement('ul', '', 'group-reasons');
    reasons.replaceChildren(...group.reasons.map(reason => textElement('li', reason)));
    item.append(reasons, textElement('p', group.action, 'protective-step'));
    return item;
  }));
  byId('visible-limits').replaceChildren(...view.limits.slice(1).map(limit => textElement('li', limit)));

  byId('checks').replaceChildren(...result.checks.map(checkItem));
  byId('asks-section').hidden = result.requestRisk.flags.length === 0;
  byId('asks').replaceChildren(...result.requestRisk.flags.map(flag => signalItem(flag, result)));
  byId('warnings').replaceChildren(...otherWarnings.map(warning => textElement('p', warning, 'warning')));
  byId('next-list').replaceChildren(...result.nextSteps.map(step => textElement('li', step)));
  showWhy(result, showAnnotations(text, result), text);
  // Each new result starts with its full details folded away.
  byId('evidence-details').open = false;
  byId('followup-details').open = false;
  byId('why-section').open = false;
  byId('annotated-section').open = false;
  byId('self-check-details').open = false;
  // The protective steps stay visible; extra help starts folded for each new result.
  byId('trusted-help').open = false;
  byId('no-one-available').open = false;
  byId('request-status').textContent = '';

  shownResult = result;
  resetSelfCheck();
  showScreen('result');
}

function clearResult() {
  for (const id of ['action-groups', 'visible-limits', 'why-list', 'result-title', 'result-scope', 'result-description', 'identity', 'channel', 'inspected', 'meaning', 'checks', 'asks', 'warnings', 'next-list', 'action-lead', 'annotated', 'annotation-notes']) {
    byId(id).replaceChildren();
  }
  byId('annotated-section').hidden = true;
  byId('why-section').hidden = true;
  byId('why-draft').hidden = true;
  byId('request-status').textContent = '';
  shownResult = null;
  resetSelfCheck();
}

/* ---------- "I checked it myself" (never changes the result) ---------- */

function choiceButton(label, hint, onChoose) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'self-check-option';
  button.setAttribute('aria-pressed', 'false');
  button.append(textElement('span', label, 'choice-label'));
  if (hint) button.append(textElement('span', hint, 'choice-hint'));
  button.addEventListener('click', () => {
    for (const other of button.parentElement.children) other.setAttribute('aria-pressed', String(other === button));
    onChoose();
  });
  return button;
}

function showOutcome(outcome) {
  byId('outcome-title').textContent = outcome.title;
  byId('outcome-lines').replaceChildren(...outcome.lines.map(line => textElement('li', line)));
  byId('self-check-outcome').className = `self-check-outcome ${outcome.kind}`;
  byId('self-check-outcome').hidden = false;
  byId('outcome-title').focus();
}

function chooseMethod(method) {
  const check = window.TfsSelfCheck;
  byId('self-check-outcome').hidden = true;
  // A check that was not independent ends here; there is nothing to ask about it.
  const finished = !check.METHODS[method].independent;
  byId('answer-step').hidden = finished;
  if (finished) return showOutcome(check.outcome(method, null, shownResult));
  byId('answer-options').replaceChildren(...Object.entries(check.ANSWERS).map(([answer, label]) =>
    choiceButton(label, '', () => showOutcome(check.outcome(method, answer, shownResult)))));
  byId('answer-title').focus();
}

function resetSelfCheck() {
  byId('method-options').replaceChildren(...window.TfsSelfCheck.methodsFor(shownResult).map(m =>
    choiceButton(m.label, m.hint, () => chooseMethod(m.id))));
  for (const id of ['answer-options', 'outcome-title', 'outcome-lines']) byId(id).replaceChildren();
  byId('answer-step').hidden = true;
  byId('self-check-outcome').hidden = true;
}

/* ---------- Ask someone you trust (never changes the result) ---------- */

// Only the fixed request is shared or copied, never the person's message. The app the
// person picks sends it; this page sends nothing.
const helpRequest = () => byId('trusted-request').textContent;

async function shareRequest() {
  try {
    await navigator.share({ text: helpRequest() });
    byId('request-status').textContent = '';
  } catch (error) {
    // Closing the share menu is a choice, not a failure.
    if (error.name !== 'AbortError') byId('request-status').textContent = 'Sharing did not open. You can copy the request instead, or read it to them on the phone.';
  }
}

async function copyRequest() {
  try {
    await navigator.clipboard.writeText(helpRequest());
    byId('request-status').textContent = 'Copied. Paste it into a message to someone you trust.';
  } catch {
    byId('request-status').textContent = 'Copying did not work. You can select the request above and copy it, or read it to them on the phone.';
  }
}

/* ---------- Wiring ---------- */

for (const channel of CHANNELS) byId(`channel-${channel}`).addEventListener('click', () => chooseChannel(channel));
byId('message').addEventListener('input', () => {
  clearExampleNote();
  clearError();
  updateCount();
});
byId('submission-form').addEventListener('submit', checkMessage);
byId('back').addEventListener('click', () => {
  showScreen('home');
  byId('message').focus();
});
byId('start-again').addEventListener('click', startOver);
// Each button shows only where this browser can do it; the request stays readable either way.
byId('share-request').hidden = typeof navigator.share !== 'function';
byId('copy-request').hidden = !(navigator.clipboard && typeof navigator.clipboard.writeText === 'function');
byId('share-request').addEventListener('click', shareRequest);
byId('copy-request').addEventListener('click', copyRequest);
byId('reset').addEventListener('click', startOver);
for (const [id, example] of Object.entries(window.demoScenarios)) {
  const button = textElement('button', example.label);
  button.type = 'button';
  button.addEventListener('click', () => loadExample(id));
  byId('scenario-buttons').append(button);
}
byId('list-count').textContent = `${window.TFS_STORE.orgs.length} organizations · Website list ${window.TFS_STORE.version}`;
resetSelfCheck();
updateCount();

// Only a fixed made-up example from the scam guide (data/scam-guide.js) can be loaded by a link;
// no message text travels in a URL. Loading it neither chooses the channel nor runs the check.
const CHANNEL_NAMES = { text: 'Text', email: 'Email', unknown: 'Not sure' };
const exampleId = new URLSearchParams(window.location.search).get('example');
const practice = window.TFS_GUIDE && window.TFS_GUIDE.scams.find(s => s.id === exampleId);
if (practice) {
  startOver();
  byId('message').value = practice.example.text;
  updateCount();
  const channel = practice.example.channel;
  byId('example-loaded').textContent = `Made-up practice message. Choose ${CHANNEL_NAMES[channel]}, then Check this message when you are ready.`;
  byId('example-loaded').hidden = false;
  byId(`channel-${channel}`).focus();
  window.history.replaceState(null, '', window.location.pathname);
}
