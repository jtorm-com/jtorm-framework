'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormUiCacheModel: c } = require('../../src/models/ui-cache-model/src/ui-cache-model.js');
const { jTormRenderContextModel: cm } = require('../../src/models/render-context-model/src/render-context-model.js');
const { jTormRequestModel: rm } = require('../../src/models/request-model/src/request-model.js');
const { jTormPromiseCacheModel: pm } = require('../../src/models/promise-cache-model/src/promise-cache-model.js');

const nativeClock = pm.clock;
const nativePersistenceClock = c.persistenceClock;
let now;
let wallNow;

function reset(ttl = 10, staleWindow = 5) {
  now = 0;
  wallNow = 0;
  pm.clock = () => now;
  c.persistenceClock = () => wallNow;
  c.cache = {};
  c.order = new Map();
  c.max = 8;
  c.ttl = ttl;
  c.staleWindow = arguments.length > 1 ? arguments[1] : staleWindow;
  c.updated = 0;
  c.revision = 0;
  c.saveModel = null;
  c.flights = new WeakMap();
  c.iterations = new WeakMap();
  c.stores = new WeakMap();
  c.settlements = new WeakMap();
  c.persistenceObserved = new WeakMap();
  c.refreshes = new WeakMap();
  c.refreshHosts = new WeakMap();
  c.requests = new WeakMap();
  c.executions = new WeakMap();
  c.refreshModel = null;
  c.renderContextModel = cm;
  c.requestModel = rm;
  c.promiseCacheModel = pm;
  rm.renderContextModel = cm;
  rm.base = '';
  pm.reset(c);
}

function root(tenant = 'tenant') {
  return {c: 0, tenant};
}

function host() {
  const details = new WeakMap();
  const pending = new WeakMap();
  const sessions = new WeakMap();
  const h = {
    epoch: {},
    authorizations: 0,
    checks: 0,
    ownershipChecks: 0,
    renders: 0,
    authorize(v, coordinates) {
      this.authorizations++;
      assert.equal(Object.isFrozen(coordinates), true);
      return this.epoch;
    },
    current(v, authority, coordinates) {
      const context = c.context(v);
      this.checks++;
      return authority === this.epoch && Object.isFrozen(coordinates)
        && context && context.tenant === 'tenant';
    },
    session(v, request, authority, coordinates) {
      const detail = details.get(request);
      const token = {};

      assert.ok(detail);
      assert.strictEqual(authority, detail.authority);
      assert.strictEqual(coordinates, detail.coordinates);
      sessions.set(c.context(v), {request, token, authority, coordinates});
      return token;
    },
    owns(v, session, request, authority, coordinates) {
      const value = sessions.get(c.context(v));
      this.ownershipChecks++;
      return authority === this.epoch && !!value
        && value.request === request && value.token === session
        && value.authority === authority && value.coordinates === coordinates;
    },
    render(v, request, coordinates, authority) {
      let reject, resolve;
      const promise = new Promise((a, b) => { resolve = a; reject = b; });
      this.renders++;
      assert.equal(authority, this.epoch);
      assert.equal(Object.isFrozen(coordinates), true);
      details.set(request, {authority, coordinates});
      pending.set(request, {reject, resolve});
      return promise;
    },
    attest(v, request) {
      const value = details.get(request);

      assert.ok(value);
      return this.session(v, request, value.authority, value.coordinates);
    },
    resolve(request) {
      const value = pending.get(request);
      if (value) value.resolve();
    },
    reject(request, error) {
      const value = pending.get(request);
      if (value) value.reject(error);
    },
    revokeSession(v) {
      sessions.delete(c.context(v));
    }
  };
  c.refreshModel = h;
  if (!c.refreshHosts.has(c.order)) c.refreshHosts.set(c.order, h);
  return h;
}

function pair() {
  return c.settlements.get(c.order).values().next().value;
}

test.afterEach(() => {
  pm.clock = nativeClock;
  c.persistenceClock = nativePersistenceClock;
  rm.base = 'test:';
  c.refreshModel = null;
});

