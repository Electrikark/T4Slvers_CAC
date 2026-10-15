/* Shared harness for the Phase 2 groups (trusted view, sender, tiers, policies, annotations).
   Each case file registers a group; suite.js runs them after the earlier groups. */
window.TFS_PHASE2 = (function () {
  var registered = [];
  function add(name, body) { registered.push({ name: name, body: body }); }
  function run() {
    return registered.map(function (group) {
      var rows = [];
      var t = {
        test: function (id, fn) {
          try { fn(); rows.push({ cells: [id, 'PASS', ''], passed: true }); }
          catch (err) { rows.push({ cells: [id, 'FAIL', err && err.message ? err.message : String(err)], passed: false }); }
        },
        assert: function (ok, reason) { if (!ok) throw new Error(reason); },
        same: function (a, b, reason) {
          if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(reason + ': got ' + JSON.stringify(a) + ', expected ' + JSON.stringify(b));
        }
      };
      try { group.body(t); }
      catch (err) { rows.push({ cells: [group.name, 'FAIL', 'group threw: ' + err.message], passed: false }); }
      return { name: group.name, rows: rows };
    });
  }
  return { add: add, run: run };
})();
