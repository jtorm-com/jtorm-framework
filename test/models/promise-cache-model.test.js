'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormPromiseCacheModel: pm } = require('../../src/models/promise-cache-model/src/promise-cache-model.js');

test('dedupes in-flight work and bumps hit recency', async () => {
  let release, loads = 0;
  const owner = {c: new Map(), max: 2, ttl: Infinity};
  const op = {load: () => {
    loads++;
    return new Promise(resolve => { release = resolve; });
  }};

  const a = pm.get(owner, 'a', op), b = pm.get(owner, 'a', op);
  assert.strictEqual(b, a);
  assert.equal(loads, 1);
  release('A');
  assert.deepEqual(await Promise.all([a, b]), ['A', 'A']);

  await pm.get(owner, 'b', {load: () => Promise.resolve('B')});
  await pm.get(owner, 'a', {load: () => Promise.resolve('unused')});
  await pm.get(owner, 'c', {load: () => Promise.resolve('C')});
  assert.deepEqual([...owner.c.keys()], ['a', 'c']);
});

test('runs an optional guarded-hit hook without replacing the cached promise', async () => {
  let hits = 0;
  const owner = {c: new Map(), max: 2, ttl: Infinity};
  const p = pm.get(owner, 'a', {load: () => Promise.resolve('A')});
  assert.equal(await pm.get(owner, 'a', {load: () => Promise.resolve('unused'), hit: async () => { hits++; }}), 'A');
  assert.strictEqual(owner.c.get('a'), p);
  assert.equal(hits, 1);
});

test('late rejection removes only its own identity, not a newer entry', async () => {
  let reject;
  const owner = {c: new Map(), max: 1, ttl: Infinity};
  const stale = pm.get(owner, 'a', {load: () => new Promise((_, r) => { reject = r; })});
  stale.catch(() => {});
  await pm.get(owner, 'b', {load: () => Promise.resolve('B')});
  const fresh = pm.get(owner, 'a', {load: () => Promise.resolve('A2')});
  reject(new Error('late'));
  await Promise.resolve(); await Promise.resolve();
  assert.equal(await fresh, 'A2');
  assert.strictEqual(owner.c.get('a'), fresh);
});

test('a degenerate maximum retains the newest entry and uses replaced owner state', async () => {
  const old = new Map(), owner = {c: old, max: 0, ttl: Infinity};
  owner.c = new Map();
  const p = pm.get(owner, 1, {load: () => Promise.resolve('one')});

  assert.equal(await p, 'one');
  assert.equal(old.size, 0);
  assert.strictEqual(owner.c.get(1), p);
});

test('undefined is an actual cache bypass with no read, write, deduplication, rejection eviction, or recency change', async () => {
  const stale = Promise.resolve('STALE');
  const calls = {get: 0, set: 0, delete: 0, keys: 0};
  class TrackedMap extends Map {
    get(key) { calls.get++; return super.get(key); }
    set(key, value) { calls.set++; return super.set(key, value); }
    delete(key) { calls.delete++; return super.delete(key); }
    keys() { calls.keys++; return super.keys(); }
  }
  const cache = new TrackedMap([['a', Promise.resolve('A')], [undefined, stale]]);
  const owner = {c: cache, max: 1, ttl: Infinity};
  Object.defineProperty(owner, 'staleWindow', {
    get() { throw new Error('bypass read stale window'); }
  });
  const before = [...owner.c.entries()];
  let checks = 0, hits = 0, loads = 0;
  const op = {
    load: () => Promise.resolve(++loads),
    hit() { hits++; },
    check() { checks++; }
  };
  calls.get = calls.set = calls.delete = calls.keys = 0;

  const a = pm.get(owner, undefined, op);
  const b = pm.get(owner, undefined, op);
  assert.notStrictEqual(b, a);
  assert.deepEqual(await Promise.all([a, b]), [1, 2]);
  assert.deepEqual({checks, hits}, {checks: 0, hits: 0});
  assert.deepEqual(calls, {get: 0, set: 0, delete: 0, keys: 0});
  assert.deepEqual([...owner.c.entries()], before);

  await assert.rejects(
    () => pm.get(owner, undefined, {load: () => Promise.reject(new Error('no cache'))}),
    /no cache/
  );
  assert.deepEqual(calls, {get: 0, set: 0, delete: 0, keys: 0});
  assert.deepEqual([...owner.c.entries()], before);
});

test('non-undefined generic keys retain existing identity semantics', async () => {
  for (const key of [null, '', 0, false]) {
    const owner = {c: new Map(), max: 2, ttl: Infinity};
    let loads = 0;
    const a = pm.get(owner, key, {load: async () => ++loads});
    const b = pm.get(owner, key, {load: async () => ++loads});
    assert.strictEqual(b, a);
    assert.equal(await b, 1);
    assert.equal(loads, 1);
  }
});
