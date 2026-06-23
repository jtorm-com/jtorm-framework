'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { makeDataParser } = require('../helpers/parser.js');

test('parse() resolves a dot-path against the model', () => {
  const dp = makeDataParser();
  assert.equal(dp.parse({ user: { name: 'Ada' } }, 'user.name'), 'Ada');
});

test("parse() concatenates with '+' (append)", () => {
  const dp = makeDataParser();
  assert.equal(dp.parse({ a: 'x', b: 'y' }, 'a + b'), 'xy');
});

test("parse() returns a quoted literal unquoted", () => {
  const dp = makeDataParser();
  assert.equal(dp.parse({}, "'hello'"), 'hello');
});

test("parse('@c') resolves to the first value of the current object (CHARACTERIZATION)", () => {
  const dp = makeDataParser();
  // Documents current behavior: @c -> tmp[Object.keys(tmp)[0]]. NOTE (review #17):
  // if the object's first key is a sentinel like isLoop/index, @c picks that instead.
  assert.equal(dp.parse({ a: 'X', b: 'Y' }, '@c'), 'X');
});
