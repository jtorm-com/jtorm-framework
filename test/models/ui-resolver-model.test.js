'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormUiResolverModel: r } = require('../../src/models/ui-resolver-model/src/ui-resolver-model.js');

const initial = {
  cache: r.cache,
  default: r.default,
  framework: r.framework,
  regexp: r.regexp,
  ui: r.ui,
  uis: r.uis
};

test.afterEach(() => {
  for (const k in initial) r[k] = initial[k];
});

function reset(uis = []) {
  r.cache = {};
  r.default = 'default';
  r.framework = 'schema';
  r.regexp = {};
  r.ui = { mapper: null };
  r.uis = uis;
}

function registry(framework, component, artifact) {
  return {
    id: 'pkg/' + framework,
    alias: '@' + framework[0],
    framework,
    mapper: { [component]: { default: { t: [artifact] } } }
  };
}

test('registered lookup supports framework/alias selection and terminal default variants', async () => {
  const schema = registry('schema', 'Thing', 'schema.tss');
  reset([schema]);

  assert.equal((await r.getComponent('Thing', 'schema')).c.t[0], 'schema.tss');
  r.cache = {};
  assert.equal((await r.getComponent('Thing', '@s')).c.t[0], 'schema.tss');
});

test('implicit resolution prefers custom, then configured framework, then registry order', async () => {
  const schema = registry('schema', 'Thing', 'schema.tss');
  const html = registry('html', 'OnlyHtml', 'html.tss');
  reset([schema, html]);
  r.ui = { mapper: { Thing: { default: { t: ['custom.tss'] } } } };

  assert.equal((await r.getComponent('Thing', 'self')).c.t[0], 'custom.tss');
  assert.equal((await r.getComponent('OnlyHtml', 'self')).c.t[0], 'html.tss');
  assert.equal((await r.getComponent('Thing', 'schema')).c.t[0], 'schema.tss');
});

test('implicit and explicit resolution use separate cache entries and cache misses', async () => {
  const schema = registry('schema', 'Thing', 'schema.tss');
  reset([schema]);
  r.ui = { mapper: { Thing: { default: { t: ['custom.tss'] } } } };

  assert.equal((await r.getComponent('Thing', 'self')).c.t[0], 'custom.tss');
  assert.equal((await r.getComponent('Thing', 'schema')).c.t[0], 'schema.tss');
  assert.equal(await r.getComponent('Late', 'schema'), 0);
  schema.mapper.Late = { default: { t: ['late.tss'] } };
  assert.equal(await r.getComponent('Late', 'schema'), 0);
  r.cache = {};
  assert.equal((await r.getComponent('Late', 'schema')).c.t[0], 'late.tss');
});

test('custom nested-ui defaults to the configured framework without mutating host input', async () => {
  const descriptor = { ui: { c: 'Thing' }, t: ['custom.tss'] };
  reset([registry('schema', 'Thing', 'schema.tss')]);
  r.ui = { mapper: { Local: { default: descriptor } } };

  const found = await r.getComponent('Local', 'self');

  assert.equal(found.c.ui.f, 'schema');
  assert.deepEqual(descriptor, { ui: { c: 'Thing' }, t: ['custom.tss'] });
});

test('init rebuilds regex state, clears component cache, and expands aliases and asset URLs', async () => {
  reset([{
    id: 'pkg/html/src',
    alias: '@h',
    framework: 'html',
    mapperAlias: { e: 'element' },
    mapper: {},
    url: 'https://cdn.example/'
  }]);
  r.cache = { stale: { self: 1 } };
  r.regexp = { stale: 1 };

  await r.init();

  assert.deepEqual(r.cache, {});
  assert.equal(r.regexp.stale, undefined);
  assert.equal(r.parseComponent('@h/@e/div.tss'), '@h/element/div.tss');
  assert.equal(r.parseUrl('@h/@e/div.css'), 'https://cdn.example/pkg/html/src/element/div.css');
  assert.equal(r.parseUrl('/local.css'), '/local.css');
});
