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
