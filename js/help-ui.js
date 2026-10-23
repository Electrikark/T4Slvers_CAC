// "Already did something?" help: a menu of every topic (always available, no download) and
// a search that only suggests topics. Text is drawn with textContent only.
import { keywordSearch, mlSearch, loadModel } from './help-search.js';

// Which search the page uses. Set by the volunteer test (docs/decisions/help-search.md):
// 'keyword' unless the ML search meets the decision rule. "?search=ml" tries the ML search
// for testing only.
const SEARCH = 'keyword';
const method = new URLSearchParams(location.search).get('search') === 'ml' ? 'ml' : SEARCH;

const help = window.TFS_HELP;
const byId = id => document.getElementById(id);
const card = id => help.cards.find(c => c.id === id);
const el = (tag, props = {}, text) => { const n = document.createElement(tag); Object.assign(n, props); if (text != null) n.textContent = text; return n; };

function topicButton(c, extra) {
  const b = el('button', { type: 'button', className: 'help-topic' }, extra ? extra + c.title : c.title);
  b.addEventListener('click', () => open(c.id));
  return b;
}

function open(id) {
  const c = card(id);
  const view = byId('help-card');
  view.replaceChildren();
  view.append(el('h3', { id: 'help-card-title', tabIndex: -1 }, c.title));
  if (c.summary) view.append(el('p', { className: 'help-summary' }, c.summary));
  if (c.children) {
    view.append(el('p', { className: 'help-choose' }, c.choose));
    const list = el('div', { className: 'help-topics' });
    c.children.forEach(child => list.append(topicButton(card(child))));
    view.append(list);
  }
  if (c.steps) {
    const ol = el('ol', { className: 'help-steps' });
    for (const step of c.steps) {
      const li = el('li', {}, step.text + ' ');
      const source = step.source && help.sources[step.source];
      if (source) li.append(el('a', { href: source.url, target: '_blank', rel: 'noopener noreferrer', className: 'help-source' }, 'Source: ' + source.title));
      else li.append(el('span', { className: 'help-source' }, 'Tech for Silvers advice'));
      ol.append(li);
    }
    view.append(ol);
  }
  const back = el('button', { type: 'button', className: 'text-button' }, c.parent ? 'Back to “' + card(c.parent).title + '”' : 'Back to all topics');
  back.addEventListener('click', () => c.parent ? open(c.parent) : close());
  view.append(back);
  view.hidden = false;
  byId('help-card-title').focus();
}

function close() {
  byId('help-card').hidden = true;
  byId('help-menu').querySelector('button')?.focus();
}

// ML search is used only once the model is ready. Until then (or if it never loads) the page
// uses keyword search straight away, so nobody waits on a download.
let modelState = 'idle';
function prepareModel() {
  if (method !== 'ml' || modelState !== 'idle') return;
  modelState = 'loading';
  loadModel().then(() => { modelState = 'ready'; })
    .catch(() => { modelState = 'failed'; });
}

// Each search gets a number; a slower, older search never replaces a newer one's results.
let latest = 0;
async function find(event) {
  event.preventDefault();
  const mine = ++latest;
  const query = byId('help-query').value.trim();
  const out = byId('help-suggestions');
  out.replaceChildren();
  if (!query) { byId('help-status').textContent = 'Type a few words about what happened, or choose a topic above.'; return; }
  let results, used = 'keyword';
  if (method === 'ml' && modelState === 'ready') {
    try { results = await mlSearch(query, help); used = 'ml'; }
    catch { modelState = 'failed'; results = keywordSearch(query, help); }
  } else {
    results = keywordSearch(query, help);
  }
  if (mine !== latest) return;
  out.replaceChildren();
  out.dataset.method = used;
  if (!results.length) {
    byId('help-status').textContent = 'We could not match that to a topic. Choose the closest one above, or “Something else, or I am not sure.”';
    return;
  }
  byId('help-status').textContent = 'These might fit. Choose the one that matches what happened.';
  results.forEach(r => out.append(topicButton(card(r.id), 'Suggested: ')));
}

function start() {
  if (!help) return;
  const menu = byId('help-menu');
  help.cards.filter(c => !c.parent).forEach(c => menu.append(topicButton(c)));
  byId('help-draft').hidden = Boolean(help.approvedBy);
  byId('help-form').addEventListener('submit', find);
  byId('help-query').addEventListener('focus', prepareModel);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
