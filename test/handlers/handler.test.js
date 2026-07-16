/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const _ = require('lodash');
const { jTormHandler } = require('../../src/handlers/handler/src/handler.js');
const { jTormViewModel } = require('../../src/models/view-model/src/view-model.js');

// Per-request scope lifecycle (code-review #9 / backlog P0.2, first slice).
// The handler captures v.c.s (find descendant) + v.c.a (get/ui ancestor) per rule
// subtree and restores them after the children boil (handler.js). v.c is the
// shared/by-ref context (the root v is prototype-linked to the view-model singleton,
// so v.c IS process-global) — so if a mid-render throw skips the restore, the leaked
// scope poisons the NEXT render on the same worker. These tests drive the real
// handler with fake verbs and assert the restore ALWAYS runs (try/finally), with NO
// reset in between (the full-pipeline harness resets per render() and cannot repro).

// Minimal DI: real handler + real view-model (the child boil calls viewModel.create
// with an already-built wrapper + parsed tree, so document-model/tss-parser are never
// touched); event-model + data-parser stubbed (this suite exercises scope, not verbs).
// Capture the singleton DI fields this file overwrites and restore them after the suite
// (AGENTS.md: reset singleton mutable fields a test touches) — so a shared-process run,
// or tests later appended to this file, don't inherit the fake wiring. The no-reset
// behavior that proves cross-render poison stays INSIDE the tests, not the teardown.
const orig = {
  m: jTormHandler.methods, vm: jTormHandler.viewModel,
  em: jTormHandler.eventModel, dp: jTormHandler.dataParser, u: jTormViewModel._
};
test.after(() => {
  jTormHandler.methods = orig.m;
  jTormHandler.viewModel = orig.vm;
  jTormHandler.eventModel = orig.em;
  jTormHandler.dataParser = orig.dp;
  jTormViewModel._ = orig.u;
});

jTormViewModel._ = _;
jTormHandler.viewModel = jTormViewModel;

let peeked = null;
let forgotCalls = 0;
let calls = null;
let spinCalls = 0;
let childModel;

jTormHandler.eventModel = { handle: async (v, phase) => {
  if (calls) calls.push(phase + ':' + v.t.m);
} };
jTormHandler.dataParser = { handle: v => {
  if (calls) calls.push('data:' + v.t.m);
  v.d = {};
} };

// Fake verbs (set once → concurrency-safe). Each returns its child-recursion intent;
// `forget` deliberately returns nothing to exercise handler-owned safe defaults.
jTormHandler.methods = {
  // sets scope on v.c then throws IN its own handle (restore must still run)
  poison: { params: [], validate: () => 1, handle: (v) => { v.c.s = '.leaked-s'; v.c.a = '.leaked-a'; throw new Error('boom in handle'); } },
  // sets the ancestor + descendant scope like get{t}/ui/find, then lets children boil
  setScope: { params: [], validate: () => 1, handle: (v) => { v.c.a = '.anc'; v.c.s = '.desc'; return { children: true }; } },
  // throws mid-subtree (the zero-match drift shape a fetched child hits)
  boom: { params: [], validate: () => 1, handle: () => { throw new Error('mid-render drift'); } },
  // records the scope the NEXT render inherits
  peek: { params: [], validate: () => 1, handle: (v) => { peeked = { s: v.c.s, a: v.c.a }; return { children: true }; } },
  // deliberately forgets to return an effect; the second call was the finite
  // sentinel for the render loop the removed mutable-side-channel contract created
  forget: { params: [], validate: () => 1, handle: () => {
    forgotCalls++;
    if (forgotCalls > 1) throw new Error('would repeat forever');
  } },
  normal: {
    alias: 'normalAlias', params: [],
    validate: () => { if (calls) calls.push('validate:normal'); return 1; },
    handle: () => { if (calls) calls.push('handle:normal'); return { children: true, repeat: false, data: 0 }; }
  },
  prepared: {
    alias: 'preparedAlias', params: [],
    data: (v, d) => { if (calls) calls.push(['data:prepared', d]); v.d = { ok: d.ok }; },
    validate: v => { if (calls) calls.push('validate:prepared'); return v.d.ok; },
    handle: () => { if (calls) calls.push('handle:prepared'); return { children: true, data: '' }; }
  },
  binder: {
    params: [], validate: () => 1,
    data: () => ({ children: true, data: false })
  },
  malformed: {
    gate: 1, params: [], validate: () => 1,
    handle: () => Object.assign(Object.create({ children: true }), { repeat: 'false' })
  },
  unstable: {
    gate: 1, params: [], validate: () => 1,
    handle: () => {
      let reads = 0;
      return Object.defineProperty({}, 'children', {
        get: () => reads++ ? 'open' : false
      });
    }
  },
  closed: { gate: 1, params: [], validate: () => 1, handle: () => {} },
  gateMiss: { gate: 1, params: [], validate: () => 0, handle: () => { throw new Error('must not run'); } },
  passMiss: { params: [], validate: () => 0, handle: () => { throw new Error('must not run'); } },
  switch: {
    params: [], validate: () => { if (calls) calls.push('validate:switch'); return 1; },
    handle: v => {
      if (calls) calls.push('handle:switch');
      v.t = { s: v.t.s, m: 'finish', p: {}, c: [] };
      return { repeat: true };
    }
  },
  finish: {
    params: [], validate: () => { if (calls) calls.push('validate:finish'); return 1; },
    handle: () => { if (calls) calls.push('handle:finish'); return { children: true, data: 'done' }; }
  },
  spin: { params: [], validate: () => 1, handle: () => { spinCalls++; return { repeat: true }; } },
  parent: { params: [], validate: () => 1, handle: () => ({ children: true, data: false }) },
  child: { params: [], validate: () => 1, handle: v => { childModel = v.m; return { children: false }; } }
};

