'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const _ = require('lodash');
const { jTormUiMethod: m } = require('../../src/methods/ui-method/src/ui-method.js');
const { jTormUiResolverModel: r } = require('../../src/models/ui-resolver-model/src/ui-resolver-model.js');
const { jTormUiCompilerModel: c } = require('../../src/models/ui-compiler-model/src/ui-compiler-model.js');

const models = { resolverModel: m.resolverModel, compilerModel: m.compilerModel };
m.resolverModel = r;
m.compilerModel = c;

test.after(() => {
  for (const k in models) {
    if (models[k] === undefined)
      delete m[k];
    else
      m[k] = models[k];
  }
});

function state() {
  return {
    cache: m.cache,
    default: m.default,
    framework: m.framework,
    regexp: m.regexp,
    ui: m.ui,
    uis: m.uis,
    methods: m.methods,
    viewModel: m.viewModel
  };
}

function restore(s) {
  for (const k in s) m[k] = s[k];
}

function view(d = { t: 1, h: 1 }) {
  return {
    _: _,
    d,
    io: {},
    t: { s: '.target', m: 'ui', p: { c: 'Old' }, c: [{ s: 'b', m: 'text', p: {}, c: [] }] }
  };
}

test('ui-method keeps its published state and helper surface observable', () => {
  for (const k of ['cache', 'default', 'framework', 'params', 'regexp', 'ui', 'uis'])
    assert.ok(k in m, k + ' state is missing');

  for (const k of ['init', 'validate', 'handle', 'getComponent', 'processComponent',
    'add', 'addLoop', 'findUIComponent', 'parseAlias', 'parseUrl', 'quotes', 'parseComponent'])
    assert.equal(typeof m[k], 'function', k + ' helper is missing');
});

test('ui-method facade state writes replace the live resolver/compiler state', () => {
  const s = state();
  const cache = { Thing: { self: 1 } };
  const methods = { allow: {} };
  const viewModel = { copy: () => {} };

  try {
    m.cache = cache;
    m.methods = methods;
    m.viewModel = viewModel;

    assert.equal(r.cache, cache);
    assert.equal(c.methods, methods);
    assert.equal(c.viewModel, viewModel);
  } finally {
    restore(s);
  }
});

test('component lookup applies terminal default, ordered framework fallback, hit caching, and miss caching', async () => {
  const s = state();
  const a = {
    alias: '@a', framework: 'a', mapper: {
      Thing: { default: { t: ['a.tss'] } }
    }
  };
  const b = {
    alias: '@b', framework: 'b', mapper: {
      Thing: { default: { t: ['b.tss'] } }
    }
  };

  try {
    m.cache = {};
    m.default = 'default';
    m.uis = [a, b];

    const fallback = await m.getComponent('Thing', 'missing');
    assert.equal(fallback.ui, a);
    assert.deepEqual(fallback.c, { t: ['a.tss'] });

    a.mapper.Thing.default = { t: ['changed.tss'] };
    assert.equal((await m.getComponent('Thing', 'missing')).c.t[0], 'a.tss');

    assert.equal(await m.getComponent('Absent', 'a'), 0);
    a.mapper.Absent = { default: { t: ['late.tss'] } };
    assert.equal(await m.getComponent('Absent', 'a'), 0, 'a cached miss remains a miss');
    m.cache = {};
    assert.equal((await m.getComponent('Absent', 'a')).c.t[0], 'late.tss');
  } finally {
    restore(s);
  }
});

test('alias parsing and asset URL expansion preserve mapper sub-aliases and unmatched URLs', async () => {
  const s = state();
  const ui = {
    id: 'pkg/ui/src',
    alias: '@x',
    framework: 'x',
    mapperAlias: { a: 'asset' },
    mapper: {},
    url: 'https://cdn.example/'
  };

  try {
    m.cache = {};
    m.regexp = {};
    m.uis = [ui];
    await m.init();

    assert.equal(m.parseComponent('@x/@a/file.tss'), '@x/asset/file.tss');
    assert.equal(m.parseUrl('@x/@a/file.css'), 'https://cdn.example/pkg/ui/src/asset/file.css');
    assert.equal(m.parseUrl('/local/file.css'), '/local/file.css');
  } finally {
    restore(s);
  }
});

