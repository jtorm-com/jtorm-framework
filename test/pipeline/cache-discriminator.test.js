'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render, WIRED_PLUGINS } = require('../helpers/engine.js');
const { jTormUiCacheModel } = require('../../src/models/ui-cache-model/src/ui-cache-model.js');
const { jTormDataModel } = require('../../src/models/data-model/src/data-model.js');

const unscoped = () => ({c: 0, s: null, a: null});
const scoped = tenant => ({c: 0, s: null, a: null, request: {tenant}});
test.afterEach(() => {
  jTormUiCacheModel.saveModel = null;
});

test('same-identity unscoped get renders observe fresh fetched content across shared-cache reuse', async () => {
  const tss = ".a->get { d: '/same.json'; span->inner { h: value; } }";
  const first = await render(
    '<body><div class="a"><span></span></div></body>', tss, {},
    'http://localhost/', {'/same.json': {json: {value: 'A'}}}, unscoped()
  );
  const second = await render(
    '<body><div class="a"><span></span></div></body>', tss, {},
    'http://localhost/', {'/same.json': {json: {value: 'B'}}}, unscoped(), null, 0,
    {reuseSharedCaches: true}
  );

  assert.equal(first.body, '<div class="a"><span>A</span></div>');
  assert.equal(second.body, '<div class="a"><span>B</span></div>');
  assert.deepEqual(first.requests, ['/same.json']);
  assert.deepEqual(second.requests, ['/same.json']);
});

test('same-identity unscoped fragment renders observe fresh output across shared-cache reuse', async () => {
  const first = await render(
    '<div></div>', "div->append { cid: 'same'; ->inner { t: 'A'; } }", {},
    'http://localhost/', null, unscoped()
  );
  const second = await render(
    '<div></div>', "div->append { cid: 'same'; ->inner { t: 'B'; } }", {},
    'http://localhost/', null, unscoped(), null, 0, {reuseSharedCaches: true}
  );

  assert.equal(first.body, '<div>A</div>');
  assert.equal(second.body, '<div>B</div>');
  assert.deepEqual(jTormUiCacheModel.cache, {});
  assert.equal(jTormUiCacheModel.order.size, 0);
  assert.equal(jTormUiCacheModel.settlements.get(jTormUiCacheModel.order), undefined);
});

test('explicitly scoped warm renders retain byte output and fetch-cache reuse', async () => {
  const tss = ".a->get { d: '/same.json'; span->inner { h: value; } }";
  const first = await render(
    '<body><div class="a"><span></span></div></body>', tss, {},
    'http://localhost/', {'/same.json': {json: {value: 'A'}}}, scoped('tenant-a')
  );
  const second = await render(
    '<body><div class="a"><span></span></div></body>', tss, {},
    'http://localhost/', {'/same.json': {json: {value: 'B'}}}, scoped('tenant-a'), null, 0,
    {reuseSharedCaches: true}
  );

  assert.equal(second.html, first.html);
  assert.equal(second.body, first.body);
  assert.deepEqual(first.requests, ['/same.json']);
  assert.deepEqual(second.requests, []);
});

test('an explicit fragment language survives detached rendering and keeps its warm identity', async () => {
  const first = await render(
    '<div></div>', "div->append { l: 'en'; cid: 'same'; ->inner { t: 'A'; } }", {},
    'http://localhost/', null, scoped('tenant-a')
  );
  const second = await render(
    '<div></div>', "div->append { l: 'en'; cid: 'same'; ->inner { t: 'B'; } }", {},
    'http://localhost/', null, scoped('tenant-a'), null, 0, {reuseSharedCaches: true}
  );

  assert.equal(first.body, '<div>A</div>');
  assert.equal(second.body, first.body);
  assert.equal(jTormUiCacheModel.cache.en.same['tenant-a\0default'], 'A');
});

test('an unscoped handler failure after a cid render leaves no fragment state', async () => {
  await assert.rejects(
    () => render(
      '<body><div></div><span></span></body>',
      "div->append { cid: 'same'; ->inner { t: 'A'; } } span->notRegistered { x: '1'; }",
      {}, 'http://localhost/', null, unscoped()
    )
  );
  assert.deepEqual(jTormUiCacheModel.cache, {});
  assert.equal(jTormUiCacheModel.order.size, 0);
  assert.equal(jTormUiCacheModel.settlements.get(jTormUiCacheModel.order), undefined);
});

