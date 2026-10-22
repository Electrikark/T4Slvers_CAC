'use strict';
const HEADER = 'id,group_id,label,channel,category,source,collected,split,expected_findings,notes,text'.split(',');
const CODES = new Set('T1-GIFT T1-CODE T1-WIRE T1-REMOTE T1-CALLBACK T1-DOMAIN T1-POLICY'.split(' '));

function expectedCodes(value) {
  return String(value || '').trim().split(/\s+/).filter(c => c && c.toLowerCase() !== 'none');
}

function readSuppliedData(rows) {
  const errors = [], records = [], ids = new Set(), texts = new Set(), groups = new Map();
  if (JSON.stringify(rows[0]) !== JSON.stringify(HEADER)) return { errors: ['Use the exact eleven source headers.'], records };
  for (const [i, cells] of rows.slice(1).entries()) {
    const r = Object.fromEntries(HEADER.map((h, k) => [h, cells[k] || '']));
    const fail = issue => errors.push(`Row ${i + 2} (${r.id}): ${issue}`);
    if (cells.length !== HEADER.length) fail('wrong field count');
    for (const name of ['id', 'group_id', 'category', 'source', 'text']) if (!r[name].trim()) fail(`${name} is empty`);
    if (ids.has(r.id)) fail('duplicate id');
    ids.add(r.id);
    const key = r.text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
    if (texts.has(key)) fail('duplicate normalized text');
    texts.add(key);
    if (!['dev', 'test'].includes(r.split)) fail('split must be dev or test');
    if (!['fraud', 'legit'].includes(r.label)) fail('invalid label');
    if (!['text', 'email', 'unknown'].includes(r.channel)) fail('invalid channel');
    if (/^\s*fictional/i.test(r.source)) fail('source starts with FICTIONAL');
    const codes = expectedCodes(r.expected_findings);
    if (codes.some(c => !CODES.has(c)) || new Set(codes).size !== codes.length) fail('invalid or repeated Tier 1 code');
    if (r.label === 'legit' && codes.length) fail('legit expected findings must be none or blank');
    const day = new Date(r.collected + 'T00:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.collected) || !Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== r.collected) fail('invalid collection date');
    const prior = groups.get(r.group_id);
    if (prior && (prior.split !== r.split || prior.category !== r.category)) fail('group spans splits or categories');
    groups.set(r.group_id, r);
    records.push(r);
  }
  return { errors, records };
}

module.exports = { HEADER, expectedCodes, readSuppliedData };
