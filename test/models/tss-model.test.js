'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormTssModel: tm } = require('../../src/models/tss-model/src/tss-model.js');
const { jTormRequestModel: rm } = require('../../src/models/request-model/src/request-model.js');
const { jTormPromiseCacheModel: pm } = require('../../src/models/promise-cache-model/src/promise-cache-model.js');
const { jTormRenderContextModel: cm } = require('../../src/models/render-context-model/src/render-context-model.js');
const { makeTssParser } = require('../helpers/parser.js');

tm.promiseCacheModel = pm;
rm.renderContextModel = cm;

test('awaits text BEFORE parsing (bug: a Promise must not reach tssParser.handle)', async () => {
  tm.c = new Map();
  tm.tssParser = makeTssParser();
  tm.requestModel = { get: () => ({ text: () => Promise.resolve('a { color: red; }') }) };
  const tree = await tm.get('/x');
  assert.equal(tree[0].s, 'a');
  assert.deepEqual(tree[0].p, { color: 'red' });
});

test('cache hits return the same parsed AST and node identities', async () => {
  tm.c = new Map(); tm.max = 512;
  tm.tssParser = makeTssParser();
  let fetches = 0;
  tm.requestModel = {
    get: () => ({ text: async () => { fetches++; return "a->attr { n: 'data-x'; v: value; }"; } })
  };

  const a = await tm.get('/same.tss');
  const b = await tm.get('/same.tss');

  assert.strictEqual(b, a);
  assert.strictEqual(b[0], a[0]);
  assert.equal(fetches, 1);
});

test('concurrent callers share one in-flight parse', async () => {
  let release, fetches = 0, parses = 0;
  tm.c = new Map(); tm.max = 512;
  tm.tssParser = { handle: t => { parses++; return [t]; } };
  tm.requestModel = { get: () => ({ text: () => {
    fetches++;
    return new Promise(resolve => { release = resolve; });
  } }) };

  const a = tm.get('/same'), b = tm.get('/same');
  assert.equal(fetches, 1);
  release('same');
  const [x, y] = await Promise.all([a, b]);
  assert.strictEqual(y, x);
  assert.equal(parses, 1);
});

test('array inputs load and concatenate sequentially in source order', async () => {
  const starts = [], releases = {};
  tm.c = new Map(); tm.max = 512;
  tm.tssParser = { handle: t => [t] };
  tm.requestModel = { get: u => ({ text: () => {
    starts.push(u);
    return new Promise(resolve => { releases[u] = resolve; });
  } }) };

  const p = tm.get(['/a', '/b']);
  await Promise.resolve();
  assert.deepEqual(starts, ['/a']);
  releases['/a']('A');
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(starts, ['/a', '/b']);
  releases['/b']('B');
  assert.deepEqual(await p, ['A', 'B']);
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

test('cache key includes the resolved request base', async () => {
  tm.c = new Map(); tm.max = 512;
  tm.tssParser = { handle: (t) => t };
  let fetches = 0;
  tm.requestModel = {
    url: (u, c) => c.request.base + u,
    get: (u, c) => ({ text: () => { fetches++; return Promise.resolve(c.request.base); } })
  };

  const a = { request: { base: 'https://a.example' } };
  const b = { request: { base: 'https://b.example' } };

  assert.equal(await tm.get('/same.tss', a), 'https://a.example');
  assert.equal(await tm.get('/same.tss', b), 'https://b.example');
  assert.equal(fetches, 2, 'same relative path under different bases must not share the cache');
  assert.ok(tm.c.has('https://a.example/same.tss'));
  assert.ok(tm.c.has('https://b.example/same.tss'));
});

test('absolute URL cache hits still honor the request base guard', async () => {
  const savedM = tm.requestModel, savedT = rm.transport, savedB = rm.base, savedO = rm.timeout;
  let fetches = 0;

  try {
    tm.c = new Map(); tm.max = 512; tm.requestModel = rm; tm.tssParser = { handle: (t) => t };
    rm.base = ''; rm.timeout = 0;
    rm.transport = async () => {
      fetches++;
      return { ok: true, status: 200, text: async () => 'TENANT A' };
    };

    assert.equal(await tm.get('https://a.example/secret.tss', { request: { tenant: 't', base: 'https://a.example/' } }), 'TENANT A');
    await assert.rejects(() => tm.get('https://a.example/secret.tss', { request: { tenant: 't', base: 'https://b.example/' } }), /URL blocked/);
    assert.equal(fetches, 1, 'blocked second context must not be served from tenant A cache');
  } finally {
    tm.requestModel = savedM;
    tm.c = new Map();
    rm.transport = savedT;
    rm.base = savedB;
    rm.timeout = savedO;
  }
});
