'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormUiCacheModel: c } = require('../../src/models/ui-cache-model/src/ui-cache-model.js');
const { jTormRenderContextModel: cm } = require('../../src/models/render-context-model/src/render-context-model.js');
const { jTormRequestModel: rm } = require('../../src/models/request-model/src/request-model.js');

c.renderContextModel = cm;
rm.renderContextModel = cm;
c.requestModel = rm;
rm.base = 'test:';

test('get() returns the value set() stored for the same (l,id,c)', async () => {
  c.cache = {}; c.order = new Map(); c.max = 512; c.saveModel = null;
  c.set(null, 'en', 'comp1', 'default', '<b>hi</b>');
  assert.equal(await c.get(null, 'en', 'comp1', 'default'), '<b>hi</b>');
});

test('bounds the cache to `max` — the oldest entries are evicted (no unbounded growth)', async () => {
  c.cache = {}; c.order = new Map(); c.max = 3; c.saveModel = null;
  for (let i = 0; i < 10; i++) c.set(null, 'en', 'comp' + i, 'd', 'h' + i);
  assert.equal(await c.get(null, 'en', 'comp0', 'd'), null, 'oldest (comp0) must be evicted');
  assert.equal(await c.get(null, 'en', 'comp9', 'd'), 'h9', 'newest (comp9) must survive');
  assert.ok(c.order.size <= 3, 'cache grew past max: ' + c.order.size);
});

test('LRU: a re-read entry survives eviction over an older untouched one', async () => {
  c.cache = {}; c.order = new Map(); c.max = 2; c.saveModel = null;
  c.set(null, 'en', 'a', 'd', 'A');   // [a]
  c.set(null, 'en', 'b', 'd', 'B');   // [a,b]
  await c.get(null, 'en', 'a', 'd');  // bump a -> [b,a]
  c.set(null, 'en', 'cc', 'd', 'C');  // add cc, evict LRU b -> [a,cc]
  assert.equal(await c.get(null, 'en', 'a', 'd'), 'A', 'recently-read a should survive');
  assert.equal(await c.get(null, 'en', 'b', 'd'), null, 'least-recently-used b should be evicted');
  assert.equal(await c.get(null, 'en', 'cc', 'd'), 'C', 'cc should be present');
});

test('a degenerate max (0) never evicts the just-added entry (older ones go)', async () => {
  c.cache = {}; c.order = new Map(); c.max = 0; c.saveModel = null;
  c.set(null, 'en', 'a', 'd', 'A');
  c.set(null, 'en', 'b', 'd', 'B');
  assert.equal(await c.get(null, 'en', 'b', 'd'), 'B', 'the just-added entry survives its own insert');
  assert.equal(await c.get(null, 'en', 'a', 'd'), null, 'the older entry is evicted at max 0');
});

