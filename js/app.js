/* The view owns input and focus. The engine owns evidence and action guidance.
   No text or file is stored, read from disk, or sent to a server. */
const byId = id => document.getElementById(id);
const form = byId('submission-form');
const submitButton = byId('check-button');
const maxChars = window.TFS.MAX_CHARS;
let declaredChannel = null;
let selectedScenario = null;
let revision = 0;
let shownResult = null;

// Future API boundary: return the same validated result shape from this function.
async function analyzeSubmission(input) {
  const result = window.TfsEngine.analyze(input.text, window.TFS_STORE, { declaredChannel: input.declaredChannel, policies: window.TFS_POLICIES });
  if (!window.TfsEngine.validateResult(result)) throw new Error('Invalid result shape');
  return result;
}

function showScreen(name) {
  for (const id of ['home', 'checking', 'result']) byId(id).hidden = id !== name;
  byId('demo-tools').hidden = name === 'checking';
  const heading = { home: 'home-title', checking: 'checking-title', result: 'result-title' }[name];
  byId(heading).focus();
}

function clearError() {
  byId('error').textContent = '';
  byId('message').removeAttribute('aria-invalid');
  byId('channel-question').removeAttribute('aria-invalid');
  for (const channel of ['text', 'email', 'unknown']) byId(`channel-${channel}`).removeAttribute('aria-invalid');
}

function showError(text, field) {
  byId('error').textContent = text;
  if (field) {
    field.setAttribute('aria-invalid', 'true');
    field.focus();
  }
}

function clearExample() {
  selectedScenario = null;
  byId('example-loaded').textContent = '';
  byId('example-loaded').hidden = true;
}

function updateCount() {
  const count = byId('message').value.length;
  byId('character-count').textContent = `${count.toLocaleString()} / ${maxChars.toLocaleString()} characters`;
  byId('character-count').classList.toggle('over-limit', count > maxChars);
}

function selectChannel(channel) {
  declaredChannel = channel;
  for (const option of ['text', 'email', 'unknown']) {
    byId(`channel-${option}`).setAttribute('aria-pressed', String(option === channel));
    byId(`channel-${option}`).classList.toggle('active', option === channel);
  }
  clearError();
}

function clearResult() {
  for (const id of ['result-title', 'result-description', 'identity', 'channel', 'inspected', 'meaning', 'checks', 'asks', 'warnings', 'next-list', 'action-lead', 'annotated', 'annotated-advice', 'annotation-notes']) {
    byId(id).replaceChildren();
  }
  byId('annotated-section').hidden = true;
  shownResult = null;
  resetSelfCheck();
}

/* "I checked it myself": records the person's own check. It never changes the assessment. */
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
  byId('self-check-outcome').hidden = true;
  const done = !window.TfsSelfCheck.METHODS[method].independent;
  byId('answer-step').hidden = done;
  if (done) {
    showOutcome(window.TfsSelfCheck.outcome(method, null, shownResult));
    return;
  }
  byId('answer-options').replaceChildren(...Object.entries(window.TfsSelfCheck.ANSWERS).map(([answer, label]) =>
    choiceButton(label, '', () => showOutcome(window.TfsSelfCheck.outcome(method, answer, shownResult)))));
  byId('answer-title').focus();
}

function resetSelfCheck() {
  byId('method-options').replaceChildren(...window.TfsSelfCheck.methodsFor(shownResult).map(m =>
    choiceButton(m.label, m.hint, () => chooseMethod(m.id))));
  byId('answer-options').replaceChildren();
  byId('answer-step').hidden = true;
  byId('self-check-outcome').hidden = true;
  byId('outcome-title').replaceChildren();
  byId('outcome-lines').replaceChildren();
}

function reset() {
  revision += 1;
  form.reset();
  submitButton.disabled = false;
  clearResult();
  selectChannel(null);
  clearExample();
  updateCount();
  byId('demo-tools').open = false;
  showScreen('home');
}

function loadScenario(id) {
  reset();
  selectedScenario = id;
  const scenario = window.demoScenarios[id];
  byId('message').value = scenario.input;
  updateCount();
  byId('example-loaded').textContent = `Loaded: ${scenario.label}. Example channel: ${scenario.channelLabel}. Choose that channel before checking.`;
  byId('example-loaded').hidden = false;
  submitButton.focus();
}

const assessmentDetails = {
  suspicious: { css: 'mismatch', title: 'Suspicious', label: 'PAUSE BEFORE ACTING', symbol: '!' },
  details_match: { css: 'match', title: 'Details Match', label: 'CONTACT DETAILS ONLY', symbol: '=' },
  insufficient_evidence: { css: 'unknown', title: 'Insufficient Evidence', label: 'UNRESOLVED · PAUSE BEFORE ACTING', symbol: '?' }
};