test('rendered-fragment SWR defaults off and uses strict fresh/stale/hard boundaries without sliding age', async () => {
  reset(10, 0);
  const h = host();
  const v = root();

  c.set(v, 'en', 'same', 'default', 'OLD');
  v.uiCache.updated = 0;
  now = wallNow = 10;
  const disabled = await c.lookup(v, 'en', 'same', 'default', {});
  assert.equal(disabled.value, null);
  assert.equal(disabled.refresh, undefined);
  assert.equal(h.authorizations, 0, 'zero stale window never enters host authorization');
  assert.deepEqual(c.cache, {}, 'disabled behavior is the existing blocking expiry path');

  reset();
  const active = host();
  const freshRoot = root();
  c.set(freshRoot, 'en', 'same', 'default', 'OLD');
  const retained = c.order.values().next().value;

  now = wallNow = 9;
  const fresh = await c.lookup(freshRoot, 'en', 'same', 'default', {});
  assert.equal(fresh.value, 'OLD');
  assert.equal(fresh.refresh, undefined);
  assert.strictEqual(c.order.values().next().value, retained);

  now = wallNow = 10;
  const stale = await c.lookup(freshRoot, 'en', 'same', 'default', {});
  assert.equal(stale.value, 'OLD');
  assert.equal(Object.isFrozen(stale.refresh), true);
  assert.deepEqual(Reflect.ownKeys(stale.refresh), [], 'capability exposes no coordinates or authority');
  assert.equal(active.authorizations, 1);

  now = wallNow = 14.999;
  const concurrent = await c.lookup(root(), 'en', 'same', 'default', {});
  assert.equal(concurrent.value, 'OLD');
  assert.equal(concurrent.refresh, undefined, 'one exact generation receives one attempt');
  assert.equal(pair().settledAt, 0, 'stale hits never slide the successful publication time');

  now = wallNow = 15;
  const hard = await c.lookup(root(), 'en', 'same', 'default', {});
  assert.equal(hard.value, null, 'age equal to the hard boundary is an ordinary blocking miss');
  assert.equal(hard.refresh, undefined);
  assert.deepEqual(c.cache, {});
});

test('an opaque refresh capability renders through one isolated root and commits exact bytes at lifecycle completion', async () => {
  reset();
  const foreground = root();
  const isolated = root();
  const h = host();

  c.set(foreground, 'en', 'same', 'default', 'OLD');
  foreground.uiCache.updated = 0;
  now = wallNow = 10;
  const stale = await c.lookup(foreground, 'en', 'same', 'default', {});

  assert.equal(c.start(foreground, stale.refresh), true);
  assert.equal(c.activate(foreground, stale.refresh, h.attest(foreground, stale.refresh)), false, 'the stale-serving root cannot execute its own capability');
  assert.equal(c.activate(isolated, stale.refresh, h.attest(isolated, stale.refresh)), true);
  const token = {};
  const execution = await c.lookup(isolated, 'en', 'same', 'default', token);
  assert.equal(execution.value, null, 'the normal cache hook becomes a miss only for the exact execution');
  assert.equal(execution.refresh, undefined);
  const nestedToken = {};
  const nested = await c.lookup(isolated, 'en', 'nested', 'default', nestedToken);
  assert.equal(nested.value, null, 'a different nested coordinate remains an ordinary lookup after target binding');
  c.abort(isolated, nestedToken, new Error('nested test cleanup'));

  now = wallNow = 11;
  c.stage(isolated, 'en', 'same', 'default', 'NEW', token);
  c.complete(isolated, token);

  assert.equal(await c.get(root(), 'en', 'same', 'default'), 'NEW');
  assert.equal(pair().settledAt, 11);
  assert.deepEqual(isolated.uiCache, {updated: 1, revision: 1});
  assert.equal(c.refreshView(isolated), true, 'the isolated after-view can observe its save path');
  c.closeRefreshView(isolated);
  assert.equal(c.refreshView(isolated), false);
  assert.equal(h.renders, 1, 'the exact capability starts one observed host render');
  h.resolve(stale.refresh);
  assert.equal(h.checks, 5, 'reservation, start, activation, execution lookup, and publication revalidate authority');
  assert.equal(h.ownershipChecks, 3, 'activation, execution lookup, and publication revalidate the exact host session');
});

