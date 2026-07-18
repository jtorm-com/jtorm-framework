'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { jTormUiCacheModel: c } = require('../../src/models/ui-cache-model/src/ui-cache-model.js');
const { jTormRenderContextModel: cm } = require('../../src/models/render-context-model/src/render-context-model.js');
const { jTormRequestModel: rm } = require('../../src/models/request-model/src/request-model.js');
const { jTormPromiseCacheModel: pm } = require('../../src/models/promise-cache-model/src/promise-cache-model.js');

const fixture = name => JSON.parse(fs.readFileSync(path.join(__dirname, '../fixtures', name), 'utf8'));
const nativeClock = pm.clock;
const nativePersistenceClock = c.persistenceClock;
let processNow = 0, wallNow = 0;

function reset(ttl = 10, max = 8) {
  c.cache = {};
  c.order = new Map();
  c.max = max;
  c.ttl = ttl;
  c.updated = 0;
  c.revision = 0;
  c.saveModel = null;
  c.flights = new WeakMap();
  c.iterations = new WeakMap();
  c.stores = new WeakMap();
  c.settlements = new WeakMap();
  c.persistenceObserved = new WeakMap();
  c.renderContextModel = cm;
  c.requestModel = rm;
  c.promiseCacheModel = pm;
  rm.renderContextModel = cm;
  rm.base = 'test:';
  processNow = 0;
  wallNow = 0;
  pm.clock = () => processNow;
  c.persistenceClock = () => wallNow;
  pm.reset(c);
}

function record(settledAt, values = {}) {
  return Object.assign({
    language: 'en', cid: 'same', variant: 'test:\0default', html: 'OLD', settledAt
  }, values);
}

function wire(records, version = 1) {
  return {version, fragments: records};
}

function adapter(value) {
  return {
    uiCacheScoped: true,
    value,
    gets: 0,
    sets: 0,
    get() { this.gets++; return this.value; },
    set(next) { this.sets++; this.value = next; }
  };
}

function assertCold() {
  assert.deepEqual(c.cache, {});
  assert.equal(c.order.size, 0);
  assert.equal(c.settlements.get(c.order), undefined);
  assert.equal(c.persistenceObserved.get(c.order), undefined);
  assert.equal(pm.records(c.order), undefined);
  assert.equal(c.updated, 0);
  assert.equal(c.revision, 0);
}

test.afterEach(() => {
  pm.clock = nativeClock;
  c.persistenceClock = nativePersistenceClock;
  rm.base = 'test:';
});

test('wire v1 exact golden pairs fragment bytes with successful settlement time', async () => {
  reset(100);
  wallNow = 1000;
  rm.base = '';
  const root = {c: 0, tenant: 'https://tenant.example'};
  const store = adapter(null);
  c.saveModel = store;

  c.set(root, 'en', 'card', 'default', '<article>cached</article>');
  await c.save(root);

  assert.deepEqual(store.value, fixture('ui-cache-persistence-v1.json'));
  assert.equal(Object.isFrozen(store.value), true);
  assert.equal(Object.isFrozen(store.value.fragments), true);
  assert.equal(Object.isFrozen(store.value.fragments[0]), true);
  assert.deepEqual(c.cache, {
    en: {card: {['https://tenant.example\0default']: '<article>cached</article>'}}
  });
});

test('unversioned migration is cold by default while trusted original timestamps may construct wire v1', async () => {
  const migration = fixture('ui-cache-persistence-migration.json');
  reset(10);
  wallNow = 1009;
  rm.base = '';
  const root = {c: 0, tenant: 'https://tenant.example'};
  const store = adapter(migration.unversioned);
  c.saveModel = store;
  await c.init();
  assertCold();
  assert.equal(store.sets, 0, 'quarantine never rewrites or freshens unversioned state');

  reset(10);
  wallNow = 1009;
  rm.base = '';
  c.saveModel = adapter(migration.trustedMigration);
  await c.init();
  assert.equal(await c.get(root, 'en', 'card', 'default'), '<article>cached</article>');
  processNow = 1;
  wallNow = 1010;
  assert.equal(await c.get(root, 'en', 'card', 'default'), null);

  assert.deepEqual(fixture('ui-cache-persistence-rollback.json'), {
    storeVersion: 1,
    beforeOlderReader: [
      'disablePersistence',
      'clearVersion1StoreOrRestoreReaderCompatibleSnapshot',
      'startOlderReader'
    ],
    mixedReadersAllowed: false
  });
});

