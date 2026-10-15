// app.js - Frontend logic for the checker tool
// TODO: clean up some of these helpers later when we refactor into modules, but works for now

const getElem = (id) => document.getElementById(id);

const myForm = getElem('submission-form');
const checkBtn = getElem('check-button');
const charLimit = window.TFS.MAX_CHARS;
const possibleChannels = ['text', 'email', 'unknown'];

let selectedChannel = null;
let currentRev = 0;
let lastResult = null; // Storing this so we can access it in the self-check stuff

function analyzeSubmission(text, channel) {
  // calling the engine - hope this doesn't fail lol
  const res = window.TfsEngine.analyze(text, window.TFS_STORE, { declaredChannel: channel });
  if (!window.TfsEngine.validateResult(res)) {
    throw new Error('Invalid result shape');
  }
  return res;
}

function showScreen(screenName) {
  // Hide/show screens... probably a better way to do this with CSS classes but whatever
  ['home', 'checking', 'result'].forEach(id => {
    getElem(id).hidden = (id !== screenName);
  });
  
  getElem('demo-tools').hidden = (screenName === 'checking');
  
  const headingMap = { home: 'home-title', checking: 'checking-title', result: 'result-title' };
  const targetHeading = headingMap[screenName];
  if (targetHeading) {
    getElem(targetHeading).focus();
  }
}

function clearError() {
  getElem('error').textContent = '';
  getElem('message').removeAttribute('aria-invalid');
  getElem('channel-question').removeAttribute('aria-invalid');
  possibleChannels.forEach(c => {
    getElem(`channel-${c}`).removeAttribute('aria-invalid');
  });
}

function showError(msg, fieldToFocus) {
  getElem('error').textContent = msg;
  if (fieldToFocus) {
    fieldToFocus.setAttribute('aria-invalid', 'true');
    fieldToFocus.focus();
  }
}

function clearExample() {
  const ex = getElem('example-loaded');
  ex.textContent = '';
  ex.hidden = true;
}

function updateCount() {
  const currentLen = getElem('message').value.length;
  const countDisplay = getElem('character-count');
  countDisplay.textContent = `${currentLen.toLocaleString()} / ${charLimit.toLocaleString()} characters`;
  
  if (currentLen > charLimit) {
    countDisplay.classList.add('over-limit');
  } else {
    countDisplay.classList.remove('over-limit');
  }
}

function selectChannel(ch) {
  selectedChannel = ch;
  possibleChannels.forEach(opt => {
    const el = getElem(`channel-${opt}`);
    el.setAttribute('aria-pressed', String(opt === ch));
    if (opt === ch) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });
  clearError();
}

function clearResult() {
  // Clearing out old result data from the DOM
  const idsToClear = [
    'result-title', 'result-description', 'identity', 'channel', 
    'inspected', 'meaning', 'checks', 'asks', 'warnings', 'next-list', 'action-lead'
  ];
  
  idsToClear.forEach(id => {
    getElem(id).replaceChildren();
  });
  
  lastResult = null;
  resetSelfCheck();
}

// "I checked it myself": records the person's own check. It never changes the assessment.
function choiceButton(label, hint, onChoose) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'self-check-option';
  btn.setAttribute('aria-pressed', 'false');
  
  btn.append(textElement('span', label, 'choice-label'));
  if (hint) {
    btn.append(textElement('span', hint, 'choice-hint'));
  }
  
  btn.addEventListener('click', (e) => {
    // Just loop through siblings to toggle pressed state
    const parent = btn.parentElement;
    for (const child of parent.children) {
      child.setAttribute('aria-pressed', String(child === btn));
    }
    onChoose();
  });
  
  return btn;
}

function showOutcome(outcome) {
  getElem('outcome-title').textContent = outcome.title;
  
  const linesContainer = getElem('outcome-lines');
  linesContainer.replaceChildren(...outcome.lines.map(l => textElement('li', l)));
  
  const outcomeBox = getElem('self-check-outcome');
  outcomeBox.className = `self-check-outcome ${outcome.kind}`;
  outcomeBox.hidden = false;
  
  getElem('outcome-title').focus();
}

