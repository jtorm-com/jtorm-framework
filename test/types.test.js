'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const types = require('../src/types/src/types.js');
const { jTormViewModel } = require('../src/models/view-model/src/view-model.js');

test('types.js loads as a comments-only module (exports an object)', () => {
  assert.equal(typeof types, 'object');
});

test('view-model.data keeps the documented ViewModel field set (keep the types.js @typedef in sync)', () => {
  // If view-model.data gains/loses a field, update the ViewModel typedef in types.js.
  assert.deepEqual(
    Object.keys(jTormViewModel.data).sort(),
    ['c', 'cid', 'cs', 'd', 'h', 'io', 'm', 'r', 't', 'tss']
  );
});