test('restart just before, exactly at, and after ttl retains only true remaining life', async () => {
  for (const [at, loaded] of [[109, true], [110, false], [111, false]]) {
    reset(10);
    wallNow = at;
    c.saveModel = adapter(wire([record(100)]));
    await c.init();
    assert.equal(c.order.size, loaded ? 1 : 0, 'restart at ' + at);
    if (loaded) {
      assert.equal(await c.get(null, 'en', 'same', 'default'), 'OLD');
      processNow = 1;
      wallNow = 110;
      assert.equal(await c.get(null, 'en', 'same', 'default'), null);
      assert.equal(c.settlements.get(c.order), undefined);
    } else assert.deepEqual(c.cache, {});
  }
});

test('save delay and cache hits do not slide original settlement time', async () => {
  reset(10);
  wallNow = 100;
  const store = adapter(null);
  c.saveModel = store;
  c.set(null, 'en', 'same', 'default', 'OLD');
  processNow = 5; wallNow = 105;
  assert.equal(await c.get(null, 'en', 'same', 'default'), 'OLD');
  processNow = 9; wallNow = 109;
  assert.equal(await c.get(null, 'en', 'same', 'default'), 'OLD');
  await c.save(null);
  assert.equal(store.value.fragments[0].settledAt, 100);

  await c.init();
  assert.equal(await c.get(null, 'en', 'same', 'default'), 'OLD');
  processNow = 10; wallNow = 110;
  assert.equal(await c.get(null, 'en', 'same', 'default'), null);
});

test('current ttl re-evaluates original age across restart, including zero and Infinity rollback', async () => {
  const saved = wire([record(100)]);
  for (const [ttl, at, retained] of [[5, 104, true], [5, 105, false], [20, 115, true], [0, 100, false]]) {
    reset(ttl);
    wallNow = at;
    c.saveModel = adapter(saved);
    await c.init();
    assert.equal(c.order.size, retained ? 1 : 0, 'ttl=' + ttl + ', now=' + at);
  }

  reset(Infinity);
  wallNow = 100;
  const store = adapter(null);
  c.saveModel = store;
  pm.clock = () => { throw new Error('Infinity must not read process clock'); };
  c.set(null, 'en', 'same', 'default', 'OLD');
  await c.save(null);
  wallNow = 1000;
  await c.init();
  assert.equal(await c.get(null, 'en', 'same', 'default'), 'OLD');

  reset(901);
  wallNow = 1000;
  c.saveModel = adapter(store.value);
  await c.init();
  assert.equal(await c.get(null, 'en', 'same', 'default'), 'OLD');
  reset(900);
  wallNow = 1000;
  c.saveModel = adapter(store.value);
  await c.init();
  assert.deepEqual(c.cache, {});
  assert.equal(c.order.size, 0);
  assert.equal(c.settlements.get(c.order), undefined);
  assert.equal(pm.records(c.order), undefined);
  assert.equal(c.persistenceObserved.get(c.order), 1000, 'a valid all-stale generation keeps only its clock high-water');
});

test('invalid, future, and live-regressing absolute clocks fail fresh without partial publication', async () => {
  const invalid = [undefined, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '100'];
  for (const value of invalid) {
    reset();
    c.persistenceClock = () => value;
    c.saveModel = adapter(wire([record(0)]));
    await c.init();
    assertCold();
    assert.equal(pm.observed.get(c), undefined);
  }

  reset();
  wallNow = 99;
  c.saveModel = adapter(wire([record(100)]));
  await c.init();
  assertCold();
  assert.equal(pm.observed.get(c), undefined, 'future rejection rolls back the candidate process observation');

  reset(100);
  wallNow = 100;
  c.set(null, 'en', 'a', 'default', 'A');
  c.updated = 0;
  wallNow = 99;
  c.set(null, 'en', 'b', 'default', 'B');
  assert.equal(await c.get(null, 'en', 'b', 'default'), null);
  assert.equal(await c.get(null, 'en', 'a', 'default'), 'A');
  assert.equal(c.updated, 0);
});