function chooseMethod(methodKey) {
  getElem('self-check-outcome').hidden = true;
  const isDone = !window.TfsSelfCheck.METHODS[methodKey].independent;
  
  getElem('answer-step').hidden = isDone;
  if (isDone) {
    showOutcome(window.TfsSelfCheck.outcome(methodKey, null, lastResult));
    return;
  }
  
  const answerOpts = getElem('answer-options');
  const answerEntries = Object.entries(window.TfsSelfCheck.ANSWERS);
  
  answerOpts.replaceChildren(
    ...answerEntries.map(([ansKey, ansLabel]) => 
      choiceButton(ansLabel, '', () => {
        showOutcome(window.TfsSelfCheck.outcome(methodKey, ansKey, lastResult));
      })
    )
  );
  
  getElem('answer-title').focus();
}

function resetSelfCheck() {
  const methodOpts = getElem('method-options');
  const availableMethods = window.TfsSelfCheck.methodsFor(lastResult);
  
  methodOpts.replaceChildren(
    ...availableMethods.map(m => choiceButton(m.label, m.hint, () => chooseMethod(m.id)))
  );
  
  getElem('answer-options').replaceChildren();
  getElem('answer-step').hidden = true;
  getElem('self-check-outcome').hidden = true;
  getElem('outcome-title').replaceChildren();
  getElem('outcome-lines').replaceChildren();
}

function resetApp() {
  currentRev++;
  myForm.reset();
  checkBtn.disabled = false;
  clearResult();
  selectChannel(null);
  clearExample();
  updateCount();
  getElem('demo-tools').open = false;
  showScreen('home');
}

function loadScenario(scenarioId) {
  resetApp();
  const scenario = window.demoScenarios[scenarioId];
  getElem('message').value = scenario.input;
  updateCount();
  
  const exLoaded = getElem('example-loaded');
  exLoaded.textContent = `Loaded: ${scenario.label}. Example channel: ${scenario.channelLabel}. Choose that channel before checking.`;
  exLoaded.hidden = false;
  
  checkBtn.focus();
}

const assessmentDetails = {
  suspicious: { css: 'mismatch', title: 'Suspicious', label: 'PAUSE BEFORE ACTING', symbol: '!' },
  details_match: { css: 'match', title: 'Details Match', label: 'CONTACT DETAILS ONLY', symbol: '=' },
  insufficient_evidence: { css: 'unknown', title: 'Insufficient Evidence', label: 'UNRESOLVED · PAUSE BEFORE ACTING', symbol: '?' }
};

function textElement(tag, txt, className) {
  const el = document.createElement(tag);
  el.textContent = txt;
  if (className) {
    el.className = className;
  }
  return el;
}

