/* The page: reads the form, shows results, and runs the "I checked it myself" step.
   The engine decides everything; this file only displays it.
   Nothing typed here is stored or sent anywhere. */
const byId = id => document.getElementById(id);
const CHANNELS = ['text', 'email', 'unknown'];
const MAX_CHARS = window.TFS.MAX_CHARS;

let chosenChannel = null;
let shownResult = null;

const RESULT_STYLES = {
  suspicious: { css: 'mismatch', title: 'Suspicious', label: 'PAUSE BEFORE ACTING', symbol: '!' },
  details_match: { css: 'match', title: 'Details Match', label: 'CONTACT DETAILS ONLY', symbol: '=' },
  insufficient_evidence: { css: 'unknown', title: 'Insufficient Evidence', label: 'UNRESOLVED · PAUSE BEFORE ACTING', symbol: '?' }
};
const CHECK_LABELS = { SUPPORTS: 'On our list', CONTRADICTS: 'Details conflict', UNKNOWN: 'Still unresolved' };

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
    const result = window.TfsEngine.analyze(text, window.TFS_STORE, { declaredChannel: chosenChannel });
    // Never show a result whose parts disagree; fail with a plain message instead.
    if (!window.TfsEngine.validateResult(result)) throw new Error('Invalid result');
    showResult(result);
  } catch {
    showScreen('home');
    showError('The check could not finish. Your input is still here. Please try again.', byId('message'));
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

function showResult(result) {
  const style = RESULT_STYLES[result.assessment];
  const risk = result.requestRisk.level;
  byId('result-banner').className = `result-banner ${style.css}${risk !== 'none' ? ' risky' : ''}`;
  byId('state-symbol').textContent = style.symbol;
  byId('state-label').textContent = risk === 'high' ? `${style.label} · ACTION WARNING` : style.label;
  byId('result-title').textContent = style.title;
  byId('result-description').textContent = result.description;
  byId('identity').textContent = result.claimedIdentity;
  byId('channel').textContent = result.channel;
  byId('inspected').textContent = result.inspected;
  byId('meaning').textContent = result.meaning;

  // The most important warning sits right under the result, also on small screens.
  const [lead, ...otherWarnings] = result.actionWarnings;
  byId('action-lead').textContent = lead;
  byId('action-note').classList.toggle('high-risk', risk === 'high');

  byId('checks').replaceChildren(...result.checks.map(checkItem));
  byId('asks-section').hidden = result.requestRisk.flags.length === 0;
  byId('asks').replaceChildren(...result.requestRisk.flags.map(flag => signalItem(flag, result)));
  byId('warnings').replaceChildren(...otherWarnings.map(text => textElement('p', text, 'warning')));
  byId('next-list').replaceChildren(...result.nextSteps.map(text => textElement('li', text)));

  shownResult = result;
  resetSelfCheck();
  showScreen('result');
}

function clearResult() {
  for (const id of ['result-title', 'result-description', 'identity', 'channel', 'inspected', 'meaning', 'checks', 'asks', 'warnings', 'next-list', 'action-lead']) {
    byId(id).replaceChildren();
  }
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
