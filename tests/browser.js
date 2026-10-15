/* Render the same suite used by the terminal runner. */
(async function () {
try {
  const response = await fetch('reporting-scope/fixture.json');
  if (!response.ok) throw new Error('Reporting-scope fixture HTTP ' + response.status);
  window.TFS_SCOPE_FIXTURE = await response.json();
  const suite = window.runEngineTests();
  const targets = ['rows', 'real', 'step1', 'inv', 'gate', 'self'];
  let passed = 0;
  let total = 0;
  suite.groups.forEach((group, index) => {
    let body = document.getElementById(targets[index]);
    if (!body) {
      // Phase 2 groups get their own table, built with text only.
      const heading = document.createElement('h2');
      heading.textContent = group.name;
      const table = document.createElement('table');
      const head = document.createElement('thead');
      const headRow = document.createElement('tr');
      for (const label of ['Check', 'Result', 'Details']) {
        const th = document.createElement('th');
        th.textContent = label;
        headRow.append(th);
      }
      head.append(headRow);
      body = document.createElement('tbody');
      table.append(head, body);
      document.body.append(heading, table);
    }
    for (const row of group.rows) {
      total += 1;
      if (row.passed) passed += 1;
      const tr = document.createElement('tr');
      row.cells.forEach((text, i) => {
        const td = document.createElement('td');
        td.textContent = text.length > 200 ? text.slice(0, 200) + '… (' + text.length + ' characters)' : text;
        if (i === 1) td.className = row.passed ? 'pass' : 'fail';
        tr.append(td);
      });
      body.append(tr);
    }
  });
  document.getElementById('overview').textContent = `${passed} of ${total} checks pass.`;
} catch (error) {
  document.getElementById('overview').textContent = `Tests could not run: ${error.message}`;
}
})();