test('refresh failure retains the original generation only to its hard deadline and is never retried', async () => {
  reset();
  const h = host();
  const v = root();
  c.set(v, 'en', 'same', 'default', 'OLD');
  v.uiCache.updated = 0;

  now = wallNow = 10;
  const first = await c.lookup(v, 'en', 'same', 'default', {});
  assert.equal(c.start(v, first.refresh), true);
  const error = new Error('background render failed');
  assert.equal(c.fail(first.refresh, error), true);

  c.ttl = 20;
  now = wallNow = 14;
  const fresh = await c.lookup(root(), 'en', 'same', 'default', {});
  assert.equal(fresh.value, 'OLD');
  assert.equal(fresh.refresh, undefined);
  c.ttl = 10;
  const retained = await c.lookup(root(), 'en', 'same', 'default', {});
  assert.equal(retained.value, 'OLD');
  assert.equal(retained.refresh, undefined);
  assert.equal(h.authorizations, 1, 'failed generation is not attempted again');
  assert.equal(pair().settledAt, 0);
  assert.equal(v.uiCache.updated, 0);

  now = wallNow = 15;
  const hard = await c.lookup(root(), 'en', 'same', 'default', {});
  assert.equal(hard.value, null);
  assert.deepEqual(c.cache, {});
});

test('refresh start requires a literal current decision before invoking host render', async () => {
  for (const mode of ['false', 'truthy', 'throwing']) {
    reset();
    const h = host();
    const admitted = h.epoch;
    const current = h.current;
    const v = root();
    c.set(v, 'en', 'same', 'default', 'OLD');
    now = wallNow = 10;
    const stale = await c.lookup(v, 'en', 'same', 'default', {});

    if (mode === 'false') h.epoch = {};
    if (mode === 'truthy') h.current = () => 1;
    if (mode === 'throwing') h.current = () => { throw new Error('denied'); };
    assert.equal(c.start(v, stale.refresh), false, mode);
    assert.equal(h.renders, 0, mode);

    h.epoch = admitted;
    h.current = current;
    now = wallNow = 14;
    const retained = await c.lookup(root(), 'en', 'same', 'default', {});
    assert.equal(retained.value, 'OLD', mode);
    assert.equal(retained.refresh, undefined, mode);
  }
});

test('host start is exactly once and observes throws, malformed promises, rejection, and incomplete fulfillment', async () => {
  for (const mode of ['throw', 'value', 'reject', 'incomplete']) {
    reset();
    const h = host();
    const foreground = root();
    c.set(foreground, 'en', 'same', 'default', 'OLD');
    foreground.uiCache.updated = 0;
    now = wallNow = 10;
    const stale = await c.lookup(foreground, 'en', 'same', 'default', {});
    const error = new Error(mode);

    if (mode === 'throw') h.render = () => { throw error; };
    if (mode === 'value') h.render = () => ({then() {}});
    if (mode === 'reject') h.render = () => Promise.reject(error);
    if (mode === 'incomplete') h.render = () => Promise.resolve('not-rendered');

    assert.equal(c.start(foreground, stale.refresh), mode === 'reject' || mode === 'incomplete', mode);
    assert.equal(c.start(foreground, stale.refresh), false, mode + ' starts once');
    await Promise.resolve();
    await Promise.resolve();

    now = wallNow = 14;
    const retained = await c.lookup(root(), 'en', 'same', 'default', {});
    assert.equal(retained.value, 'OLD', mode);
    assert.equal(retained.refresh, undefined, mode);
    assert.equal(pair().settledAt, 0, mode);
  }
});

