// Finds help cards for "I already did something" descriptions. Two methods over the same
// content (each card's title and example descriptions), so a comparison tests the method only:
//   keywordSearch - word overlap (BM25) with a small fixed synonym list; no download
//   mlSearch      - all-MiniLM-L6-v2 sentence embeddings, run locally from vendor/minilm. The
//                   embedding score decides whether a card matches at all; matching cards are
//                   ranked by a mix of that score and the keyword score (a hybrid).
// Both return suggestions only. The page always shows every topic, and a weak match
// returns nothing rather than a confident guess.

const base = () => new URL('vendor/minilm/', document.baseURI).href;
const MODEL = 'Xenova/all-MiniLM-L6-v2';

// Chosen on development data only (experiments/help-search/dev-challenge.json and the card
// examples), by one rule for both methods: most first suggestions right while confidently wrong
// on at most 2 of the 4 unrelated questions. Frozen before the volunteer test
// (experiments/help-search/freeze.json); changing them afterwards invalidates that test.
export const SETTINGS = {
  keywordMinScore: 2,
  mlMinSimilarity: 0.45,
  mlWeight: 0.6,
  suggestions: 3
};

// "Something else, or I am not sure" goes first only when the description says nothing was
// handed over: "they asked for my code but I did not give it", "I hung up before I gave them
// anything". If the person did hand something over anywhere in the sentence ("I gave them my
// password but did not send money"), the suggestions are left alone. Same rule for both methods.
// "n't" sits inside a word (didn't, haven't), so it has no word boundary before it.
const NEGATION_CUE = /\b(?:not|never|almost|nearly|stopped|hung up|refused|before)\b|n['’]t\b/i;
const HANDOVER = /\b(?:gave|give|given|sent|send|paid|pay|told|tell|read|shared?|typed|entered|bought|buy|purchased|installed|downloaded|let|transferred|wired|mailed|scratched|filled|answered|put|zelled|venmoed)\b/gi;
const NOT_ME = /\b(?:they|he|she|someone|somebody|the (?:caller|man|woman|guy|lady|scammer|text|message)|it)\b/gi;
// Clause boundaries: a negation or "before" does not reach past these.
const CLAUSE_END = /[.;!?,]|\b(?:but|and then|then|and|so|because)\b/gi;

function nothingHandedOver(query) {
  const text = String(query).toLowerCase();
  if (!NEGATION_CUE.test(text)) return false;
  const cuts = [0];
  for (const m of text.matchAll(CLAUSE_END)) cuts.push(m.index, m.index + m[0].length);
  cuts.push(text.length);
  for (let i = 0; i < cuts.length - 1; i += 2) {
    const clause = text.slice(cuts[i], cuts[i + 1]);
    for (const verb of clause.matchAll(HANDOVER)) {
      const before = clause.slice(0, verb.index);
      // "did not give", "never paid", "almost bought", "before I gave": not handed over.
      if (/\b(?:not|never|almost|nearly|before|without|refused to)\b|n['’]t\b/.test(before)) continue;
      // "they sent me", "the caller told me": someone else did it.
      const lastMe = Math.max(before.lastIndexOf(' i '), before.startsWith('i ') ? 0 : -1, before.lastIndexOf("i'"));
      const others = [...before.matchAll(NOT_ME)].map(m => m.index);
      if (others.length && others[others.length - 1] > lastMe) continue;
      return false;
    }
  }
  return true;
}

function withNegation(query, list) {
  if (!nothingHandedOver(query)) return list;
  return [{ id: 'other', score: null }].concat(list.filter(r => r.id !== 'other')).slice(0, SETTINGS.suggestions);
}

export const _test = { nothingHandedOver };

const STOP = new Set(('a an and are as at be but by for from had has have he her him his i i\'m im in is it its me my of on or ' +
  'our she so that the their them then there they this to was we were what when which who will with you your just did do ' +
  'got get go went about all also am any been can could would should into out up down over').split(' '));
// A small, fixed synonym list: the keyword method's fair share of hand-made knowledge.
const SYNONYMS = {
  passcode: 'code', pin: 'code', otp: 'code', digits: 'code', numbers: 'code', password: 'password',
  anydesk: 'remote', teamviewer: 'remote', control: 'remote', screen: 'remote', access: 'remote', technician: 'remote', support: 'remote',
  giftcard: 'gift', giftcards: 'gift', itunes: 'gift', 'google': 'gift', target: 'gift', apple: 'gift',
  zelle: 'bank', transfer: 'bank', debit: 'bank', checking: 'bank',
  venmo: 'app', cashapp: 'app', paypal: 'app',
  wire: 'wire', wired: 'wire', western: 'wire', moneygram: 'wire',
  visa: 'credit', mastercard: 'credit', bitcoin: 'crypto', cryptocurrency: 'crypto',
  mailed: 'mail', envelope: 'mail', courier: 'mail', fedex: 'mail', ups: 'mail',
  social: 'ssn', security: 'ssn', medicare: 'ssn', birth: 'ssn', license: 'ssn',
  paid: 'pay', paying: 'pay', sent: 'send', sending: 'send', money: 'pay'
};

function stem(w) {
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}
export function tokens(text) {
  const words = String(text).toLowerCase().replace(/cash app/g, 'cashapp').replace(/gift cards?/g, 'giftcard')
    .match(/[a-z0-9']+/g) || [];
  return words.filter(w => !STOP.has(w)).map(w => SYNONYMS[w] || stem(w));
}

// Every card a description can match: each card's own title and examples.
function documents(help) {
  return help.cards.filter(c => c.examples && c.examples.length).map(c => ({ id: c.id, texts: [c.title].concat(c.examples) }));
}

function keywordScores(query, help, exclude) {
  const docs = documents(help).map(d => ({ id: d.id, words: d.texts.filter(t => t !== exclude).flatMap(tokens) }));
  const q = [...new Set(tokens(query))];
  if (!q.length) return docs.map(d => ({ id: d.id, score: 0 }));
  const avg = docs.reduce((s, d) => s + d.words.length, 0) / docs.length;
  const df = w => docs.filter(d => d.words.includes(w)).length;
  const k1 = 1.2, b = 0.75;
  return docs.map(d => {
    let score = 0;
    for (const w of q) {
      const tf = d.words.filter(x => x === w).length;
      if (!tf) continue;
      const idf = Math.log(1 + (docs.length - df(w) + 0.5) / (df(w) + 0.5));
      score += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * d.words.length / avg));
    }
    return { id: d.id, score };
  });
}

export function keywordSearch(query, help, { exclude = null } = {}) {
  const list = keywordScores(query, help, exclude).filter(r => r.score >= SETTINGS.keywordMinScore)
    .sort((a, b) => b.score - a.score).slice(0, SETTINGS.suggestions);
  return withNegation(query, list);
}

let extractorPromise = null;
let index = null;

export async function loadModel(onProgress = () => {}) {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const BASE = base();
      const t = await import(BASE + 'lib/transformers.min.js');
      t.env.allowRemoteModels = false;
      t.env.allowLocalModels = true;
      // A path, not a full URL: the library only checks local files for scheme-less paths.
      t.env.localModelPath = new URL('models/', BASE).pathname;
      t.env.useBrowserCache = false;
      t.env.backends.onnx.wasm.wasmPaths = BASE + 'lib/';
      t.env.backends.onnx.wasm.numThreads = 1;
      return t.pipeline('feature-extraction', MODEL, { dtype: 'q8', device: 'wasm', progress_callback: onProgress });
    })().catch(error => { extractorPromise = null; throw error; });
  }
  return extractorPromise;
}

