/* No input is persisted or sent anywhere. Classic scripts also run from file://.
   Pasted text is checked by the engine in js/engine against the list in data/store.js. */
const byId = id => document.getElementById(id);
let inputType = 'paste';
let selectedScenario = null;
let revision = 0;

// Pasted text runs through the real checker on this device. Screenshots stay scripted
// until image reading exists; the app never reads the selected file.
async function analyzeSubmission(input) {
  // A short pause so the change of screen is noticeable for people who read slowly.
  await new Promise(resolve => setTimeout(resolve, 400));
  const result = input.type === 'upload'
    ? window.demoScenarios.screenshot.result
    : window.TfsEngine.analyze(input.text, window.TFS_STORE);
  if (!window.TfsEngine.validateResult(result)) throw new Error('Result failed the shape check');
  return result;
}

function showScreen(name) {
  for (const id of ['home', 'checking', 'result']) byId(id).hidden = id !== name;
  byId('demo-tools').hidden = name === 'checking';
  const heading = { home: 'home-title', checking: 'checking-title', result: 'result-title' }[name];
  byId(heading).focus();
}

function selectInput(type, clearScenario = true) {
  inputType = type;
  if (clearScenario) clearExample();
  for (const option of ['paste', 'upload']) {
    byId(`${option}-option`).setAttribute('aria-pressed', String(option === type));
    byId(`${option}-option`).classList.toggle('active', option === type);
    byId(`${option}-panel`).hidden = option !== type;
  }
  byId('error').textContent = '';
}
function clearExample() {
  selectedScenario = null;
  byId('example-loaded').hidden = true;
}
function reset() {
  revision += 1;
  byId('submission-form').reset();
  byId('submission-form').querySelector('[type=submit]').disabled = false;
  byId('file-name').textContent = 'No screenshot selected.';
  byId('message').removeAttribute('aria-invalid');
  byId('screenshot').removeAttribute('aria-invalid');
  selectInput('paste');
  byId('demo-tools').open = false;
  showScreen('home');
}
function loadScenario(id) {
  reset();
  selectedScenario = id;
  const scenario = window.demoScenarios[id];
  selectInput(scenario.type, false);
  byId('message').value = scenario.input;
  byId('example-loaded').textContent = `Loaded: ${scenario.label}. ${scenario.type === 'upload' ? 'This one is scripted, because the app does not read images yet; no file is needed.' : 'Choose “Check this” to run it through the checker.'}`;
  byId('example-loaded').hidden = false;
}

