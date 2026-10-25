/* The readable report. Everything in it is also in findings.json; this is for a person. */
'use strict';

const LIMITS = [
  'The tool can expose only concepts present in its input.',
  'Groups can reflect names, writing style or templates instead of request meaning.',
  'No Tier 1 hit does not by itself establish a defect.',
  'Low group yield does not prove that an in-path detector has no value.',
  'Repeated variants of one family are not independent discoveries.',
  'Similarity scores are grouping signals, not fraud probabilities.'
];

const cell = s => String(s).replace(/\s+/g, ' ').replace(/[|`\\]/g, c => '\\' + c).replace(/</g, '&lt;');
const short = (s, n = 140) => { const t = String(s).replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n) + '…' : t; };

function renderReport(findings, manifest) {
  const f = findings, out = [];
  const byId = new Map(f.candidates.map(c => [c.candidateId, c]));
  out.push('# Discovery report (experimental developer tool)', '');
  if (f.demonstration) out.push('> **Demonstration.** No real or public development rows were processed. Nothing here is a real-data finding.', '');
  out.push('> **Human review: pending.** Groups are candidates for investigation, not findings. Group names are provisional.', '');
  out.push(`Run \`${f.runId}\` · reference date ${f.referenceDate} · split dev · engine ${manifest.engine.version} · store ${manifest.engine.storeVersion} · repository ${manifest.repository.revision || 'n/a'}${manifest.repository.dirty ? ' (dirty)' : ''}`, '');

  out.push('## Sources', '', '| Source | Kind | SHA-256 | Selected | Excluded (reason: count) | Exposure |', '| --- | --- | --- | --- | --- | --- |');
  for (const s of manifest.sources) {
    const ex = Object.entries(s.excluded).filter(([k, v]) => k !== 'rows' && v).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none';
    out.push(`| \`${cell(s.path)}\` | ${s.kind} | \`${s.sha256.slice(0, 12)}…\` | ${s.selected} of ${s.excluded.rows} | ${ex} | ${cell(s.exposure.state)} |`);
  }
  const sel = manifest.selection;
  out.push('', `Messages: real ${sel.messages.real} · synthetic ${sel.messages.synthetic}. Families: real ${sel.families.real} · synthetic ${sel.families.synthetic}.`, '');

  out.push('## Stages', '', '| Stage | Status | Detail |', '| --- | --- | --- |');
  for (const [k, v] of Object.entries(manifest.stages)) out.push(`| ${k} | ${v.status} | ${cell(v.detail || '')} |`);
  out.push('');
  if (manifest.stages.embedding.status !== 'ok') {
    out.push(`**ML stage ${manifest.stages.embedding.status}.** The ungrouped queue below is complete and usable without it.`, '');
  }

  const engine = f.messages.reduce((acc, m) => { acc[m.engine.assessment] = (acc[m.engine.assessment] || 0) + 1; return acc; }, {});
  out.push('## Engine replay', '', Object.entries(engine).map(([k, v]) => `${k}: ${v}`).join(' · '), '');
  const fraudNotSusp = f.messages.filter(m => m.suppliedLabel === 'fraud' && m.engine.assessment !== 'suspicious').length;
  const susWithUncovered = f.messages.filter(m => m.engine.assessment === 'suspicious' &&
    f.candidates.some(c => c.messageId === m.messageId && c.coverage.uncovered && !c.methods.includes('full_message'))).length;
  out.push(`- Fraud-labeled messages not labeled Suspicious: ${fraudNotSusp}`);
  out.push(`- Suspicious messages that still have a span no Tier 1 finding overlaps: ${susWithUncovered} (one caught request does not mean every request is covered)`, '');

  const queue = f.candidates.filter(c => c.coverage.uncovered && f.messages.find(m => m.messageId === c.messageId).suppliedLabel === 'fraud');
  out.push('## Review queues', '');
  out.push(`- Candidates: ${f.candidates.length} (${f.ungroupable.length} without a vector: ${countBy(f.ungroupable.map(id => byId.get(id).embedding.status))})`);
  out.push(`- Ungrouped baseline queue (fraud-labeled, no Tier 1 span overlaps): ${queue.length}`);
  out.push(`- Groups: ${f.groups.length} · singletons: ${f.singletons.length}`, '');

  if (f.groups.length) {
    out.push(`## Groups at cutoff ${f.config.cutoff} (provisional)`, '', '| Group | Items | Messages | Real families | Synthetic families | Fraud / legit / unlabeled messages | Uncovered items | Stability ±0.05 | Representative |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const g of f.groups) {
      const near = Object.entries(g.stability).filter(([c]) => Math.abs(+c - f.config.cutoff) < 0.051).map(([, v]) => v);
      out.push(`| ${g.groupId}${g.singleFamily ? ' (one family)' : ''} | ${g.items} | ${g.messages} | ${g.families.real} | ${g.families.synthetic} | ${g.labels.fraud} / ${g.labels.legit} / ${g.labels.unlabeled} | ${g.uncoveredItems} | ${near.length ? Math.min(...near) : 'n/a'} | ${cell(short(byId.get(g.representatives[0]).quote))} |`);
    }
    out.push('', '## Cutoff sensitivity', '', '| Cutoff | Groups | Singletons | Adjusted Rand vs default |', '| --- | --- | --- | --- |');
    for (const s of f.sensitivity) out.push(`| ${s.cutoff}${s.cutoff === f.config.cutoff ? ' (default)' : ''} | ${s.groups} | ${s.singletons} | ${s.ari} |`);
    out.push('');
  }

  out.push('## Limits', '');
  for (const l of LIMITS) out.push('- ' + l);
  out.push('', 'Open `discovery/review/index.html` and load `findings.json` to review. Only a human decision there can turn a candidate into a finding.', '');
  return out.join('\n');
}

function countBy(list) {
  const m = {};
  for (const x of list) m[x] = (m[x] || 0) + 1;
  return Object.entries(m).map(([k, v]) => `${k} ${v}`).join(', ') || 'none';
}

module.exports = { renderReport, LIMITS };
