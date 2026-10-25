// "What happened?" search on recover.html. The topics themselves are plain <details> written from
// data/help-cards.js (scripts/build-recover.cjs), so they work without this file. This file only
// adds a search that suggests topics; choosing a suggestion opens that topic. Text is drawn with
// textContent only.
import { keywordSearch, mlSearch, loadModel } from './help-search.js';

// Language search starts with the page. Keyword results remain available while the local
// model loads or a language search is pending. This product choice is not accuracy evidence.
// docs/decisions/automatic-help-search.md; the frozen scorer stays in help-search.js.

const help = window.TFS_HELP;
const byId = id => document.getElementById(id);
const card = id => help.cards.find(c => c.id === id);

// Open a topic (and the topic it sits inside), then move the reader to it.
function openTopic(id) {
  const topic = byId(id);
  if (!topic) return;
  for (let el = topic; el; el = el.parentElement && el.parentElement.closest('details')) el.open = true;
  const summary = topic.querySelector(':scope > summary');
  summary.scrollIntoView({ block: 'start' });
  summary.focus();
}

function suggestion(c) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'help-topic';
  b.textContent = 'Suggested: ' + c.title;
  b.dataset.topic = c.id;
  b.addEventListener('click', () => { latest++; openTopic(c.id); });
  return b;
}

// Preparing the local model never blocks the menu or the first search results.
let modelState = 'idle';
async function prepareSearch() {
  if (modelState !== 'idle') return;
  modelState = 'loading';
  const status = byId('smart-search-status');
  status.textContent = 'Preparing search on your device (about 50 MB download). You can search now.';
  try {
    await loadModel();
    modelState = 'ready';
    status.textContent = 'Search is ready.';
    if (lastSearch) enhance(lastSearch);
  } catch {
    modelState = 'failed';
    status.textContent = 'The extra language tools could not load. You can still search and use every topic below.';
  }
}

// A late result must not replace a newer query or a topic the reader already chose.
let latest = 0;
let lastSearch = null;
const isCurrent = search => search.id === latest && search.query === byId('help-query').value.trim();

function showSuggestions(results, used) {
  const out = byId('help-suggestions');
  out.replaceChildren();
  out.dataset.method = used;
  if (!results.length) {
    byId('help-status').textContent = 'We could not match that to a topic. Open the closest one below, or “Something else, or I am not sure.”';
    return;
  }
  byId('help-status').textContent = 'These might fit. Choose the one that matches what happened.';
  results.forEach(r => out.append(suggestion(card(r.id))));
}

async function enhance(search) {
  if (modelState !== 'ready' || !isCurrent(search)) return;
  byId('help-status').textContent = 'Checking for related topics. You can choose a suggestion or a topic below now.';
  try {
    const results = await mlSearch(search.query, help);
    if (isCurrent(search)) showSuggestions(results, 'ml');
  } catch {
    if (!isCurrent(search)) return;
    modelState = 'failed';
    byId('smart-search-status').textContent = 'The extra language tools stopped working. You can still search and use every topic below.';
    showSuggestions(keywordSearch(search.query, help), 'keyword');
  }
}

function find(event) {
  event.preventDefault();
  const query = byId('help-query').value.trim();
  const search = { id: ++latest, query };
  lastSearch = query ? search : null;
  showSuggestions(query ? keywordSearch(query, help) : [], 'keyword');
  if (!query) {
    byId('help-status').textContent = 'Type a few words about what happened, or open a topic below.';
    return;
  }
  enhance(search);
}

function start() {
  if (!help || !byId('help-form')) return;
  byId('help-form').hidden = false;
  byId('help-form').addEventListener('submit', find);
  // Keep a result stable from the start of interaction, including keyboard focus.
  for (const event of ['focusin', 'pointerdown']) {
    byId('help-suggestions').addEventListener(event, () => { latest++; });
  }
  byId('help-query').addEventListener('input', () => {
    latest++;
    lastSearch = null;
    byId('help-suggestions').replaceChildren();
    byId('help-status').textContent = '';
  });
  prepareSearch();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
