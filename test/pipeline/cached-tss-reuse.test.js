'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render, setSanitize } = require('../helpers/engine.js');
const { makeTssParser } = require('../helpers/parser.js');
const { jTormTssModel: tm } = require('../../src/models/tss-model/src/tss-model.js');
const { jTormPromiseCacheModel: pm } = require('../../src/models/promise-cache-model/src/promise-cache-model.js');

const source = ".a->each { d: items; ->append { h: 'iter'; } }";
const html = '<body><div class="a"></div></body>';
const saved = {
  c: tm.c, max: tm.max, parser: tm.tssParser,
  cache: tm.promiseCacheModel, request: tm.requestModel
};

function copy(v) {
  let r, k;
  if (Array.isArray(v)) return v.map(copy);
  if (!v || typeof v !== 'object') return v;
  r = {};
  for (k in v) r[k] = copy(v[k]);
  return r;
}

function structure(t) {
  return t.map(n => ({ s: n.s, m: n.m, p: copy(n.p), c: structure(n.c || []) }));
}

async function trees() {
  let fetches = 0;
  tm.c = new Map();
  tm.max = 512;
  tm.promiseCacheModel = pm;
  tm.tssParser = makeTssParser();
  tm.requestModel = {
    cacheKey: u => String(u),
    get: () => ({ text: async () => { fetches++; return source; } })
  };
  const cached = await tm.get('/shared.tss');
  const same = await tm.get('/shared.tss');
  const fresh = makeTssParser().handle(source);
  assert.strictEqual(same, cached);
  assert.strictEqual(same[0], cached[0]);
  assert.equal(fetches, 1);
  return { cached, fresh };
}

test.afterEach(() => {
  setSanitize(null);
  tm.c = saved.c;
  tm.max = saved.max;
  tm.tssParser = saved.parser;
  tm.promiseCacheModel = saved.cache;
  tm.requestModel = saved.request;
});

test('successful wrapper render leaves one cached AST identity reusable like a fresh tree', async () => {
  const { cached, fresh } = await trees();
  const before = structure(cached), direct = cached[0].c[0].c[0];
  const p = direct.p, c = direct.c;

  assert.equal((await render(html, cached, { items: [{}] })).body, '<div class="a">iter</div>');
  const reused = await render(html, cached, null);
  const baseline = await render(html, fresh, null);

  assert.equal(reused.body, baseline.body);
  assert.equal(reused.body, '<div class="a">iter</div>');
  assert.deepEqual(structure(cached), before);
  assert.strictEqual(cached[0].c[0].c[0], direct);
  assert.strictEqual(direct.p, p);
  assert.strictEqual(direct.c, c);
});

test('failed wrapper render leaks no selector and the same cached AST still matches fresh output', async () => {
  const { cached, fresh } = await trees();
  const before = structure(cached), error = new Error('wrapper stop');

  setSanitize(() => { throw error; });
  await assert.rejects(
    () => render(html, cached, { items: [{}] }),
    value => value === error
  );
  setSanitize(null);

  const reused = await render(html, cached, null);
  const baseline = await render(html, fresh, null);
  assert.equal(reused.body, baseline.body);
  assert.equal(reused.body, '<div class="a">iter</div>');
  assert.deepEqual(structure(cached), before);
});
