/* The view owns input and focus. The engine owns evidence and action guidance.
   No text or file is stored, read from disk, or sent to a server. */
const byId = id => document.getElementById(id);
const form = byId('submission-form');
const submitButton = byId('check-button');
const maxChars = window.TFS.MAX_CHARS;
let inputType = 'paste';
let selectedScenario = null;
let revision = 0;

// Future API boundary: return the same validated result shape from this function.
// Files need their own explicit handling if image analysis is added later.
async function analyzeSubmission(input) {
  await new Promise(resolve => setTimeout(resolve, 400));
  let result;
  if (input.type === 'upload') {
    result = input.scenarioId === 'screenshot'
      ? window.demoScenarios.screenshot.result
      : window.screenshotResult;
  } else {
    result = window.TfsEngine.analyze(input.text, window.TFS_STORE);
  }
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
  byId('screenshot').removeAttribute('aria-invalid');
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

function selectInput(type, clearScenario = true) {
  inputType = type;
  if (clearScenario) clearExample();
  for (const option of ['paste', 'upload']) {
    byId(`${option}-option`).setAttribute('aria-pressed', String(option === type));
    byId(`${option}-option`).classList.toggle('active', option === type);
    byId(`${option}-panel`).hidden = option !== type;
  }
  clearError();
}

function clearResult() {
  for (const id of ['result-title', 'result-description', 'identity', 'channel', 'inspected', 'meaning', 'checks', 'asks', 'warnings', 'next-list', 'action-lead']) {
    byId(id).replaceChildren();
  }
}

function reset() {
  revision += 1;
  form.reset();
  submitButton.disabled = false;
  byId('file-name').textContent = 'No screenshot selected.';
  byId('remove-file').hidden = true;
  clearResult();
  selectInput('paste');
  updateCount();
  byId('demo-tools').open = false;
  showScreen('home');
}

function loadScenario(id) {
  reset();
  selectedScenario = id;
  const scenario = window.demoScenarios[id];
  selectInput(scenario.type, false);
  byId('message').value = scenario.input;
  updateCount();
  byId('example-loaded').textContent = `Loaded: ${scenario.label}. ${scenario.type === 'upload' ? 'A scripted screenshot example; no file is needed.' : 'Choose “Check this” to compare the text with the local list.'}`;
  byId('example-loaded').hidden = false;
  submitButton.focus();
}

const stateDetails = {
  mismatch: { title: 'Suspicious mismatch', label: 'CONFLICTING DETAILS', symbol: '!' },
  match: { title: 'Details match our list', label: 'ADDRESS MATCH · SENDER STILL UNKNOWN', symbol: '=' },
  unknown: { title: 'Not enough evidence', label: 'UNRESOLVED · PAUSE BEFORE ACTING', symbol: '?' }
};

function textElement(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

function renderResult(result) {
  const state = stateDetails[result.state];
  const flags = result.requestRisk.flags;
  const risky = result.requestRisk.level !== 'none';
  const highRisk = result.requestRisk.level === 'high';
  byId('result-banner').className = `result-banner ${result.state}${risky ? ' risky' : ''}`;
  byId('state-symbol').textContent = state.symbol;
  byId('state-label').textContent = highRisk ? `${state.label} · ACTION WARNING` : state.label;
  byId('result-title').textContent = result.state === 'mismatch' && result.strength === 'moderate'
    ? 'Conflicting address details' : state.title;
  byId('result-description').textContent = result.description;
  byId('result-kind').textContent = selectedScenario === 'screenshot'
    ? 'SCRIPTED SCREENSHOT EXAMPLE' : inputType === 'upload' ? 'IMAGE NOT ANALYZED' : 'YOUR LOCAL CHECK';
  byId('result-scope').textContent = inputType === 'upload'
    ? 'This app has not read the image or checked any hidden link.'
    : 'Local text comparison only. No website was opened. The sender and caller were not checked.';
  for (const [id, field] of Object.entries({ identity: 'claimedIdentity', channel: 'channel', inspected: 'inspected', meaning: 'meaning' })) {
    byId(id).textContent = result[field];
  }

  // Put critical action advice next to the evidence state, also on narrow screens.
  const leadingFlag = flags.find(flag => flag.level === 'high');
  const lead = leadingFlag ? leadingFlag.explanation : result.actionWarnings[0];
  byId('action-lead').textContent = lead;
  byId('action-note').classList.toggle('high-risk', highRisk);
  byId('checks').replaceChildren();
  const checkLabels = { SUPPORTS: 'On our list', CONTRADICTS: 'Details conflict', UNKNOWN: 'Still unresolved' };
  for (const check of result.checks) {
    const item = document.createElement('li');
    item.className = `check-item ${check.status.toLowerCase()}`;
    const source = document.createElement('details');
    source.className = 'check-source';
    source.append(textElement('summary', 'About this check'), textElement('p', check.source, 'source'));
    item.append(textElement('span', checkLabels[check.status], 'check-label'), textElement('p', check.detail), source);
    byId('checks').append(item);
  }

  byId('asks-section').hidden = flags.length === 0;
  byId('asks').replaceChildren();
  for (const flag of flags) {
    const item = document.createElement('li');
    item.append(textElement('span', flag.label, 'check-label'), textElement('p', `“${flag.words}”`, 'quote'));
    byId('asks').append(item);
  }
  byId('warnings').replaceChildren();
  for (const text of result.actionWarnings.filter(text => text !== lead)) {
    byId('warnings').append(textElement('p', text, 'warning'));
  }
  byId('next-list').replaceChildren();
  for (const text of result.nextSteps) byId('next-list').append(textElement('li', text));
  byId('paste-link').hidden = !result.offerPaste;
  showScreen('result');
}

byId('paste-option').addEventListener('click', () => selectInput('paste'));
byId('upload-option').addEventListener('click', () => selectInput('upload'));
byId('message').addEventListener('input', () => {
  clearExample();
  clearError();
  updateCount();
});
byId('screenshot').addEventListener('change', () => {
  clearExample();
  clearError();
  const file = byId('screenshot').files[0];
  byId('file-name').textContent = file ? `Selected: ${file.name}` : 'No screenshot selected.';
  byId('remove-file').hidden = !file;
});
byId('remove-file').addEventListener('click', () => {
  byId('screenshot').value = '';
  byId('file-name').textContent = 'No screenshot selected.';
  byId('remove-file').hidden = true;
  clearExample();
  clearError();
  byId('screenshot').focus();
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitButton.disabled) return;
  clearError();
  const text = byId('message').value.trim();
  const file = byId('screenshot').files[0];
  let error = '';
  if (inputType === 'paste' && !text) error = 'Paste a message or link first.';
  else if (inputType === 'paste' && text.length > maxChars) error = `This is too long to check fully. Paste ${maxChars.toLocaleString()} characters or fewer, or one complete link.`;
  else if (inputType === 'upload' && !file && selectedScenario !== 'screenshot') error = 'Choose a screenshot first.';
  else if (inputType === 'upload' && file && (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024)) error = 'Choose a PNG, JPG, or WebP image up to 10 MB.';
  if (error) {
    showError(error, byId(inputType === 'paste' ? 'message' : 'screenshot'));
    return;
  }

  const currentRevision = ++revision;
  submitButton.disabled = true;
  byId('checking-title').textContent = inputType === 'upload' ? 'Preparing image guidance…' : 'Comparing the details…';
  byId('checking-note').textContent = inputType === 'upload' ? 'Your image is not being read or sent anywhere.' : 'Using the local reference list. No links are opened.';
  showScreen('checking');
  try {
    const result = await analyzeSubmission({ type: inputType, text, scenarioId: selectedScenario });
    if (currentRevision === revision) renderResult(result);
  } catch {
    if (currentRevision === revision) {
      showScreen('home');
      showError('The check could not finish. Your input is still here. Please try again.', byId(inputType === 'paste' ? 'message' : 'screenshot'));
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
  byId(inputType === 'paste' ? 'message' : 'screenshot').focus();
});
byId('start-again').addEventListener('click', reset);
byId('reset').addEventListener('click', reset);
byId('paste-link').addEventListener('click', () => { reset(); byId('message').focus(); });
byId('list-count').textContent = `${window.TFS_STORE.orgs.length} organizations · Website list ${window.TFS_STORE.version}`;
updateCount();
