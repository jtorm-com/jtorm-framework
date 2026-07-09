'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormDataModel: dm } = require('../../src/models/data-model/src/data-model.js');
const { jTormRequestModel: rm } = require('../../src/models/request-model/src/request-model.js');

test('caches the value; a rejected fetch is NOT cached (review #16) — retry succeeds', async () => {
  dm.c = new Map();
  dm.requestModel = { get: () => ({ json: () => Promise.reject(new Error('net')) }) };
  await assert.rejects(() => dm.get('/x'));
  dm.requestModel = { get: () => ({ json: () => Promise.resolve({ ok: 1 }) }) };
  assert.deepEqual(await dm.get('/x'), { ok: 1 }); // would stay rejected if the rejection were cached
});

test('bounds the cache to `max` entries — evicts oldest, no unbounded growth', async () => {
  dm.c = new Map(); dm.max = 3;
  dm.requestModel = { get: (u) => ({ json: () => Promise.resolve(u) }) };
  for (let i = 0; i < 10; i++) await dm.get('/u' + i);
  assert.ok(dm.c.size <= 3, 'cache grew past max: ' + dm.c.size);
});

test('LRU: a re-read entry survives eviction over an older untouched one', async () => {
  dm.c = new Map(); dm.max = 2;
  dm.requestModel = { get: (u) => ({ json: () => Promise.resolve(u) }) };
  await dm.get('/a');   // [a]
  await dm.get('/b');   // [a,b]
  await dm.get('/a');   // bump a -> [b,a]
  await dm.get('/c');   // add c, evict LRU b -> [a,c]
  assert.ok(dm.c.has('/a'), 'recently-read /a should survive');
  assert.ok(!dm.c.has('/b'), 'least-recently-used /b should be evicted');
  assert.ok(dm.c.has('/c'), '/c should be present');
});

test('caches and returns an integer-like key (LRU order must not depend on key type)', async () => {
  dm.c = new Map(); dm.max = 2;
  dm.requestModel = { get: (u) => ({ json: () => Promise.resolve('v' + u) }) };
  await dm.get('/a');
  await dm.get('/b');   // at max
  assert.equal(await dm.get(42), 'v42'); // integer key must round-trip, not return undefined
});

test('a repeated array-of-URLs key reuses the cache across distinct array instances', async () => {
  dm.c = new Map(); dm.max = 512;
  let fetches = 0;
  dm.requestModel = { get: () => ({ json: () => { fetches++; return Promise.resolve({ ok: 1 }); } }) };
  await dm.get(['/a.json']);   // ui-method builds artifact URL lists as arrays (ui-method.js:184)
  await dm.get(['/a.json']);   // a DIFFERENT array, same content -> must hit, not refetch
  assert.equal(fetches, 1, 'same-content array key must hit the cache (Map keys arrays by identity)');
});

test('cache key includes the resolved request base', async () => {
  dm.c = new Map(); dm.max = 512;
  let fetches = 0;
  dm.requestModel = {
    url: (u, c) => c.request.base + u,
    get: (u, c) => ({ json: () => { fetches++; return Promise.resolve({ base: c.request.base }); } })
  };

  const a = { request: { base: 'https://a.example' } };
  const b = { request: { base: 'https://b.example' } };

  assert.deepEqual(await dm.get('/same.json', a), { base: 'https://a.example' });
  assert.deepEqual(await dm.get('/same.json', b), { base: 'https://b.example' });
  assert.equal(fetches, 2, 'same relative path under different bases must not share the cache');
  assert.ok(dm.c.has('https://a.example/same.json'));
  assert.ok(dm.c.has('https://b.example/same.json'));
});

test('absolute URL cache hits still honor the request base guard', async () => {
  const savedM = dm.requestModel, savedT = rm.transport, savedB = rm.base, savedO = rm.timeout;
  let fetches = 0;

  try {
    dm.c = new Map(); dm.max = 512; dm.requestModel = rm;
    rm.base = ''; rm.timeout = 0;
    rm.transport = async () => {
      fetches++;
      return { ok: true, status: 200, json: async () => ({ tenant: 'a' }) };
    };

    assert.deepEqual(await dm.get('https://a.example/secret.json', { request: { tenant: 't', base: 'https://a.example/' } }), { tenant: 'a' });
    await assert.rejects(() => dm.get('https://a.example/secret.json', { request: { tenant: 't', base: 'https://b.example/' } }), /URL blocked/);
    assert.equal(fetches, 1, 'blocked second context must not be served from tenant A cache');
  } finally {
    dm.requestModel = savedM;
    dm.c = new Map();
    rm.transport = savedT;
    rm.base = savedB;
    rm.timeout = savedO;
  }
});

test('a degenerate max (0) still returns the fetched value (never evicts the fresh entry)', async () => {
  dm.c = new Map(); dm.max = 0;
  dm.requestModel = { get: (u) => ({ json: () => Promise.resolve('v' + u) }) };
  assert.equal(await dm.get('/a'), 'v/a');
});

test('an evicted-while-pending fetch does not delete a newer valid entry on late rejection', async () => {
  let rejectA;
  dm.c = new Map(); dm.max = 1;
  dm.requestModel = { get: (u) => ({ json: () =>
    u === '/a' ? new Promise((_, rej) => { rejectA = rej; }) : Promise.resolve('B')
  }) };
  dm.get('/a').catch(() => {});  // caches P1 (pending); swallow the late wrapper rejection
  await dm.get('/b');            // max=1 evicts /a; P1 orphaned, still pending
  dm.requestModel = { get: () => ({ json: () => Promise.resolve('A2') }) };
  const a2 = await dm.get('/a'); // re-fetch -> P2; evicts /b
  rejectA(new Error('late'));    // P1 rejects -> its stale catch must NOT delete P2
  await Promise.resolve(); await Promise.resolve();
  assert.equal(a2, 'A2');
  assert.ok(dm.c.has('/a'), 'the current /a entry (P2) must survive P1 late rejection');
});
