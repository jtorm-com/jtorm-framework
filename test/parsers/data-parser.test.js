'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { makeDataParser } = require('../helpers/parser.js');

test('parse() resolves a dot-path against the model', () => {
  const dp = makeDataParser();
  assert.equal(dp.parse({ user: { name: 'Ada' } }, 'user.name'), 'Ada');
});

test('parse() resolves a deep dot-path', () => {
  const dp = makeDataParser();
  assert.equal(dp.parse({ a: { b: { c: 'Z' } } }, 'a.b.c'), 'Z');
});

test('parse() resolves an @meta path like any other dot-path', () => {
  const dp = makeDataParser();
  assert.equal(dp.parse({ '@meta': { x: 'M' } }, '@meta.x'), 'M');
});

test("parse() concatenates data + data with '+'", () => {
  const dp = makeDataParser();
  assert.equal(dp.parse({ a: 'x', b: 'y' }, 'a + b'), 'xy');
  assert.equal(dp.parse({ a: '1', b: '2', c: '3' }, 'a + b + c'), '123');
});

test("parse() concatenates data + quoted literal", () => {
  const dp = makeDataParser();
  assert.equal(dp.parse({ x: 'A' }, "x + ' y'"), 'A y');
});

test('parse() returns a quoted literal unquoted', () => {
  const dp = makeDataParser();
  assert.equal(dp.parse({}, "'hello'"), 'hello');
});

test('parse() coerces a bare number literal to a Number', () => {
  const dp = makeDataParser();
  assert.equal(dp.parse({}, '42'), 42);
});

test('parse() coerces bare true/false to a Boolean', () => {
  const dp = makeDataParser();
  assert.equal(dp.parse({}, 'true'), true);
  assert.equal(dp.parse({}, 'false'), false);
});

// Unquoted var semantics (resolve or null) are covered in data-parser-var-semantics.test.js.

// CHARACTERIZATION (review #17): @c -> tmp[Object.keys(tmp)[0]]; if the first key
// is a sentinel (isLoop/index) it picks that instead.
test("parse('@c') resolves to the first value of the current object", () => {
  const dp = makeDataParser();
  assert.equal(dp.parse({ a: 'X', b: 'Y' }, '@c'), 'X');
});
