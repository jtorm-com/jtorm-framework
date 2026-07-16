'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const _ = require('lodash');
const { jTormUiCompilerModel: c } = require('../../src/models/ui-compiler-model/src/ui-compiler-model.js');

const initial = { handler: c.handler, methods: c.methods, viewModel: c.viewModel };

test.afterEach(() => {
  for (const k in initial) {
    if (initial[k] === undefined)
      delete c[k];
    else
      c[k] = initial[k];
  }
});

function view(d = { t: 1, h: 1 }) {
  return {
    _: _, d,
    t: { s: '.target', m: 'ui', p: {}, c: [{ s: 'i', m: 'text', p: {}, c: [] }] }
  };
}

test('compiler emits quoted h/t/d get parameters without mutating its inputs', async () => {
  const v = view();
  const r = { c: { h: 'part.html', t: ['part.tss'], d: ['part.json'] } };
  const before = _.cloneDeep({ t: v.t, r });

  const t = await c.processComponent(v, r);

  assert.deepEqual(t.p, {
    h: ["'part.html'"], t: ["'part.tss'"], d: ["'part.json'"]
  });
  assert.equal(t.m, 'get');
  assert.deepEqual({ t: v.t, r }, before);
});

test('compiler emits nested ui and drops an empty artifact parameter', async () => {
  const t = await c.processComponent(view(), {
    c: { t: [], ui: { c: 'Parent', f: 'schema', t: 0, h: 1, m: 1 } }
  });

  assert.deepEqual(t.p, { c: "'Parent'", f: "'schema'", t: "'0'", h: "'1'", m: "'1'" });
  assert.deepEqual(t.c[0].p, {});
  assert.equal(t.c[0].m, 'get');
});

test('compiler preserves the pT parent-target AST branch', async () => {
  const t = await c.processComponent(view(), {
    c: { t: ['part.tss'], pT: { s: '.parent', m: 'if', p: { d: 'ok' } } }
  });

  assert.equal(t.c[0].s, '.parent');
  assert.deepEqual(t.c[0].c[0], {
    s: '.target', m: 'get', p: { t: ["'part.tss'"] },
    c: [{ s: 'i', m: 'text', p: {}, c: [] }]
  });
});

test('compiler routes artifact and root ui di through dispatch with prepared data', async () => {
  const calls = [];
  c.viewModel = { copy: v => ({ ...v, d: {} }) };
  c.handler = {
    dispatch: async (v, d) => {
      calls.push({ t: v.t, d });
      return { children: !!d.pass, repeat: false, data: undefined };
    }
  };

  const artifacts = await c.processComponent(view(), {
    c: { t: [
      { url: 'yes.tss', di: { m: { allow: { pass: 1 } } } },
      { url: 'no.tss', di: { m: { allow: { pass: 0 } } } }
    ] }
  });
  assert.deepEqual(artifacts.p.t, ["'yes.tss'"]);

  const gated = await c.processComponent(view(), {
    c: { ui: { c: 'Parent' }, di: { m: { allow: { pass: 0 } } } }
  });
  assert.equal(gated, null);
  assert.deepEqual(calls, [
    { t: { s: '.target', m: 'allow', p: {}, c: [] }, d: { pass: 1 } },
    { t: { s: '.target', m: 'allow', p: {}, c: [] }, d: { pass: 0 } },
    { t: { s: '.target', m: 'allow', p: {}, c: [] }, d: { pass: 0 } }
  ]);
});
