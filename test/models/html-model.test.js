'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormHtmlModel: hm } = require('../../src/models/html-model/src/html-model.js');

test('returns text and does not cache a rejection (#16)', async () => {
  hm.c = new Map();
  hm.requestModel = { get: () => ({ text: () => Promise.reject(new Error('net')) }) };
  await assert.rejects(() => hm.get('/x'));
  hm.requestModel = { get: () => ({ text: () => Promise.resolve('<b>hi</b>') }) };
  assert.equal(await hm.get('/x'), '<b>hi</b>');
});

test('bounds the cache to `max` entries — evicts oldest, no unbounded growth', async () => {
  hm.c = new Map(); hm.max = 3;
  hm.requestModel = { get: (u) => ({ text: () => Promise.resolve(u) }) };
  for (let i = 0; i < 10; i++) await hm.get('/u' + i);
  assert.ok(hm.c.size <= 3, 'cache grew past max: ' + hm.c.size);
});

test('LRU: a re-read entry survives eviction over an older untouched one', async () => {
  hm.c = new Map(); hm.max = 2;
  hm.requestModel = { get: (u) => ({ text: () => Promise.resolve(u) }) };
  await hm.get('/a');   // [a]
  await hm.get('/b');   // [a,b]
  await hm.get('/a');   // bump a -> [b,a]
  await hm.get('/c');   // add c, evict LRU b -> [a,c]
  assert.ok(hm.c.has('/a'), 'recently-read /a should survive');
  assert.ok(!hm.c.has('/b'), 'least-recently-used /b should be evicted');
  assert.ok(hm.c.has('/c'), '/c should be present');
});

test('caches and returns an integer-like key (LRU order must not depend on key type)', async () => {
  hm.c = new Map(); hm.max = 2;
  hm.requestModel = { get: (u) => ({ text: () => Promise.resolve('v' + u) }) };
  await hm.get('/a');
  await hm.get('/b');   // at max
  assert.equal(await hm.get(42), 'v42'); // integer key must round-trip, not return undefined
});