test('malformed timestamps and unknown versions quarantine the complete envelope', async () => {
  const bad = [
    Object.assign(record(0), {settledAt: -1}),
    Object.assign(record(0), {settledAt: 1.5}),
    Object.assign(record(0), {settledAt: NaN}),
    Object.assign(record(0), {settledAt: Infinity}),
    Object.assign(record(0), {settledAt: Number.MAX_SAFE_INTEGER + 1}),
    Object.assign(record(0), {settledAt: '0'}),
    {language: 'en', cid: 'same', variant: 'test:\0default', html: 'OLD'}
  ];
  for (const entry of bad) {
    reset();
    c.saveModel = adapter(wire([entry]));
    await c.init();
    assertCold();
  }
  for (const v of [0, 2, -1, '1', 1.5]) {
    reset();
    c.saveModel = adapter(wire([record(0)], v));
    await c.init();
    assertCold();
  }

  reset();
  c.saveModel = adapter(wire([record(0), record(0, {html: 'DUPLICATE'})]));
  await c.init();
  assertCold();
  assert.equal(pm.observed.get(c), undefined, 'duplicate identities fail before either clock is sampled');
});

test('a valid mixed-age envelope commits only the still-fresh subset in deterministic order', async () => {
  reset(10);
  wallNow = 10;
  c.saveModel = adapter(wire([
    record(0, {cid: 'stale', html: 'STALE'}),
    record(1, {cid: 'fresh-a', html: 'A'}),
    record(5, {cid: 'fresh-b', html: 'B'})
  ]));
  await c.init();

  assert.equal(await c.get(null, 'en', 'stale', 'default'), null);
  assert.equal(await c.get(null, 'en', 'fresh-a', 'default'), 'A');
  assert.equal(await c.get(null, 'en', 'fresh-b', 'default'), 'B');
  assert.deepEqual([...c.order.values()].map(value => value.id), ['fresh-a', 'fresh-b']);
  assert.equal(c.settlements.get(c.order).size, 2);
});

test('hostile, oversized, failed, and mixed-validity loads leave no partial state', async () => {
  const accessor = {};
  let accesses = 0;
  Object.defineProperty(accessor, 'version', {get() { accesses++; return 1; }, enumerable: true});
  Object.defineProperty(accessor, 'fragments', {value: [record(0)], enumerable: true});
  const cyclic = {version: 1}; cyclic.fragments = cyclic;
  const polluted = Object.assign(Object.create({polluted: true}), wire([record(0)]));
  const mixed = wire([record(0), record(0, {cid: 'bad', variant: 'unscoped'})]);
  const cases = [accessor, cyclic, polluted, mixed];

  for (const value of cases) {
    reset();
    c.saveModel = adapter(value);
    await c.init();
    assertCold();
  }
  assert.equal(accesses, 0, 'descriptor validation never evaluates payload accessors');

  reset(10, 1);
  let indexed = 0;
  const oversized = [record(0), record(0, {cid: 'b'})];
  Object.defineProperty(oversized, '0', {get() { indexed++; return record(0); }, enumerable: true, configurable: true});
  c.saveModel = adapter(wire(oversized));
  await c.init();
  assertCold();
  assert.equal(indexed, 0, 'oversize rejection happens before entry evaluation');

  reset();
  c.saveModel = {uiCacheScoped: true, get() { return Promise.reject(new Error('offline')); }};
  await c.init();
  assertCold();

  reset();
  const throwingAdapter = {uiCacheScoped: true};
  Object.defineProperty(throwingAdapter, 'get', {get() { throw new Error('adapter unavailable'); }});
  c.saveModel = throwingAdapter;
  await c.init();
  assertCold();
});

test('attestation and schema version must be own data properties', async () => {
  reset();
  let gets = 0, accesses = 0;
  const inherited = Object.create({uiCacheScoped: true});
  inherited.get = () => { gets++; return wire([record(0)]); };
  c.saveModel = inherited;
  await c.init();
  assert.equal(gets, 0);
  assertCold();

  reset();
  const accessor = {get() { gets++; return wire([record(0)]); }};
  Object.defineProperty(accessor, 'uiCacheScoped', {get() { accesses++; return true; }});
  c.saveModel = accessor;
  await c.init();
  assert.equal(accesses, 0);
  assert.equal(gets, 0);
  assertCold();

  reset();
  const inheritedVersion = Object.assign(Object.create({version: 1}), {fragments: [record(0)]});
  c.saveModel = adapter(inheritedVersion);
  await c.init();
  assertCold();
});

