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
jTormViewModel._ = _;
jTormHandler.viewModel = jTormViewModel;
jTormHandler.eventModel = { handle: async () => {} };
jTormHandler.dataParser = { handle: () => {} };

let peeked = null;

// Fake verbs (set once → concurrency-safe). A verb REPLACES v.io to end the do/while
// (mirrors text-method `v.io = {c:1,d:v.m}` / each-method `v.io = {}`); io.r becomes
// undefined → the loop exits and children boil.
jTormHandler.methods = {
  // sets scope on v.c then throws IN its own handle (restore must still run)
  poison: { params: [], validate: () => 1, handle: (v) => { v.c.s = '.leaked-s'; v.c.a = '.leaked-a'; throw new Error('boom in handle'); } },
  // sets the ancestor + descendant scope like get{t}/ui/find, then lets children boil
  setScope: { params: [], validate: () => 1, handle: (v) => { v.c.a = '.anc'; v.c.s = '.desc'; v.io = { c: 1, d: null }; } },
  // throws mid-subtree (the zero-match drift shape a fetched child hits)
  boom: { params: [], validate: () => 1, handle: () => { throw new Error('mid-render drift'); } },
  // records the scope the NEXT render inherits
  peek: { params: [], validate: () => 1, handle: (v) => { peeked = { s: v.c.s, a: v.c.a }; v.io = { c: 1, d: null }; } }
};

/** A root view object whose context is `ctx` (mirrors the shared singleton v.c). */
function rootView(ctx, tss) {
  return { _, tss, c: ctx, io: { d: null, c: 1, r: 1, v: 0 }, h: { body: () => '' }, m: null, d: null, t: null };
}

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
