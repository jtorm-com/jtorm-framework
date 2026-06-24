'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormTssModel: tm } = require('../../src/models/tss-model/src/tss-model.js');
const { makeTssParser } = require('../helpers/parser.js');

test('awaits text BEFORE parsing (bug: a Promise must not reach tssParser.handle)', async () => {
  tm.c = {};
  tm.tssParser = makeTssParser();
  tm.requestModel = { get: () => ({ text: () => Promise.resolve('a { color: red; }') }) };
  const tree = await tm.get('/x');
  assert.equal(tree[0].s, 'a');
  assert.deepEqual(tree[0].p, { color: 'red' });
});