test('the composite key does not collide across distinct (l,id,c) coordinates', async () => {
  c.cache = {}; c.order = new Map(); c.max = 512; c.saveModel = null;
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

test('rendered fragments are separated by request base for the same (language,cid,scope)', async () => {
  const a = { c: { request: { base: 'https://a.example/' } } };
  const b = { c: { request: { base: 'https://b.example/' } } };
  c.cache = {}; c.order = new Map(); c.max = 512; c.saveModel = null;

  c.set(a, 'en', 'comp1', 'default', 'TENANT A');
  c.set(b, 'en', 'comp1', 'default', 'TENANT B');

  assert.equal(await c.get(a, 'en', 'comp1', 'default'), 'TENANT A');
  assert.equal(await c.get(b, 'en', 'comp1', 'default'), 'TENANT B');
});

test('rendered fragments prefer explicit request origin over a shared request base', async () => {
  const a = { c: { request: { base: 'https://cdn.example/', origin: 'https://a.example/' } } };
  const b = { c: { request: { base: 'https://cdn.example/', origin: 'https://b.example/' } } };
  c.cache = {}; c.order = new Map(); c.max = 512; c.saveModel = null;

  c.set(a, 'en', 'comp1', 'default', 'TENANT A');
  c.set(b, 'en', 'comp1', 'default', 'TENANT B');

  assert.equal(await c.get(a, 'en', 'comp1', 'default'), 'TENANT A');
  assert.equal(await c.get(b, 'en', 'comp1', 'default'), 'TENANT B');
});

test('save() rebuilds the nested {l:{id:{c:d}}} shape for saveModel; init() reloads it', async () => {
  const store = { uiCacheScoped: true, o: null, get() { return this.o; }, set(o) { this.o = o; } };
  c.cache = {}; c.order = new Map(); c.max = 512; c.updated = 0; c.saveModel = store;
  c.set(null, 'en', 'comp1', 'default', 'A');
  c.set(null, 'en', 'comp1', 'boxed', 'B');
  c.set(null, 'nl', 'comp2', 'default', 'C');
  await c.save();
  assert.deepEqual(store.o, {
    en: { comp1: { ['test:\0default']: 'A', ['test:\0boxed']: 'B' } },
    nl: { comp2: { ['test:\0default']: 'C' } }
  });

  // a fresh init() from the same store repopulates the cache
  c.cache = {}; c.order = new Map(); c.updated = 0;
  await c.init();
  assert.equal(await c.get(null, 'en', 'comp1', 'boxed'), 'B');
  assert.equal(await c.get(null, 'nl', 'comp2', 'default'), 'C');
});

test('save() only persists when dirty — a freshly loaded cache is not re-written', async () => {
  const store = { uiCacheScoped: true, o: { en: { comp1: { ['test:\0default']: 'A' } } }, sets: 0, get() { return this.o; }, set(o) { this.o = o; this.sets++; } };
  c.cache = {}; c.order = new Map(); c.max = 512; c.updated = 0; c.saveModel = store;
  await c.init();                 // loads A; must NOT mark dirty
  await c.save();
  assert.equal(store.sets, 0, 'a clean (freshly loaded) cache must not be persisted');
  c.set(null, 'en', 'comp2', 'default', 'B');  // now dirty
  await c.save();
  assert.equal(store.sets, 1, 'a new entry must trigger exactly one persist');
});

test('init() bounds an oversized persisted cache to `max`', async () => {
  const store = { uiCacheScoped: true, o: { en: {
    a: { ['test:\0d']: '1' }, b: { ['test:\0d']: '2' }, cc: { ['test:\0d']: '3' },
    dd: { ['test:\0d']: '4' }, ee: { ['test:\0d']: '5' }
  } }, get() { return this.o; }, set() {} };
  c.cache = {}; c.order = new Map(); c.max = 2; c.updated = 0; c.saveModel = store;
  await c.init();
  assert.equal(await c.get(null, 'en', 'a', 'd'), null, 'oldest loaded entry evicted past max');
  assert.equal(await c.get(null, 'en', 'ee', 'd'), '5', 'newest loaded entry retained');
  assert.ok(c.order.size <= 2, 'init loaded past max: ' + c.order.size);
});

test('set() is write-once — a repeat of the same key keeps the first value and does not re-dirty', async () => {
  c.cache = {}; c.order = new Map(); c.max = 512; c.updated = 0; c.saveModel = null;
  c.set(null, 'en', 'x', 'd', 'FIRST');
  c.updated = 0;                                // clear so a no-op set is detectable
  c.set(null, 'en', 'x', 'd', 'SECOND');        // repeat -> must be ignored
  assert.equal(await c.get(null, 'en', 'x', 'd'), 'FIRST', 'the first value must win');
  assert.equal(c.updated, 0, 'a write-once no-op must not mark the cache dirty');
});

test('set() write-once does not bump recency (a repeat leaves eviction order intact)', async () => {
  c.cache = {}; c.order = new Map(); c.max = 2; c.updated = 0; c.saveModel = null;
  c.set(null, 'en', 'a', 'd', 'A');   // [a]
  c.set(null, 'en', 'b', 'd', 'B');   // [a,b]
  c.set(null, 'en', 'a', 'd', 'A2');  // repeat of a -> no-op, must NOT move a ahead of b
  c.set(null, 'en', 'cc', 'd', 'C');  // insert cc -> evict LRU (still a, since a was not bumped)
  assert.equal(await c.get(null, 'en', 'a', 'd'), null, 'a stayed least-recently-used and was evicted');
  assert.equal(await c.get(null, 'en', 'b', 'd'), 'B', 'b survived');
});

test('init() clears a stale dirty flag — a freshly reloaded cache is not re-persisted', async () => {
  const store = { uiCacheScoped: true, o: { en: { comp1: { ['test:\0default']: 'A' } } }, sets: 0, get() { return this.o; }, set(o) { this.o = o; this.sets++; } };
  c.cache = {}; c.order = new Map(); c.max = 512; c.updated = 1; c.saveModel = store;  // dirty BEFORE init
  await c.init();
  await c.save();
  assert.equal(store.sets, 0, 'reloading a persisted cache must not leave it marked dirty');
});

test('the exported `cache` field is the live store — a host read/reset takes effect', async () => {
  c.cache = {}; c.order = new Map(); c.max = 512; c.saveModel = null;
  c.set(null, 'en', 'comp1', 'default', 'A');
  assert.equal(c.cache.en.comp1['test:\0default'], 'A', 'set() writes through the exported cache field');
  c.cache = {};                                   // a host reset via the exported field only
  assert.equal(await c.get(null, 'en', 'comp1', 'default'), null, 'get() reads the exported cache — a reset takes effect');
});

test('dirty tracking is per render context while cache/order remain shared', async () => {
  const store = { sets: 0, o: null, set(o) { this.o = o; this.sets++; } };
  const a = { c: { c: 1, s: null, a: null } };
  const b = { c: { c: 1, s: null, a: null } };
  c.cache = {}; c.order = new Map(); c.max = 512; c.updated = 0; c.saveModel = store;

  c.set(a, 'en', 'comp1', 'default', 'A');

  assert.equal(await c.get(b, 'en', 'comp1', 'default'), 'A', 'the persisted cache store is still shared');

  await c.save(b);
  assert.equal(store.sets, 0, 'another render save must not persist or clear render A dirty state');

  await c.save(a);
  assert.equal(store.sets, 1, 'render A save persists its own dirty write');
  assert.deepEqual(store.o, { en: { comp1: { ['test:\0default']: 'A' } } });
});

test('unscoped fragment read, write, and save bypass seeded state without recency, dirty, or persistence effects', async () => {
  const old = {
    cache: c.cache, order: c.order, max: c.max, updated: c.updated,
    saveModel: c.saveModel, requestModel: c.requestModel
  };
  const root = {c: 0, s: null, a: null};
  let reads = 0;
  const cache = new Proxy({en: {old: {default: 'LEAK', ['tenant\0default']: 'KEPT'}}}, {
    get(target, key, receiver) { reads++; return Reflect.get(target, key, receiver); }
  });
  const orderCalls = {get: 0, set: 0, delete: 0, keys: 0};
  class TrackedMap extends Map {
    get(key) { orderCalls.get++; return super.get(key); }
    set(key, value) { orderCalls.set++; return super.set(key, value); }
    delete(key) { orderCalls.delete++; return super.delete(key); }
    keys() { orderCalls.keys++; return super.keys(); }
  }
  const order = new TrackedMap([
    [c.key('en', 'old', 'default'), {l: 'en', id: 'old', c: 'default'}],
    [c.key('en', 'old', 'tenant\0default'), {l: 'en', id: 'old', c: 'tenant\0default'}]
  ]);
  const beforeCache = JSON.parse(JSON.stringify(cache));
  const beforeOrder = [...order.entries()];
  let saves = 0;
  reads = 0;
  orderCalls.get = orderCalls.set = orderCalls.delete = orderCalls.keys = 0;

  try {
    c.cache = cache; c.order = order; c.max = 1; c.updated = 7;
    c.requestModel = rm; rm.base = '';
    c.saveModel = { set() { saves++; throw new Error('save'); } };

    assert.equal(await c.get(root, 'en', 'old', 'default'), null);
    c.set(root, 'en', 'new', 'default', 'NEW');
    await c.save(root);

    assert.strictEqual(c.cache, cache);
    assert.strictEqual(c.order, order);
    assert.equal(reads, 0);
    assert.deepEqual(orderCalls, {get: 0, set: 0, delete: 0, keys: 0});
    assert.deepEqual(c.cache, beforeCache);
    assert.deepEqual([...c.order.entries()], beforeOrder);
    assert.equal(c.updated, 7);
    assert.equal(root.uiCache, undefined);
    assert.equal(saves, 0);
  } finally {
    c.cache = old.cache; c.order = old.order; c.max = old.max; c.updated = old.updated;
    c.saveModel = old.saveModel; c.requestModel = old.requestModel; rm.base = '';
  }
});

test('interleaved unscoped fragment coordinates cannot observe or retain each other', async () => {
  const old = {cache: c.cache, order: c.order, saveModel: c.saveModel, requestModel: c.requestModel};
  const a = {c: 0, s: null, a: null};
  const b = {c: 0, s: null, a: null};

  try {
    c.cache = {}; c.order = new Map(); c.saveModel = null; c.requestModel = rm; rm.base = '';
    const first = c.get(a, 'en', 'same', 'default');
    c.set(a, 'en', 'same', 'default', 'A');
    const second = c.get(b, 'en', 'same', 'default');
    c.set(b, 'en', 'same', 'default', 'B');

    assert.deepEqual(await Promise.all([first, second]), [null, null]);
    assert.deepEqual(c.cache, {});
    assert.equal(c.order.size, 0);
    assert.equal(a.uiCache, undefined);
    assert.equal(b.uiCache, undefined);
  } finally {
    c.cache = old.cache; c.order = old.order; c.saveModel = old.saveModel;
    c.requestModel = old.requestModel; rm.base = '';
  }
});

test('an attested persisted store ignores malformed variants while scoped entries retain their shape', async () => {
  const old = {cache: c.cache, order: c.order, max: c.max, updated: c.updated, saveModel: c.saveModel, requestModel: c.requestModel};
  const store = {uiCacheScoped: true, o: {en: {same: {
    default: 'RAW',
    ['\0default']: 'LEADING',
    ['tenant\0default']: 'SCOPED'
  }}}, get() { return this.o; }, set() {}};
  const root = {c: 0, s: null, a: null, tenant: 'tenant'};

  try {
    c.cache = {}; c.order = new Map(); c.max = 512; c.updated = 1;
    c.saveModel = store; c.requestModel = rm; rm.base = '';
    await c.init();

    assert.deepEqual(c.cache, {en: {same: {['tenant\0default']: 'SCOPED'}}});
    assert.equal(c.order.size, 1);
    assert.equal(await c.get(root, 'en', 'same', 'default'), 'SCOPED');
    assert.equal(c.updated, 0);

    c.put('en', 'same', 'raw', 'NO');
    c.put('en', 'same', '\0leading', 'NO');
    assert.deepEqual(c.cache, {en: {same: {['tenant\0default']: 'SCOPED'}}});
    assert.equal(c.order.size, 1);
  } finally {
    c.cache = old.cache; c.order = old.order; c.max = old.max; c.updated = old.updated;
    c.saveModel = old.saveModel; c.requestModel = old.requestModel; rm.base = '';
  }
});

test('persisted fragments are quarantined until the adapter attests a completed scoped migration', async () => {
  const old = {cache: c.cache, order: c.order, max: c.max, updated: c.updated, saveModel: c.saveModel, requestModel: c.requestModel};
  const store = {o: {en: {same: {['tenant\0default']: 'AMBIGUOUS'}}}, gets: 0, get() { this.gets++; return this.o; }, set() {}};
  const root = {c: 0, tenant: 'tenant'};

  try {
    c.cache = {}; c.order = new Map(); c.max = 512; c.updated = 1;
    c.saveModel = store; c.requestModel = rm; rm.base = '';
    await c.init();

    assert.equal(store.gets, 0);
    assert.deepEqual(c.cache, {});
    assert.equal(c.order.size, 0);
    assert.equal(await c.get(root, 'en', 'same', 'default'), null);
    assert.equal(c.updated, 0);
  } finally {
    c.cache = old.cache; c.order = old.order; c.max = old.max; c.updated = old.updated;
    c.saveModel = old.saveModel; c.requestModel = old.requestModel; rm.base = '';
  }
});

test('persisted fragment migration attestation must be an own adapter field', async () => {
  const old = {cache: c.cache, order: c.order, max: c.max, updated: c.updated, saveModel: c.saveModel, requestModel: c.requestModel};
  const store = {o: {en: {same: {['tenant\0default']: 'LEGACY'}}}, gets: 0, get() { this.gets++; return this.o; }, set() {}};
  const root = {c: 0, tenant: 'tenant'};

  Object.defineProperty(Object.prototype, 'uiCacheScoped', {value: true, configurable: true, writable: true});
  try {
    c.cache = {}; c.order = new Map(); c.max = 512; c.updated = 1;
    c.saveModel = store; c.requestModel = rm; rm.base = '';
    await c.init();

    assert.equal(store.gets, 0);
    assert.deepEqual(c.cache, {});
    assert.equal(c.order.size, 0);
    assert.equal(await c.get(root, 'en', 'same', 'default'), null);
    assert.equal(c.updated, 0);
  } finally {
    delete Object.prototype.uiCacheScoped;
    c.cache = old.cache; c.order = old.order; c.max = old.max; c.updated = old.updated;
    c.saveModel = old.saveModel; c.requestModel = old.requestModel; rm.base = '';
  }
});

test('separator-bearing fragment coordinates bypass shared state', async () => {
  const old = {cache: c.cache, order: c.order, updated: c.updated, saveModel: c.saveModel, requestModel: c.requestModel};
  const root = {c: 0, tenant: 'a'};

  try {
    c.cache = {}; c.order = new Map(); c.updated = 0; c.saveModel = null;
    c.requestModel = rm; rm.base = '';

    c.set(root, 'en', 'same', 'b\0c', 'VARIANT');
    c.set(root, 'en\0nl', 'same', 'default', 'LANGUAGE');
    c.set(root, 'en', 'same\0other', 'default', 'ID');
    c.put('en', 'same', 'a\0b\0c', 'PERSISTED');

    assert.equal(await c.get(root, 'en', 'same', 'b\0c'), null);
    assert.equal(await c.get(root, 'en\0nl', 'same', 'default'), null);
    assert.equal(await c.get(root, 'en', 'same\0other', 'default'), null);
    assert.deepEqual(c.cache, {});
    assert.equal(c.order.size, 0);
    assert.equal(c.updated, 0);
    assert.equal(root.uiCache, undefined);
  } finally {
    c.cache = old.cache; c.order = old.order; c.updated = old.updated;
    c.saveModel = old.saveModel; c.requestModel = old.requestModel; rm.base = '';
  }
});

test('fragment discriminator preserves first-match precedence and configured-base behavior', () => {
  const old = c.requestModel;
  const savedBase = rm.base;

  try {
    c.requestModel = rm;
    rm.base = 'configured:';
    assert.equal(c.tenant({c: 0, tenant: 'root', request: {tenant: 'request'}}), 'root');
    assert.equal(c.tenant({c: 0, tenant: '', request: {tenant: 'request'}}), 'request');
    assert.equal(c.tenant({c: 0, request: {tenant: '', origin: 'origin', base: 'base'}}), 'origin');
    assert.equal(c.tenant({c: 0, request: {base: 0}}), '0');
    assert.equal(c.tenant({c: 0, request: {base: false}}), 'false');
    assert.equal(c.tenant({c: 0, request: {base: 0n}}), '0');
    assert.equal(c.tenant({c: 0, request: {base: ''}}), '');
    assert.equal(c.tenant({c: 0, request: {base: null}}), 'configured:');
    assert.equal(c.tenant({c: 0, tenant: 0}), '0');
    assert.equal(c.tenant({c: 0, tenant: false}), 'false');
    assert.equal(c.tenant({c: 0, tenant: NaN}), 'NaN');
    assert.equal(c.tenant({c: 0, tenant: 'a\0b'}), '');
    assert.equal(c.tenant({c: 0, tenant: {bad: true}}), '');
    assert.equal(c.tenant({c: 0, tenant: 'winner', request: {tenant: {ignored: true}}}), 'winner');
    assert.equal(c.tenant({c: 0, tenant: 'winner', request: []}), 'winner');
    assert.equal(c.tenant({c: 0, origin: 'root-origin'}), '');
    assert.equal(c.tenant({c: 0, base: '/root/'}), '');
    rm.base = '';
    assert.equal(c.tenant({c: 0, origin: 'root-origin'}), '');
    assert.equal(c.tenant({c: 0, base: '/root/'}), '');
  } finally {
    c.requestModel = old;
    rm.base = savedBase;
  }
});

test('fragment scope follows the effective request option facade instead of a shared raw base', async () => {
  const old = {cache: c.cache, order: c.order, requestModel: c.requestModel, context: rm.context, option: rm.option};
  const a = {c: 0, request: {base: '/shared/'}, effective: '/tenant-a/'};
  const b = {c: 0, request: {base: '/shared/'}, effective: '/tenant-b/'};

  try {
    c.cache = {}; c.order = new Map(); c.requestModel = rm;
    rm.option = (value, key, fallback) => key === 'base' ? value.effective : fallback;

    c.set(a, 'en', 'same', 'default', 'TENANT A');
    assert.equal(await c.get(b, 'en', 'same', 'default'), null);
    c.set(b, 'en', 'same', 'default', 'TENANT B');
    assert.equal(await c.get(a, 'en', 'same', 'default'), 'TENANT A');
    assert.equal(await c.get(b, 'en', 'same', 'default'), 'TENANT B');

    c.cache = {}; c.order = new Map();
    delete a.request; delete b.request;
    c.set(a, 'en', 'same', 'default', 'ROOT A');
    assert.equal(await c.get(b, 'en', 'same', 'default'), null);
    c.set(b, 'en', 'same', 'default', 'ROOT B');
    assert.equal(await c.get(a, 'en', 'same', 'default'), 'ROOT A');
    assert.equal(await c.get(b, 'en', 'same', 'default'), 'ROOT B');
  } finally {
    c.cache = old.cache; c.order = old.order; c.requestModel = old.requestModel;
    rm.context = old.context; rm.option = old.option;
  }
});

test('root-only origin and base fields cannot collapse fragments under a configured base', async () => {
  const old = {cache: c.cache, order: c.order, requestModel: c.requestModel};
  const savedBase = rm.base;
  const contexts = [
    {c: 0, origin: 'origin-a'}, {c: 0, origin: 'origin-b'},
    {c: 0, base: '/base-a/'}, {c: 0, base: '/base-b/'}
  ];

  try {
    c.cache = {}; c.order = new Map(); c.requestModel = rm; rm.base = '/configured/';
    c.set(contexts[0], 'en', 'same', 'default', 'ORIGIN A');
    c.set(contexts[2], 'en', 'same', 'default', 'BASE A');

    assert.equal(await c.get(contexts[1], 'en', 'same', 'default'), null);
    assert.equal(await c.get(contexts[3], 'en', 'same', 'default'), null);
    assert.deepEqual(c.cache, {});
    assert.equal(c.order.size, 0);
  } finally {
    c.cache = old.cache; c.order = old.order; c.requestModel = old.requestModel;
    rm.base = savedBase;
  }
});

test('fragment policy DI fails safe and tenant() still delegates through the overridable context facade', () => {
  const oldModel = c.requestModel;
  const oldContext = c.context;
  const root = {c: 0, tenant: 'root'};
  let seen;

  try {
    c.requestModel = null;
    assert.equal(c.tenant(root), '');

    c.context = () => root;
    c.requestModel = { discriminator(value) { seen = value; return 'scope'; } };
    assert.equal(c.tenant({ignored: true}), 'scope');
    assert.strictEqual(seen, root);

    c.requestModel = { discriminator() { throw new Error('policy'); } };
    assert.equal(c.tenant(root), '');

    c.requestModel = { discriminator() { return 'a\0b'; } };
    assert.equal(c.tenant(root), '');
  } finally {
    c.requestModel = oldModel;
    c.context = oldContext;
  }
});

test('cyclic and structurally malformed fragment contexts cannot regain configured-base caching', () => {
  const old = c.requestModel;
  const savedBase = rm.base;
  const cycle = {c: 0};
  const inherited = Object.assign(Object.create({tenant: 'prototype'}), {c: 0});
  cycle.p = cycle;

  try {
    c.requestModel = rm;
    rm.base = 'configured:';
    assert.equal(c.tenant(cycle), '');
    assert.equal(c.scope(cycle, 'default'), undefined);
    assert.equal(c.tenant({c: 'invalid'}), '');
    assert.equal(c.tenant({c: 0, request: []}), '');
    rm.base = '';
    assert.equal(c.tenant(inherited), '');
  } finally {
    c.requestModel = old;
    rm.base = savedBase;
  }
});

test('inherited context links cannot retain or serve a rendered fragment', async () => {
  const old = {cache: c.cache, order: c.order, requestModel: c.requestModel};
  const savedBase = rm.base;
  const root = Object.assign(Object.create(null), {tenant: 'prototype-root'});
  const parent = Object.create({p: root});
  const view = Object.create({c: root});

  try {
    c.cache = {}; c.order = new Map(); c.requestModel = rm; rm.base = '';
    c.set(parent, 'en', 'same', 'default', 'PARENT');
    c.set(view, 'en', 'same', 'default', 'VIEW');

    assert.equal(await c.get(parent, 'en', 'same', 'default'), null);
    assert.equal(await c.get(view, 'en', 'same', 'default'), null);
    assert.deepEqual(c.cache, {});
    assert.equal(c.order.size, 0);
  } finally {
    c.cache = old.cache; c.order = old.order; c.requestModel = old.requestModel;
    rm.base = savedBase;
  }
});

test('an inherited request accessor cannot retain or serve a rendered fragment', async () => {
  const old = {cache: c.cache, order: c.order, requestModel: c.requestModel};
  const savedBase = rm.base;
  const p = {};
  let calls = 0;
  Object.defineProperty(p, 'request', {
    get() { calls++; return {tenant: 'prototype-' + calls}; }
  });
  const root = Object.assign(Object.create(p), {c: 0});

  try {
    c.cache = {}; c.order = new Map(); c.requestModel = rm; rm.base = '/configured/';
    c.set(root, 'en', 'same', 'default', 'PROTOTYPE');

    assert.equal(await c.get(root, 'en', 'same', 'default'), null);
    assert.deepEqual(c.cache, {});
    assert.equal(c.order.size, 0);
    assert.equal(calls, 0);
  } finally {
    c.cache = old.cache; c.order = old.order; c.requestModel = old.requestModel;
    rm.base = savedBase;
  }
});
