// Every assertion reads the checked-in fixture. No templates or generator run here.
for (const context of ['WF', 'PC', 'RD', 'TW', 'OWN', 'W', 'LEGIT']) {
  const families = ['WF', 'PC', 'RD', 'TW'].includes(context) ? ['GC', 'CD', 'WT', 'RA'] : [null];
  for (const family of families) {
    window.TFS_PHASE2.add('Scope matrix ' + context + (family ? ' × ' + family : ''), function (t) {
      const fixture = window.TFS_SCOPE_FIXTURE;
      t.assert(fixture && fixture.rows.length === 384, 'checked-in fixture not loaded or row count differs');
      t.assert(new Set(fixture.rows.map(r => r.id)).size === 384, 'duplicate fixture IDs');
      const rows = fixture.rows.concat(fixture.hand_rows).filter(r => r.context === context && (!family || r.family === family));
      const expectedCount = family ? 24 : { OWN: 8, W: 4, LEGIT: 6 }[context];
      t.assert(rows.length === expectedCount, 'missing or extra rows in matrix group');
      for (const row of rows) t.test(row.id, function () {
        const result = window.TFS_SCOPE_SETUP.observe(window.TfsEngine, row, fixture.evaluation_date);
        t.assert(result.passed, JSON.stringify(result));
      });
    });
  }
}
