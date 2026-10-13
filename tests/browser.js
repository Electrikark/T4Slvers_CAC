/* Render the same suite used by the terminal runner. */
try {
  const suite = window.runEngineTests();
  const targets = ['rows', 'real', 'step1', 'inv', 'gate', 'self'];
  let passed = 0;
  let total = 0;
  suite.groups.forEach((group, index) => {
    const body = document.getElementById(targets[index]);
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