test('plain descriptors compile cloned h/t/d artifacts into the existing get node', async () => {
  const s = state();
  const v = view();
  const r = { c: { h: 'part.html', t: ['part.tss'], d: ['part.json'] } };
  const beforeV = _.cloneDeep(v.t);
  const beforeR = _.cloneDeep(r);

  try {
    const t = await m.processComponent(v, r);

    assert.deepEqual(t, {
      s: '.target',
      m: 'get',
      p: {
        h: ["'part.html'"],
        t: ["'part.tss'"],
        d: ["'part.json'"]
      },
      c: [{ s: 'b', m: 'text', p: {}, c: [] }]
    });
    assert.deepEqual(v.t, beforeV, 'the source TSS node is not mutated');
    assert.deepEqual(r, beforeR, 'the mapper descriptor is not mutated');
  } finally {
    restore(s);
  }
});

test('descriptor t/h switches and empty nested-ui artifacts retain their exact AST contract', async () => {
  const s = state();

  try {
    const plain = await m.processComponent(
      view({ t: 0, h: 0 }),
      { c: { h: 'part.html', t: ['part.tss'], d: ['part.json'] } }
    );
    assert.deepEqual(plain.p, { d: ["'part.json'"] });

    const nested = await m.processComponent(
      view(),
      { c: { t: [], ui: { c: 'Parent', f: 'schema', t: 0, h: 1, m: 1 } } }
    );
    assert.deepEqual(nested, {
      s: '.target',
      m: 'ui',
      p: { c: "'Parent'", f: "'schema'", t: "'0'", h: "'1'", m: "'1'" },
      c: [{
        s: '.target',
        m: 'get',
        p: {},
        c: [{ s: 'b', m: 'text', p: {}, c: [] }]
      }]
    });
  } finally {
    restore(s);
  }
});

test('pT wraps the original target get as the parent-target node sole child', async () => {
  const s = state();
  const r = {
    c: {
      t: ['part.tss'],
      pT: { s: '.parent', m: 'if', p: { d: 'enabled' }, c: { ignored: 1 } }
    }
  };
  const before = _.cloneDeep(r);

  try {
    const t = await m.processComponent(view(), r);

    assert.equal(t.c.length, 1);
    assert.deepEqual(t.c[0], {
      s: '.parent',
      m: 'if',
      p: { d: 'enabled' },
      c: [{
        s: '.target',
        m: 'get',
        p: { t: ["'part.tss'"] },
        c: [{ s: 'b', m: 'text', p: {}, c: [] }]
      }]
    });
    assert.deepEqual(r, before);
  } finally {
    restore(s);
  }
});

test('artifact di gates each URL and root ui di preserves its historical double-m nesting', async () => {
  const s = state();
  const calls = [];

  try {
    m.viewModel = { copy: v => ({ ...v, d: {}, io: {} }) };
    m.methods = {
      allow: {
        handle: v => {
          calls.push(v.d);
          v.io.c = v.d.pass;
        }
      }
    };

    const artifacts = await m.processComponent(view(), {
      c: {
        t: [
          { url: 'yes.tss', di: { m: { allow: { pass: 1 } } } },
          { url: 'no.tss', di: { m: { allow: { pass: 0 } } } },
          'plain.tss'
        ]
      }
    });
    assert.deepEqual(artifacts.p.t, ["'yes.tss'", "'plain.tss'"]);

    const oneM = await m.processComponent(view(), {
      c: { ui: { c: 'Parent' }, di: { m: { allow: { pass: 0 } } } }
    });
    assert.ok(oneM, 'one m level is historically not dispatched and therefore allows');

    const twoM = await m.processComponent(view(), {
      c: { ui: { c: 'Parent' }, di: { m: { m: { allow: { pass: 0 } } } } }
    });
    assert.equal(twoM, null, 'two m levels reach add() and can suppress the component');
    assert.deepEqual(calls, [{ pass: 1 }, { pass: 0 }, { pass: 0 }]);
  } finally {
    restore(s);
  }
});