test('an unscoped event failure after UI-cache ordering leaves no fragment state', async () => {
  const plugin = {
    event: {after: {iteration: {weight: 100}}},
    afterIteration() { throw new Error('event failure'); }
  };
  WIRED_PLUGINS.push(plugin);

  try {
    await assert.rejects(
      () => render(
        '<div></div>', "div->append { cid: 'same'; ->inner { t: 'A'; } }", {},
        'http://localhost/', null, unscoped()
      ),
      /event failure/
    );
    assert.deepEqual(jTormUiCacheModel.cache, {});
    assert.equal(jTormUiCacheModel.order.size, 0);
    assert.equal(jTormUiCacheModel.settlements.get(jTormUiCacheModel.order), undefined);
  } finally {
    WIRED_PLUGINS.pop();
  }
});

test('a scoped event failure after UI staging publishes no fragment', async () => {
  const plugin = {
    event: {after: {iteration: {weight: 100}}},
    afterIteration() { throw new Error('event failure'); }
  };
  WIRED_PLUGINS.push(plugin);

  try {
    await assert.rejects(
      () => render(
        '<div></div>', "div->append { cid: 'same'; ->inner { t: 'A'; } }", {},
        'http://localhost/', null, scoped('tenant-a')
      ),
      /event failure/
    );
    assert.deepEqual(jTormUiCacheModel.cache, {});
    assert.equal(jTormUiCacheModel.order.size, 0);
    assert.equal(jTormUiCacheModel.settlements.get(jTormUiCacheModel.order), undefined);
  } finally {
    WIRED_PLUGINS.pop();
  }
});

test('a scoped completion-hook failure after UI preparation publishes no fragment', async () => {
  const plugin = {
    event: {after: {iteration: {weight: 100}}},
    afterIteration() {},
    completeIteration() { throw new Error('completion failure'); }
  };
  WIRED_PLUGINS.push(plugin);

  try {
    await assert.rejects(
      () => render(
        '<div></div>', "div->append { cid: 'same'; ->inner { t: 'A'; } }", {},
        'http://localhost/', null, scoped('tenant-a')
      ),
      /completion failure/
    );
    assert.deepEqual(jTormUiCacheModel.cache, {});
    assert.equal(jTormUiCacheModel.order.size, 0);
    assert.equal(jTormUiCacheModel.settlements.get(jTormUiCacheModel.order), undefined);
  } finally {
    WIRED_PLUGINS.pop();
  }
});

