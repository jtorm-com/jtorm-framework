'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormHtmlModel: hm } = require('../../src/models/html-model/src/html-model.js');
const { jTormRequestModel: rm } = require('../../src/models/request-model/src/request-model.js');
const { jTormPromiseCacheModel: pm } = require('../../src/models/promise-cache-model/src/promise-cache-model.js');
const { jTormRenderContextModel: cm } = require('../../src/models/render-context-model/src/render-context-model.js');

hm.promiseCacheModel = pm;
rm.renderContextModel = cm;

test('returns text and does not cache a rejection (#16)', async () => {
  hm.c = new Map();
  hm.requestModel = { get: () => ({ text: () => Promise.reject(new Error('net')) }) };
  await assert.rejects(() => hm.get('/x'));
  hm.requestModel = { get: () => ({ text: () => Promise.resolve('<b>hi</b>') }) };
  assert.equal(await hm.get('/x'), '<b>hi</b>');
});

test('concurrent callers share one in-flight fetch', async () => {
  let release, fetches = 0;
  hm.c = new Map(); hm.max = 512;
  hm.requestModel = { get: () => ({ text: () => {
    fetches++;
    return new Promise(resolve => { release = resolve; });
  } }) };

  const a = hm.get('/same'), b = hm.get('/same');
  assert.equal(fetches, 1);
  release('same');
  assert.deepEqual(await Promise.all([a, b]), ['same', 'same']);
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

test('a repeated array-of-URLs key reuses the cache across distinct array instances', async () => {
  hm.c = new Map(); hm.max = 512;
  let fetches = 0;
  hm.requestModel = { get: () => ({ text: () => { fetches++; return Promise.resolve('X'); } }) };
  await hm.get(['/a.html']);   // ui-method passes a fresh array each render (ui-method.js:177)
  await hm.get(['/a.html']);   // a DIFFERENT array, same content -> must hit, not refetch
  assert.equal(fetches, 1, 'same-content array key must hit the cache (Map keys arrays by identity)');
});

test('cache key includes the resolved request base', async () => {
  hm.c = new Map(); hm.max = 512;
  let fetches = 0;
  hm.requestModel = {
    url: (u, c) => c.request.base + u,
    get: (u, c) => ({ text: () => { fetches++; return Promise.resolve(c.request.base); } })
  };

  const a = { request: { base: 'https://a.example' } };
  const b = { request: { base: 'https://b.example' } };

  assert.equal(await hm.get('/same.html', a), 'https://a.example');
  assert.equal(await hm.get('/same.html', b), 'https://b.example');
  assert.equal(fetches, 2, 'same relative path under different bases must not share the cache');
  assert.ok(hm.c.has('https://a.example/same.html'));
  assert.ok(hm.c.has('https://b.example/same.html'));
});

test('absolute URL cache hits still honor the request base guard', async () => {
  const savedM = hm.requestModel, savedT = rm.transport, savedB = rm.base, savedO = rm.timeout;
  let fetches = 0;

  try {
    hm.c = new Map(); hm.max = 512; hm.requestModel = rm;
    rm.base = ''; rm.timeout = 0;
    rm.transport = async () => {
      fetches++;
      return { ok: true, status: 200, text: async () => 'TENANT A' };
    };

    assert.equal(await hm.get('https://a.example/secret.html', { request: { tenant: 't', base: 'https://a.example/' } }), 'TENANT A');
    await assert.rejects(() => hm.get('https://a.example/secret.html', { request: { tenant: 't', base: 'https://b.example/' } }), /URL blocked/);
    assert.equal(fetches, 1, 'blocked second context must not be served from tenant A cache');
  } finally {
    hm.requestModel = savedM;
    hm.c = new Map();
    rm.transport = savedT;
    rm.base = savedB;
    rm.timeout = savedO;
  }
});
