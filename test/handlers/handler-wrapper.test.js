'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormHandlerWrapper: hw } = require('../../src/handlers/handler-wrapper/src/handler-wrapper.js');
const { makeDataParser } = require('../helpers/parser.js');

const e = hw.eventModel, h = hw.handler, v = hw.viewModel;

function copy(v) {
  let r, k;
  if (Array.isArray(v)) return v.map(copy);
  if (!v || typeof v !== 'object') return v;
  r = {};
  for (k in v) r[k] = copy(v[k]);
  return r;
}

function snapshot(t) {
  const r = [];
  function walk(a) {
    for (const n of a) {
      r.push({ n, s: n.s, m: n.m, p: n.p, pv: copy(n.p), c: n.c });
      walk(n.c || []);
    }
  }
  walk(t);
  return r;
}

function unchanged(t, before) {
  const after = snapshot(t);
  assert.equal(after.length, before.length);
  for (let i = 0; i < before.length; i++) {
    assert.strictEqual(after[i].n, before[i].n);
    assert.equal(after[i].s, before[i].s);
    assert.equal(after[i].m, before[i].m);
    assert.strictEqual(after[i].p, before[i].p);
    assert.deepEqual(after[i].pv, before[i].pv);
    assert.strictEqual(after[i].c, before[i].c);
  }
}

function source() {
  return {
    s: '.a', m: 'each', p: {}, c: [
      { s: '.a', m: 'append', p: { h: 'name' }, c: [
        { s: '.nested', m: 'text', p: { t: 'label' }, c: [] }
      ] },
      { s: '.explicit', m: 'text', p: { t: 'label' }, c: [] },
      { s: null, m: 'append', p: { h: 'selectorless' }, c: [] }
    ]
  };
}

function parent(t, id = '') {
  return {
    t, c: { s: null, a: null, locale: 'nl-NL' }, r: null,
    cid: 'cid' + id, cs: 'cs' + id
  };
}

test.afterEach(() => {
  hw.eventModel = e;
  hw.handler = h;
  hw.viewModel = v;
});

test('handler-wrapper carries v.c.locale into detached fragment contexts', async () => {
  let c;

  hw.eventModel = { handle: async () => {} };
  hw.handler = { handle: async () => '<span>Hallo</span>' };
  hw.viewModel = {
    create: async (h, t, m, ctx) => {
      c = ctx;
      return { h: { body: () => '<span>Hallo</span>' } };
    }
  };

  await hw.handle('', { c: [{}] }, {}, { c: { locale: 'nl-NL' } });

  assert.equal(c.locale, 'nl-NL');
  assert.equal(c.c, 1);
  assert.equal(c.b, 'body');
});

test('handler-wrapper projects direct selectors without changing source structure or lifecycle state', async () => {
  const t = source(), before = snapshot(t.c), pv = parent(t), order = [];
  let projected, child, context;

  hw.eventModel = { handle: async (x, phase, type) => {
    assert.equal(type, 'iteration');
    order.push(phase);
    if (phase === 'before') {
      assert.strictEqual(x, pv);
      assert.equal(x.c.s, '.a');
    } else {
      assert.strictEqual(x, child);
      assert.equal(x.cid, 'cid');
      assert.equal(x.cs, 'cs');
    }
  } };
  hw.viewModel = { create: async (html, tss, model, c) => {
    order.push('create');
    projected = tss;
    context = c;
    child = { h: { body: () => { order.push('body'); return '<i>x</i>'; } }, tss };
    return child;
  } };
  hw.handler = { handle: async (a, b, c, d, x) => {
    order.push('handler');
    assert.strictEqual(x, child);
    assert.equal(x.cid, 'cid');
    assert.equal(x.cs, 'cs');
    x.cid = 'changed';
    x.cs = 'changed';
    return x.h;
  } };

  assert.equal(await hw.handle('', t, {}, pv), '<i>x</i>');

  assert.deepEqual(order, ['before', 'create', 'handler', 'after', 'body']);
  assert.notStrictEqual(projected, t.c);
  assert.equal(projected.length, t.c.length);
  for (let i = 0; i < projected.length; i++) {
    assert.notStrictEqual(projected[i], t.c[i]);
    assert.equal(projected[i].s, 'body');
    assert.equal(projected[i].m, t.c[i].m);
    assert.strictEqual(projected[i].p, t.c[i].p);
    assert.strictEqual(projected[i].c, t.c[i].c);
  }
  assert.strictEqual(projected[0].c[0], t.c[0].c[0]);
  assert.equal(t.c[2].s, null);
  assert.equal(projected[2].s, 'body');
  assert.deepEqual(
    { s: context.s, a: context.a, b: context.b, c: context.c, locale: context.locale },
    { s: null, a: null, b: 'body', c: 1, locale: 'nl-NL' }
  );
  assert.strictEqual(context.p, pv.c);
  assert.strictEqual(pv.r, child.h);
  unchanged(t.c, before);
});

