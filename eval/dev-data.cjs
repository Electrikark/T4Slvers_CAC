'use strict';
const HEADER = 'id,group_id,split,label,expected_findings,category,channel,source,text'.split(',');
const CODES = new Set('T1-GIFT T1-CODE T1-WIRE T1-REMOTE T1-CALLBACK T1-DOMAIN T1-POLICY'.split(' '));
const CATEGORIES = new Set('gift_card toll bank_login delivery tech_support family code appointment'.split(' '));

function readDevData(rows) {
  const errors = [], records = [], ids = new Set(), texts = new Set(), groups = new Map();
  if (JSON.stringify(rows[0]) !== JSON.stringify(HEADER)) return { errors: ['Use the exact nine dev dataset headers.'], records };
  for (const [i, cells] of rows.slice(1).entries()) {
    const r = Object.fromEntries(HEADER.map((h, k) => [h, cells[k] || '']));
    const fail = issue => errors.push(`Row ${i + 2} (${r.id}): ${issue}`);
    if (cells.length !== HEADER.length) fail('wrong field count');
    for (const name of ['id', 'group_id', 'text']) if (!r[name].trim()) fail(`${name} is empty`);
    if (ids.has(r.id)) fail('duplicate id');
    ids.add(r.id);
    const key = r.text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
    if (texts.has(key)) fail('duplicate text');
    texts.add(key);
    if (!['dev', 'test'].includes(r.split)) fail('split must be dev or test');
    if (!['fraud', 'legit'].includes(r.label)) fail('invalid label');
    if (!['sms', 'email', 'unknown'].includes(r.channel)) fail('channel must be sms, email or unknown');
    if (!['volunteer_shared', 'public_example', 'synthetic'].includes(r.source)) fail('invalid source');
    if (!CATEGORIES.has(r.category)) fail('invalid category');
    const codes = r.expected_findings.split(/\s+/).filter(Boolean);
    if (r.label === 'legit' && r.expected_findings !== 'none') fail('legit expected_findings must be none');
    if (r.label === 'fraud' && (!codes.length || codes.some(c => !CODES.has(c)) || new Set(codes).size !== codes.length)) fail('fraud needs valid Tier 1 codes');
    const prior = groups.get(r.group_id);
    if (prior && (prior.split !== r.split || prior.category !== r.category)) fail('group spans splits or categories');
    groups.set(r.group_id, r);
    records.push({ ...r, channel: r.channel === 'sms' ? 'text' : r.channel, notes: r.source === 'synthetic' ? 'synthetic' : '', expected_findings: r.expected_findings === 'none' ? '' : r.expected_findings });
  }
  return { errors, records };
}

module.exports = { HEADER, readDevData };