function renderResult(result) {
  const info = assessmentDetails[result.assessment];
  const riskFlags = result.requestRisk.flags;
  const isRisky = result.requestRisk.level !== 'none';
  const isHighRisk = result.requestRisk.level === 'high';
  
  const banner = getElem('result-banner');
  banner.className = `result-banner ${info.css}${isRisky ? ' risky' : ''}`;
  
  getElem('state-symbol').textContent = info.symbol;
  getElem('state-label').textContent = isHighRisk ? `${info.label} · ACTION WARNING` : info.label;
  getElem('result-title').textContent = info.title;
  getElem('result-description').textContent = result.description;
  
  // Quick mapping to populate text fields
  const fieldsToFill = {
    identity: 'claimedIdentity', 
    channel: 'channel', 
    inspected: 'inspected', 
    meaning: 'meaning'
  };
  
  for (const [domId, propName] of Object.entries(fieldsToFill)) {
    getElem(domId).textContent = result[propName];
  }

  const primaryLead = result.actionWarnings[0];
  getElem('action-lead').textContent = primaryLead;
  
  const actionNote = getElem('action-note');
  if (isHighRisk) {
    actionNote.classList.add('high-risk');
  } else {
    actionNote.classList.remove('high-risk');
  }
  
  const checksContainer = getElem('checks');
  checksContainer.replaceChildren();
  
  const checkLabels = { SUPPORTS: 'On our list', CONTRADICTS: 'Details conflict', UNKNOWN: 'Still unresolved' };
  
  result.checks.forEach(chk => {
    const item = document.createElement('li');
    item.className = `check-item ${chk.status.toLowerCase()}`;
    
    const detailsTag = document.createElement('details');
    detailsTag.className = 'check-source';
    detailsTag.append(
      textElement('summary', 'About this check'), 
      textElement('p', chk.source, 'source')
    );
    
    item.append(
      textElement('span', checkLabels[chk.status], 'check-label'), 
      textElement('p', chk.detail), 
      detailsTag
    );
    checksContainer.append(item);
  });

  const asksSec = getElem('asks-section');
  asksSec.hidden = (riskFlags.length === 0);
  
  const asksContainer = getElem('asks');
  asksContainer.replaceChildren();
  
  riskFlags.forEach(flag => {
    const item = document.createElement('li');
    item.append(
      textElement('span', flag.label, 'check-label'), 
      textElement('p', `“${flag.words}”`, 'quote')
    );
    
    const matchingEvidence = result.requestRisk.established.find(e => e.antecedent && e.action.start === flag.start);
    if (matchingEvidence) {
      item.append(textElement('p', `The request refers to “${matchingEvidence.antecedent.quote}” in this message.`, 'source'));
    }
    asksContainer.append(item);
  });
  
  const warningsContainer = getElem('warnings');
  warningsContainer.replaceChildren();
  
  result.actionWarnings.forEach(wText => {
    if (wText !== primaryLead) {
      warningsContainer.append(textElement('p', wText, 'warning'));
    }
  });
  
  const nextList = getElem('next-list');
  nextList.replaceChildren();
  result.nextSteps.forEach(step => {
    nextList.append(textElement('li', step));
  });
  
  getElem('paste-link').hidden = !result.offerPaste;
  
  lastResult = result;
  resetSelfCheck();
  showScreen('result');
}

// Event Listeners setup loop
possibleChannels.forEach(c => {
  getElem(`channel-${c}`).addEventListener('click', () => selectChannel(c));
});

getElem('message').addEventListener('input', () => {
  clearExample();
  clearError();
  updateCount();
});

myForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (checkBtn.disabled) return;
  
  clearError();
  const textVal = getElem('message').value;
  let validationError = '';
  
  if (!textVal.trim()) {
    validationError = 'Paste a message or link first.';
  } else if (textVal.length > charLimit) {
    validationError = `This is too long to check fully. Paste ${charLimit.toLocaleString()} characters or fewer, or one complete link.`;
  }
  
  if (validationError) {
    showError(validationError, getElem('message'));
    return;
  }
  
  if (!selectedChannel) {
    getElem('channel-question').setAttribute('aria-invalid', 'true');
    showError('Choose Text, Email, or Not sure before checking.', getElem('channel-text'));
    return;
  }

  const thisRevision = ++currentRev;
  checkBtn.disabled = true;
  showScreen('checking');
  
  try {
    const analysisResult = await analyzeSubmission(textVal, selectedChannel);
    if (thisRevision === currentRev) {
      renderResult(analysisResult);
    }
  } catch (err) {
    // console.log("Error during analysis:", err);
    if (thisRevision === currentRev) {
      showScreen('home');
      showError('The check could not finish. Your input is still here. Please try again.', getElem('message'));
    }
  } finally {
    if (thisRevision === currentRev) {
      checkBtn.disabled = false;
    }
  }
});

// Setup scenario buttons dynamically
for (const [scenarioKey, scenarioObj] of Object.entries(window.demoScenarios)) {
  const scenarioBtn = textElement('button', scenarioObj.label);
  scenarioBtn.type = 'button';
  scenarioBtn.addEventListener('click', () => loadScenario(scenarioKey));
  getElem('scenario-buttons').append(scenarioBtn);
}

// Bottom action bindings
getElem('back').addEventListener('click', () => {
  showScreen('home');
  getElem('message').focus();
});

getElem('start-again').addEventListener('click', resetApp);
getElem('reset').addEventListener('click', resetApp);

getElem('paste-link').addEventListener('click', () => {
  resetApp();
  getElem('message').focus();
});

// Init calls
resetSelfCheck();
getElem('list-count').textContent = `${window.TFS_STORE.orgs.length} organizations · Website list ${window.TFS_STORE.version}`;
updateCount();