test('handler-wrapper preserves the entry-captured child array across before-event edits', async () => {
  const t = source(), captured = t.c, replacement = [
    { s: '.replacement', m: 'text', p: {}, c: [] }
  ], edited = { s: '.edited', m: 'append', p: { h: 'edited' }, c: [] }, pv = parent(t);
  let projected;

  hw.eventModel = { handle: async (x, phase) => {
    if (phase === 'before') {
      x.t.c = replacement;
      captured[0] = edited;
    }
  } };
  hw.viewModel = { create: async (html, tss) => {
    projected = tss;
    return { h: { body: () => 'edited' }, tss };
  } };
  hw.handler = { handle: async (a, b, c, d, x) => x.h };

  assert.equal(await hw.handle('', t, {}, pv), 'edited');
  assert.strictEqual(t.c, replacement);
  assert.equal(replacement[0].s, '.replacement');
  assert.equal(projected.length, captured.length);
  assert.equal(projected[0].m, 'append');
  assert.equal(projected[0].p.h, 'edited');
  assert.equal(projected[0].s, 'body');
  assert.equal(edited.s, '.edited');
});

test('handler-wrapper isolates explicitly interleaved projections of one source identity', async () => {
  const t = source(), before = snapshot(t.c), seen = [];
  let release, readyResolve;
  const gate = new Promise(resolve => { release = resolve; });
  const ready = new Promise(resolve => { readyResolve = resolve; });

  hw.eventModel = { handle: async () => {} };
  hw.viewModel = { create: async (html, tss, model) => {
    seen.push({ tss, model });
    if (seen.length === 2) readyResolve();
    await gate;
    return { h: { body: () => model.id }, tss };
  } };
  hw.handler = { handle: async (a, b, c, d, x) => x.h };

  const a = hw.handle('', t, { id: 'A' }, parent(t, 'A'));
  const b = hw.handle('', t, { id: 'B' }, parent(t, 'B'));
  await ready;

  const distinctArrays = seen[0].tss !== seen[1].tss;
  const distinctNodes = seen[0].tss[0] !== seen[1].tss[0];
  seen[0].tss[0].s = 'first-only';
  const isolatedSelector = seen[1].tss[0].s;
  const sourceSelector = t.c[0].s;
  release();

  assert.deepEqual(await Promise.all([a, b]), ['A', 'B']);
  assert.equal(distinctArrays, true);
  assert.equal(distinctNodes, true);
  assert.equal(isolatedSelector, 'body');
  assert.equal(sourceSelector, '.a');
  unchanged(t.c, before);
});

test('handler-wrapper failures never leak structural overlays or wrapper-owned projection state', async () => {
  for (const phase of ['before', 'create', 'handler', 'after']) {
    const t = source(), before = snapshot(t.c), pv = parent(t, phase), error = new Error(phase);
    const wrapperKeys = Object.keys(hw).sort(), contextKeys = Object.keys(pv.c).sort();
    let creates = 0, handles = 0, afters = 0;

    hw.eventModel = { handle: async (x, at) => {
      if (at === 'after') afters++;
      if (at === phase) throw error;
    } };
    hw.viewModel = { create: async (html, tss) => {
      creates++;
      if (phase === 'create') throw error;
      return { h: { body: () => phase }, tss };
    } };
    hw.handler = { handle: async (a, b, c, d, x) => {
      handles++;
      if (phase === 'handler') throw error;
      return x.h;
    } };

    await assert.rejects(() => hw.handle('', t, {}, pv), x => x === error);
    unchanged(t.c, before);
    assert.deepEqual(Object.keys(hw).sort(), wrapperKeys);
    assert.deepEqual(Object.keys(pv.c).sort(), contextKeys);
    assert.equal(creates, phase === 'before' ? 0 : 1);
    assert.equal(handles, phase === 'before' || phase === 'create' ? 0 : 1);
    assert.equal(afters, phase === 'after' ? 1 : 0);
  }
});