async function embed(texts) {
  const extractor = await loadModel();
  const out = await extractor(texts, { pooling: 'mean', normalize: true });
  return out.tolist();
}

async function buildIndex(help) {
  if (index && index.help === help) return index;
  const rows = documents(help).flatMap(d => d.texts.map(text => ({ id: d.id, text })));
  const vectors = await embed(rows.map(r => r.text));
  index = { help, rows: rows.map((r, i) => ({ ...r, vector: vectors[i] })) };
  return index;
}

const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

// Raw embedding similarity per card (the best match among its title and examples).
export async function similarities(query, help, { exclude = null } = {}) {
  if (!String(query).trim()) return [];
  const { rows } = await buildIndex(help);
  const [q] = await embed([query]);
  const best = new Map();
  for (const r of rows) {
    if (r.text === exclude) continue;
    const s = dot(q, r.vector);
    if (!best.has(r.id) || s > best.get(r.id)) best.set(r.id, s);
  }
  return [...best].map(([id, score]) => ({ id, score }));
}

export async function mlSearch(query, help, { exclude = null } = {}) {
  const sims = await similarities(query, help, { exclude });
  const keyword = keywordScores(query, help, exclude);
  const top = Math.max(0, ...keyword.map(k => k.score));
  const kw = new Map(keyword.map(k => [k.id, top ? k.score / top : 0]));
  const list = sims.filter(r => r.score >= SETTINGS.mlMinSimilarity)
    .map(r => ({ id: r.id, score: SETTINGS.mlWeight * r.score + (1 - SETTINGS.mlWeight) * (kw.get(r.id) || 0), similarity: r.score }))
    .sort((a, b) => b.score - a.score).slice(0, SETTINGS.suggestions);
  return withNegation(query, list);
}
