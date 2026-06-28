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
// replacable-style tss does a selectorless `->inner` meant for the fetched <span>.
// handler-wrapper boils each item in a DETACHED <body> fragment whose body default
// lives on its OWN channel (v.c.b='body'), leaving v.c.s null. Two fixes make this
// compose with the get/ui ancestor scope (v.c.a, PR #3): (1) the fragment is created
// with {c:1} AT create time, so it no longer reuses+wipes the live doc the each appends
// into ("`.a` not found"); (2) the body default is v.c.b, not v.c.s — so it never folds
// into a fetched component's selectorless rule, which stays getSelector(false,null)
// =false → scope('span', false) → the <span> itself. Routing it through v.c.s='body'
// instead leaked into the subtree → scope('span','body') → "span body not found".
// Unblocks every iteration-boiling ui component (Text/Thing.*/Article.*/...); the ui
// integration form is locked in test/pipeline/ui.test.js.
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

// Regression: an EXPLICIT `body` rule inside an iteration must resolve to the
// fragment's own <body> via selectAll, so `body->append` matches the body element
// itself. Routing the fragment scope through the ancestor channel instead (v.c.a=
// 'body') would make this evaluate scope('body','body') — which queries DESCENDANTS of
// <body> and excludes the body itself → "body body not found". This is exactly
// BreadcrumbList's `ol->each ... { body->append->ui ... }` (breadcrumb-list-default.tss);
// locks that the iteration keeps explicit body rules selectable. (get{d} here doesn't
// set v.c.a, and the fragment's body default is v.c.b, not the ancestor channel.)
test('each iteration keeps an explicit body rule scoped to the fragment body', async () => {
  const { body } = await render(
    '<body><div class="a"></div></body>',
    ".a->get { t: '/comp.tss'; }",
    { items: ['x', 'y'] },
    'http://localhost/',
    { '/comp.tss': { text: "->each(d: items, a: 'v') { body->append { p: '<i>'; h: v; s: '</i>'; } }" } }
  );
  assert.equal(body, '<div class="a"><i>x</i><i>y</i></div>');
});