test('handler-wrapper projections forward the live compiled-binding cache to each source node', async () => {
  const dp = makeDataParser(), current = dp.current;
  const t = source(), projected = [], caches = [];
  const first = t.c[0], second = t.c[1];

  hw.eventModel = { handle: async () => {} };
  hw.viewModel = { create: async (html, tss) => {
    projected.push(tss);
    return { h: { body: () => '' }, tss };
  } };
  hw.handler = { handle: async (a, b, c, d, x) => {
    caches.push(x.tss.map(n => dp.cache(n)));
    return x.h;
  } };

  try {
    await hw.handle('', t, {}, parent(t, '1'));
    const descriptor = Object.getOwnPropertyDescriptor(projected[0][0], 'b');
    assert.equal(descriptor.enumerable, true);
    assert.equal(typeof descriptor.get, 'function');
    assert.equal(typeof descriptor.set, 'function');
    assert.ok(Object.prototype.hasOwnProperty.call(first, 'b'));
    assert.ok(Object.prototype.hasOwnProperty.call(second, 'b'));
    const sourceDescriptor = Object.getOwnPropertyDescriptor(first, 'b');
    assert.equal(sourceDescriptor.get, undefined);
    assert.equal(sourceDescriptor.set, undefined);
    assert.equal(sourceDescriptor.writable, true);
    assert.equal(sourceDescriptor.enumerable, true);
    assert.equal(sourceDescriptor.configurable, true);
    assert.strictEqual(sourceDescriptor.value, first.b);
    assert.strictEqual(projected[0][0].b, first.b);
    assert.strictEqual(projected[0][1].b, second.b);
    assert.notStrictEqual(first.b, second.b);

    await hw.handle('', t, {}, parent(t, '2'));
    assert.strictEqual(caches[1][0], caches[0][0]);
    assert.strictEqual(caches[1][1], caches[0][1]);

    const assigned = {
      k: caches[0][0].k, r: caches[0][0].r,
      p: caches[0][0].p, x: caches[0][0].x
    };
    projected[0][0].b = assigned;
    assert.strictEqual(first.b, assigned);
    assert.strictEqual(projected[1][0].b, assigned);
    await hw.handle('', t, {}, parent(t, '3'));
    assert.strictEqual(caches[2][0], assigned);

    first.p.h = 'changed';
    await hw.handle('', t, {}, parent(t, '4'));
    assert.notStrictEqual(caches[3][0], assigned);
    assert.strictEqual(first.b, caches[3][0]);

    const raw = first.b;
    dp.current = '@next';
    await hw.handle('', t, {}, parent(t, '5'));
    assert.notStrictEqual(first.b, raw);
    assert.strictEqual(first.b, caches[4][0]);
    assert.strictEqual(second.b, caches[4][1]);
  } finally {
    dp.current = current;
  }
});

test('handler-wrapper carries one ephemeral iteration token through before/after/complete and completes after the existing after chain', async () => {
  const t = source(), pv = parent(t), calls = [];
  let child, token;
  pv.l = 'en';
  hw.eventModel = {
    handle: async (view, phase, type, value) => {
      assert.equal(type, 'iteration');
      if (!token) token = value;
      assert.strictEqual(value, token);
      calls.push(phase);
      if (phase === 'before') assert.strictEqual(view, pv);
      else {
        assert.strictEqual(view, child);
        assert.equal(view.l, 'en');
      }
    },
    complete: async (view, type, value) => {
      assert.strictEqual(view, child);
      assert.equal(type, 'iteration');
      assert.strictEqual(value, token);
      calls.push('complete');
    },
    abort: async () => { calls.push('abort'); }
  };
  hw.viewModel = {create: async () => {
    calls.push('create');
    child = {h: {body: () => { calls.push('body'); return 'OK'; }}};
    return child;
  }};
  hw.handler = {handle: async () => {
    calls.push('handler');
    assert.equal(child.l, 'en');
    child.l = 'mutated';
    return 'rendered';
  }};

  assert.equal(await hw.handle('', t, {}, pv), 'OK');
  assert.ok(token && typeof token === 'object');
  assert.deepEqual(calls, ['before', 'create', 'handler', 'after', 'body', 'complete']);
});

test('handler-wrapper aborts every failed iteration span without masking the original error', async () => {
  for (const phase of ['before', 'create', 'handler', 'after', 'complete']) {
    const t = source(), pv = parent(t, phase), original = new Error(phase), cleanup = new Error('cleanup');
    let child, token, aborts = 0;
    hw.eventModel = {
      handle: async (view, at, type, value) => {
        token = token || value;
        assert.strictEqual(value, token);
        if (at === phase) throw original;
      },
      complete: async (view, type, value) => {
        assert.strictEqual(value, token);
        if (phase === 'complete') throw original;
      },
      abort: async (view, type, value, error) => {
        aborts++;
        assert.strictEqual(value, token);
        assert.strictEqual(error, original);
        throw cleanup;
      }
    };
    hw.viewModel = {create: async () => {
      if (phase === 'create') throw original;
      child = {h: {body: () => 'body'}};
      return child;
    }};
    hw.handler = {handle: async () => {
      if (phase === 'handler') throw original;
      return 'rendered';
    }};

    await assert.rejects(() => hw.handle('', t, {}, pv), error => error === original);
    assert.equal(aborts, 1, phase);
    assert.ok(token && typeof token === 'object');
    void child;
  }
});
