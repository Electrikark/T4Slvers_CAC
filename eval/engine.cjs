/* Loads the same engine files and reference list the app uses, in the same order. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const FILES = [
  'js/engine/normalize.js', 'js/engine/extract.js', 'js/engine/domain.js', 'js/engine/risk.js',
  'js/assessment-gate.js', 'js/engine/evidence.js', 'js/engine/aggregate.js', 'js/engine/copy.js', 'data/store.js'
];

function loadEngine(root = path.join(__dirname, '..')) {
  const context = vm.createContext({ URL, performance, console });
  context.window = context;
  for (const file of FILES) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  const store = context.TFS_STORE;
  return {
    engine: context.TfsEngine,
    store,
    reviewedOrgs: store.orgs.filter(org => context.TFS.humanReviewed(org)).length,
    analyze: (text, channel) => context.TfsEngine.analyze(text, store, { declaredChannel: channel })
  };
}

module.exports = { loadEngine };
