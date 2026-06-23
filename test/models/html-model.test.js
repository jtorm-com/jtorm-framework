'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormHtmlModel: hm } = require('../../src/models/html-model/src/html-model.js');

test('returns text and does not cache a rejection (#16)', async () => {
  hm.c = {};
  hm.requestModel = { get: () => ({ text: () => Promise.reject(new Error('net')) }) };
  await assert.rejects(() => hm.get('/x'));
  hm.requestModel = { get: () => ({ text: () => Promise.resolve('<b>hi</b>') }) };
  assert.equal(await hm.get('/x'), '<b>hi</b>');
});
