'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormPromiseCacheModel: pm } = require('../../src/models/promise-cache-model/src/promise-cache-model.js');

const nativeClock = pm.clock;

function owner(ttl, max = 8) {
  if (arguments.length === 0) ttl = 10;
  const o = {c: new Map(), max, ttl};
  if (pm.reset) pm.reset(o);
  return o;
}

test.afterEach(() => {
  pm.clock = nativeClock;
});

test('absolute TTL starts at successful settlement, preserves warm identity, and expires at age === ttl without sliding', async () => {
  let now = 0, loads = 0;
  const o = owner();
  pm.clock = () => now;
  const load = () => Promise.resolve({version: ++loads});

  const first = pm.get(o, 'k', {load});
  assert.deepEqual(await first, {version: 1});

  now = 5;
  assert.strictEqual(pm.get(o, 'k', {load}), first, 'a pre-expiry hit keeps the original promise');
  now = 9;
  assert.strictEqual(pm.get(o, 'k', {load}), first, 'a hit must not slide expiration');
  now = 10;
  const fresh = pm.get(o, 'k', {load});
  assert.notStrictEqual(fresh, first);
  assert.deepEqual(await fresh, {version: 2});
  assert.equal(loads, 2);
});

test('pending work never expires, while exact purge detaches it without aborting or letting late completion own a newer insertion', async () => {
  let now = 0, releaseOld, releaseNew, loads = 0;
  const o = owner(1);
  pm.clock = () => now;
  const load = () => new Promise(resolve => {
    loads++;
    if (loads === 1) releaseOld = resolve;
    else releaseNew = resolve;
  });

  const old = pm.get(o, 'k', {load});
  now = 1000;
  assert.strictEqual(pm.get(o, 'k', {load}), old, 'elapsed time cannot expire pending work');
  assert.equal(pm.purge(o, 'k'), 1);
  assert.equal(pm.purge(o, 'k'), 0);

  const fresh = pm.get(o, 'k', {load});
  assert.notStrictEqual(fresh, old);
  releaseOld('OLD');
  assert.equal(await old, 'OLD', 'purge does not alter an already returned promise');
  assert.strictEqual(o.c.get('k'), fresh, 'late fulfillment cannot reinsert or replace');
  releaseNew('NEW');
  assert.equal(await fresh, 'NEW');
  assert.strictEqual(o.c.get('k'), fresh);
});

test('ttl zero reuses pending only and Infinity explicitly preserves settled reuse without clock access', async () => {
  let release, loads = 0, clocks = 0;
  const zero = owner(0);
  pm.clock = () => { clocks++; return 0; };
  const load = () => {
    loads++;
    return new Promise(resolve => { release = resolve; });
  };
  const a = pm.get(zero, 'k', {load});
  assert.strictEqual(pm.get(zero, 'k', {load}), a);
  release('A');
  assert.equal(await a, 'A');
  const b = pm.get(zero, 'k', {load: () => Promise.resolve('B')});
  assert.notStrictEqual(b, a);
  assert.equal(await b, 'B');

  const forever = owner(Infinity);
  pm.clock = () => { throw new Error('Infinity must not read the clock'); };
  const p = pm.get(forever, 'k', {load: () => Promise.resolve('FOREVER')});
  assert.equal(await p, 'FOREVER');
  assert.strictEqual(pm.get(forever, 'k', {load: () => Promise.resolve('unused')}), p);
  assert.equal(clocks, 0, 'ttl zero does not need a settlement timestamp');
});

