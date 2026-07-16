'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
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

test('ui validate is a pure component-presence gate', () => {
  const v = { d: { c: 'Thing', t: '0', h: '2', m: '1' } };
  const before = structuredClone(v);

  assert.equal(m.validate(v), true);
  assert.deepEqual(v, before);
});

test('ui data phase parses parameters and normalizes t/h/m before validation', async () => {
  const p = m.dataParser;
  const calls = [];
  const v = { d: {}, t: { p: {} } };

  try {
    m.dataParser = {
      handle: (vo, params) => {
        calls.push(params);
        vo.d = { c: 'Thing', t: '0' };
      }
    };

    await m.data(v);

    assert.deepEqual(calls, [m.params]);
    assert.deepEqual(v.d, { c: 'Thing', t: 0, m: 0, h: 1 });
    assert.equal(m.validate(v), true);
  } finally {
    m.dataParser = p;
  }
});

test('ui data phase normalizes prepared synthesized data without reparsing it', () => {
  const p = m.dataParser;
  const v = { d: {}, t: { p: {} } };

  try {
    m.dataParser = { handle: () => { throw new Error('must not parse prepared data'); } };
    m.data(v, { c: 'Thing', t: '0', h: '0', m: '1' });

    assert.deepEqual(v.d, { c: 'Thing', t: 0, h: 0, m: 1 });
  } finally {
    m.dataParser = p;
  }
});

test('ui data phase keeps the invalid-t error before validation and method events', () => {
  const p = m.dataParser;
  const e = m.errorHandler;
  const v = { d: {}, t: { p: {} } };

  try {
    m.dataParser = { handle: vo => { vo.d = { c: 'Thing', t: 'bad' }; } };
    m.errorHandler = { handle: message => { throw new Error(message); } };

    assert.throws(() => m.data(v), /t is NaN/);
  } finally {
    m.dataParser = p;
    m.errorHandler = e;
  }
});

test('ui handle orchestrates implicit resolution, mediatarget compilation, cleanup, and repeat flags', async () => {
  const resolver = m.resolverModel;
  const compiler = m.compilerModel;
  const media = m.mediatargetMethod;
  const calls = [];
  const v = {
    d: { c: 'Thing', t: 1, h: 1, m: 1, keep: 'yes' },
    t: { s: '.target', m: 'ui', p: {}, c: [] }
  };

  try {
    m.resolverModel = {
      getComponent: async (component, framework) => {
        calls.push(['resolve', component, framework]);
        return component.endsWith('Missing') ? 0 : { c: { id: component } };
      }
    };
    m.compilerModel = {
      processComponent: async (vo, resolution) => {
        calls.push(['compile', resolution.c.id]);
        return { s: vo.t.s, m: 'get', p: { id: resolution.c.id }, c: [{ s: 'old' }] };
      }
    };
    m.mediatargetMethod = { current: ['Desktop', 'Missing'] };

    const effect = await m.handle(v);

    assert.deepEqual(calls, [
      ['resolve', 'Thing', 'self'],
      ['compile', 'Thing'],
      ['resolve', 'ThingDesktop', 'self'],
      ['compile', 'ThingDesktop'],
      ['resolve', 'ThingMissing', 'self']
    ]);
    assert.deepEqual(v.d, { keep: 'yes' });
    assert.deepEqual(effect, { children: true, repeat: true });
    assert.deepEqual(v.t.c, [{ s: 'old' }, {
      s: '.target', m: 'get', p: { id: 'ThingDesktop' }, c: []
    }]);
  } finally {
    m.resolverModel = resolver;
    m.compilerModel = compiler;
    m.mediatargetMethod = media;
  }
});

test('ui handle fails loudly for missing DI models and unresolved components', async () => {
  const resolver = m.resolverModel;
  const compiler = m.compilerModel;
  const error = m.errorHandler;
  const v = { d: { c: 'Missing' }, t: { s: '', p: {}, c: [] } };

  try {
    m.errorHandler = { handle: message => { throw new Error(message); } };
    m.resolverModel = null;
    await assert.rejects(m.handle(v), /UI Models not injected/);

    m.resolverModel = { getComponent: async () => 0 };
    m.compilerModel = compiler;
    await assert.rejects(m.handle(v), /Invalid UI Component/);
  } finally {
    m.resolverModel = resolver;
    m.compilerModel = compiler;
    m.errorHandler = error;
  }
});
