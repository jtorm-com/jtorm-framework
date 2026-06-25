'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { makeDataParser } = require('../helpers/parser.js');
const { render } = require('../helpers/engine.js');

// CONTRACT: quoted input = string literal; unquoted input = variable. An unquoted
// variable that does not resolve is an UNDEFINED variable → null (not its own name).
// (Regression: v1.0.0 / commit 4675148 changed the unresolved fallback from
// `return null` to `return this.tssParser.quotes(k)`, breaking var semantics.)

test('parse(): an unquoted path that does not resolve returns null (var semantics)', () => {
  const dp = makeDataParser();
  assert.equal(dp.parse({}, 'missing'), null);
  assert.equal(dp.parse({ a: { b: 1 } }, 'a.nope'), null);
});

test('parse(): a quoted literal is still returned as a string (contract preserved)', () => {
  const dp = makeDataParser();
  assert.equal(dp.parse({}, "'missing'"), 'missing');
  assert.equal(dp.parse({}, "'hello'"), 'hello');
});

test('if(d: <absent var>) is false → no-op (not always-true)', async () => {
  const { body } = await render('<body><p>x</p></body>', "p->if(d: missing)->attr { n: 'data-a'; v: '1'; }", {});
  assert.equal(body, '<p>x</p>');
});

test('attr { v: <absent var> } binds nothing (not the literal key name)', async () => {
  const { body } = await render('<body><a>x</a></body>', "a->attr { n: 'href'; v: missing; }", {});
  assert.equal(body, '<a>x</a>');
});

test('if(d: a && b) evaluates the AND', async () => {
  const t = "p->if(d: a && b)->attr { n: 'data-a'; v: '1'; }";
  assert.equal((await render('<body><p>x</p></body>', t, { a: '1', b: '1' })).body, '<p data-a="1">x</p>');
  assert.equal((await render('<body><p>x</p></body>', t, { a: '1', b: '' })).body, '<p>x</p>');
});

test('if(d: a || b) evaluates the OR', async () => {
  const t = "p->if(d: a || b)->attr { n: 'data-a'; v: '1'; }";
  assert.equal((await render('<body><p>x</p></body>', t, { a: '', b: '1' })).body, '<p data-a="1">x</p>');
  assert.equal((await render('<body><p>x</p></body>', t, { a: '', b: '' })).body, '<p>x</p>');
});