test('invalid TTL/clock and owner-wide clock regression fail fresh without turning cache availability into an error', async () => {
  const invalid = [-1, NaN, '10', null, undefined];
  for (const ttl of invalid) {
    const o = owner(ttl);
    let loads = 0;
    pm.clock = () => 1;
    assert.equal(await pm.get(o, 'k', {load: async () => ++loads}), 1);
    assert.equal(await pm.get(o, 'k', {load: async () => ++loads}), 2, 'invalid ttl ' + String(ttl));
  }

  const throwing = owner(10);
  let loads = 0;
  pm.clock = () => { throw new Error('clock unavailable'); };
  assert.equal(await pm.get(throwing, 'k', {load: async () => ++loads}), 1);
  assert.equal(await pm.get(throwing, 'k', {load: async () => ++loads}), 2);

  let now = 10;
  const regressing = owner(100);
  pm.clock = () => now;
  await pm.get(regressing, 'a', {load: async () => 'A1'});
  now = 20;
  await pm.get(regressing, 'b', {load: async () => 'B1'});
  now = 15;
  let aLoads = 0;
  assert.equal(await pm.get(regressing, 'a', {load: async () => 'A' + (++aLoads + 1)}), 'A2');
  assert.equal(aLoads, 1, 'regression first observed through another key must invalidate a');
});

test('guarded hits check expiry first, while a fresh guard rejection retains the original pack participation', async () => {
  let now = 0, loads = 0, hits = 0;
  const o = owner(10);
  pm.clock = () => now;
  const first = pm.get(o, 'pack', {load: async () => ++loads});
  assert.equal(await first, 1);

  now = 9;
  await assert.rejects(
    () => pm.get(o, 'pack', {load: async () => ++loads, hit: async () => { hits++; throw new Error('blocked'); }}),
    /blocked/
  );
  assert.strictEqual(o.c.get('pack'), first);

  now = 10;
  const fresh = pm.get(o, 'pack', {load: async () => ++loads, hit: async () => { hits++; }});
  assert.equal(await fresh, 2);
  assert.equal(hits, 1, 'the stale entry is removed before its hit guard');
});

test('purge-all is deterministic and insertion tokens isolate same-promise reuse across keys and generations', async () => {
  const o = owner(100);
  let now = 0, resolve;
  pm.clock = () => now;
  const shared = new Promise(r => { resolve = r; });

  assert.strictEqual(pm.get(o, 'a', {load: () => shared}), shared);
  assert.strictEqual(pm.get(o, 'b', {load: () => shared}), shared);
  assert.equal(pm.purge(o, undefined), 0);
  assert.equal(pm.purge(o, 'a'), 1);
  assert.strictEqual(pm.get(o, 'a', {load: () => shared}), shared, 'the same promise may be reinserted with a new token');
  assert.equal(pm.purgeAll(o), 2);
  assert.equal(pm.purgeAll(o), 0);

  resolve('done');
  assert.equal(await shared, 'done');
  await Promise.resolve();
  assert.equal(o.c.size, 0, 'late settlement cannot restore purged generations');
});

test('late settlement resolves the current owner map and never retains or mutates a replaced host map', async () => {
  const o = owner(10);
  let resolveOld, now = 0;
  pm.clock = () => now;
  const oldMap = o.c;
  const old = pm.get(o, 'k', {load: () => new Promise(resolve => { resolveOld = resolve; })});
  o.c = new Map();
  if (pm.reset) pm.reset(o);
  const fresh = pm.get(o, 'k', {load: async () => 'NEW'});
  assert.equal(await fresh, 'NEW');
  resolveOld('OLD');
  assert.equal(await old, 'OLD');
  await Promise.resolve();
  assert.strictEqual(o.c.get('k'), fresh);
  assert.strictEqual(oldMap.get('k'), old, 'the old public map shape is untouched by late settlement');
});

test('a stale removal drops its metadata even when the replacement loader throws synchronously', async () => {
  const o = owner(1);
  let now = 0;
  pm.clock = () => now;
  await pm.get(o, 'k', {load: async () => 'OLD'});
  now = 1;

  assert.throws(() => pm.get(o, 'k', {load() { throw new Error('load failed'); }}), /load failed/);
  assert.equal(o.c.size, 0);
  assert.equal(pm.records(o.c), undefined, 'the failed replacement leaves no orphan timestamp record');
});