test('an explicitly scoped warm pipeline is byte-stable before TTL, refreshes fetched and rendered content at the boundary, and refreshes after purge', async () => {
  let now = 0;
  const clock = () => now;
  const options = {reuseSharedCaches: true, clock, ttl: 10};
  const tss = "div->append { cid: 'frag'; body->get { d: '/same.json'; ->inner { h: value; } } }";

  const first = await render(
    '<body><div></div></body>', tss, {}, 'http://localhost/',
    {'/same.json': {json: {value: 'A'}}}, scoped('tenant-a'), null, 0,
    {clock, ttl: 10}
  );
  now = 9;
  const warm = await render(
    '<body><div></div></body>', tss, {}, 'http://localhost/',
    {'/same.json': {json: {value: 'B'}}}, scoped('tenant-a'), null, 0, options
  );

  assert.equal(warm.html, first.html);
  assert.equal(warm.body, first.body);
  assert.equal(first.body, '<div>A</div>');
  assert.deepEqual(first.requests, ['/same.json']);
  assert.deepEqual(warm.requests, []);

  now = 10;
  const boundary = await render(
    '<body><div></div></body>', tss, {}, 'http://localhost/',
    {'/same.json': {json: {value: 'B'}}}, scoped('tenant-a'), null, 0, options
  );
  assert.equal(boundary.body, '<div>B</div>');
  assert.deepEqual(boundary.requests, ['/same.json']);

  const context = scoped('tenant-a');
  assert.equal(jTormDataModel.purge('/same.json', context), 1);
  assert.equal(jTormUiCacheModel.purge(context, null, 'frag', 'default'), 1);
  const purged = await render(
    '<body><div></div></body>', tss, {}, 'http://localhost/',
    {'/same.json': {json: {value: 'C'}}}, scoped('tenant-a'), null, 0, options
  );
  assert.equal(purged.body, '<div>C</div>');
  assert.deepEqual(purged.requests, ['/same.json']);
});
test('scoped request-triggered SWR serves stale once, refreshes in the background, and stays isolated from unscoped renders', async () => {
  let now = 0;
  const clock = () => now;
  const options = {reuseSharedCaches: true, clock, ttl: 10, staleWindow: 10};
  const tss = ".a->get { d: '/same.json'; span->inner { h: value; } }";
  const html = '<body><div class="a"><span></span></div></body>';

  const first = await render(
    html, tss, {}, 'http://localhost/',
    {'/same.json': {json: {value: 'A'}}}, scoped('tenant-a'), null, 0,
    {clock, ttl: 10, staleWindow: 10}
  );
  now = 10;
  const stale = await render(
    html, tss, {}, 'http://localhost/',
    {'/same.json': {json: {value: 'B'}}}, scoped('tenant-a'), null, 0, options
  );
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(first.body, '<div class="a"><span>A</span></div>');
  assert.equal(stale.body, first.body);
  assert.deepEqual(first.requests, ['/same.json']);
  assert.deepEqual(stale.requests, ['/same.json']);

  now = 11;
  const fresh = await render(
    html, tss, {}, 'http://localhost/',
    {'/same.json': {json: {value: 'C'}}}, scoped('tenant-a'), null, 0, options
  );
  const untrusted = await render(
    html, tss, {}, 'http://localhost/',
    {'/same.json': {json: {value: 'C'}}}, unscoped(), null, 0, options
  );
  const stillScoped = await render(
    html, tss, {}, 'http://localhost/',
    {'/same.json': {json: {value: 'D'}}}, scoped('tenant-a'), null, 0, options
  );

  assert.equal(fresh.body, '<div class="a"><span>B</span></div>');
  assert.deepEqual(fresh.requests, []);
  assert.equal(untrusted.body, '<div class="a"><span>C</span></div>');
  assert.deepEqual(untrusted.requests, ['/same.json']);
  assert.equal(stillScoped.body, fresh.body);
  assert.deepEqual(stillScoped.requests, []);
});

test('a stale acquisition can publish a newer derived fragment that acquisition purge alone cannot revoke', async () => {
  let now = 0;
  const clock = () => now;
  const context = scoped('tenant-a');
  const store = {uiCacheScoped: true, value: null, set(value) { this.value = value; }};
  const options = {
    reuseSharedCaches: true, clock, persistenceClock: clock, ttl: 10, staleWindow: 10,
    uiCacheStore: store
  };
  const tss = "div->append { cid: 'frag'; body->get { d: '/same.json'; ->inner { h: value; } } }";
  const html = '<body><div></div></body>';

  await render(
    html, tss, {}, 'http://localhost/',
    {'/same.json': {json: {value: 'A'}}}, context, null, 0,
    {clock, persistenceClock: clock, ttl: 10, staleWindow: 10, uiCacheStore: store}
  );
  now = 10;
  const stale = await render(
    html, tss, {}, 'http://localhost/',
    {'/same.json': {json: {value: 'B'}}}, context, null, 0, options
  );
  await new Promise(resolve => setImmediate(resolve));

  const settlements = jTormUiCacheModel.settlements.get(jTormUiCacheModel.order);
  assert.equal(stale.body, '<div>A</div>');
  assert.deepEqual(stale.requests, ['/same.json']);
  assert.equal(jTormUiCacheModel.cache.null.frag['tenant-a\0default'], 'A');
  assert.deepEqual([...settlements.values()].map(r => r.settledAt), [10]);
  assert.equal(store.value.fragments[0].html, 'A');
  assert.equal(store.value.fragments[0].settledAt, 10);

  assert.equal(jTormDataModel.purge('/same.json', context), 1);
  now = 11;
  const retained = await render(
    html, tss, {}, 'http://localhost/',
    {'/same.json': {json: {value: 'C'}}}, context, null, 0, options
  );
  assert.equal(retained.body, '<div>A</div>');
  assert.deepEqual(retained.requests, []);

  assert.equal(jTormUiCacheModel.purge(context, null, 'frag', 'default'), 1);
  const cleared = await render(
    html, tss, {}, 'http://localhost/',
    {'/same.json': {json: {value: 'C'}}}, context, null, 0, options
  );
  assert.equal(cleared.body, '<div>C</div>');
  assert.deepEqual(cleared.requests, ['/same.json']);
});
