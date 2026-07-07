'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormTssModel: tm } = require('../../src/models/tss-model/src/tss-model.js');
const { makeTssParser } = require('../helpers/parser.js');

test('awaits text BEFORE parsing (bug: a Promise must not reach tssParser.handle)', async () => {
  tm.c = new Map();
  tm.tssParser = makeTssParser();
  tm.requestModel = { get: () => ({ text: () => Promise.resolve('a { color: red; }') }) };
  const tree = await tm.get('/x');
  assert.equal(tree[0].s, 'a');
  assert.deepEqual(tree[0].p, { color: 'red' });
});

test('bounds the cache to `max` entries — evicts oldest, no unbounded growth', async () => {
  tm.c = new Map(); tm.max = 3;
  tm.tssParser = { handle: (t) => t };
  tm.requestModel = { get: (u) => ({ text: () => Promise.resolve(u) }) };
  for (let i = 0; i < 10; i++) await tm.get('/u' + i);
  assert.ok(tm.c.size <= 3, 'cache grew past max: ' + tm.c.size);
});

test('LRU: a re-read entry survives eviction over an older untouched one', async () => {
  tm.c = new Map(); tm.max = 2;
  tm.tssParser = { handle: (t) => t };
  tm.requestModel = { get: (u) => ({ text: () => Promise.resolve(u) }) };
  await tm.get('/a');   // [a]
  await tm.get('/b');   // [a,b]
  await tm.get('/a');   // bump a -> [b,a]
  await tm.get('/c');   // add c, evict LRU b -> [a,c]
  assert.ok(tm.c.has('/a'), 'recently-read /a should survive');
  assert.ok(!tm.c.has('/b'), 'least-recently-used /b should be evicted');
  assert.ok(tm.c.has('/c'), '/c should be present');
});

test('caches and returns an integer-like key (LRU order must not depend on key type)', async () => {
  tm.c = new Map(); tm.max = 2;
  tm.tssParser = { handle: (t) => t };
  tm.requestModel = { get: (u) => ({ text: () => Promise.resolve('v' + u) }) };
  await tm.get('/a');
  await tm.get('/b');   // at max
  assert.equal(await tm.get(42), 'v42'); // integer key must round-trip, not return undefined
});
