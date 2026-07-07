'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormUiCacheModel: c } = require('../../src/models/ui-cache-model/src/ui-cache-model.js');

test('get() returns the value set() stored for the same (l,id,c)', async () => {
  c.c = new Map(); c.max = 512; c.saveModel = null;
  c.set(null, 'en', 'comp1', 'default', '<b>hi</b>');
  assert.equal(await c.get(null, 'en', 'comp1', 'default'), '<b>hi</b>');
});

test('bounds the cache to `max` — the oldest entries are evicted (no unbounded growth)', async () => {
  c.c = new Map(); c.max = 3; c.saveModel = null;
  for (let i = 0; i < 10; i++) c.set(null, 'en', 'comp' + i, 'd', 'h' + i);
  assert.equal(await c.get(null, 'en', 'comp0', 'd'), null, 'oldest (comp0) must be evicted');
  assert.equal(await c.get(null, 'en', 'comp9', 'd'), 'h9', 'newest (comp9) must survive');
  assert.ok(c.c.size <= 3, 'cache grew past max: ' + c.c.size);
});

test('LRU: a re-read entry survives eviction over an older untouched one', async () => {
  c.c = new Map(); c.max = 2; c.saveModel = null;
  c.set(null, 'en', 'a', 'd', 'A');   // [a]
  c.set(null, 'en', 'b', 'd', 'B');   // [a,b]
  await c.get(null, 'en', 'a', 'd');  // bump a -> [b,a]
  c.set(null, 'en', 'cc', 'd', 'C');  // add cc, evict LRU b -> [a,cc]
  assert.equal(await c.get(null, 'en', 'a', 'd'), 'A', 'recently-read a should survive');
  assert.equal(await c.get(null, 'en', 'b', 'd'), null, 'least-recently-used b should be evicted');
  assert.equal(await c.get(null, 'en', 'cc', 'd'), 'C', 'cc should be present');
});

test('a degenerate max (0) never evicts the just-added entry (older ones go)', async () => {
  c.c = new Map(); c.max = 0; c.saveModel = null;
  c.set(null, 'en', 'a', 'd', 'A');
  c.set(null, 'en', 'b', 'd', 'B');
  assert.equal(await c.get(null, 'en', 'b', 'd'), 'B', 'the just-added entry survives its own insert');
  assert.equal(await c.get(null, 'en', 'a', 'd'), null, 'the older entry is evicted at max 0');
});

test('the composite key does not collide across distinct (l,id,c) coordinates', async () => {
  c.c = new Map(); c.max = 512; c.saveModel = null;
  // a naive concat 'en'+'a'+'bc' === 'en'+'ab'+'c' — the delimiter must keep them distinct
  c.set(null, 'en', 'a', 'bc', 'X');
  c.set(null, 'en', 'ab', 'c', 'Y');
  assert.equal(await c.get(null, 'en', 'a', 'bc'), 'X');
  assert.equal(await c.get(null, 'en', 'ab', 'c'), 'Y');
  // the language coordinate independently distinguishes an entry
  c.set(null, 'nl', 'a', 'bc', 'Z');
  assert.equal(await c.get(null, 'en', 'a', 'bc'), 'X', 'language distinguishes');
  assert.equal(await c.get(null, 'nl', 'a', 'bc'), 'Z');
});

test('save() rebuilds the nested {l:{id:{c:d}}} shape for saveModel; init() reloads it', async () => {
  const store = { o: null, get() { return this.o; }, set(o) { this.o = o; } };
  c.c = new Map(); c.max = 512; c.updated = 0; c.saveModel = store;
  c.set(null, 'en', 'comp1', 'default', 'A');
  c.set(null, 'en', 'comp1', 'boxed', 'B');
  c.set(null, 'nl', 'comp2', 'default', 'C');
  await c.save();
  assert.deepEqual(store.o, { en: { comp1: { default: 'A', boxed: 'B' } }, nl: { comp2: { default: 'C' } } });

  // a fresh init() from the same store repopulates the cache
  c.c = new Map(); c.updated = 0;
  await c.init();
  assert.equal(await c.get(null, 'en', 'comp1', 'boxed'), 'B');
  assert.equal(await c.get(null, 'nl', 'comp2', 'default'), 'C');
});

test('save() only persists when dirty — a freshly loaded cache is not re-written', async () => {
  const store = { o: { en: { comp1: { default: 'A' } } }, sets: 0, get() { return this.o; }, set(o) { this.o = o; this.sets++; } };
  c.c = new Map(); c.max = 512; c.updated = 0; c.saveModel = store;
  await c.init();                 // loads A; must NOT mark dirty
  await c.save();
  assert.equal(store.sets, 0, 'a clean (freshly loaded) cache must not be persisted');
  c.set(null, 'en', 'comp2', 'default', 'B');  // now dirty
  await c.save();
  assert.equal(store.sets, 1, 'a new entry must trigger exactly one persist');
});

test('init() bounds an oversized persisted cache to `max`', async () => {
  const store = { o: { en: { a: { d: '1' }, b: { d: '2' }, cc: { d: '3' }, dd: { d: '4' }, ee: { d: '5' } } }, get() { return this.o; }, set() {} };
  c.c = new Map(); c.max = 2; c.updated = 0; c.saveModel = store;
  await c.init();
  assert.equal(await c.get(null, 'en', 'a', 'd'), null, 'oldest loaded entry evicted past max');
  assert.equal(await c.get(null, 'en', 'ee', 'd'), '5', 'newest loaded entry retained');
  assert.ok(c.c.size <= 2, 'init loaded past max: ' + c.c.size);
});

test('set() is write-once — a repeat of the same key keeps the first value and does not re-dirty', async () => {
  c.c = new Map(); c.max = 512; c.updated = 0; c.saveModel = null;
  c.set(null, 'en', 'x', 'd', 'FIRST');
  c.updated = 0;                                // clear so a no-op set is detectable
  c.set(null, 'en', 'x', 'd', 'SECOND');        // repeat -> must be ignored
  assert.equal(await c.get(null, 'en', 'x', 'd'), 'FIRST', 'the first value must win');
  assert.equal(c.updated, 0, 'a write-once no-op must not mark the cache dirty');
});

test('set() write-once does not bump recency (a repeat leaves eviction order intact)', async () => {
  c.c = new Map(); c.max = 2; c.updated = 0; c.saveModel = null;
  c.set(null, 'en', 'a', 'd', 'A');   // [a]
  c.set(null, 'en', 'b', 'd', 'B');   // [a,b]
  c.set(null, 'en', 'a', 'd', 'A2');  // repeat of a -> no-op, must NOT move a ahead of b
  c.set(null, 'en', 'cc', 'd', 'C');  // insert cc -> evict LRU (still a, since a was not bumped)
  assert.equal(await c.get(null, 'en', 'a', 'd'), null, 'a stayed least-recently-used and was evicted');
  assert.equal(await c.get(null, 'en', 'b', 'd'), 'B', 'b survived');
});

test('init() clears a stale dirty flag — a freshly reloaded cache is not re-persisted', async () => {
  const store = { o: { en: { comp1: { default: 'A' } } }, sets: 0, get() { return this.o; }, set(o) { this.o = o; this.sets++; } };
  c.c = new Map(); c.max = 512; c.updated = 1; c.saveModel = store;  // dirty BEFORE init
  await c.init();
  await c.save();
  assert.equal(store.sets, 0, 'reloading a persisted cache must not leave it marked dirty');
});
