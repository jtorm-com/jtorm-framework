'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormDataModel: dm } = require('../../src/models/data-model/src/data-model.js');
const { jTormHtmlModel: hm } = require('../../src/models/html-model/src/html-model.js');
const { jTormTssModel: tm } = require('../../src/models/tss-model/src/tss-model.js');
const { jTormPromiseCacheModel: pm } = require('../../src/models/promise-cache-model/src/promise-cache-model.js');

function restore(model, saved) {
  model.c = saved.c;
  model.max = saved.max;
  model.requestModel = saved.requestModel;
  if (model === tm) model.tssParser = saved.tssParser;
}

function saved(model) {
  return {
    c: model.c,
    max: model.max,
    requestModel: model.requestModel,
    tssParser: model.tssParser
  };
}

test('unscoped data calls observe sequential and interleaved fresh sources without touching seeded LRU state', async () => {
  const old = saved(dm);
  const seed = new Map([['kept', Promise.resolve({n: 0})], [undefined, Promise.resolve({n: -1})]]);
  const before = [...seed.entries()];
  let calls = 0;

  try {
    dm.c = seed; dm.max = 1; dm.promiseCacheModel = pm;
    dm.requestModel = {
      cacheKey: () => undefined,
      get: () => ({ json: async () => ({n: ++calls}) })
    };
    assert.deepEqual(await dm.get('/same.json'), {n: 1});
    assert.deepEqual(await dm.get('/same.json'), {n: 2});
    assert.deepEqual([...dm.c.entries()], before);

    const releases = [];
    calls = 0;
    dm.requestModel = {
      cacheKey: () => undefined,
      get: () => ({ json: () => {
        const n = ++calls;
        return new Promise(resolve => { releases.push(() => resolve({n})); });
      } })
    };
    const a = dm.get('/same.json');
    const b = dm.get('/same.json');
    const started = calls;
    for (const release of releases) release();
    assert.deepEqual(await Promise.all([a, b]), [{n: 1}, {n: 2}]);
    assert.equal(started, 2);
    assert.deepEqual([...dm.c.entries()], before);
  } finally {
    restore(dm, old);
  }
});

test('unscoped data transport rejection evicts no seeded entry and a retry performs fresh work', async () => {
  const old = saved(dm);
  const seed = new Map([['kept', Promise.resolve('kept')]]);
  const before = [...seed.entries()];
  let fail = 1, calls = 0;

  try {
    dm.c = seed; dm.max = 1; dm.promiseCacheModel = pm;
    dm.requestModel = {
      cacheKey: () => undefined,
      get: () => ({ json: async () => {
        calls++;
        if (fail) { fail = 0; throw new Error('transport'); }
        return {fresh: true};
      } })
    };
    await assert.rejects(() => dm.get('/same.json'), /transport/);
    assert.deepEqual([...dm.c.entries()], before);
    assert.deepEqual(await dm.get('/same.json'), {fresh: true});
    assert.equal(calls, 2);
    assert.deepEqual([...dm.c.entries()], before);
  } finally {
    restore(dm, old);
  }
});

test('missing, null, and empty HTML cache identities all bypass shared state', async () => {
  const old = saved(hm);

  try {
    for (const identity of ['missing', null, '']) {
      let calls = 0;
      hm.c = new Map([['kept', Promise.resolve('KEPT')]]);
      const before = [...hm.c.entries()];
      hm.max = 1; hm.promiseCacheModel = pm;
      hm.requestModel = {
        get: () => ({ text: async () => String(++calls) })
      };
      if (identity !== 'missing') hm.requestModel.cacheKey = () => identity;

      assert.equal(await hm.get('/same.html'), '1');
      assert.equal(await hm.get('/same.html'), '2');
      assert.deepEqual([...hm.c.entries()], before);
    }
  } finally {
    restore(hm, old);
  }
});

test('unscoped TSS calls parse fresh text, retain no failed parse, and keep array loads serial', async () => {
  const old = saved(tm);
  const starts = [], releases = {};
  let source = 0, parseFail = 0;

  try {
    tm.c = new Map([['kept', Promise.resolve(['KEPT'])]]);
    const before = [...tm.c.entries()];
    tm.max = 1; tm.promiseCacheModel = pm;
    tm.tssParser = { handle: value => {
      if (parseFail) { parseFail = 0; throw new Error('parse'); }
      return [{value}];
    } };
    tm.requestModel = {
      cacheKey: () => undefined,
      get: () => ({ text: async () => String(++source) })
    };

    const a = await tm.get('/same.tss');
    const b = await tm.get('/same.tss');
    assert.notStrictEqual(b, a);
    assert.deepEqual([a[0].value, b[0].value], ['1', '2']);
    assert.deepEqual([...tm.c.entries()], before);

    parseFail = 1;
    await assert.rejects(() => tm.get('/bad.tss'), /parse/);
    assert.deepEqual([...tm.c.entries()], before);
    assert.deepEqual(await tm.get('/bad.tss'), [{value: '4'}]);
    assert.deepEqual([...tm.c.entries()], before);

    tm.requestModel = {
      cacheKey: () => undefined,
      get: value => ({ text: () => {
        starts.push(value);
        return new Promise(resolve => { releases[value] = resolve; });
      } })
    };
    const sequence = tm.get(['/a.tss', '/b.tss']);
    await Promise.resolve();
    assert.deepEqual(starts, ['/a.tss']);
    releases['/a.tss']('A');
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(starts, ['/a.tss', '/b.tss']);
    releases['/b.tss']('B');
    assert.deepEqual(await sequence, [{value: 'A'}, {value: 'B'}]);
    assert.deepEqual([...tm.c.entries()], before);
  } finally {
    restore(tm, old);
  }
});

test('explicit custom cache identities retain scoped deduplication, identity reuse, LRU, and isolation', async () => {
  const old = saved(dm);
  let calls = 0, scope = 'tenant-a';

  try {
    dm.c = new Map(); dm.max = 2; dm.promiseCacheModel = pm;
    dm.requestModel = {
      cacheKey: value => scope + '\0' + value,
      get: () => ({ json: async () => ({call: ++calls, scope}) })
    };
    const a = await dm.get('/same.json');
    const a2 = await dm.get('/same.json');
    assert.strictEqual(a2, a);
    scope = 'tenant-b';
    const b = await dm.get('/same.json');
    assert.notStrictEqual(b, a);
    assert.deepEqual([a.scope, b.scope], ['tenant-a', 'tenant-b']);
    assert.equal(calls, 2);
    assert.deepEqual([...dm.c.keys()], ['tenant-a\0/same.json', 'tenant-b\0/same.json']);

    scope = 'tenant-a';
    await dm.get('/same.json');
    scope = 'tenant-c';
    await dm.get('/same.json');
    assert.deepEqual([...dm.c.keys()], ['tenant-a\0/same.json', 'tenant-c\0/same.json']);
  } finally {
    restore(dm, old);
  }
});
