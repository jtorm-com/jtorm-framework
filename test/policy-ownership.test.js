'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { scanMethods } = require('./helpers/policy-ownership.js');

const ROOT = path.resolve(__dirname, '..');
const file = p => path.join(ROOT, p);
const read = p => fs.readFileSync(file(p), 'utf8');
const pkg = p => JSON.parse(read(p + '/package.json'));

const owners = [
  'src/models/render-context-model/src/render-context-model.js',
  'src/models/promise-cache-model/src/promise-cache-model.js',
  'src/models/asset-plugin-model/src/asset-plugin-model.js'
];
const context = [
  ['src/models/request-model/src/request-model.js', ['context'], {context: 2}],
  ['src/models/ui-manifest-model/src/ui-manifest-model.js', ['root'], {root: 1}],
  ['src/models/layer-model/src/layer-model.js', ['context', 'state'], {context: 1, state: 1}],
  ['src/models/ui-cache-model/src/ui-cache-model.js', ['context', 'state'], {context: 1, state: 1}]
];
const cache = [
  ['src/models/data-model/src/data-model.js', ['get'], {get: 3}],
  ['src/models/html-model/src/html-model.js', ['get'], {get: 3}],
  ['src/models/tss-model/src/tss-model.js', ['get'], {get: 5}],
  ['src/models/ui-manifest-model/src/ui-manifest-model.js', ['load'], {load: 2}]
];
const assets = [
  ['src/plugins/css-plugin/src/css-plugin.js', ['context', 'state', 'adopt', 'process', 'afterView']],
  ['src/plugins/js-plugin/src/js-plugin.js', ['context', 'state', 'adopt', 'process', 'afterView']]
];

const scans = entries => entries.map(([p, methods]) => [p, scanMethods(read(p), p, methods)]);

