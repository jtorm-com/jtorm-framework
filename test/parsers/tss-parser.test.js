'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { makeTssParser } = require('../helpers/parser.js');

test('handle() parses a single selector + property into one tree node', () => {
  const p = makeTssParser();
  const tree = p.handle("a { color: red; }");
  assert.equal(tree.length, 1);
  assert.equal(tree[0].s, 'a');
  assert.equal(tree[0].m, false);
  assert.deepEqual(tree[0].p, { color: 'red' });
  assert.deepEqual(tree[0].c, []);
});
