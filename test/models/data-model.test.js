'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormDataModel: dm } = require('../../src/models/data-model/src/data-model.js');

test('caches the value; a rejected fetch is NOT cached (review #16) — retry succeeds', async () => {
  dm.c = {};
  dm.requestModel = { get: () => ({ json: () => Promise.reject(new Error('net')) }) };
  await assert.rejects(() => dm.get('/x'));
  dm.requestModel = { get: () => ({ json: () => Promise.resolve({ ok: 1 }) }) };
  assert.deepEqual(await dm.get('/x'), { ok: 1 }); // would stay rejected if the rejection were cached
});
