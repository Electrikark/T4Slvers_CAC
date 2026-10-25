/* Discovery review page.

   Loads a findings.json the reviewer picks, shows candidates in an ungrouped queue (the baseline)
   or by group, and records the reviewer's own decisions. Message text is only ever set as text
   (textContent / text nodes), never parsed as HTML, so markup and links in a message are inert.
   The page makes no network requests (see the Content-Security-Policy in index.html). Decisions
   are kept in this browser per run and can be exported, imported and reset. */
(function () {
  'use strict';
  const S = window.DiscoveryShared;
  const MAX_FILE = 64 * 1024 * 1024;
  const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F­​-‏‪-‮⁠-⁩﻿]/g;
  const $ = id => document.getElementById(id);
  const state = { findings: null, review: null, messages: new Map(), candidates: new Map(), groups: new Map(), mode: 'ungrouped', selected: null, openGroup: null, saveTimer: null, ticks: 0 };

  // Builds elements from text only. Strings become text nodes; there is no HTML path.
  function el(tag, props, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'dataset') Object.assign(n.dataset, v);
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : String(v));
    }
    for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) n.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    return n;
  }
  const badge = (text, cls) => el('span', { class: 'badge' + (cls ? ' ' + cls : ''), text });
  const clear = node => { while (node.firstChild) node.firstChild.remove(); };
  const now = () => new Date().toISOString();
  const short = (s, n) => { const t = String(s).replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n) + '…' : t; };

  function notify(text, ok) {
    const m = $('message');
    m.textContent = text;
    m.className = 'banner' + (ok ? ' ok' : '');
    m.hidden = false;
  }

  // ---- storage (this browser only) ----
  const storageKey = runId => 'discovery-review:' + runId;
  function saveNow() {
    clearTimeout(state.saveTimer);
    try { localStorage.setItem(storageKey(state.findings.runId), JSON.stringify(state.review)); return true; }
    catch (err) { notify('Could not save in this browser (storage is unavailable or full). Export the review to keep your work.'); return false; }
  }
  const scheduleSave = () => { clearTimeout(state.saveTimer); state.saveTimer = setTimeout(saveNow, 300); };
  function restore(runId) {
    try { const raw = localStorage.getItem(storageKey(runId)); return raw ? JSON.parse(raw) : null; } catch (err) { return null; }
  }

  // ---- data helpers ----
  const msg = c => state.messages.get(c.messageId);
  const allCandidates = () => state.findings.candidates.concat(state.review.created);
  const decisionOf = id => state.review.decisions[id] || null;
  function coverageOf(c) {
    if (c.coverage) return c.coverage;
    const t1 = msg(c).engine.tier1.filter(f => f.span && f.status === 'established' && f.span.start < c.end && f.span.end > c.start);
    return { tier1: t1.map(f => ({ ruleId: f.ruleId, status: f.status })), tier2: [], messageLevelTier1: [], uncovered: !t1.length };
  }
  function decidedSpan(c) { const d = decisionOf(c.candidateId); return d ? S.decidedSpan(d, c) : { start: c.start, end: c.end, quote: c.quote }; }
  const isContextOnly = c => c.embedding && c.embedding.status === 'context_only';

  function load(findings) {
    state.findings = findings;
    state.messages = new Map(findings.messages.map(m => [m.messageId, m]));
    state.candidates = new Map(findings.candidates.map(c => [c.candidateId, c]));
    state.groups = new Map(findings.groups.map(g => [g.groupId, g]));
    const saved = restore(findings.runId);
    const ok = saved && S.validateReview(saved, findings).ok;
    state.review = ok ? normalizeReview(saved) : S.emptyReview(findings.runId);
    for (const c of state.review.created) state.candidates.set(c.candidateId, c);
    state.selected = null; state.openGroup = null; state.mode = 'ungrouped';
    document.querySelector('input[name="mode"][value="ungrouped"]').checked = true;
    $('empty').hidden = true; $('app').hidden = false; $('load-review').disabled = false;
    $('reviewer').value = state.review.reviewer;
    const n = Object.keys(state.review.decisions).length;
    notify(`Loaded run ${findings.runId}: ${findings.messages.length} messages, ${findings.candidates.length} candidates.` +
      (ok && n ? ` Restored ${n} decision(s) saved in this browser.` : saved && !ok ? ' A saved review for this run did not validate and was ignored.' : ''), true);
    renderAll();
  }
  function normalizeReview(r) {
    r.firstGroupedAt = r.firstGroupedAt || null;
    for (const [id, d] of Object.entries(r.decisions)) r.decisions[id] = S.decision(d);
    return r;
  }

  // ---- file loading ----
  async function readJsonFile(input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return null;
    if (file.size > MAX_FILE) { notify(`Not loaded: the file is ${(file.size / 1048576).toFixed(1)} MB; the limit is 64 MB.`); return null; }
    try { return JSON.parse(await file.text()); }
    catch (err) { notify('Not loaded: the file is not valid JSON.'); return null; }
  }
  $('load-findings').addEventListener('change', async e => {
    const data = await readJsonFile(e.target);
    if (data === null) return;
    const check = S.validateFindings(data);
    if (!check.ok) return notify('Not loaded: this is not a valid discovery findings file.\n' + check.errors.slice(0, 8).join('\n'));
    load(data);
  });
  $('load-review').addEventListener('change', async e => {
    if (!state.findings) return;
    const data = await readJsonFile(e.target);
    if (data === null) return;
    const check = S.validateReview(data, state.findings);
    if (!check.ok) return notify('Review not imported:\n' + check.errors.slice(0, 8).join('\n'));
    if (Object.keys(state.review.decisions).length && !confirm('Replace the decisions in this browser with the imported review?')) return;
    state.review = normalizeReview(data);
    state.candidates = new Map(state.findings.candidates.map(c => [c.candidateId, c]));
    for (const c of state.review.created) state.candidates.set(c.candidateId, c);
    $('reviewer').value = state.review.reviewer;
    saveNow();
    notify(`Imported ${Object.keys(state.review.decisions).length} decision(s).`, true);
    renderAll();
  });

  // ---- toolbar ----
  $('reviewer').addEventListener('input', e => { state.review.reviewer = e.target.value.slice(0, 200); scheduleSave(); });
  for (const r of document.querySelectorAll('input[name="mode"]')) r.addEventListener('change', e => setMode(e.target.value));
  function setMode(mode) {
    if (mode === 'grouped' && !state.review.frozenAt && !state.review.firstGroupedAt &&
        !confirm('Your ungrouped notes are not frozen. Once you open the grouped view, the comparison with the ungrouped queue is no longer clean. Open it anyway?')) {
      document.querySelector('input[name="mode"][value="ungrouped"]').checked = true;
      return;
    }
    if (mode === 'grouped' && !state.review.firstGroupedAt) { state.review.firstGroupedAt = now(); saveNow(); }
    state.mode = mode;
    document.querySelector(`input[name="mode"][value="${mode}"]`).checked = true;
    renderAll();
  }
  $('freeze').addEventListener('click', () => {
    if (state.review.frozenAt) return;
    if (!confirm('Freeze your ungrouped notes now? Outcomes set or changed afterwards are marked as made after the freeze.')) return;
    state.review.frozenAt = now();
    state.review.baseline = { decisions: JSON.parse(JSON.stringify(state.review.decisions)) };
    saveNow();
    renderAll();
  });
  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = el('a', { href: url, download: name, hidden: true });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  function validOrSay() {
    const check = S.validateReview(state.review, state.findings);
    if (!check.ok) notify('The review does not validate, so it was not exported:\n' + check.errors.slice(0, 8).join('\n'));
    return check.ok;
  }
  $('export-review').addEventListener('click', () => {
    if (!validOrSay()) return;
    saveNow();
    download(`review-${state.findings.runId}.json`, JSON.stringify(state.review, null, 2) + '\n', 'application/json');
    notify('Exported the review. It contains message excerpts: keep it local.', true);
  });
  $('export-drafts').addEventListener('click', () => {
    if (validOrSay()) download(`issue-drafts-${state.findings.runId}.md`, S.issueDrafts(state.review, state.findings), 'text/markdown');
  });
  $('export-summary').addEventListener('click', () => {
    if (validOrSay()) download(`review-summary-${state.findings.runId}.md`, S.renderSummary(S.summarizeReview(state.review, state.findings)), 'text/markdown');
  });
  $('reset').addEventListener('click', () => {
    if (!confirm('Reset removes every decision and reviewer candidate for this run from this browser. Export first to keep them. Reset now?')) return;
    try { localStorage.removeItem(storageKey(state.findings.runId)); } catch (err) { /* nothing stored */ }
    state.review = S.emptyReview(state.findings.runId);
    state.candidates = new Map(state.findings.candidates.map(c => [c.candidateId, c]));
    state.selected = null; state.openGroup = null;
    $('reviewer').value = '';
    setMode('ungrouped');
    notify('Review reset for this run.', true);
  });
  $('filter').addEventListener('change', renderList);

  // Measured time: counted only while the page is visible, per mode. Approximate by design.
  setInterval(() => {
    if (!state.findings || document.visibilityState !== 'visible') return;
    state.review.effort[state.mode + 'Ms'] += 1000;
    if (++state.ticks % 15 === 0) { saveNow(); renderCounters(); }
  }, 1000);

  // ---- rendering ----
  function renderAll() { renderRunInfo(); renderCounters(); renderList(); renderDetail(); }

  function renderRunInfo() {
    const f = state.findings, info = $('run-info');
    clear(info);
    const ml = f.stages.embedding;
    const buckets = f.messages.reduce((a, m) => (a[m.provenance.bucket]++, a), { real: 0, synthetic: 0 });
    info.append(
      el('span', {}, 'Run ', el('code', { text: f.runId })),
      f.demonstration ? badge('Demonstration: no real-data findings', 'demo') : badge('Contains real or public dev rows', 'warn'),
      el('span', { text: `Reference date ${f.referenceDate}` }),
      el('span', { text: `Messages: real ${buckets.real} · synthetic ${buckets.synthetic}` }),
      badge(`ML stage: ${ml.status}`, ml.status === 'ok' ? 'ok' : 'warn'),
      el('span', { text: `Cutoff ${f.config.cutoff} · ${f.groups.length} groups · ${f.singletons.length} singletons · ${f.ungroupable.length} not grouped` }),
      badge('Human review: pending until you decide', 'warn')
    );
    if (ml.status !== 'ok') info.append(el('span', { text: ml.detail }));
    const notices = $('notices');
    clear(notices);
    for (const n of f.notices) notices.append(el('li', { text: n }));
  }

  function baselineQueue() {
    return state.findings.candidates.filter(c => !isContextOnly(c) && msg(c).suppliedLabel === 'fraud' && c.coverage.uncovered);
  }

  function renderCounters() {
    const r = state.review, decided = Object.values(r.decisions).filter(d => d.outcome).length;
    const after = Object.values(r.decisions).filter(d => d.outcome && d.afterFreeze).length;
    const min = ms => (ms / 60000).toFixed(1);
    $('counters').textContent = `${decided} of ${allCandidates().length} candidates have an outcome · baseline queue ${baselineQueue().length} · ` +
      (r.frozenAt ? `ungrouped notes frozen at ${r.frozenAt} (${after} outcome(s) set after)` : 'ungrouped notes not frozen') +
      (r.firstGroupedAt && (!r.frozenAt || r.firstGroupedAt < r.frozenAt) ? ' · grouped view opened before the freeze' : '') +
      ` · measured time: ungrouped ${min(r.effort.ungroupedMs)} min, grouped ${min(r.effort.groupedMs)} min`;
    const fz = $('freeze');
    fz.disabled = Boolean(r.frozenAt);
    fz.textContent = r.frozenAt ? 'Ungrouped notes frozen' : 'Freeze ungrouped notes';
  }

  function itemButton(c, extra) {
    const m = msg(c), d = decisionOf(c.candidateId), cov = coverageOf(c);
    return el('button', { class: 'item', type: 'button', 'aria-current': String(state.selected === c.candidateId), onclick: () => select(c.candidateId) },
      el('div', { class: 'q', text: c.quote }),
      el('div', { class: 'meta' },
        el('span', { text: m.messageId }),
        el('span', { text: 'family ' + m.familyId }),
        badge(m.suppliedLabel),
        badge(m.engine.assessment || 'engine error'),
        cov.uncovered ? badge('no Tier 1 span') : badge('Tier 1: ' + cov.tier1.map(x => x.ruleId).join(', '), 't1'),
        c.origin === 'reviewer' ? badge('reviewer-created') : null,
        d && d.reviewState !== 'unreviewed' ? badge(d.reviewState) : null,
        d && d.outcome ? badge(S.OUTCOMES[d.outcome], 'ok') : null,
        extra || null));
  }

  function renderList() {
    const list = $('list');
    clear(list);
    $('queue-tools').hidden = state.mode !== 'ungrouped';
    if (state.mode === 'ungrouped') {
      const f = $('filter').value;
      const rows = allCandidates().filter(c => {
        const m = msg(c), d = decisionOf(c.candidateId);
        switch (f) {
          case 'baseline': return c.origin === 'automatic' && !isContextOnly(c) && m.suppliedLabel === 'fraud' && c.coverage.uncovered;
          case 'suspicious-uncovered': return m.engine.assessment === 'suspicious' && !isContextOnly(c) && coverageOf(c).uncovered;
          case 'fraud': case 'legit': case 'unlabeled': return m.suppliedLabel === f;
          case 'reviewer': return c.origin === 'reviewer';
          case 'decided': return Boolean(d && d.outcome);
          default: return true;
        }
      });
      list.append(el('div', { class: 'section-head', text: `${rows.length} candidate(s), in message order` }));
      for (const c of rows) list.append(itemButton(c));
      if (!rows.length) list.append(el('p', { class: 'section-head', text: 'Nothing in this view.' }));
      return;
    }
    const f = state.findings;
    list.append(el('div', { class: 'section-head', text: `Groups at cutoff ${f.config.cutoff} (names are provisional)` }));
    if (!f.groups.length) list.append(el('p', { class: 'section-head', text: f.stages.embedding.status === 'ok' ? 'No groups at this cutoff.' : `No groups: ML stage ${f.stages.embedding.status}. Use the ungrouped queue.` }));
    for (const g of f.groups) {
      const open = state.openGroup === g.groupId;
      const near = Object.entries(g.stability).filter(([c]) => Math.abs(+c - f.config.cutoff) < 0.051).map(([, v]) => v);
      const wrap = el('div', { class: 'group' },
        el('button', { type: 'button', 'aria-expanded': String(open), onclick: () => { state.openGroup = open ? null : g.groupId; renderList(); } },
          el('div', { class: 'gname', text: `${g.groupId} · ${g.provisionalName}` }),
          el('div', { class: 'meta' },
            badge(`${g.items} items`), badge(`${g.messages} messages`),
            badge(`families: real ${g.families.real} · synthetic ${g.families.synthetic}`),
            badge(`fraud ${g.labels.fraud} · legit ${g.labels.legit} · unlabeled ${g.labels.unlabeled}`),
            badge(`${g.uncoveredItems} with no Tier 1 span`),
            g.singleFamily ? badge('one family: repeated variants', 'warn') : null,
            badge(`stability ±0.05: ${near.length ? Math.min(...near) : 'n/a'}`))));
      if (open) {
        const members = el('div', { class: 'members' });
        members.append(el('div', { class: 'section-head', text: 'Representatives' }));
        for (const id of g.representatives) members.append(itemButton(state.candidates.get(id), badge('representative')));
        members.append(el('div', { class: 'section-head', text: 'Other members' }));
        for (const id of g.members) if (!g.representatives.includes(id)) members.append(itemButton(state.candidates.get(id)));
        wrap.append(members);
      }
      list.append(wrap);
    }
    const more = (title, ids, extra) => {
      const d = el('details', {}, el('summary', { class: 'section-head', text: `${title} (${ids.length})` }));
      for (const id of ids) d.append(itemButton(state.candidates.get(id), extra && extra(state.candidates.get(id))));
      list.append(d);
    };
    more('Singletons and outliers', f.singletons);
    more('Not grouped', f.ungroupable, c => badge(c.embedding.status.replace('_', ' ')));
    if (state.review.created.length) more('Reviewer-created', state.review.created.map(c => c.candidateId));
  }

  function select(id) {
    state.selected = id;
    for (const b of document.querySelectorAll('.item[aria-current]')) b.setAttribute('aria-current', 'false');
    renderList();
    renderDetail();
    $('detail').scrollTop = 0;
  }

  // The original message, in pieces that each know their offset, so a text selection maps back
  // to exact positions. Invisible and direction-changing characters are shown as visible codes.
  function messageText(m, span) {
    const text = m.text;
    const marks = [];
    if (span) marks.push({ start: span.start, end: span.end, cls: 'cand' });
    for (const f of m.engine.tier1) if (f.span && f.span.exact) marks.push({ start: f.span.start, end: f.span.end, cls: 't1' });
    for (const f of m.engine.tier2) if (f.span && f.span.exact) marks.push({ start: f.span.start, end: f.span.end, cls: 't2' });
    for (const e of m.engine.evidence) if (e.exact && !/^tier/.test(e.kind)) marks.push({ start: e.start, end: e.end, cls: 'ev' });
    const cuts = [...new Set([0, text.length].concat(marks.flatMap(x => [x.start, x.end])))].filter(x => x >= 0 && x <= text.length).sort((a, b) => a - b);
    const box = el('div', { class: 'msg', id: 'msg-text', tabindex: '0', 'aria-label': 'Original message' });
    for (let i = 0; i < cuts.length - 1; i++) {
      const a = cuts[i], b = cuts[i + 1];
      if (a === b) continue;
      const cls = ['p'].concat([...new Set(marks.filter(x => x.start <= a && x.end >= b).map(x => x.cls))]).join(' ');
      const seg = text.slice(a, b);
      let last = 0;
      for (const mm of seg.matchAll(CONTROL)) {
        if (mm.index > last) box.append(el('span', { class: cls, dataset: { start: String(a + last) }, text: seg.slice(last, mm.index) }));
        const code = mm[0].codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
        box.append(el('span', { class: cls + ' ctl', dataset: { start: String(a + mm.index) }, title: 'Invisible character U+' + code, text: '⟨U+' + code + '⟩' }));
        last = mm.index + 1;
      }
      if (last < seg.length) box.append(el('span', { class: cls, dataset: { start: String(a + last) }, text: seg.slice(last) }));
    }
    return box;
  }

  function offsetAt(node, off) {
    const box = $('msg-text');
    if (node === box) {
      if (off >= box.childNodes.length) return state.messages.get(state.findingsMessageId).text.length;
      return Number(box.childNodes[off].dataset.start);
    }
    const p = (node.nodeType === 3 ? node.parentElement : node).closest('.p');
    if (!p || !box.contains(p)) return null;
    const start = Number(p.dataset.start);
    if (p.classList.contains('ctl')) return off > 0 ? start + 1 : start;
    return node.nodeType === 3 ? start + off : start;
  }
  function selection(allowCollapsed) {
    const sel = window.getSelection(), box = $('msg-text');
    if (!sel || !sel.rangeCount || !box) return null;
    const r = sel.getRangeAt(0);
    if (!box.contains(r.startContainer) || !box.contains(r.endContainer)) return null;
    const a = offsetAt(r.startContainer, r.startOffset), b = offsetAt(r.endContainer, r.endOffset);
    if (a === null || b === null || (a === b && !allowCollapsed)) return null;
    return { start: Math.min(a, b), end: Math.max(a, b) };
  }
  function trimSpan(text, s, e) {
    while (s < e && /\s/.test(text[s])) s++;
    while (e > s && /\s/.test(text[e - 1])) e--;
    return s < e ? { start: s, end: e, quote: text.slice(s, e) } : null;
  }

  function setDecision(id, patch, rerender) {
    const prior = decisionOf(id);
    const d = S.decision(Object.assign({}, prior || {}, patch));
    d.mode = state.mode;
    d.afterFreeze = Boolean(state.review.frozenAt);
    d.updatedAt = now();
    state.review.decisions[id] = d;
    scheduleSave();
    renderCounters();
    if (rerender) { renderList(); renderDetail(); }
    return d;
  }
  function createCandidate(m, span, method) {
    const id = `${m.messageId}#r${span.start}-${span.end}`;
    if (!state.candidates.has(id)) {
      const c = { candidateId: id, messageId: m.messageId, familyId: m.familyId, start: span.start, end: span.end, quote: span.quote, origin: 'reviewer', method };
      state.review.created.push(c);
      state.candidates.set(id, c);
    }
    return id;
  }

  function renderDetail() {
    const pane = $('detail');
    clear(pane);
    const c = state.selected && state.candidates.get(state.selected);
    if (!c) { pane.append(el('p', { class: 'hint', text: 'Pick a candidate or a group.' })); return; }
    const m = msg(c), e = m.engine, d = decisionOf(c.candidateId) || S.decision({}), span = decidedSpan(c), cov = coverageOf(c);
    state.findingsMessageId = m.messageId;
    pane.append(el('h2', {}, 'Candidate ', el('code', { text: c.candidateId })),
      el('div', { class: 'row' }, badge(c.origin === 'reviewer' ? 'reviewer-created candidate' : 'automatic candidate'),
        badge('review state: ' + d.reviewState), (c.methods || [c.method]).map(x => badge(x)), c.embedding ? badge('embedding: ' + c.embedding.status) : null));

    pane.append(el('h3', { text: 'Message' }), el('dl', { class: 'kv' },
      el('dt', { text: 'Message' }), el('dd', { text: m.messageId }),
      el('dt', { text: 'Family' }), el('dd', { text: m.familyId }),
      el('dt', { text: 'Source' }), el('dd', { text: `${m.provenance.sourceType} · ${m.provenance.bucket} · ${m.provenance.sourcePath || ''}` }),
      el('dt', { text: 'Provenance' }), el('dd', { text: m.provenance.detail || '—' }),
      el('dt', { text: 'Supplied label' }), el('dd', { text: m.suppliedLabel + (m.suppliedTier1.length ? ` (supplied Tier 1: ${m.suppliedTier1.join(', ')})` : ' (no Tier 1 code supplied)') }),
      el('dt', { text: 'Channel' }), el('dd', { text: m.channel }),
      m.flags.length ? [el('dt', { text: 'Flags' }), el('dd', { text: m.flags.join(', ') })] : null,
      m.priorKnowledge.length ? [el('dt', { text: 'Known before this run' }), el('dd', { text: m.priorKnowledge.join('; ') })] : null));

    pane.append(el('h3', { text: 'Original message' }),
      el('div', { class: 'legend' }, el('span', { class: 'cand', text: 'this candidate' }), el('span', { class: 't1', text: 'Tier 1 span' }),
        el('span', { class: 't2', text: 'Tier 2 span' }), el('span', { class: 'ev', text: 'other engine evidence' }),
        el('span', { text: `offsets ${span.start}–${span.end} of ${m.text.length} (UTF-16, half-open)` })),
      messageText(m, span));
    if (c.context) pane.append(el('div', { class: 'field' }, el('span', { text: 'Nearby context' }), el('div', { class: 'quote', text: c.context.quote })));

    pane.append(el('h3', { text: 'Engine (replayed)' }), el('dl', { class: 'kv' },
      el('dt', { text: 'Verdict' }), el('dd', { text: (e.assessment || 'engine error: ' + e.error) + (e.rules.length ? ` · rules ${e.rules.join(', ')}` : '') }),
      el('dt', { text: 'Blocked by' }), el('dd', { text: e.blockedBy.join(', ') || '—' }),
      el('dt', { text: 'Tier 1' }), el('dd', {}, list(e.tier1.map(f => `${f.ruleId} (${f.status})${f.span ? ` ${f.span.start}–${f.span.end}: “${short(f.span.quote, 90)}”` : ' — message-level, no span'}`))),
      el('dt', { text: 'Tier 2' }), el('dd', {}, list(e.tier2.map(f => `${f.ruleId} (${f.status}${f.level ? ', ' + f.level : ''})${f.span ? ` “${short(f.span.quote, 90)}”` : ''}`))),
      el('dt', { text: 'Unresolved checks' }), el('dd', {}, list(e.unresolved.map(u => `${u.kind}: ${u.id}`))),
      el('dt', { text: 'This span' }), el('dd', { text: cov.uncovered ? 'No established Tier 1 span overlaps it' + (cov.messageLevelTier1.length ? ` (message-level: ${cov.messageLevelTier1.join(', ')})` : '') : 'Overlapped by ' + cov.tier1.map(x => x.ruleId).join(', ') })));

    pane.append(modelBox(c), humanBox(c, m, d));
  }
  function list(items) { return items.length ? el('ul', { class: 'plain' }, items.map(t => el('li', { text: t }))) : '—'; }

  function modelBox(c) {
    const f = state.findings, box = el('section', { class: 'box model', 'aria-label': 'Model grouping signals' }, el('h3', { text: 'Model grouping signals (not decisions)' }));
    if (c.origin === 'reviewer') { box.append(el('p', { class: 'hint', text: 'Reviewer-created spans are not embedded or grouped.' })); return box; }
    const g = c.groupId && state.groups.get(c.groupId);
    if (g) {
      box.append(el('p', {}, `${g.groupId} · ${g.provisionalName} · ${g.items} items in ${g.messages} messages, families real ${g.families.real} / synthetic ${g.families.synthetic}. Similarity to the representative: ${c.similarityToRepresentative} (a grouping signal, not a probability).`),
        el('button', { type: 'button', onclick: () => { state.openGroup = g.groupId; setMode('grouped'); } }, 'Show this group'));
    } else if (f.singletons.includes(c.candidateId)) box.append(el('p', { text: `Singleton: nothing else within cutoff ${f.config.cutoff}. Rare cases can matter.` }));
    else box.append(el('p', { text: `Not grouped: ${c.embedding.status.replace('_', ' ')}.` }));
    const near = f.neighbors[c.candidateId] || [];
    box.append(el('div', { class: 'field' }, el('span', { text: 'Most similar legitimate dev examples from other families (controls to compare, not labels)' }),
      near.length ? el('div', { class: 'neighbors' }, near.map(x => el('button', { type: 'button', onclick: () => select(x.candidateId) },
        el('div', { text: short(state.candidates.get(x.candidateId).quote, 160) }),
        el('div', { class: 'meta' }, badge(`similarity ${x.similarity}`), ` ${x.messageId} · family ${x.familyId}`)))) : el('p', { class: 'hint', text: 'None available.' })));
    return box;
  }

  function humanBox(c, m, d) {
    const id = c.candidateId;
    const box = el('section', { class: 'box human', 'aria-label': 'Your decision' }, el('h3', { text: 'Your decision' }));
    const span = decidedSpan(c);
    const startIn = el('input', { type: 'number', min: '0', max: String(m.text.length), value: String(span.start), 'aria-label': 'Start offset' });
    const endIn = el('input', { type: 'number', min: '1', max: String(m.text.length), value: String(span.end), 'aria-label': 'End offset' });
    const preview = el('div', { class: 'quote', 'aria-live': 'polite' });
    const show = () => {
      const s = Number(startIn.value), t = Number(endIn.value);
      preview.textContent = Number.isInteger(s) && Number.isInteger(t) && s >= 0 && s < t && t <= m.text.length ? m.text.slice(s, t) : 'Offsets must satisfy 0 ≤ start < end ≤ ' + m.text.length;
    };
    startIn.addEventListener('input', show); endIn.addEventListener('input', show); show();
    const useSel = () => { const s = selection(false); if (!s) return notify('Select part of the original message first.'); startIn.value = s.start; endIn.value = s.end; show(); };
    box.append(el('div', { class: 'field' }, el('span', { text: 'Candidate span (edit offsets or select text in the message above)' }),
      el('div', { class: 'row' }, el('label', {}, 'Start ', startIn), el('label', {}, 'End ', endIn), el('button', { type: 'button', onclick: useSel }, 'Use my selection')),
      preview,
      el('div', { class: 'row' },
        el('button', { type: 'button', onclick: () => setDecision(id, { reviewState: 'confirmed', adjusted: null, splitInto: [] }, true) }, 'Confirm as is'),
        el('button', { type: 'button', onclick: () => {
          const s = Number(startIn.value), t = Number(endIn.value);
          if (!(Number.isInteger(s) && Number.isInteger(t) && s >= 0 && s < t && t <= m.text.length)) return notify('Offsets are out of range.');
          if (s === c.start && t === c.end) return setDecision(id, { reviewState: 'confirmed', adjusted: null, splitInto: [] }, true);
          setDecision(id, { reviewState: 'adjusted', adjusted: { start: s, end: t, quote: m.text.slice(s, t) }, splitInto: [] }, true);
        } }, 'Save adjusted span'),
        el('button', { type: 'button', onclick: () => {
          const s = selection(true), at = s ? s.start : null;
          if (at === null || at <= c.start || at >= c.end) return notify('Put the cursor inside this candidate in the message, where it should split.');
          const parts = [trimSpan(m.text, c.start, at), trimSpan(m.text, at, c.end)];
          if (parts.some(p => !p)) return notify('Both parts of a split need text.');
          const ids = parts.map(p => createCandidate(m, p, 'reviewer_split'));
          setDecision(id, { reviewState: 'split', adjusted: null, splitInto: ids }, true);
          notify('Split into ' + ids.join(' and ') + '. Review each part.', true);
        } }, 'Split at cursor'),
        el('button', { type: 'button', onclick: () => {
          const s = selection(false), t = s && trimSpan(m.text, s.start, s.end);
          if (!t) return notify('Select the request text in the message first.');
          const nid = createCandidate(m, t, 'reviewer_selected');
          scheduleSave();
          select(nid);
        } }, 'Add selection as a new candidate'),
        el('button', { type: 'button', class: 'danger', onclick: () => setDecision(id, { reviewState: 'rejected', adjusted: null, splitInto: [] }, true) }, 'Reject candidate'),
        el('button', { type: 'button', onclick: () => setDecision(id, { reviewState: 'unreviewed', adjusted: null, splitInto: [] }, true) }, 'Mark unreviewed'))));

    const outcome = el('fieldset', {}, el('legend', { text: 'Outcome' }),
      Object.entries(S.OUTCOMES).map(([k, label]) => el('label', {}, el('input', { type: 'radio', name: 'outcome', value: k, checked: d.outcome === k, onchange: () => setDecision(id, { outcome: k }, true) }), ' ' + label)),
      el('label', {}, el('input', { type: 'radio', name: 'outcome', value: '', checked: !d.outcome, onchange: () => setDecision(id, { outcome: null }, true) }), ' No outcome yet'));
    const draft = el('pre', { class: 'draft', 'aria-label': 'Issue draft preview' });
    const refreshDraft = () => { const cur = decisionOf(id); if (cur && (cur.outcome === 'wording_gap' || cur.outcome === 'missing_concept')) draft.textContent = S.issueDraft(cur, c, m); };
    const text = (key, label, value, onSet) => el('label', { class: 'field' }, el('span', { text: label }),
      el('textarea', { 'aria-label': label, oninput: ev => { onSet(ev.target.value.slice(0, 20000)); refreshDraft(); } }, value));
    box.append(outcome,
      text('evidence', 'Evidence (what in the message and the engine output supports this)', d.evidence, v => setDecision(id, { evidence: v })),
      text('nextAction', 'Proposed next action', d.nextAction, v => setDecision(id, { nextAction: v })),
      el('div', { class: 'row' },
        el('label', {}, 'Known before this run? ', el('select', { onchange: ev => setDecision(id, { knownBeforeRun: ev.target.value }) },
          [['', 'not recorded'], ['yes', 'yes'], ['no', 'no'], ['unsure', 'unsure']].map(([v, l]) => el('option', { value: v, selected: d.knownBeforeRun === v }, l)))),
        el('label', {}, 'Reference ', el('input', { type: 'text', value: d.knownReference, placeholder: 'issue, doc or test', oninput: ev => setDecision(id, { knownReference: ev.target.value.slice(0, 2000) }) }))));
    if (d.outcome === 'wording_gap' || d.outcome === 'missing_concept') {
      const labels = { currentBehavior: 'Current behavior (beyond the replayed verdict above)', whyInsufficient: 'Why it is insufficient', intendedScope: 'Intended rule scope or wording change', controlsLegit: 'Legitimate control that must stay unflagged', controlsNegated: 'Negated control ("we will never ask…")', controlsReported: 'Reported control ("scammers may ask…")', unknowns: 'Unknowns and required validation' };
      box.append(el('h3', { text: 'Issue draft (not filed)' }));
      for (const k of S.ISSUE_FIELDS) box.append(text(k, labels[k], d.issue[k], v => setDecision(id, { issue: Object.assign({}, (decisionOf(id) || d).issue, { [k]: v }) })));
      box.append(draft);
      refreshDraft();
    }
    const saved = decisionOf(id);
    box.append(el('div', { class: 'row' },
      el('span', { class: 'hint', text: saved ? `Decision recorded in the ${saved.mode} view${saved.afterFreeze ? ' after the freeze' : ''}, last changed ${saved.updatedAt}.` : 'No decision recorded.' }),
      saved ? el('button', { type: 'button', onclick: () => { delete state.review.decisions[id]; scheduleSave(); renderAll(); } }, 'Clear decision') : null));
    return box;
  }
}());