/** A root view object whose context is `ctx` (mirrors the shared singleton v.c). */
function rootView(ctx, tss) {
  return { _, tss, c: ctx, h: { body: () => '' }, m: null, d: null, t: null };
}

test('a method that returns nothing cannot create an implicit render loop', async () => {
  forgotCalls = 0;
  await jTormHandler.handle(null, null, null, null, rootView(
    { c: 1, s: null, a: null },
    [{ s: '.x', m: 'forget', p: {}, c: [] }]
  ));
  assert.equal(forgotCalls, 1);
});

test('normal and aliased methods share the data/validate/event/handle lifecycle', async () => {
  for (const method of ['normal', 'normalAlias']) {
    calls = [];
    const v = rootView({ c: 1, s: null, a: null }, []);
    v.t = { s: '.x', m: method, p: {}, c: [] };

    assert.deepEqual(await jTormHandler.dispatch(v), {
      children: true, repeat: false, data: 0
    });
    assert.deepEqual(calls, [
      'data:' + method,
      'validate:normal',
      'before:' + method,
      'handle:normal',
      'after:' + method
    ]);
  }
  calls = null;
});

test('prepared synthesized data still runs custom data, validation, and events through aliases', async () => {
  calls = [];
  const d = { ok: 1 };
  const v = rootView({ c: 1, s: null, a: null }, []);
  v.t = { s: '.x', m: 'preparedAlias', p: {}, c: [] };

  assert.deepEqual(await jTormHandler.dispatch(v, d), {
    children: true, repeat: false, data: ''
  });
  assert.deepEqual(calls, [
    ['data:prepared', d],
    'validate:prepared',
    'before:preparedAlias',
    'handle:prepared',
    'after:preparedAlias'
  ]);
  calls = null;
});

test('data-only effects survive validation while gate defaults fail closed', async () => {
  const v = rootView({ c: 1, s: null, a: null }, []);

  v.t = { s: '.x', m: 'binder', p: {}, c: [] };
  assert.deepEqual(await jTormHandler.dispatch(v), {
    children: true, repeat: false, data: false
  });

  for (const [method, children] of [['closed', false], ['gateMiss', false], ['passMiss', true]]) {
    v.t = { s: '.x', m: method, p: {}, c: [] };
    assert.deepEqual(await jTormHandler.dispatch(v), {
      children, repeat: false, data: undefined
    });
  }
});