test('active refresh owns hard callers without serving stale, duplicating work, or deadlocking its roots', async () => {
  reset();
  const h = host();
  const foreground = root();
  const isolated = root();
  c.set(foreground, 'en', 'same', 'default', 'OLD');
  foreground.uiCache.updated = 0;
  now = wallNow = 10;
  const stale = await c.lookup(foreground, 'en', 'same', 'default', {});
  assert.equal(c.start(foreground, stale.refresh), true);
  assert.equal(c.activate(isolated, stale.refresh, h.attest(isolated, stale.refresh)), true);
  const executionToken = {};
  assert.equal((await c.lookup(isolated, 'en', 'same', 'default', executionToken)).value, null);

  now = wallNow = 15;
  let settled = false;
  const waiting = c.lookup(root(), 'en', 'same', 'default', {})
    .then(value => { settled = true; return value; });
  await Promise.resolve();
  assert.equal(settled, false, 'an independent hard caller joins the active refresh');
  assert.equal((await c.lookup(foreground, 'en', 'same', 'default', {})).value, null,
    'the stale-triggering root bypasses its own refresh instead of awaiting itself');
  assert.equal(h.renders, 1);

  now = wallNow = 16;
  c.stage(isolated, 'en', 'same', 'default', 'NEW', executionToken);
  c.complete(isolated, executionToken);
  assert.equal((await waiting).value, 'NEW');
  assert.equal(await c.get(root(), 'en', 'same', 'default'), 'NEW');
  h.resolve(stale.refresh);

  reset();
  const failedHost = host();
  const first = root();
  const background = root();
  c.set(first, 'en', 'same', 'default', 'OLD');
  now = wallNow = 10;
  const failing = await c.lookup(first, 'en', 'same', 'default', {});
  assert.equal(c.start(first, failing.refresh), true);
  assert.equal(c.activate(background, failing.refresh, failedHost.attest(background, failing.refresh)), true);
  await c.lookup(background, 'en', 'same', 'default', {});
  now = wallNow = 15;
  const rejected = c.lookup(root(), 'en', 'same', 'default', {});
  const error = new Error('refresh rejected');
  failedHost.reject(failing.refresh, error);
  await assert.rejects(rejected, value => value === error);
  assert.equal((await c.lookup(root(), 'en', 'same', 'default', {})).value, null,
    'the next caller acquires the ordinary blocking lease');
  assert.equal(failedHost.renders, 1);
});

test('hard followers recheck caller scope and the published generation at consumption', async () => {
  for (const invalidation of ['scope', 'authority', 'purge', 'purgeAll', 'newer', 'cache', 'order', 'host', 'init']) {
    reset();
    const h = host();
    const foreground = root();
    const isolated = root();
    const follower = root();
    let initializing;
    c.set(foreground, 'en', 'same', 'default', 'OLD');
    now = wallNow = 10;
    const stale = await c.lookup(foreground, 'en', 'same', 'default', {});
    assert.equal(c.start(foreground, stale.refresh), true);
    assert.equal(c.activate(isolated, stale.refresh, h.attest(isolated, stale.refresh)), true);
    const token = {};
    await c.lookup(isolated, 'en', 'same', 'default', token);

    now = wallNow = 15;
    const waiting = c.lookup(follower, 'en', 'same', 'default', {});
    await Promise.resolve();
    if (invalidation === 'scope') follower.tenant = 'other';

    now = wallNow = 16;
    c.stage(isolated, 'en', 'same', 'default', 'NEW', token);
    c.complete(isolated, token);
    if (invalidation === 'purge') c.purge(foreground, 'en', 'same', 'default');
    if (invalidation === 'purgeAll') c.purgeAll(foreground);
    if (invalidation === 'newer') c.put('en', 'same', 'tenant\0default', 'NEWER');
    if (invalidation === 'cache') c.cache = {};
    if (invalidation === 'order') c.order = new Map();
    if (invalidation === 'host') host();
    if (invalidation === 'init') initializing = c.init();
    if (invalidation === 'authority') h.epoch = {};

    const denied = ['scope', 'authority', 'order', 'host'].includes(invalidation);
    if (denied)
      await assert.rejects(waiting, /Rendered fragment refresh join denied/, invalidation);
    else {
      const result = await waiting;
      assert.equal(result.value, invalidation === 'newer' ? 'NEWER' : null, invalidation);
    }
    if (initializing) await initializing;
    if (invalidation === 'purge') assert.deepEqual(c.cache, {});
    h.resolve(stale.refresh);
  }
});

