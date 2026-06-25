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

// if(d: x && y) / if(d: x || y): the &&/|| branch in if-method.js:50-69 only runs
// when v.d.d === null, but data-parser.parse returns the raw "x && y" string
// (truthy, never null), so the boolean logic is dead — the condition is always
// truthy and the chained method ALWAYS applies, regardless of x/y.
test('KNOWN BUG: if(d: a && b) always applies (boolean AND is dead code)', async () => {
  const t = "p->if(d: a && b)->attr { n: 'data-a'; v: '1'; }";
  // b is falsy, so a real AND would no-op; current behavior applies anyway:
  assert.equal((await render('<body><p>x</p></body>', t, { a: '1', b: '' })).body, '<p data-a="1">x</p>');
});

test('KNOWN BUG: if(d: a || b) always applies (boolean OR is dead code)', async () => {
  const t = "p->if(d: a || b)->attr { n: 'data-a'; v: '1'; }";
  // both falsy, so a real OR would no-op; current behavior applies anyway:
  assert.equal((await render('<body><p>x</p></body>', t, { a: '', b: '' })).body, '<p data-a="1">x</p>');
});
