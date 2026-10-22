/* Loads the same engine files and reference list the app uses, in the same order. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// The order of the matching <script> tags in check.html (checked by tests/eval-tests.cjs).
const FILES = [
  'js/engine/normalize.js', 'js/engine/extract.js', 'js/engine/sender.js', 'js/engine/domain.js',
  'js/engine/trusted.js', 'js/engine/risk.js', 'js/engine/policy.js', 'js/assessment-gate.js',
  'js/engine/evidence.js', 'js/engine/aggregate.js', 'js/engine/copy.js', 'data/store.js', 'data/policies.js'
];

function loadEngine(root = path.join(__dirname, '..'), options = {}) {
  const context = vm.createContext({ URL, performance, console });
  context.window = context;
  for (const file of FILES) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  const store = context.TFS_STORE;
  // Only the trusted view can support a contact, so count organizations with a record in it.
  const trusted = context.TFS.buildTrustedView(store, options.today);
  return {
    engine: context.TfsEngine,
    store,
    reviewedOrgs: new Set(trusted.trusted.map(r => r.orgId)).size,
    analyze: (text, channel) => context.TfsEngine.analyze(text, store, { declaredChannel: channel, policies: context.TFS_POLICIES, today: options.today })
  };
}

module.exports = { loadEngine, FILES };
