'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');

// `each` validate requires children (each-method.js:27 `v.t.c.length`); with no
// children it is a silent no-op. The positive each path (object arrays rendered
// through the ui/append component machinery) is deferred to a follow-up that
// wires `ui` (spec §9) — `each` stays wired + covered by the drift guard.
test('each with no children is a silent no-op (characterization)', async () => {
  const { body } = await render(
    '<body><ul><li>t</li></ul></body>',
    "li->each { d: items; }",
    { items: [1, 2] }
  );
  assert.equal(body, '<ul><li>t</li></ul>');
});

// Regression: a method that REPLACES v.c with a non-object must not make the
// handler's lexical-scope restore throw. each-method.js:45 sets `v.c = 1` on the
// `e:` element path (signalling children to boil a fresh doc); the restore resets
// the captured context object's fields and reinstates the reference, rather than
// writing `.s`/`.a` onto the number 1 (strict-mode `Cannot create property 's'`).
test('each(e:) does not break the handler scope restore', async () => {
  const { body } = await render(
    '<body><ul><li>seed</li></ul></body>',
    "ul->each { e: 'li'; d: items; li->inner { h: name; } }",
    { items: [{ name: 'A' }] }
  );
  assert.equal(body, '<ul><li>A</li></ul>');
});

// Regression: the each iteration path must compose with a nested get's ancestor
// scope. This mirrors the real component shape (e.g. schema-ui Text): an OUTER get
// fetches a component tss — parsed standalone, so its rules are genuinely
// selectorless — whose `each` iterates and, per item, fetches an element whose
// replacable-style tss does a selectorless `->inner` ancestor-scoped to the fetched
// <span>. handler-wrapper boils each item in a FRESH <body> doc with v.c.s='body'
// (the iteration descendant-scope). The per-item get establishes its OWN ancestor
// scope (v.c.a='span', PR #3); its selectorless `->inner` must resolve to that
// ancestor (scope('span', false) → the <span>), NOT inherit the stale v.c.s='body'.
// Pre-fix v.c.s='body' leaked into the fetched subtree → getSelector(false,'body')
// ='body' → scope('span','body') matched nothing → "span body not found". Breaks
// every iteration-boiling ui component (Text/Thing.*/Article.*/ImageObject/...); the
// ui integration form is locked in test/pipeline/ui.test.js. Fix: get-method resets
// v.c.s when it sets v.c.a; the handler restores it after the get subtree.
test('each iteration composes with a nested get ancestor-scope (selectorless inner)', async () => {
  const { body } = await render(
    '<body><div class="a"></div></body>',
    ".a->get { t: '/comp.tss'; }",
    { items: ['x', 'y'] },
    'http://localhost/',
    {
      '/comp.tss': { text: "->each(d: items, a: 'v') { ->if(d: v) { ->get { h: '/el.html'; t: '/el.tss'; } } }" },
      '/el.html': { text: '<span></span>' },
      '/el.tss': { text: "span->get { t: '/inner.tss'; }" },
      '/inner.tss': { text: '->inner { h: v; }' }
    }
  );
  assert.equal(body, '<div class="a"><span>x</span><span>y</span></div>');
});