test('an injected promise-cache owner below the restore seam fails cold without escaping init', async () => {
  reset();
  wallNow = 1;
  const current = c.promiseCacheModel;
  c.promiseCacheModel = Object.assign({}, pm, {restore: undefined});
  c.saveModel = adapter(wire([record(0)]));

  try {
    await c.init();
    assertCold();
  } finally {
    c.promiseCacheModel = current;
    pm.reset(c);
  }
});

test('a delayed init cannot overwrite newer publication, lease, purge, replacement, or init', async () => {
  reset(100);
  wallNow = 10;
  let release;
  c.saveModel = {uiCacheScoped: true, get() { return new Promise(resolve => { release = resolve; }); }};
  const loading = c.init();
  await Promise.resolve();
  c.set(null, 'en', 'new', 'default', 'NEW');
  release(wire([record(0)]));
  await loading;
  assert.equal(await c.get(null, 'en', 'new', 'default'), 'NEW');
  assert.equal(await c.get(null, 'en', 'same', 'default'), null);

  reset(100);
  c.saveModel = {uiCacheScoped: true, get() { return new Promise(resolve => { release = resolve; }); }};
  const pending = c.init();
  await Promise.resolve();
  const token = {};
  assert.equal(await c.get(null, 'en', 'lease', 'default', token), null);
  assert.equal(c.purge(null, 'en', 'lease', 'default'), 1);
  c.cache = {};
  release(wire([record(0)]));
  await pending;
  assert.deepEqual(c.cache, {});
  assert.equal(c.order.size, 0);
});

test('async saves receive frozen paired snapshots while mutation and rejection remain dirty for retry', async () => {
  reset(100);
  wallNow = 100;
  const root = {c: 0, tenant: 'tenant'};
  let rejectSave, resolveSave;
  const payloads = [];
  c.saveModel = {set(value) {
    payloads.push(value);
    return new Promise((resolve, reject) => { resolveSave = resolve; rejectSave = reject; });
  }};
  c.set(root, 'en', 'a', 'default', 'A');
  const first = c.save(root);
  assert.equal(Object.isFrozen(payloads[0]), true);
  assert.deepEqual(payloads[0].fragments, [
    {language: 'en', cid: 'a', variant: 'tenant\0default', html: 'A', settledAt: 100}
  ]);

  wallNow = 101;
  c.set(root, 'en', 'b', 'default', 'B');
  assert.equal(payloads[0].fragments.length, 1, 'later mutation cannot alter the adapter body');
  resolveSave();
  await first;
  assert.equal(root.uiCache.updated, 1);

  const second = c.save(root);
  assert.deepEqual(payloads[1].fragments, [
    {language: 'en', cid: 'a', variant: 'tenant\0default', html: 'A', settledAt: 100},
    {language: 'en', cid: 'b', variant: 'tenant\0default', html: 'B', settledAt: 101}
  ]);
  rejectSave(new Error('save failed'));
  await assert.rejects(second, /save failed/);
  assert.equal(root.uiCache.updated, 1);
});

test('overlapping saves keep immediate calls and internally consistent snapshots without promising adapter ordering', async () => {
  reset(100);
  const a = {c: 0, tenant: 'tenant'}, b = {c: 0, tenant: 'tenant'};
  const releases = [], payloads = [];
  c.saveModel = {set(value) {
    payloads.push(value);
    return new Promise(resolve => releases.push(resolve));
  }};
  wallNow = 1; c.set(a, 'en', 'a', 'default', 'A');
  const first = c.save(a);
  wallNow = 2; c.set(b, 'en', 'b', 'default', 'B');
  const second = c.save(b);
  assert.equal(payloads.length, 2, 'both adapter calls begin immediately');
  assert.equal(payloads[0].fragments.length, 1);
  assert.equal(payloads[1].fragments.length, 2);
  releases[1](); releases[0]();
  await Promise.all([first, second]);
});

