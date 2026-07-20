'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormUiCacheModel: c } = require('../../src/models/ui-cache-model/src/ui-cache-model.js');
const { jTormUiCachePlugin: p } = require('../../src/plugins/ui-cache-plugin/src/ui-cache-plugin.js');
const { jTormHandlerWrapper: w } = require('../../src/handlers/handler-wrapper/src/handler-wrapper.js');
const { jTormEventModel: e } = require('../../src/models/event-model/src/event-model.js');
const { jTormRenderContextModel: cm } = require('../../src/models/render-context-model/src/render-context-model.js');
const { jTormRequestModel: rm } = require('../../src/models/request-model/src/request-model.js');
const { jTormPromiseCacheModel: pm } = require('../../src/models/promise-cache-model/src/promise-cache-model.js');

const nativeClock = pm.clock;
const nativePersistenceClock = c.persistenceClock;

function events() {
  return {
    before: {iteration: [], method: [], view: []},
    after: {iteration: [], method: [], view: []}
  };
}

function fragment(value) {
  return {
    value,
    body() { return this.value; }
  };
}

function setup(saveError, handlerError, afterViewError) {
  let now = 0;
  let releaseRender;
  let releaseSave;
  let observeSave;
  const renderGate = new Promise(resolve => { releaseRender = resolve; });
  const saveStarted = new Promise(resolve => { observeSave = resolve; });
  const details = new WeakMap();
  const sessions = new WeakMap();
  const state = {
    afterViews: 0,
    afterIterations: 0,
    abortIterations: 0,
    beforeViews: 0,
    completions: 0,
    renders: 0,
    saves: 0,
    saveSettled: false
  };
  const store = {
    uiCacheScoped: true,
    value: null,
    set(value) {
      state.saves++;
      observeSave();
      this.value = value;
      if (saveError) return Promise.reject(saveError);
      return new Promise(resolve => {
        releaseSave = () => {
          state.saveSettled = true;
          resolve();
        };
      });
    }
  };
  const effectPlugin = {
    event: {
      before: {view: {weight: 0}},
      after: {iteration: {weight: 0}, view: {weight: 0}}
    },
    beforeView(v) {
      c.context(v).beforeViews = (c.context(v).beforeViews || 0) + 1;
      state.beforeViews++;
    },
    afterView(v) {
      c.context(v).afterViews = (c.context(v).afterViews || 0) + 1;
      state.afterViews++;
      if (afterViewError) throw afterViewError;
    },
    afterIteration(v) {
      c.context(v).afterIterations = (c.context(v).afterIterations || 0) + 1;
      state.afterIterations++;
    },
    completeIteration(v) {
      c.context(v).completions = (c.context(v).completions || 0) + 1;
      state.completions++;
    },
    abortIteration(v) {
      c.context(v).abortIterations = (c.context(v).abortIterations || 0) + 1;
      state.abortIterations++;
    }
  };
  const rule = {c: [], s: null};
  const host = {
    epoch: {},
    promise: null,
    isolated: null,
    authorize() { return this.epoch; },
    current(v, authority, coordinates) {
      const context = c.context(v);
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
      return authority === this.epoch && !!value
        && value.request === request && value.token === session
        && value.authority === authority && value.coordinates === coordinates;
    },
    revokeSession(v) {
      sessions.delete(c.context(v));
    },
    render(v, request, coordinates, authority) {
      const context = {c: 0, tenant: 'tenant'};
      const isolated = {
        c: context,
        cid: 'same',
        cs: 'default',
        l: 'en',
        m: {},
        r: null,
        h: fragment('TEMPLATE')
      };
      state.renders++;
      this.isolated = isolated;
      this.request = request;
      this.authority = authority;
      this.coordinates = coordinates;
      details.set(request, {authority, coordinates});
      assert.equal(c.activate(isolated, request,
        this.session(isolated, request, authority, coordinates)), true);
      this.promise = (async () => {
        await renderGate;
        await e.handle(isolated, 'before', 'view');
        const value = await w.handle('TEMPLATE', rule, {}, isolated);
        const after = Object.assign({}, isolated, {h: fragment(value)});
        await e.handle(after, 'after', 'view');
        return value;
      })();
      return this.promise;
    }
  };

  pm.clock = () => now;
  c.persistenceClock = () => now;
  c.cache = {};
  c.order = new Map();
  c.max = 8;
  c.ttl = 10;
  c.staleWindow = 5;
  c.updated = 0;
  c.revision = 0;
  c.saveModel = store;
  c.flights = new WeakMap();
  c.iterations = new WeakMap();
  c.stores = new WeakMap();
  c.settlements = new WeakMap();
  c.persistenceObserved = new WeakMap();
  c.refreshes = new WeakMap();
  c.requests = new WeakMap();
  c.refreshHosts = new WeakMap();
  c.executions = new WeakMap();
  c.renderContextModel = cm;
  c.requestModel = rm;
  c.promiseCacheModel = pm;
  c.refreshModel = host;
  rm.renderContextModel = cm;
  c.refreshHosts.set(c.order, host);
  rm.base = '';
  pm.reset(c);

  p.uiCacheModel = c;
  p.refreshModel = host;
  e.event = events();
  e.plugins = [p, effectPlugin];
  e.init();
  w.eventModel = e;
  w.viewModel = {
    async create(value, tss, model, context) {
      return {
        c: context,
        cid: null,
        cs: null,
        l: null,
        m: model,
        r: null,
        tss,
        h: fragment(value)
      };
    }
  };
  w.handler = {
    async handle(a, b, d, q, v) {
      const context = c.context(v);
      context.effects = (context.effects || 0) + 1;
      v.h.value = 'NEW';
      if (handlerError) throw handlerError;
      return 'NEW';
    }
  };

  return {
    host,
    releaseRender,
    releaseSave: () => releaseSave && releaseSave(),
    saveStarted,
    setNow(value) { now = value; },
    state,
    store
  };
}

