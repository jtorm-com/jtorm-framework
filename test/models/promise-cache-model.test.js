'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormPromiseCacheModel: pm } = require('../../src/models/promise-cache-model/src/promise-cache-model.js');

test('dedupes in-flight work and bumps hit recency', async () => {
  let release, loads = 0;
  const owner = {c: new Map(), max: 2};
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
  const owner = {c: new Map(), max: 2};
  const p = pm.get(owner, 'a', {load: () => Promise.resolve('A')});
  assert.equal(await pm.get(owner, 'a', {load: () => Promise.resolve('unused'), hit: async () => { hits++; }}), 'A');
  assert.strictEqual(owner.c.get('a'), p);
  assert.equal(hits, 1);
});

test('late rejection removes only its own identity, not a newer entry', async () => {
  let reject;
  const owner = {c: new Map(), max: 1};
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
  const old = new Map(), owner = {c: old, max: 0};
  owner.c = new Map();
  const p = pm.get(owner, 1, {load: () => Promise.resolve('one')});

  assert.equal(await p, 'one');
  assert.equal(old.size, 0);
  assert.strictEqual(owner.c.get(1), p);
});
