'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormRenderContextModel: cm } = require('../../src/models/render-context-model/src/render-context-model.js');

function chain(n) {
  const root = {};
  let leaf = root;
  for (let i = 0; i < n; i++) leaf = {p: leaf};
  return {leaf, root};
}

test('accepts direct/view contexts through 128 edges and rejects deeper chains', () => {
  const a = chain(128), b = chain(129);
  cm.max = 128;

  assert.strictEqual(cm.context(a.leaf), a.root);
  assert.strictEqual(cm.context({c: a.leaf}), a.root);
  assert.equal(cm.context(b.leaf), null);
});

test('rejects malformed and cyclic context chains', () => {
  const a = {}, b = {p: a};
  a.p = b;
  cm.max = 128;

  assert.equal(cm.context(), null);
  assert.equal(cm.context('context'), null);
  assert.equal(cm.context(a), null);
});

test('cache resolution requires own view and parent links without changing normal resolution', () => {
  const root = Object.assign(Object.create(null), {tenant: 'root'});
  const ownParent = {p: root};
  const inheritedParent = Object.create({p: root});
  const ownView = {c: ownParent};
  const inheritedView = Object.create({c: root});

  assert.strictEqual(cm.cacheContext(ownParent), root);
  assert.strictEqual(cm.cacheContext(ownView), root);
  assert.strictEqual(cm.context(inheritedParent), root);
  assert.strictEqual(cm.context(inheritedView), root);
  assert.equal(cm.cacheContext(inheritedParent), null);
  assert.equal(cm.cacheContext(inheritedView), null);
});

test('root-only context stays valid with a degenerate configured maximum', () => {
  const root = {};
  cm.max = 0;
  try {
    assert.strictEqual(cm.context(root), root);
    assert.equal(cm.context({p: root}), null);
  } finally {
    cm.max = 128;
  }
});

test('state honors the consumer context facade, initializes once, and aliases children', () => {
  const root = {}, child = {}, v = {c: child};
  let contexts = 0, fresh = 0;
  const owner = {
    context: x => { contexts++; assert.strictEqual(x, v); return root; },
    freshState: () => { fresh++; return {value: 1}; }
  };

  const a = cm.state(owner, v, {n: 'owned', f: 'freshState'});
  const b = cm.state(owner, v, {n: 'owned', f: 'freshState'});

  assert.strictEqual(a, b);
  assert.strictEqual(root.owned, a);
  assert.strictEqual(child.owned, a);
  assert.deepEqual(a, {value: 1});
  assert.equal(contexts, 2);
  assert.equal(fresh, 1);
});

test('invalid state context falls back to the published consumer singleton', () => {
  const owner = {context: () => null};
  assert.strictEqual(cm.state(owner, {c: {}}, {n: 'owned'}), owner);
});