test.afterEach(() => {
  pm.clock = nativeClock;
  c.persistenceClock = nativePersistenceClock;
  c.refreshModel = null;
  c.saveModel = null;
  p.refreshModel = null;
  rm.base = 'test:';
});

test('the plugin returns stale bytes immediately while one isolated full lifecycle publishes and observes save', async () => {
  const s = setup();
  const foreground = {
    c: {c: 0, tenant: 'tenant'},
    cid: 'same',
    cs: 'default',
    l: 'en',
    m: {},
    r: null,
    h: fragment('TEMPLATE')
  };

  c.set(foreground, 'en', 'same', 'default', 'OLD');
  foreground.c.uiCache.updated = 0;
  s.setNow(10);
  const served = await w.handle('TEMPLATE', {c: [], s: null}, {}, foreground);

  assert.equal(served, 'OLD');
  assert.equal(s.state.renders, 1, 'the host starts synchronously exactly once');
  assert.equal(foreground.c.effects, undefined, 'foreground state never executes background effects');
  assert.equal(s.host.isolated.c.effects, undefined, 'isolated effects wait behind the host lifetime gate');

  s.setNow(11);
  s.releaseRender();
  await s.saveStarted;
  assert.equal(s.host.isolated.c.effects, 1);
  assert.equal(s.host.isolated.c.beforeViews, 1);
  assert.equal(s.host.isolated.c.afterViews, 1);
  assert.equal(s.state.saves, 1);
  assert.equal(s.state.saveSettled, false);

  let finished = false;
  s.host.promise.then(() => { finished = true; });
  await Promise.resolve();
  assert.equal(finished, false, 'the isolated after-view keeps the host promise pending on persistence');
  s.releaseSave();
  assert.equal(await s.host.promise, 'NEW');
  assert.equal(await c.get({c: 0, tenant: 'tenant'}, 'en', 'same', 'default'), 'NEW');
  assert.equal(s.store.value.fragments[0].html, 'NEW');
  assert.equal(s.store.value.fragments[0].settledAt, 11);
  assert.equal(c.refreshView(s.host.isolated), false, 'the after-view closes its execution state');
});

test('isolated after-view save rejection is observed without rolling back live publication', async () => {
  const error = new Error('adapter offline');
  const s = setup(error);
  const foreground = {
    c: {c: 0, tenant: 'tenant'},
    cid: 'same',
    cs: 'default',
    l: 'en',
    m: {},
    r: null,
    h: fragment('TEMPLATE')
  };

  c.set(foreground, 'en', 'same', 'default', 'OLD');
  foreground.c.uiCache.updated = 0;
  s.setNow(10);
  assert.equal(await w.handle('TEMPLATE', {c: [], s: null}, {}, foreground), 'OLD');
  s.setNow(11);
  s.releaseRender();
  await assert.rejects(s.host.promise, value => value === error);

  assert.equal(await c.get({c: 0, tenant: 'tenant'}, 'en', 'same', 'default'), 'NEW');
  assert.equal(s.host.isolated.c.uiCache.updated, 1, 'adapter failure retains explicit retry state');
  assert.equal(c.refreshView(s.host.isolated), false);
});

test('after-view failure before cache save closes a completed refresh without rollback', async () => {
  const error = new Error('later after-view failed');
  const s = setup(null, null, error);
  const foreground = {
    c: {c: 0, tenant: 'tenant'},
    cid: 'same',
    cs: 'default',
    l: 'en',
    m: {},
    r: null,
    h: fragment('TEMPLATE')
  };

  c.set(foreground, 'en', 'same', 'default', 'OLD');
  foreground.c.uiCache.updated = 0;
  s.setNow(10);
  assert.equal(await w.handle('TEMPLATE', {c: [], s: null}, {}, foreground), 'OLD');
  s.setNow(11);
  s.releaseRender();
  await assert.rejects(s.host.promise, value => value === error);

  assert.equal(await c.get({c: 0, tenant: 'tenant'}, 'en', 'same', 'default'), 'NEW');
  assert.equal(s.host.isolated.c.uiCache.updated, 1, 'published dirty state remains retryable');
  assert.equal(s.state.saves, 0, 'the later cache save hook never ran');
  assert.equal(c.refreshView(s.host.isolated), false, 'the failed host lifecycle closes the completed execution');
  assert.equal(c.executions.has(s.host.isolated.c), false);
});