test('positive windows remain default-deny and malformed policies, zero TTL, and Infinity preserve safe behavior', async () => {
  reset();
  const noHost = root();
  c.set(noHost, 'en', 'same', 'default', 'OLD');
  now = wallNow = 10;
  assert.equal((await c.lookup(noHost, 'en', 'same', 'default', {})).value, null);
  assert.deepEqual(c.cache, {});

  for (const window of [undefined, -1, NaN, Infinity, '5']) {
    reset(10, window);
    host();
    const v = root();
    c.set(v, 'en', 'same', 'default', 'OLD');
    now = wallNow = 10;
    assert.equal((await c.lookup(v, 'en', 'same', 'default', {})).value, null, String(window));
  }

  reset(0, 5);
  host();
  c.set(root(), 'en', 'same', 'default', 'OLD');
  assert.equal((await c.lookup(root(), 'en', 'same', 'default', {})).value, null);

  reset(Infinity, 5);
  host();
  pm.clock = () => { throw new Error('Infinity must not read the process clock'); };
  c.set(root(), 'en', 'same', 'default', 'FOREVER');
  assert.equal((await c.lookup(root(), 'en', 'same', 'default', {})).value, 'FOREVER');

  reset(Number.MAX_SAFE_INTEGER - 2, 10);
  host();
  c.set(root(), 'en', 'same', 'default', 'LARGE');
  now = Number.MAX_SAFE_INTEGER;
  wallNow = Number.MAX_SAFE_INTEGER;
  const large = await c.lookup(root(), 'en', 'same', 'default', {});
  assert.equal(large.value, 'LARGE', 'subtraction-based stale classification avoids boundary addition');
  assert.ok(large.refresh);
});

test('scope, authority, purge, eviction, identity, reset, init, and newer-generation changes detach late publication', async () => {
  for (const invalidation of ['scope', 'authority', 'session', 'host', 'purge', 'purgeAll', 'eviction', 'cache', 'order', 'promiseReset', 'init', 'newer', 'completionScope']) {
    reset();
    const h = host();
    if (invalidation === 'completionScope')
      h.current = (v, authority) => authority === h.epoch;
    const foreground = root();
    const isolated = root();
    c.set(foreground, 'en', 'same', 'default', 'OLD');
    foreground.uiCache.updated = 0;
    now = wallNow = 10;
    const stale = await c.lookup(foreground, 'en', 'same', 'default', {});
    assert.equal(c.start(foreground, stale.refresh), true);
    assert.equal(c.activate(isolated, stale.refresh, h.attest(isolated, stale.refresh)), true);
    const token = {};
    assert.equal((await c.lookup(isolated, 'en', 'same', 'default', token)).value, null);

    if (invalidation === 'scope') isolated.tenant = 'other';
    if (invalidation === 'authority') h.epoch = {};
    if (invalidation === 'session') h.revokeSession(isolated);
    if (invalidation === 'host') host();
    if (invalidation === 'purge') c.purge(foreground, 'en', 'same', 'default');
    if (invalidation === 'purgeAll') c.purgeAll(foreground);
    if (invalidation === 'eviction') {
      c.max = 1;
      c.set(foreground, 'en', 'other', 'default', 'OTHER');
    }
    if (invalidation === 'cache') c.cache = {};
    if (invalidation === 'order') c.order = new Map();
    if (invalidation === 'promiseReset') pm.reset(c, c.order);
    if (invalidation === 'init') await c.init();
    if (invalidation === 'newer') {
      now = wallNow = 11;
      assert.equal(c.put('en', 'same', 'tenant\0default', 'NEWER'), true);
    }
    if (invalidation === 'purgeAll') {
      assert.equal(c.requests.has(stale.refresh), false, 'purge-all closes the capability');
      assert.equal(c.refreshes.get(c.order)?.size || 0, 0, 'purge-all detaches the refresh');
    }

    now = wallNow = 12;
    c.stage(isolated, 'en', 'same', 'default', 'LATE', token);
    if (invalidation === 'completionScope') isolated.tenant = 'other';
    c.complete(isolated, token);

    if (invalidation === 'newer')
      assert.equal(await c.get(root(), 'en', 'same', 'default'), 'NEWER', invalidation);
    else
      assert.notEqual(await c.get(root(), 'en', 'same', 'default'), 'LATE', invalidation);
  }
});