const stateDetails = {
  mismatch: { title: 'Suspicious mismatch', label: 'CONFLICTING EVIDENCE', symbol: '!' },
  match: { title: 'Matches what we have on file', label: 'MATCHING DETAILS · THE REQUEST STILL MATTERS', symbol: '=' },
  unknown: { title: 'Not enough evidence', label: 'UNRESOLVED · PAUSE BEFORE ACTING', symbol: '?' }
};
function renderResult(result) {
  const state = stateDetails[result.state];
  const risky = result.requestRisk && result.requestRisk.level !== 'none';
  let title = state.title;
  let label = state.label;
  if (result.state === 'mismatch' && result.strength === 'moderate') { title = 'Does not match our list'; }
  if (result.state === 'match' && risky) { label = 'DETAILS MATCH · BUT THIS REQUEST IS RISKY'; }
  if (result.state === 'unknown' && result.requestRisk && result.requestRisk.level === 'high') { label = 'UNRESOLVED · THIS REQUEST IS RISKY'; }
  byId('result-banner').className = `result-banner ${result.state}${risky ? ' risky' : ''}`;
  byId('state-symbol').textContent = state.symbol;
  byId('state-label').textContent = label;
  byId('result-title').textContent = title;
  byId('result-description').textContent = result.description;
  for (const [id, field] of Object.entries({identity:'claimedIdentity', channel:'channel', inspected:'inspected', meaning:'meaning'})) byId(id).textContent = result[field];
  byId('checks').replaceChildren();
  const checkLabels = { SUPPORTS: 'Details match', CONTRADICTS: 'Details conflict', UNKNOWN: 'Cannot establish a match' };
  for (const check of result.checks) {
    const item = document.createElement('li');
    const label = document.createElement('span');
    label.className = 'check-label';
    label.textContent = checkLabels[check.status];
    const detail = document.createElement('p');
    detail.textContent = check.detail;
    const source = document.createElement('span');
    source.className = 'source';
    source.textContent = `Source: ${check.source}`;
    item.append(label, detail, source);
    byId('checks').append(item);
  }
  // What the message asks for: quoted words from the request signals.
  const flags = (result.requestRisk && result.requestRisk.flags) || [];
  byId('asks-section').hidden = flags.length === 0;
  byId('asks').replaceChildren();
  for (const flag of flags) {
    const item = document.createElement('li');
    const name = document.createElement('span');
    name.className = 'check-label';
    name.textContent = flag.label || flag.id;
    const quote = document.createElement('p');
    quote.className = 'quote';
    quote.textContent = `“${flag.words}”`;
    item.append(name, quote);
    byId('asks').append(item);
  }
  // Render warnings for every state, including matching details.
  byId('warnings').replaceChildren();
  for (const text of result.actionWarnings) {
    const warning = document.createElement('p');
    warning.className = 'warning';
    warning.textContent = text;
    byId('warnings').append(warning);
  }
  byId('next-list').replaceChildren();
  for (const text of result.nextSteps) {
    const step = document.createElement('li');
    step.textContent = text;
    byId('next-list').append(step);
  }
  byId('paste-link').hidden = !result.offerPaste;
  showScreen('result');
}

byId('paste-option').addEventListener('click', () => selectInput('paste'));
byId('upload-option').addEventListener('click', () => selectInput('upload'));
byId('message').addEventListener('input', () => { clearExample(); byId('error').textContent = ''; byId('message').removeAttribute('aria-invalid'); });
byId('screenshot').addEventListener('change', () => {
  clearExample();
  byId('error').textContent = '';
  byId('screenshot').removeAttribute('aria-invalid');
  byId('file-name').textContent = byId('screenshot').files[0]?.name || 'No screenshot selected.';
});
byId('submission-form').addEventListener('submit', async event => {
  event.preventDefault();
  const text = byId('message').value.trim();
  const file = byId('screenshot').files[0];
  let error = '';
  if (inputType === 'paste' && !text) error = 'Paste a message or link first.';
  if (inputType === 'upload' && !file && selectedScenario !== 'screenshot') error = 'Choose a screenshot first.';
  if (inputType === 'upload' && file && (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024)) error = 'Choose a PNG, JPG, or WebP image smaller than 10 MB.';
  byId('error').textContent = error;
  if (error) {
    const field = byId(inputType === 'paste' ? 'message' : 'screenshot');
    field.setAttribute('aria-invalid', 'true'); field.focus(); return;
  }
  const currentRevision = ++revision;
  const submit = byId('submission-form').querySelector('[type=submit]');
  submit.disabled = true;
  showScreen('checking');
  try {
    const result = await analyzeSubmission({ type: inputType, text, file, scenarioId: selectedScenario });
    if (currentRevision === revision) renderResult(result);
  } catch {
    if (currentRevision === revision) { showScreen('home'); byId('error').textContent = 'The check could not finish. Please try again.'; }
  } finally { submit.disabled = false; }
});
for (const [id, scenario] of Object.entries(window.demoScenarios)) {
  const button = document.createElement('button');
  button.type = 'button'; button.textContent = scenario.label;
  button.addEventListener('click', () => loadScenario(id));
  byId('scenario-buttons').append(button);
}
byId('back').addEventListener('click', () => showScreen('home'));
byId('start-again').addEventListener('click', reset);
byId('reset').addEventListener('click', reset);
byId('paste-link').addEventListener('click', () => { reset(); byId('message').focus(); });
