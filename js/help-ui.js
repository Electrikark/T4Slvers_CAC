// "What happened?" search on recover.html. The topics themselves are plain <details> written from
// data/help-cards.js (scripts/build-recover.cjs), so they work without this file. This file only
// adds a search that suggests topics; choosing a suggestion opens that topic. Text is drawn with
// textContent only.
import { keywordSearch, mlSearch, loadModel } from './help-search.js';

// Which search the page uses by default. Set by the volunteer test (docs/decisions/help-search.md):
// 'keyword' unless the ML search meets the decision rule. Until then the ML search is a mode the
// reader turns on: it downloads only when they press "Turn on smart search mode", and only for
// that visit (nothing is stored). docs/decisions/help-search-opt-in.md.
const SEARCH = 'keyword';
let method = SEARCH;

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
  b.addEventListener('click', () => openTopic(c.id));
  return b;
}

// ML search is used only once the model is ready. Until then (or if it never loads) the page
// uses keyword search straight away, so nobody waits on a download.
let modelState = 'idle';
function turnOnSmartSearch() {
  if (modelState !== 'idle') return;
  method = 'ml';
  modelState = 'loading';
  const button = byId('smart-search-on'), status = byId('smart-search-status');
  button.disabled = true;
  status.textContent = 'Turning on smart search mode (about 50 MB download). You can search now; the regular search answers until it is ready.';
  loadModel().then(() => {
    modelState = 'ready';
    button.textContent = 'Smart search mode is on';
    status.textContent = 'Smart search mode is on for this visit.';
  }).catch(() => {
    modelState = 'failed';
    method = SEARCH;
    status.textContent = 'Smart search mode could not load. The regular search and every topic below still work.';
  });
}

// Each search gets a number; a slower, older search never replaces a newer one's results.
let latest = 0;
async function find(event) {
  event.preventDefault();
  const mine = ++latest;
  const query = byId('help-query').value.trim();
  const out = byId('help-suggestions');
  out.replaceChildren();
  if (!query) { byId('help-status').textContent = 'Type a few words about what happened, or open a topic below.'; return; }
  let results, used = 'keyword';
  if (method === 'ml' && modelState === 'ready') {
    try { results = await mlSearch(query, help); used = 'ml'; }
    catch {
      modelState = 'failed';
      byId('smart-search-status').textContent = 'Smart search mode stopped working. The regular search and every topic below still work.';
      results = keywordSearch(query, help);
    }
  } else {
    results = keywordSearch(query, help);
  }
  if (mine !== latest) return;
  out.replaceChildren();
  out.dataset.method = used;
  if (!results.length) {
    byId('help-status').textContent = 'We could not match that to a topic. Open the closest one below, or “Something else, or I am not sure.”';
    return;
  }
  byId('help-status').textContent = 'These might fit. Choose the one that matches what happened.';
  results.forEach(r => out.append(suggestion(card(r.id))));
}

function start() {
  if (!help || !byId('help-form')) return;
  byId('help-form').hidden = false;
  byId('help-form').addEventListener('submit', find);
  const smart = byId('smart-search-on');
  if (smart) smart.addEventListener('click', turnOnSmartSearch);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
