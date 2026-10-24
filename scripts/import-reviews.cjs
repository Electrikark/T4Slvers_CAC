#!/usr/bin/env node
/* Turns the filled-in review sheet (review-records.csv) into reviews in data/store.js.

     node scripts/import-reviews.cjs path/to/review-records.csv           show what would change
     node scripts/import-reviews.cjs path/to/review-records.csv --write   change data/store.js

   A row is imported only when it says reviewed_by_you = yes and has a real review date (not in
   the future) and at least one https source page. For that organization:
     - its humanReviewDraft becomes a humanReview with that date, a review-due date 90 days later,
       and the first source page (every page listed is kept in sourcePages);
     - a phone number counts only if phones_confirmed_on_that_page = yes. If it says no, that
       phone contact is marked "rejected", so the review never covers a number nobody confirmed.
   Rows that are not yes are left exactly as they are. Nothing is guessed: a missing date or page
   stops the import with the row named. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseCsv } = require('../eval/csv.cjs');

const ROOT = path.join(__dirname, '..');
const STORE = path.join(ROOT, 'data/store.js');
const DAY_MS = 86400000;

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
const realDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d) && new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d;
const plus90 = d => new Date(Date.parse(d + 'T00:00:00Z') + 90 * DAY_MS).toISOString().slice(0, 10);

function readSheet(file) {
  const [head, ...rows] = parseCsv(fs.readFileSync(file, 'utf8'));
  const col = name => head.findIndex(h => h.trim().toLowerCase().startsWith(name));
  const c = { id: col('store_id'), yes: col('reviewed_by_you'), date: col('review_date'), url: col('official_source_page_url'), phones: col('phones_confirmed') };
  for (const [k, v] of Object.entries(c)) if (v < 0) throw new Error('The sheet has no ' + k + ' column.');
  return rows.filter(r => r.length > 1).map(r => ({
    id: (r[c.id] || '').trim(), yes: (r[c.yes] || '').trim().toLowerCase() === 'yes',
    date: (r[c.date] || '').trim(), urls: (r[c.url] || '').split(/\s+/).filter(Boolean),
    phones: (r[c.phones] || '').trim().toLowerCase()
  }));
}

function loadStore(text) {
  const box = {}; box.window = box;
  vm.runInNewContext(text, box);
  return box.TFS_STORE;
}

// The text of one organization's block: from its "id" line to the next organization.
function blockOf(text, id) {
  const start = text.indexOf('\n      "id": "' + id + '",');
  if (start < 0) throw new Error('No organization "' + id + '" in data/store.js.');
  const next = text.indexOf('\n      "id": "', start + 1);
  return { start, end: next < 0 ? text.length : next };
}

function main() {
  const file = process.argv[2];
  const write = process.argv.includes('--write');
  if (!file) throw new Error('Usage: node scripts/import-reviews.cjs path/to/review-records.csv [--write]');
  let text = fs.readFileSync(STORE, 'utf8');
  const store = loadStore(text);
  const done = [];
  for (const row of readSheet(file)) {
    if (!row.yes) continue;
    const where = 'row ' + row.id + ': ';
    if (!realDate(row.date) || row.date > today) throw new Error(where + 'review_date must be a real date, not in the future (got "' + row.date + '").');
    if (!row.urls.length || row.urls.some(u => !/^https:\/\/[^\s]+$/.test(u))) throw new Error(where + 'needs at least one https source page.');
    const org = store.orgs.find(o => o.id === row.id);
    if (!org) throw new Error(where + 'no such organization in data/store.js.');
    const phones = (org.contacts || []).filter(c => c.kind === 'phone').concat((org.officialPhones || []).length && !org.contacts ? [{}] : []);
    if (phones.length && !['yes', 'no'].includes(row.phones)) throw new Error(where + 'this organization lists a phone number; fill phones_confirmed_on_that_page with yes or no.');

    const { start, end } = blockOf(text, row.id);
    let block = text.slice(start, end);
    const review = [
      '      "humanReview": {',
      '        "reviewer": "Naman Raichura",',
      '        "date": "' + row.date + '",',
      '        "reviewDue": "' + plus90(row.date) + '",',
      '        "sourceUrl": "' + row.urls[0] + '",',
      '        "sourcePages": [' + row.urls.map(u => '"' + u + '"').join(', ') + ']',
      '      },'].join('\n');
    if (/"humanReview": \{/.test(block)) throw new Error(where + 'already has a humanReview; remove it first if this is a new check.');
    const draft = /      "humanReviewDraft": \{[^}]*\},\n/;
    block = draft.test(block) ? block.replace(draft, review + '\n') : block.replace(/("id": "[^"]+",\n)/, '$1' + review + '\n');
    block = block.replace('"verifiedBy": "Human review pending"', '"verifiedBy": "Human review by Naman Raichura"');
    if (phones.length && row.phones === 'no') {
      if (!org.contacts) throw new Error(where + 'phone not confirmed: remove it from officialPhones by hand, then import again.');
      block = block.replace(/("kind": "phone",[\s\S]*?"status": )"draft"/g, '$1"rejected"');
    }
    text = text.slice(0, start) + block + text.slice(end);
    done.push(row.id + ' (' + row.date + (phones.length ? ', phone ' + (row.phones === 'yes' ? 'confirmed' : 'rejected') : '') + ')');
  }
  loadStore(text);  // the edited file must still load
  console.log(done.length ? 'Reviews to import: ' + done.join('; ') : 'No rows marked yes with a date and a page.');
  if (write && done.length) { fs.writeFileSync(STORE, text); console.log('Wrote data/store.js'); }
  else if (done.length) console.log('Nothing written. Add --write to change data/store.js.');
}

try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