test('shared runtime policies have one injected source owner per family', () => {
  const missingOwners = owners.filter(p => !fs.existsSync(file(p)));
  const missingDelegation = [
    ...scans(context).filter(([, s]) => !s.delegations.renderContextModel).map(([p]) => p),
    ...scans(cache).filter(([, s]) => !s.delegations.promiseCacheModel).map(([p]) => p),
    ...scans(assets).filter(([, s]) => !s.delegations.assetPluginModel).map(([p]) => p)
  ];

  assert.deepEqual({ missingOwners, missingDelegation }, {
    missingOwners: [],
    missingDelegation: []
  });

  assert.match(read(owners[0]), /new Set\(\)/);
  assert.match(read(owners[0]), /this\.max/);
  assert.match(read(owners[1]), /\.keys\(\)\.next\(\)/);
  assert.match(read(owners[1]), /r\.token !== n \|\| c\.get\(q\) !== p/);
  assert.match(read(owners[1]), /metadata: new WeakMap\(\)/);
  assert.match(read(owners[1]), /restore: function \(o, age, a\)/);
  assert.match(read('src/models/ui-cache-model/src/ui-cache-model.js'), /promiseCacheModel\.fresh\(/);
  assert.match(read('src/models/ui-cache-model/src/ui-cache-model.js'), /promiseCacheModel\.restore\(this, now - r\.settledAt, a\)/);
  assert.match(read(owners[2]), /renderContextModel/);
  assert.match(read(owners[2]), /\.parseUrl\(|\.createElement\(|\.appendChild\(|URL blocked/);
});

test('shared runtime policy implementations cannot return to consumer packages', () => {
  const contextScans = scans(context), cacheScans = scans(cache), assetScans = scans(assets);
  const duplicateContext = contextScans.filter(([, s]) => s.parentAccess).map(([p]) => p);
  const duplicateState = contextScans.filter(([, s]) => s.stateWrites).map(([p]) => p);
  const duplicateCache = cacheScans.filter(([, s]) => s.cacheAccess || s.promiseCatch).map(([p]) => p);
  const duplicateAssets = assetScans.filter(([, s]) => s.assetCalls || s.parentAccess || s.stateWrites).map(([p]) => p);
  const expandedFacades = [
    ...contextScans.filter(([p, s]) => {
      const expected = context.find(([x]) => x === p)[2];
      return Object.keys(expected).some(k => s.found[k] !== 1 || s.statements[k] !== expected[k]);
    }).map(([p]) => p),
    ...cacheScans.filter(([p, s]) => {
      const expected = cache.find(([x]) => x === p)[2];
      return Object.keys(expected).some(k => s.found[k] !== 1 || s.statements[k] !== expected[k]);
    }).map(([p]) => p),
    ...assetScans.filter(([, s]) => Object.values(s.found).some(n => n !== 1)
      || Object.keys(s.found).length !== 5
      || Object.values(s.statements).some(n => n !== 1)).map(([p]) => p)
  ];

  assert.deepEqual({ duplicateContext, duplicateState, duplicateCache, duplicateAssets, expandedFacades }, {
    duplicateContext: [],
    duplicateState: [],
    duplicateCache: [],
    duplicateAssets: [],
    expandedFacades: []
  });
});

test('ownership analyzer catches representative bypass families without comment/string false positives', () => {
  const contextBypasses = [
    'context: function(c) { while (c.p) c = c.p; return c; }',
    "context: function(c) { for (; c['p'];) c = c['p']; return c; }",
    'context: function(c) { const {p} = c; return p; }',
    "context: function(c) { return Reflect.get(c, 'p'); }"
  ];
  const cacheBypasses = [
    'get: function() { return s.c.get(q); }',
    "get: function() { s['c'].set(q, p); return p; }",
    'get: function() { const {c} = s; p.catch(clear); return c.get(q); }'
  ];
  const assetBypasses = [
    'process: function() { return p.uiResolverModel.parseUrl(u); }',
    "process: function() { return d['createElement']('script'); }",
    'process: function() { return new URL(u); }'
  ];

  for (const body of contextBypasses) {
    const s = scanMethods('module.exports = {' + body + '};', 'context.js', ['context']);
    assert.ok(s.parentAccess, body);
  }
  for (const body of cacheBypasses) {
    const s = scanMethods('module.exports = {' + body + '};', 'cache.js', ['get']);
    assert.ok(s.cacheAccess || s.promiseCatch, body);
  }
  for (const body of assetBypasses) {
    const s = scanMethods('module.exports = {' + body + '};', 'asset.js', ['process']);
    assert.ok(s.assetCalls, body);
  }

  const relocated = scanMethods(`module.exports = {
    get: function() {
      return (this.promiseCacheModel, this.local());
    },
    local: function() {
      const p = this.c.get('key');
      p.catch(function () {});
      return p;
    }
  };`, 'relocated.js', ['get']);
  assert.ok(relocated.cacheAccess && relocated.promiseCatch, 'relocated helper bypass');

  const safe = scanMethods(`module.exports = {
    context: function(c) {
      // while (c.p) and "s.c.get(q)" are inert examples
      return this.renderContextModel.context(c);
    }
  };`, 'safe.js', ['context']);
  assert.equal(safe.parentAccess + safe.cacheAccess + safe.promiseCatch + safe.assetCalls, 0);
  assert.equal(safe.delegations.renderContextModel, 1);
});

test('coordinated package releases declare their policy owners and dependency minima', () => {
  const releases = {
    'src/models/render-context-model': '1.0.1',
    'src/models/promise-cache-model': '1.0.4',
    'src/models/asset-plugin-model': '1.0.0',
    'src/models/request-model': '1.1.5',
    'src/models/ui-manifest-model': '1.0.4',
    'src/models/layer-model': '1.0.2',
    'src/models/ui-cache-model': '2.0.0',
    'src/models/data-model': '1.0.8',
    'src/models/html-model': '1.0.8',
    'src/models/tss-model': '1.0.9',
    'src/models/event-model': '1.0.2',
    'src/handlers/handler-wrapper': '1.0.7',
    'src/parsers/tss-parser': '2.0.0',
    'src/parsers/data-parser': '1.0.4',
    'src/methods/attrs-method': '1.0.4',
    'tooling/ui-manifest-compiler': '1.0.1',
    'src/plugins/css-plugin': '1.0.5',
    'src/plugins/js-plugin': '1.0.5',
    'src/plugins/ui-cache-plugin': '1.0.3'
  };
  const dependencies = {
    'src/models/request-model': {'@jtorm/render-context-model': '^1.0.1'},
    'src/models/ui-manifest-model': {
      '@jtorm/promise-cache-model': '^1.0.4',
      '@jtorm/render-context-model': '^1.0.0',
      '@jtorm/request-model': '^1.1.5'
    },
    'src/models/layer-model': {'@jtorm/render-context-model': '^1.0.0'},
    'src/models/ui-cache-model': {
      '@jtorm/promise-cache-model': '^1.0.3',
      '@jtorm/render-context-model': '^1.0.1',
      '@jtorm/request-model': '^1.1.5'
    },
    'src/models/data-model': {'@jtorm/promise-cache-model': '^1.0.4', '@jtorm/request-model': '^1.1.5'},
    'src/models/html-model': {'@jtorm/promise-cache-model': '^1.0.4', '@jtorm/request-model': '^1.1.5'},
    'src/models/tss-model': {
      '@jtorm/promise-cache-model': '^1.0.4',
      '@jtorm/request-model': '^1.1.5',
      '@jtorm/tss-parser': '^2.0.0'
    },
    'src/handlers/handler-wrapper': {'@jtorm/event-model': '^1.0.2'},
    'src/plugins/ui-cache-plugin': {
      '@jtorm/event-model': '^1.0.2',
      '@jtorm/handler-wrapper': '^1.0.7',
      '@jtorm/ui-cache-model': '^2.0.0'
    },
    'src/parsers/data-parser': {'@jtorm/tss-parser': '^2.0.0'},
    'src/methods/attrs-method': {'@jtorm/tss-parser': '^2.0.0'},
    'tooling/ui-manifest-compiler': {'@jtorm/tss-parser': '^2.0.0'},
    'src/plugins/css-plugin': {'@jtorm/asset-plugin-model': '^1.0.0', '@jtorm/request-model': '^1.1.4'},
    'src/plugins/js-plugin': {'@jtorm/asset-plugin-model': '^1.0.0', '@jtorm/request-model': '^1.1.4'}
  };

  for (const [dir, version] of Object.entries(releases))
    assert.equal(pkg(dir).version, version, dir)
  ;
  for (const [dir, expected] of Object.entries(dependencies))
    for (const [name, version] of Object.entries(expected))
      assert.equal(pkg(dir).dependencies[name], version, dir + ' -> ' + name)
    ;
});

test('request-triggered stale policy stays on the four acquisition exports', () => {
  const acquisition = [
    ['src/models/data-model/src/data-model.js', 'jTormDataModel'],
    ['src/models/html-model/src/html-model.js', 'jTormHtmlModel'],
    ['src/models/tss-model/src/tss-model.js', 'jTormTssModel'],
    ['src/models/ui-manifest-model/src/ui-manifest-model.js', 'jTormUiManifestModel']
  ];

  for (const [p, name] of acquisition)
    assert.deepEqual(
      Object.getOwnPropertyDescriptor(require(file(p))[name], 'staleWindow'),
      {value: 0, writable: true, enumerable: true, configurable: true},
      p
    )
  ;
  assert.equal(
    Object.getOwnPropertyDescriptor(
      require(file('src/models/ui-cache-model/src/ui-cache-model.js')).jTormUiCacheModel,
      'staleWindow'
    ),
    undefined
  );
  assert.equal(pkg('src/models/ui-cache-model').version, '2.0.0');
  assert.equal(
    pkg('src/models/ui-cache-model').dependencies['@jtorm/promise-cache-model'],
    '^1.0.3'
  );
});
