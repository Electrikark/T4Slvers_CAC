// "You don't have to decide alone": the panel under every result. It sits right after the main
// warning, shares only a fixed request (never the message), states the hotline's real limits,
// and never touches the result. The browser test covers sharing, copying and folding.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'check.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const panel = html.slice(html.indexOf('<details id="trusted-help"'), html.indexOf('<section class="next-steps"'));
const text = panel.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
// The part of app.js that shares and copies, from its heading to the next one.
const helpCode = app.slice(app.indexOf('/* ---------- Ask someone you trust'), app.indexOf('/* ---------- Wiring'));
let checks = 0;
const test = (name, run) => { run(); checks++; console.log('PASS ' + name); };

test('The panel is inside the result, right after "Before you act" and before the next steps', () => {
  const result = html.indexOf('<section id="result"'), action = html.indexOf('<section id="action-note"');
  const help = html.indexOf('<details id="trusted-help"'), next = html.indexOf('<section class="next-steps"');
  assert.ok(result > 0 && result < action && action < help && help < next);
  assert.match(panel, /<details id="trusted-help" class="trusted-help" open>/);
});

test('It says to use a number already saved, not one from the message', () => {
  assert.match(text, /You don’t have to decide alone\./);
  assert.match(text, /Before sending money or sharing a code, ask someone you already know and trust\./);
  assert.match(text, /Open your phone’s Contacts and use their saved number\. Don’t use a new number supplied in the message\./);
});

test('Someone you trust is support, not proof of who sent it', () => {
  assert.match(text, /they cannot confirm who sent the message/);
  assert.match(text, /For a family emergency, reach the person yourself on a number you already have/);
  assert.match(text, /For a bank or other company, use its official app or the number on your card or statement/);
});

test('The request is generic and never quotes the message', () => {
  assert.match(panel, /<p id="trusted-request" class="trusted-request">I received a message and want help checking it before I act\. Can you call me\?<\/p>/);
  assert.match(text, /Only this request is shared, not your message\. The app you choose sends it and may keep a copy\./);
  assert.match(helpCode, /const helpRequest = \(\) => byId\('trusted-request'\)\.textContent;/);
  assert.match(helpCode, /navigator\.share\(\{ text: helpRequest\(\) \}\)/);
  assert.match(helpCode, /navigator\.clipboard\.writeText\(helpRequest\(\)\)/);
  assert.ok(!/byId\('message'\)|annotated|\.value\b/.test(helpCode), 'the share or copy code reads the message');
  assert.equal((app.match(/navigator\.share\(/g) || []).length, 1);
  assert.equal((app.match(/clipboard\.writeText\(/g) || []).length, 1);
});

test('Sharing and copying never touch the result', () => {
  assert.ok(!/shownResult|assessment|showResult|result-/.test(helpCode));
});

test('Share and copy appear only with JavaScript, so the request stays readable without them', () => {
  assert.match(panel, /<button id="share-request" class="secondary" type="button" hidden>Share this request<\/button>/);
  assert.match(panel, /<button id="copy-request" class="secondary" type="button" hidden>Copy this request<\/button>/);
});

test('No one available: the organization’s own channel, and the hotline with its real limits', () => {
  assert.match(text, /No one available\? View other ways to get help\./);
  assert.match(text, /Contact the organization yourself\./);
  assert.match(panel, /href="tel:\+18333728311">833-372-8311</);
  assert.match(text, /age 60 or older with suspected financial fraud/);
  assert.match(text, /It does not check messages, and it cannot promise to get money back\./);
  assert.match(text, /Monday–Friday, 10 a\.m\.–6 p\.m\. Eastern\. Closed on some holidays\./);
  assert.ok(!/24\/7|around the clock|any time/i.test(text), 'the hotline is not always open');
  assert.match(panel, /href="recover\.html#hotline"/);
});

console.log('Ask someone you trust: ' + checks + '/' + checks);
