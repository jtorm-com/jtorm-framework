'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormUiCachePlugin: p } = require('../../src/plugins/ui-cache-plugin/src/ui-cache-plugin.js');

test('ui-cache plugin keeps nullish language on the existing persisted null coordinate', async () => {
  const calls = [], token = {}, v = {
    cid: 'same', cs: null, l: undefined,
    h: {body: () => 'BODY'}
  };
  p.uiCacheModel = {
    async get(view, language) { calls.push(['get', language]); return null; },
    stage(view, language) { calls.push(['stage', language]); }
  };

  await p.beforeIteration(v, token);
  p.afterIteration(v, token);
  assert.deepEqual(calls, [['get', null], ['stage', null]]);
});

test('ui-cache plugin starts the existing after-view save without awaiting persistence', () => {
  let release, saves = 0;
  p.uiCacheModel = {save() {
    saves++;
    return new Promise(resolve => { release = resolve; });
  }};

  assert.equal(p.afterView({}), undefined);
  assert.equal(saves, 1);
  release();
});

test('ui-cache plugin keeps the exact existing get path for a malformed refresh host', async () => {
  const calls = [], host = {}, v = {cid: 'same', cs: 'default', l: 'en'};
  p.refreshModel = host;
  p.uiCacheModel = {
    refreshModel: host,
    async get() { calls.push('get'); return 'LEGACY'; },
    async lookup() { calls.push('lookup'); return {value: 'NEW'}; },
    start() { calls.push('start'); }
  };

  try {
    await p.beforeIteration(v, {});
    assert.equal(v.r, 'LEGACY');
    assert.deepEqual(calls, ['get']);
  } finally {
    p.refreshModel = null;
  }
});

test('ui-cache plugin uses stable host lookup and starts a returned capability before yielding stale bytes', async () => {
  const calls = [];
  const request = Object.freeze({});
  const host = {
    authorize() {}, current() {}, render() {}, session() {}, owns() {}
  };
  const v = {
    cid: 'same', cs: 'default', l: 'en',
    h: {body: () => 'BODY'}
  };
  p.refreshModel = host;
  p.uiCacheModel = {
    refreshModel: host,
    async lookup() {
      calls.push('lookup');
      return {value: 'OLD', refresh: request};
    },
    start(view, value) {
      calls.push('start');
      assert.strictEqual(view, v);
      assert.strictEqual(value, request);
      return true;
    }
  };

  try {
    await p.beforeIteration(v, {});
    assert.equal(v.r, 'OLD');
    assert.deepEqual(calls, ['lookup', 'start']);
  } finally {
    p.refreshModel = null;
  }
});
