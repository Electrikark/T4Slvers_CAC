/* A small CSV reader and writer (RFC 4180): quoted fields, doubled quotes, commas and
   line breaks inside quotes, CRLF or LF, and a leading byte-order mark from spreadsheet exports. */
'use strict';

function parseCsv(input) {
  const text = String(input).replace(/^﻿/, '');
  const rows = [];
  let row = [], field = '', quoted = false, i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (ch === '"') { quoted = false; i++; continue; }
      field += ch; i++; continue;
    }
    if (ch === '"' && field === '') { quoted = true; i++; continue; }
    if (ch === ',') { row.push(field); field = ''; i++; continue; }
    if (ch === '\r' && text[i + 1] === '\n') i++;
    if (ch === '\n' || ch === '\r') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += ch; i++;
  }
  if (quoted) throw new Error('CSV ends inside a quoted field');
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  // Spreadsheets add blank lines at the end; they are not rows.
  return rows.filter(r => r.some(cell => cell.trim() !== ''));
}

function cell(value) {
  const s = value == null ? '' : String(value);
  return /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function displayCell(value) {
  const text = value == null ? '' : String(value);
  const formulaLike = /^[\s\u0000-\u001F]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text);
  return cell(formulaLike ? "'" + text : text);
}

function toCsv(header, records, options = {}) {
  const encode = options.spreadsheetSafe ? displayCell : cell;
  return [header.map(encode).join(',')].concat(records.map(r => header.map(h => encode(r[h])).join(','))).join('\n') + '\n';
}

module.exports = { parseCsv, toCsv };