test('tampered live bytes or timestamp metadata are never served or persisted as a mismatched pair', async () => {
  reset(100);
  wallNow = 1;
  const root = {c: 0, tenant: 'tenant'};
  let sets = 0;
  c.saveModel = {set() { sets++; }};
  c.set(root, 'en', 'same', 'default', 'OLD');
  c.cache.en.same['tenant\0default'] = 'HOST-REPLACED';
  assert.equal(await c.get(root, 'en', 'same', 'default'), null);
  assert.deepEqual(c.cache, {});
  assert.equal(c.settlements.get(c.order), undefined);
  await c.save(root);
  assert.equal(sets, 1);

  reset(100);
  wallNow = 1;
  c.saveModel = {set() { sets++; }};
  c.set(root, 'en', 'same', 'default', 'OLD');
  c.settlements = new WeakMap();
  assert.equal(await c.get(root, 'en', 'same', 'default'), null);
  assert.deepEqual(c.cache, {});
});

test('a rejected replacement publication preserves the previous complete fragment pair', async () => {
  reset(100);
  wallNow = 1;
  c.set(null, 'en', 'same', 'default', 'OLD');
  const cache = c.cache, order = c.order, stamp = pm.stamp;

  try {
    pm.stamp = () => false;
    wallNow = 2;
    assert.equal(c.put('en', 'same', 'test:\0default', 'NEW'), false);
  } finally {
    pm.stamp = stamp;
  }

  assert.strictEqual(c.cache, cache);
  assert.strictEqual(c.order, order);
  assert.equal(await c.get(null, 'en', 'same', 'default'), 'OLD');
  assert.equal(c.settlements.get(c.order).values().next().value.settledAt, 1);
});

test('expiry, exact/full purge, abort, and late completion remove both content and settlement metadata', async () => {
  reset(2);
  wallNow = 1;
  c.set(null, 'en', 'a', 'default', 'A');
  assert.equal(c.settlements.get(c.order).size, 1);
  assert.equal(c.purge(null, 'en', 'a', 'default'), 1);
  assert.equal(c.settlements.get(c.order), undefined);

  c.set(null, 'en', 'a', 'default', 'A');
  c.set(null, 'en', 'b', 'default', 'B');
  assert.equal(c.purgeAll(null), 2);
  assert.equal(c.settlements.get(c.order), undefined);
  assert.deepEqual(c.cache, {});

  wallNow = 10; processNow = 10;
  c.set(null, 'en', 'a', 'default', 'A');
  processNow = 12;
  assert.equal(await c.get(null, 'en', 'a', 'default'), null);
  assert.equal(c.settlements.get(c.order), undefined);

  reset(10);
  const token = {}, follower = {};
  assert.equal(await c.get(null, 'en', 'late', 'default', token), null);
  const waiting = c.get({c: 0, tenant: 'test:'}, 'en', 'late', 'default', follower);
  c.stage(null, 'en', 'late', 'default', 'LATE', token);
  assert.equal(c.purge(null, 'en', 'late', 'default'), 1);
  c.complete(null, token);
  assert.equal(await waiting, 'LATE');
  assert.equal(c.settlements.get(c.order), undefined);
  assert.deepEqual(c.cache, {});

  const aborted = {};
  assert.equal(await c.get(null, 'en', 'abort', 'default', aborted), null);
  c.stage(null, 'en', 'abort', 'default', 'NO', aborted);
  c.abort(null, aborted, new Error('abort'));
  assert.equal(c.settlements.get(c.order), undefined);
});

test('render leases timestamp successful completion and revalidate scope before publication', async () => {
  reset(100);
  const root = {c: 0, tenant: 'tenant'};
  const token = {};
  wallNow = 1;
  assert.equal(await c.get(root, 'en', 'same', 'default', token), null);
  wallNow = 5;
  c.stage(root, 'en', 'same', 'default', 'A', token);
  wallNow = 9;
  c.complete(root, token);
  const store = adapter(null);
  c.saveModel = store;
  await c.save(root);
  assert.equal(store.value.fragments[0].settledAt, 9, 'acquire and stage time are not publication time');

  reset(100);
  const changed = {c: 0, tenant: 'a'}, next = {};
  wallNow = 1;
  assert.equal(await c.get(changed, 'en', 'same', 'default', next), null);
  c.stage(changed, 'en', 'same', 'default', 'NO', next);
  changed.tenant = 'b';
  wallNow = 2;
  c.complete(changed, next);
  assert.deepEqual(c.cache, {});
  assert.equal(c.order.size, 0);
  assert.equal(c.settlements.get(c.order), undefined);
  assert.equal(changed.uiCache, undefined);
});

