'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { WIRED_METHODS } = require('../helpers/engine.js');

// DI-drift guard: every src/methods/*-method must be either wired by the harness
// or explicitly deferred. A newly-added method fails here until it is accounted
// for — turning silent harness drift into a loud test failure (spec §2/§10).
const DEFERRED = new Set([
  // Not needed by the Gate-B schema.org slice (test/pipeline/ui.test.js): css/js are
  // asset-injection plugins (absent from every uis .tss), time has no first-slice
  // component, and layer is used only by site-navigation-element — whose layer-plugin
  // lacks an `event` field (would throw in event-model.init), a known follow-up gap.
  // ui/data/config/mediatarget/mediaquery are now WIRED via the uis array.
  'css', 'js', 'layer', 'time'
]);

test('every src/methods/*-method is wired or explicitly deferred (DI-drift guard)', () => {
  const wired = new Set(WIRED_METHODS);
  const dir = path.join(__dirname, '..', '..', 'src', 'methods');
  const found = fs.readdirSync(dir)
    .filter(d => d.endsWith('-method'))
    .map(d => d.replace(/-method$/, ''));

  const unaccounted = found.filter(m => !wired.has(m) && !DEFERRED.has(m));
  assert.deepEqual(
    unaccounted, [],
    `Unaccounted methods — wire them in engine.js or add to DEFERRED: ${unaccounted.join(', ')}`
  );
});
