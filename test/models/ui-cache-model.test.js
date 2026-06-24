'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormUiCacheModel: c } = require('../../src/models/ui-cache-model/src/ui-cache-model.js');

test('get() returns the value set() stored for the same (l,id,c)', async () => {
  c.cache = {};
  c.set(null, 'en', 'comp1', 'default', '<b>hi</b>');
  assert.equal(await c.get(null, 'en', 'comp1', 'default'), '<b>hi</b>');
});