test('magic and primitive coordinates preserve exact scoped identities without prototype mutation', async () => {
  reset(100);
  wallNow = 1;
  const before = Object.getPrototypeOf(c.cache);
  const store = adapter(null);
  c.saveModel = store;
  c.set(null, '__proto__', 'constructor', 'prototype', 'MAGIC');
  c.put(null, 1, 'test:\0default', 'PRIMITIVE');
  await c.save(null);
  assert.strictEqual(Object.getPrototypeOf(c.cache), before);
  assert.equal(Object.prototype.MAGIC, undefined);
  assert.deepEqual(store.value.fragments, [
    {language: '__proto__', cid: 'constructor', variant: 'test:\0prototype', html: 'MAGIC', settledAt: 1},
    {language: 'null', cid: '1', variant: 'test:\0default', html: 'PRIMITIVE', settledAt: 1}
  ]);
  await c.init();
  assert.equal(await c.get(null, '__proto__', 'constructor', 'prototype'), 'MAGIC');
  assert.equal(await c.get(null, null, 1, 'default'), 'PRIMITIVE');
});

test('persisted fragments remain isolated across explicit tenant, origin, and base discriminators', async () => {
  reset(100);
  wallNow = 1;
  rm.base = '';
  const contexts = [
    {c: 0, tenant: 'tenant-a'},
    {c: 0, tenant: 'tenant-b'},
    {c: 0, request: {origin: 'https://origin-a.example', base: '/shared/'}},
    {c: 0, request: {origin: 'https://origin-b.example', base: '/shared/'}},
    {c: 0, request: {base: '/base-a/'}},
    {c: 0, request: {base: '/base-b/'}}
  ];
  const values = ['TA', 'TB', 'OA', 'OB', 'BA', 'BB'];
  const store = adapter(null);
  c.saveModel = store;
  contexts.forEach((context, index) => c.set(context, 'en', 'same', 'default', values[index]));
  await c.save(contexts[0]);
  await c.init();
  for (let i = 0; i < contexts.length; i++)
    assert.equal(await c.get(contexts[i], 'en', 'same', 'default'), values[i]);
});

test('one effective bound covers invalid max values for live entries and leases', async () => {
  for (const max of [0, -1, 1.5, NaN, Infinity, '2']) {
    reset(100, max);
    wallNow = 1;
    c.set(null, 'en', 'a', 'default', 'A');
    c.set(null, 'en', 'b', 'default', 'B');
    c.set(null, 'en', 'cc', 'default', 'C');
    assert.equal(c.order.size, 1, 'live max ' + String(max));
    assert.equal(c.settlements.get(c.order).size, 1);
    const a = {}, b = {};
    await c.get(null, 'en', 'lease-a', 'default', a);
    await c.get(null, 'en', 'lease-b', 'default', b);
    assert.equal(c.flight().size, 1, 'flight max ' + String(max));
  }
});

test('absent adapters keep no-op dirty cleanup while invalid live snapshots and rejection retain retry state', async () => {
  reset(100);
  wallNow = 1;
  const root = {c: 0, tenant: 'tenant'};
  c.set(root, 'en', 'same', 'default', 'A');
  assert.equal(root.uiCache.updated, 1);
  c.saveModel = null;
  await c.save(root);
  assert.equal(root.uiCache.updated, 0);

  c.set(root, 'en', 'other', 'default', 'B');
  let calls = 0;
  c.saveModel = {set() { calls++; }};
  c.order.set('orphan', {l: 'en', id: 'orphan', c: 'tenant\0default'});
  await c.save(root);
  assert.equal(calls, 0);
  assert.equal(root.uiCache.updated, 1);

  c.order.delete('orphan');
  c.saveModel = {set() { return Promise.reject(new Error('offline')); }};
  await assert.rejects(c.save(root), /offline/);
  assert.equal(root.uiCache.updated, 1);
});
