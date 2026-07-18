'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render, WIRED_PLUGINS } = require('../helpers/engine.js');
const { jTormUiCacheModel } = require('../../src/models/ui-cache-model/src/ui-cache-model.js');

const unscoped = () => ({c: 0, s: null, a: null});
const scoped = tenant => ({c: 0, s: null, a: null, request: {tenant}});

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
  } finally {
    WIRED_PLUGINS.pop();
  }
});