test('malformed and inherited control fields normalize to safe gate defaults', async () => {
  const v = rootView({ c: 1, s: null, a: null }, []);
  v.t = { s: '.x', m: 'malformed', p: {}, c: [] };

  assert.deepEqual(await jTormHandler.dispatch(v), {
    children: false, repeat: false, data: undefined
  });
});

test('effect control getters are read once and cannot change the normalized type', async () => {
  const v = rootView({ c: 1, s: null, a: null }, []);
  v.t = { s: '.x', m: 'unstable', p: {}, c: [] };

  assert.deepEqual(await jTormHandler.dispatch(v), {
    children: false, repeat: false, data: undefined
  });
});

test('explicit repeat re-resolves the rewritten method and repeats the full lifecycle', async () => {
  calls = [];
  const v = rootView({ c: 1, s: null, a: null }, []);
  v.t = { s: '.x', m: 'switch', p: {}, c: [] };

  assert.deepEqual(await jTormHandler.dispatch(v), {
    children: true, repeat: false, data: 'done'
  });
  assert.deepEqual(calls, [
    'data:switch', 'validate:switch', 'before:switch', 'handle:switch', 'after:finish',
    'data:finish', 'validate:finish', 'before:finish', 'handle:finish', 'after:finish'
  ]);
  calls = null;
});

test('explicit repeat fails loud at the bounded lifecycle limit', async () => {
  spinCalls = 0;
  const v = rootView({ c: 1, s: null, a: null }, []);
  v.t = { s: '.x', m: 'spin', p: {}, c: [] };

  await assert.rejects(jTormHandler.dispatch(v), /Method spin repeat limit exceeded/);
  assert.equal(spinCalls, 100);
});

test('unknown methods throw and returned falsy data reaches child recursion', async () => {
  const v = rootView({ c: 1, s: null, a: null }, []);
  v.t = { s: '.x', m: 'missing', p: {}, c: [] };
  await assert.rejects(jTormHandler.dispatch(v), /Unknown method missing/);

  childModel = undefined;
  await jTormHandler.handle(null, null, null, null, rootView(
    { c: 1, s: null, a: null },
    [{ s: '.x', m: 'parent', p: {}, c: [{ s: '.y', m: 'child', p: {}, c: [] }] }]
  ));
  assert.equal(childModel, false);
});

test('restores v.c scope when a verb throws in its own handle', async () => {
  const ctx = { c: 1, s: null, a: null };
  await assert.rejects(
    jTormHandler.handle(null, null, null, null, rootView(ctx, [{ s: '.x', m: 'poison', p: {}, c: [] }])),
    /boom in handle/
  );
  assert.equal(ctx.s, null, 'v.c.s must be restored after a mid-handle throw');
  assert.equal(ctx.a, null, 'v.c.a must be restored after a mid-handle throw');
});

test('restores v.c ancestor/descendant scope when a child subtree throws', async () => {
  const ctx = { c: 1, s: null, a: null };
  await assert.rejects(
    jTormHandler.handle(null, null, null, null, rootView(ctx, [
      { s: '.host', m: 'setScope', p: {}, c: [{ s: '.child', m: 'boom', p: {}, c: [] }] }
    ])),
    /mid-render drift/
  );
  assert.equal(ctx.a, null, 'ancestor scope must be restored after a child subtree throws');
  assert.equal(ctx.s, null, 'descendant scope must be restored after a child subtree throws');
});

test('a mid-render throw does not poison the NEXT render (no reset between)', async () => {
  // One shared context object reused across renders — mirrors the process-global v.c
  // reached through the view-model singleton's prototype. NO reset() in between.
  const shared = { c: 1, s: null, a: null };
  await assert.rejects(
    jTormHandler.handle(null, null, null, null, rootView(shared, [
      { s: '.host', m: 'setScope', p: {}, c: [{ s: '.child', m: 'boom', p: {}, c: [] }] }
    ])),
    /mid-render drift/
  );
  peeked = null;
  await jTormHandler.handle(null, null, null, null, rootView(shared, [{ s: '.b', m: 'peek', p: {}, c: [] }]));
  assert.deepEqual(peeked, { s: null, a: null }, 'the next render must inherit clean scope, not render A leaked scope');
});
