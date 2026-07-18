'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormPromiseCacheModel: pm } = require('../../src/models/promise-cache-model/src/promise-cache-model.js');
const { jTormDataModel: dm } = require('../../src/models/data-model/src/data-model.js');
const { jTormHtmlModel: hm } = require('../../src/models/html-model/src/html-model.js');
const { jTormTssModel: tm } = require('../../src/models/tss-model/src/tss-model.js');

const nativeClock = pm.clock;

function cold(model, ttl = 300000) {
  model.c = new Map();
  model.max = 512;
  model.ttl = ttl;
  model.promiseCacheModel = pm;
  if (pm.reset) pm.reset(model);
}

test.afterEach(() => {
  pm.clock = nativeClock;
});

test('all shared fetch caches publish the finite five-minute default', () => {
  assert.equal(dm.ttl, 300000);
  assert.equal(hm.ttl, 300000);
  assert.equal(tm.ttl, 300000);
});

test('data, HTML, and TSS keep pre-expiry identity then observe changed sources at the exact boundary', async () => {
  let now = 0;
  pm.clock = () => now;

  cold(dm); cold(hm); cold(tm);
  let data = {version: 1}, html = '<b>one</b>', tss = 'a{x:1;}', dataLoads = 0, htmlLoads = 0, tssLoads = 0;
  dm.requestModel = {
    cacheKey: u => String(u),
    get: () => ({json: async () => { dataLoads++; return data; }})
  };
  hm.requestModel = {
    cacheKey: u => String(u),
    get: () => ({text: async () => { htmlLoads++; return html; }})
  };
  tm.tssParser = {handle: value => [{value}]};
  tm.requestModel = {
    cacheKey: u => String(u),
    get: () => ({text: async () => { tssLoads++; return tss; }})
  };

  const d1 = await dm.get('/same');
  const h1 = await hm.get('/same');
  const t1 = await tm.get('/same');
  data = {version: 2}; html = '<b>two</b>'; tss = 'a{x:2;}';

  now = 299999;
  assert.strictEqual(await dm.get('/same'), d1);
  assert.equal(await hm.get('/same'), h1);
  assert.strictEqual(await tm.get('/same'), t1);
  assert.deepEqual([dataLoads, htmlLoads, tssLoads], [1, 1, 1]);

  now = 300000;
  assert.strictEqual(await dm.get('/same'), data);
  assert.equal(await hm.get('/same'), html);
  const t2 = await tm.get('/same');
  assert.notStrictEqual(t2, t1);
  assert.equal(t2[0].value, 'a{x:2;}');
  assert.deepEqual([dataLoads, htmlLoads, tssLoads], [2, 2, 2]);
});

test('concurrent post-expiry fetches share one new data/HTML/TSS acquisition and parse', async () => {
  let now = 0;
  pm.clock = () => now;

  for (const [model, body, method] of [
    [dm, {version: 1}, 'json'],
    [hm, 'one', 'text'],
    [tm, 'a{x:1;}', 'text']
  ]) {
    cold(model, 10);
    let current = body, release, loads = 0, parses = 0;
    if (model === tm) model.tssParser = {handle: value => { parses++; return [{value}]; }};
    model.requestModel = {
      cacheKey: u => String(u),
      get: () => ({[method]: () => {
        loads++;
        if (loads === 1) return Promise.resolve(current);
        return new Promise(resolve => { release = () => resolve(current); });
      }})
    };

    await model.get('/same');
    current = model === dm ? {version: 2} : model === hm ? 'two' : 'a{x:2;}';
    now = 10;
    const a = model.get('/same'), b = model.get('/same');
    assert.equal(loads, 2);
    release();
    const [x, y] = await Promise.all([a, b]);
    assert.strictEqual(y, x, 'fresh callers share one settled identity');
    assert.equal(loads, 2);
    if (model === tm) assert.equal(parses, 2);
    now = 0;
  }
});

test('exact and full purge reacquire immediately, return deterministic counts, and isolate explicit scopes', async () => {
  let now = 0;
  pm.clock = () => now;

  for (const [model, method] of [[dm, 'json'], [hm, 'text'], [tm, 'text']]) {
    cold(model);
    if (model === tm) model.tssParser = {handle: value => [value]};
    let version = 1, loads = 0;
    model.requestModel = {
      cacheKey: (u, c) => c && c.tenant ? c.tenant + ':' + u : undefined,
      get: () => ({[method]: async () => { loads++; return model === dm ? {version} : String(version); }})
    };
    const a = {tenant: 'a'}, b = {tenant: 'b'};
    await model.get('/same', a);
    await model.get('/same', b);
    version = 2;

    assert.equal(model.purge('/same', a), 1);
    assert.equal(model.purge('/same', a), 0);
    assert.equal(model.purge('/same', {}), 0, 'unscoped exact purge is not global');
    await model.get('/same', a);
    await model.get('/same', b);
    assert.equal(loads, 3, 'tenant b remained warm');
    assert.equal(model.purgeAll(), 2);
    assert.equal(model.purgeAll(), 0);
  }
});

test('TSS exact array purge is sequential-key compatible, counts repeats once, and remains bounded for cycles', async () => {
  cold(tm);
  pm.clock = () => 0;
  tm.tssParser = {handle: value => [value]};
  tm.requestModel = {
    cacheKey: (u, c) => c && c.tenant ? c.tenant + ':' + u : undefined,
    get: u => ({text: async () => String(u)})
  };
  const c = {tenant: 'a'};
  await tm.get(['/a', '/b'], c);
  assert.equal(tm.purge(['/a', '/a', '/b'], c), 2);
  assert.equal(tm.purge(['/a', '/b'], c), 0);

  const cycle = ['/missing'];
  cycle.push(cycle);
  assert.doesNotThrow(() => tm.purge(cycle, c));
  assert.equal(tm.purge(cycle, {}), 0);
});

test('unscoped exact purge and fetch bypass never touch cache metadata or invoke the clock', async () => {
  for (const [model, method] of [[dm, 'json'], [hm, 'text'], [tm, 'text']]) {
    cold(model);
    const kept = Promise.resolve('KEPT');
    model.c.set('kept', kept);
    if (model === tm) model.tssParser = {handle: value => [value]};
    model.requestModel = {
      cacheKey: () => undefined,
      get: () => ({[method]: async () => model === dm ? {fresh: true} : 'fresh'})
    };
    pm.clock = () => { throw new Error('unscoped clock read'); };

    assert.equal(model.purge('/same', {}), 0);
    await model.get('/same', {});
    assert.strictEqual(model.c.get('kept'), kept);
  }
});