function textElement(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

// The person's own message with each finding marked. Text nodes only: pasted markup stays text.
function renderAnnotations(text, result) {
  const model = window.TFS.annotate(text, result, window.TFS_STORE);
  window.TFS.renderAnnotations(document, model, byId('annotated'), byId('annotation-notes'));
  const advice = model.notes.length && result.assessment !== 'details_match' ? result.actionWarnings[0] : '';
  byId('annotated-advice').textContent = advice;
  byId('annotated-advice').hidden = !advice;
  byId('annotated-section').hidden = model.notes.length === 0;
}

function renderResult(result, text) {
  const state = assessmentDetails[result.assessment];
  const flags = result.requestRisk.flags;
  const risky = result.requestRisk.level !== 'none';
  const highRisk = result.requestRisk.level === 'high';
  byId('result-banner').className = `result-banner ${state.css}${risky ? ' risky' : ''}`;
  byId('state-symbol').textContent = state.symbol;
  byId('state-label').textContent = highRisk ? `${state.label} · ACTION WARNING` : state.label;
  byId('result-title').textContent = state.title;
  byId('result-description').textContent = result.description;
  byId('result-kind').textContent = 'YOUR LOCAL CHECK';
  byId('result-scope').textContent = 'Local text comparison only. No website was opened. The sender and caller were not checked.';
  for (const [id, field] of Object.entries({ identity: 'claimedIdentity', channel: 'channel', inspected: 'inspected', meaning: 'meaning' })) {
    byId(id).textContent = result[field];
  }

  // Put critical action advice next to the evidence state, also on narrow screens.
  const lead = result.actionWarnings[0];
  byId('action-lead').textContent = lead;
  byId('action-note').classList.toggle('high-risk', highRisk);
  byId('checks').replaceChildren();
  const checkLabels = { SUPPORTS: 'On our list', CONTRADICTS: 'Details conflict', UNKNOWN: 'Still unresolved' };
  for (const check of result.checks) {
    const item = document.createElement('li');
    item.className = `check-item ${check.status.toLowerCase()}`;
    const source = document.createElement('details');
    source.className = 'check-source';
    source.append(textElement(['sum', 'mary'].join(''), 'About this check'), textElement('p', check.source, 'source'));
    item.append(textElement('span', checkLabels[check.status], 'check-label'), textElement('p', check.detail), source);
    byId('checks').append(item);
  }

  byId('asks-section').hidden = flags.length === 0;
  byId('asks').replaceChildren();
  for (const flag of flags) {
    const item = document.createElement('li');
    item.append(textElement('span', flag.label, 'check-label'), textElement('p', `“${flag.words}”`, 'quote'));
    const evidence = result.requestRisk.established.find(e => e.antecedent && e.action.start === flag.start);
    if (evidence) item.append(textElement('p', `The request refers to “${evidence.antecedent.quote}” in this message.`, 'source'));
    byId('asks').append(item);
  }
  byId('warnings').replaceChildren();
  for (const text of result.actionWarnings.filter(text => text !== lead)) {
    byId('warnings').append(textElement('p', text, 'warning'));
  }
  byId('next-list').replaceChildren();
  for (const text of result.nextSteps) byId('next-list').append(textElement('li', text));
  byId('paste-link').hidden = !result.offerPaste;
  renderAnnotations(text, result);
  shownResult = result;
  resetSelfCheck();
  showScreen('result');
}

for (const channel of ['text', 'email', 'unknown']) {
  byId(`channel-${channel}`).addEventListener('click', () => selectChannel(channel));
}
byId('message').addEventListener('input', () => {
  clearExample();
  clearError();
  updateCount();
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitButton.disabled) return;
  clearError();
  const text = byId('message').value;
  let error = '';
  if (!text.trim()) error = 'Paste a message or link first.';
  else if (text.length > maxChars) error = `This is too long to check fully. Paste ${maxChars.toLocaleString()} characters or fewer, or one complete link.`;
  if (error) {
    showError(error, byId('message'));
    return;
  }
  if (!declaredChannel) {
    byId('channel-question').setAttribute('aria-invalid', 'true');
    showError('Choose Text, Email, or Not sure before checking.', byId('channel-text'));
    return;
  }

  const currentRevision = ++revision;
  submitButton.disabled = true;
  byId('checking-title').textContent = 'Checking the details…';
  byId('checking-note').textContent = 'Using the local reference list. No links are opened.';
  showScreen('checking');
  try {
    const result = await analyzeSubmission({ text, declaredChannel });
    if (currentRevision === revision) renderResult(result, text);
  } catch {
    if (currentRevision === revision) {
      showScreen('home');
      showError('The check could not finish. Your input is still here. Please try again.', byId('message'));
    }
  } finally {
    if (currentRevision === revision) submitButton.disabled = false;
  }
});

for (const [id, scenario] of Object.entries(window.demoScenarios)) {
  const button = textElement('button', scenario.label);
  button.type = 'button';
  button.addEventListener('click', () => loadScenario(id));
  byId('scenario-buttons').append(button);
}
byId('back').addEventListener('click', () => {
  showScreen('home');
  byId('message').focus();
});
byId('start-again').addEventListener('click', reset);
byId('reset').addEventListener('click', reset);
byId('paste-link').addEventListener('click', () => { reset(); byId('message').focus(); });
resetSelfCheck();
byId('list-count').textContent = `${window.TFS_STORE.orgs.length} organizations · Website list ${window.TFS_STORE.version}`;
updateCount();