test('publication and root-local dirty state roll back together after a mid-transaction dirty failure', async () => {
  reset();
  const h = host();
  const foreground = root();
  const target = {updated: 0, revision: 0};
  const isolated = root();
  isolated.uiCache = new Proxy(target, {
    set() { throw new Error('dirty write failed'); }
  });

  c.set(foreground, 'en', 'same', 'default', 'OLD');
  foreground.uiCache.updated = 0;
  now = wallNow = 10;
  const stale = await c.lookup(foreground, 'en', 'same', 'default', {});
  assert.equal(c.start(foreground, stale.refresh), true);
  assert.equal(c.activate(isolated, stale.refresh, h.attest(isolated, stale.refresh)), true);
  const token = {};
  await c.lookup(isolated, 'en', 'same', 'default', token);
  now = wallNow = 11;
  c.stage(isolated, 'en', 'same', 'default', 'NEW', token);
  c.complete(isolated, token);

  assert.equal((await c.lookup(root(), 'en', 'same', 'default', {})).value, 'OLD');
  assert.equal(pair().settledAt, 0);
  assert.deepEqual(target, {updated: 0, revision: 0});
});

test('capabilities are one-shot and pre-activation invalidation cannot be replayed onto another root', async () => {
  reset();
  const h = host();
  const foreground = root();
  const isolated = root();
  c.set(foreground, 'en', 'same', 'default', 'OLD');
  now = wallNow = 10;
  const stale = await c.lookup(foreground, 'en', 'same', 'default', {});
  assert.equal(c.start(foreground, stale.refresh), true);
  assert.equal(c.start(foreground, stale.refresh), false, 'host render starts exactly once');
  c.cache = {};
  assert.equal(c.activate(isolated, stale.refresh, h.attest(isolated, stale.refresh)), false);

  reset();
  const currentHost = host();
  const first = root();
  const execution = root();
  c.set(first, 'en', 'same', 'default', 'OLD');
  now = wallNow = 10;
  const current = await c.lookup(first, 'en', 'same', 'default', {});
  c.start(first, current.refresh);
  const session = currentHost.attest(execution, current.refresh);
  assert.equal(c.activate(execution, current.refresh, session), true);
  assert.equal(c.activate(root(), current.refresh, currentHost.attest(root(), current.refresh)), false);
  const token = {};
  await c.lookup(execution, 'en', 'same', 'default', token);
  c.stage(execution, 'en', 'same', 'default', 'NEW', token);
  c.complete(execution, token);
  assert.equal(c.activate(execution, current.refresh, session), false, 'completion closes replay');
  currentHost.resolve(current.refresh);
});

