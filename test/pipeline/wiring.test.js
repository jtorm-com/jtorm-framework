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
  // fetch verbs (need the request transport seam) + matchMedia-dependent + plugins
  'css', 'config', 'data', 'get', 'js', 'layer', 'mediaquery', 'mediatarget', 'time', 'ui'
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