test('revoked isolated execution aborts before handler effects or publication', async () => {
  for (const mode of ['scope', 'unscoped', 'malformed', 'cyclic', 'cid', 'language', 'variant', 'authority', 'session']) {
    const s = setup();
    const foreground = {
      c: {c: 0, tenant: 'tenant'},
      cid: 'same',
      cs: 'default',
      l: 'en',
      m: {},
      r: null,
      h: fragment('TEMPLATE')
    };

    c.set(foreground, 'en', 'same', 'default', 'OLD');
    foreground.c.uiCache.updated = 0;
    s.setNow(10);
    assert.equal(await w.handle('TEMPLATE', {c: [], s: null}, {}, foreground), 'OLD');
    if (mode === 'scope') s.host.isolated.c.tenant = 'other';
    if (mode === 'unscoped') delete s.host.isolated.c.tenant;
    if (mode === 'malformed') s.host.isolated.c.tenant = {};
    if (mode === 'cyclic') {
      const tenant = {};
      tenant.self = tenant;
      s.host.isolated.c.tenant = tenant;
    }
    if (mode === 'cid') s.host.isolated.cid = 'other';
    if (mode === 'language') s.host.isolated.l = 'fr';
    if (mode === 'variant') s.host.isolated.cs = 'other';
    if (mode === 'authority') s.host.epoch = {};
    if (mode === 'session') s.host.revokeSession(s.host.isolated);

    s.releaseRender();
    await assert.rejects(s.host.promise, /Rendered fragment refresh execution denied/, mode);

    assert.equal(s.host.isolated.c.effects, undefined, mode + ' never reaches the handler');
    assert.equal(s.host.isolated.c.abortIterations, 1, mode + ' aborts the denied iteration');
    assert.equal(s.state.saves, 0, mode);
    assert.equal(s.state.afterViews, 0, mode);
    assert.equal(c.cache.en.same['tenant' + c.sep + 'default'], 'OLD', mode);
  }
});

test('an effectful isolated handler failure aborts the real wrapper lease and preserves the exact old generation', async () => {
  const error = new Error('isolated handler failed');
  const s = setup(null, error);
  const foreground = {
    c: {c: 0, tenant: 'tenant'},
    cid: 'same',
    cs: 'default',
    l: 'en',
    m: {},
    r: null,
    h: fragment('TEMPLATE')
  };

  c.set(foreground, 'en', 'same', 'default', 'OLD');
  foreground.c.uiCache.updated = 0;
  const beforeDirty = foreground.c.uiCache;
  const beforeDirtyValue = {...beforeDirty};
  const beforeOrder = c.order.values().next().value;
  const beforePair = c.settlements.get(c.order).values().next().value;
  const beforeStamp = pm.record(c.order, c.order.keys().next().value, beforeOrder);
  s.setNow(10);
  assert.equal(await w.handle('TEMPLATE', {c: [], s: null}, {}, foreground), 'OLD');

  s.setNow(11);
  s.releaseRender();
  await assert.rejects(s.host.promise, value => value === error);
  await Promise.resolve();

  assert.equal(s.host.isolated.c.effects, 1, 'the isolated handler executed before failing');
  assert.equal(s.host.isolated.c.beforeViews, 1);
  assert.equal(s.host.isolated.c.afterIterations, undefined);
  assert.equal(s.host.isolated.c.completions, undefined);
  assert.equal(s.host.isolated.c.abortIterations, 1, 'the wrapper invoked the real iteration abort seam');
  assert.equal(s.state.afterIterations, 1, 'only the stale-serving foreground completed after-iteration');
  assert.equal(s.state.completions, 1, 'only the stale-serving foreground reached completion');
  assert.equal(s.state.afterViews, 0);
  assert.equal(s.state.saves, 0);
  assert.strictEqual(c.order.values().next().value, beforeOrder);
  assert.strictEqual(c.settlements.get(c.order).values().next().value, beforePair);
  assert.strictEqual(pm.record(c.order, c.order.keys().next().value, beforeOrder), beforeStamp);
  assert.equal(c.cache.en.same['tenant' + c.sep + 'default'], 'OLD');
  assert.strictEqual(foreground.c.uiCache, beforeDirty);
  assert.deepEqual(foreground.c.uiCache, beforeDirtyValue);
  assert.equal(Object.getOwnPropertyDescriptor(s.host.isolated.c, 'uiCache'), undefined);
  assert.equal(c.refreshView(s.host.isolated), false);
  const replayRoot = {c: 0, tenant: 'tenant'};
  const replaySession = s.host.session(replayRoot, s.host.request,
    s.host.authority, s.host.coordinates);
  assert.equal(c.activate(replayRoot, s.host.request, replaySession), false);

  s.setNow(15);
  const hard = await c.lookup({c: 0, tenant: 'tenant'}, 'en', 'same', 'default', {});
  assert.equal(hard.value, null, 'hard callers never receive stale after the failed attempt');
  assert.deepEqual(c.cache, {});
});