test('stamp and settlement failures restore exact bytes, process stamp, pair, recency, and dirty state', async () => {
  for (const failure of ['stamp', 'pair']) {
    reset();
    const h = host();
    const foreground = root();
    const isolated = root();
    isolated.uiCache = {updated: 0, revision: 7};
    const beforeDirty = isolated.uiCache;
    const beforeDirtyDescriptor = Object.getOwnPropertyDescriptor(isolated, 'uiCache');
    const beforeDirtyValue = {...beforeDirty};
    c.set(foreground, 'en', 'same', 'default', 'OLD');
    foreground.uiCache.updated = 0;
    const beforeOrder = [...c.order.entries()];
    const beforePair = pair();
    const beforeStamp = pm.record(c.order, beforeOrder[0][0], beforeOrder[0][1]);
    now = wallNow = 10;
    const stale = await c.lookup(foreground, 'en', 'same', 'default', {});
    c.start(foreground, stale.refresh);
    c.activate(isolated, stale.refresh, h.attest(isolated, stale.refresh));
    const token = {};
    await c.lookup(isolated, 'en', 'same', 'default', token);

    const stamp = pm.stamp;
    if (failure === 'stamp') pm.stamp = () => false;
    if (failure === 'pair') {
      const original = c.settlements.get(c.order);
      let once = 0;
      class FailingMap extends Map {
        set(key, value) {
          if (once) { once = 0; throw new Error('pair write failed'); }
          return super.set(key, value);
        }
      }
      const failing = new FailingMap(original);
      once = 1;
      c.settlements.set(c.order, failing);
    }
    try {
      now = wallNow = 11;
      c.stage(isolated, 'en', 'same', 'default', 'NEW', token);
      c.complete(isolated, token);
    } finally {
      pm.stamp = stamp;
    }

    assert.equal((await c.lookup(root(), 'en', 'same', 'default', {})).value, 'OLD', failure);
    assert.deepEqual([...c.order.entries()], beforeOrder, failure);
    assert.strictEqual(c.settlements.get(c.order).values().next().value, beforePair, failure);
    assert.strictEqual(pm.record(c.order, beforeOrder[0][0], beforeOrder[0][1]), beforeStamp, failure);
    assert.deepEqual(Object.getOwnPropertyDescriptor(isolated, 'uiCache'), beforeDirtyDescriptor, failure);
    assert.strictEqual(isolated.uiCache, beforeDirty, failure);
    assert.deepEqual(isolated.uiCache, beforeDirtyValue, failure);
  }
});

test('a blocking render lease cannot overwrite a newer public generation', async () => {
  reset(10, 0);
  const leader = root();
  const token = {};

  assert.equal(await c.get(leader, 'en', 'same', 'default', token), null);
  now = wallNow = 1;
  assert.equal(c.put('en', 'same', 'tenant\0default', 'NEWER'), true);
  c.stage(leader, 'en', 'same', 'default', 'OLDER', token);
  c.complete(leader, token);

  assert.equal(await c.get(root(), 'en', 'same', 'default'), 'NEWER');
});

test('a post-init host replacement cannot reserve a restored stale generation', async () => {
  reset();
  now = wallNow = 10;
  c.saveModel = {uiCacheScoped: true, get() { return {version: 1, fragments: [{
    language: 'en', cid: 'same', variant: 'tenant\0default', html: 'OLD', settledAt: 0
  }]}; }};
  const admitted = host();
  await c.init();
  const replacement = host();
  const result = await c.lookup(root(), 'en', 'same', 'default', {});

  assert.equal(result.value, null);
  assert.equal(result.refresh, undefined);
  assert.equal(admitted.authorizations, 0);
  assert.equal(replacement.authorizations, 0);
  assert.deepEqual(c.cache, {});
});

test('wire v1 restores original stale age as a new process-local generation and stays cold at hard age', async () => {
  const wire = {
    version: 1,
    fragments: [{
      language: 'en',
      cid: 'same',
      variant: 'tenant\0default',
      html: 'OLD',
      settledAt: 0
    }]
  };

  for (const unavailable of ['absent', 'malformed', 'changed']) {
    reset();
    now = wallNow = 10;
    if (unavailable === 'malformed') c.refreshModel = {};
    if (unavailable === 'changed') {
      let release;
      host();
      c.saveModel = {
        uiCacheScoped: true,
        get() { return new Promise(resolve => { release = resolve; }); }
      };
      const loading = c.init();
      host();
      release(wire);
      await loading;
    } else {
      c.saveModel = {uiCacheScoped: true, get() { return wire; }};
      await c.init();
    }
    assert.deepEqual(c.cache, {}, unavailable);
    assert.equal(c.order.size, 0, unavailable);
  }

  reset();
  now = wallNow = 10;
  c.saveModel = {uiCacheScoped: true, get() { return wire; }};
  const h = host();
  await c.init();
  const stale = await c.lookup(root(), 'en', 'same', 'default', {});
  assert.equal(stale.value, 'OLD');
  assert.ok(stale.refresh);
  assert.equal(pair().settledAt, 0);

  reset();
  now = wallNow = 15;
  c.saveModel = {uiCacheScoped: true, get() { return wire; }};
  await c.init();
  assert.deepEqual(c.cache, {});
  assert.equal(c.order.size, 0);
});
