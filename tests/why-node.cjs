// "Why this is a warning sign": coverage of every rule and wording warning, valid sources,
// and the explanations chosen for real engine results.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadEngine } = require('../eval/engine.cjs');

const root = path.join(__dirname, '..');
const ctx = vm.createContext({ console }); ctx.window = ctx;
for (const f of ['data/why.js', 'js/why.js', 'js/assessment-gate.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const why = ctx.TFS_WHY, whyItems = ctx.TFS.whyItems;
const loaded = loadEngine();
let checks = 0;
const test = (name, run) => { run(); checks++; console.log('PASS ' + name); };
const keys = r => Array.from(whyItems(r, why), i => i.key);
const analyze = text => loaded.analyze(text, 'text');

test('Every Tier 1 rule and every wording warning has an explanation', () => {
  for (const id of ctx.TfsAssessment.TIER1_RULES) assert.ok(why.rules[id] && why.rules[id].why, 'missing rule ' + id);
  const copy = fs.readFileSync(path.join(root, 'js/engine/copy.js'), 'utf8');
  const flagIds = [...copy.slice(copy.indexOf('const FLAGS = {')).matchAll(/^\s{4}([a-z_]+): \{ label:/gm)].map(m => m[1]);
  assert.ok(flagIds.length >= 20, 'flag list not found');
  for (const id of flagIds) assert.ok(why.flags[id] && why.flags[id].why, 'missing flag ' + id);
});

test('Every quote names a listed source with an official https address', () => {
  const entries = Object.values(why.rules).concat(Object.values(why.flags));
  for (const e of entries) for (const q of [e.official, e.also].filter(Boolean)) {
    assert.ok(q.quote && q.quote.length > 10, 'empty quote');
    const s = why.sources[q.source];
    assert.ok(s, 'unknown source ' + q.source);
    assert.match(s.url, /^https:\/\/(?:www\.)?(?:consumer\.ftc\.gov|bulkorder\.ftc\.gov|militaryconsumer\.gov)\//, s.url);
  }
});

test('A gift-card request from "Grandma" gets the gift-card reason first, without repeats', () => {
  const k = keys(analyze('Grandma, I’m in trouble. Please buy 3 Apple gift cards and send me the codes.'));
  assert.equal(k[0], 'T1-GIFT');
  assert.ok(!k.includes('gift_card_payment') && !k.includes('gift_card_disclosure'), JSON.stringify(k));
  assert.ok(k.length <= 3);
});

test('A lookalike toll link gets the address reason, and a remaining wording reason may follow', () => {
  const k = keys(analyze('FasTrak: You have an unpaid toll of $4.15. Pay within 24 hours to avoid a fine: https://fastrak-ca-tolls.com/pay'));
  assert.equal(k[0], 'T1-DOMAIN');
  assert.ok(k.length <= 3, JSON.stringify(k));
});

test('No explanation for an ordinary message with nothing found', () => {
  assert.deepEqual(keys(analyze('USPS: Your package is out for delivery. Track it at https://tools.usps.com/go/TrackConfirmAction')), []);
  assert.deepEqual(keys(analyze('See you at lunch on Sunday!')), []);
});

test('A warning without a Tier 1 rule still gets its reason', () => {
  const r = analyze('Your account has been locked. Act now within 24 hours.');
  assert.notEqual(r.assessment, 'suspicious');
  const k = keys(r);
  assert.ok(k.length >= 1 && k.every(x => why.flags[x]), JSON.stringify(k));
});

test('At most 3 reasons, each shown once', () => {
  const r = analyze('Microsoft: Your computer is infected. Call 1-888-555-0142 now, install AnyDesk, keep this secret, and read us the code we text you. Pay the fee with gift cards today.');
  const items = whyItems(r, why);
  assert.ok(items.length <= 3);
  assert.equal(new Set(Array.from(items, i => i.why)).size, items.length);
});

test('Each reason quotes the words in this message it is about', () => {
  const giftText = 'Grandma, I’m in trouble. Please buy 3 Apple gift cards and send me the codes.';
  const gift = whyItems(analyze(giftText), why, giftText);
  assert.equal(gift[0].words, 'send me the codes');
  const toll = whyItems(analyze('FasTrak: You have an unpaid toll of $4.15. Pay within 24 hours to avoid a fine: https://fastrak-ca-tolls.com/pay'), why);
  assert.equal(toll[0].key, 'T1-DOMAIN');
  assert.equal(toll[0].words, 'https://fastrak-ca-tolls.com/pay');
  const locked = whyItems(analyze('Your account has been locked. Act now within 24 hours.'), why);
  for (const item of locked) assert.ok(item.words && 'Your account has been locked. Act now within 24 hours.'.includes(item.words), JSON.stringify(item));
});

test('Several findings: each reason keeps its own words, in the order found', () => {
  const text = 'Microsoft: Your computer is infected. Install AnyDesk now and read us the code we text you.';
  const items = whyItems(analyze(text), why, text);
  assert.deepEqual(Array.from(items.slice(0, 2), i => [i.key, i.words]), [['T1-REMOTE', 'Install AnyDesk'], ['T1-CODE', 'read us the code']]);
  assert.ok(items.length >= 2, JSON.stringify(Array.from(items, i => i.key)));
  for (const item of items) assert.ok(item.words && text.includes(item.words), JSON.stringify(item));
  assert.equal(new Set(Array.from(items, i => i.words)).size, items.length);
});

console.log('Why explanations: ' + checks + '/' + checks);
