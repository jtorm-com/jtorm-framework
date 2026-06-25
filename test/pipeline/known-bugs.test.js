'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');

// KNOWN BUGS surfaced by full-pipeline coverage. These characterize the CURRENT
// (broken) behavior so a future fix flips the assertion and forces an update.
// Flagged in jtorm-code-review.md.

// unwrap (unwrap-method.js:16,19) and wrap (wrap-method.js:32,36) call
// `v.h.set(selectorString, fn, v)`, but document-model.set is `set(v, fn)` and
// reads `v.t.s` — the selector string has no `.t`, so it throws immediately.
// Every other transform verb passes the view object `v`.

test('KNOWN BUG: unwrap throws — set() signature mismatch (selector string vs view)', async () => {
  await assert.rejects(
    render('<body><div><p class="in">X</p></div></body>', "div->unwrap { s: '.in'; }", {}),
    /Cannot read properties of undefined \(reading 's'\)/
  );
});

test('KNOWN BUG: wrap throws — same set() signature mismatch', async () => {
  await assert.rejects(
    render('<body><span>X</span></body>', "span->wrap { s: '.w'; h: '<div class=\"w\"></div>'; }", {}),
    /Cannot read properties of undefined \(reading 's'\)/
  );
});

// NOTE: if(d: x && y) / if(d: x || y) were dead (always-applied) before
// fix/data-parser-unresolved-var — caused by the same v1.0.0 regression. Now fixed;
// evaluated-boolean coverage lives in data-parser-var-semantics.test.js + if.test.js.
