'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');

// `get` boils end-to-end against an INJECTED fixture transport (no network) — the
// request transport seam. Children written inside the get brace become the get
// node's children and boil with the merged data (handler.js:65-66); `inner { h }`
// writes to the DOM (text alone only preps the model — see text.test.js).
//
// get-method.get() returns the raw model result (get-method.js:15): data → parsed
// JSON, html → text, tss → parsed-TSS tree. (The prior `return r.d` was stale post
// native-fetch and is fixed in this change — it dropped html/tss and required a
// `{d:…}` data envelope.)

test('get { d } merges fetched JSON data and boils the children', async () => {
  const { body } = await render(
    '<body><div class="a"><span>placeholder</span></div></body>',
    ".a->get { d: '/d.json'; span->inner { h: name; } }",
    {},
    'http://localhost/',
    { '/d.json': { json: { name: 'Ada' } } }
  );
  assert.equal(body, '<div class="a"><span>Ada</span></div>');
});

test('get { h } sets innerHTML from the fetched HTML fragment', async () => {
  const { body } = await render(
    '<body><div class="a">orig</div></body>',
    ".a->get { h: '/frag.html'; }",
    {},
    'http://localhost/',
    { '/frag.html': { text: '<b>hi</b>' } }
  );
  assert.equal(body, '<div class="a"><b>hi</b></div>');
});

test('get { t } prepends the fetched TSS rules and boils them', async () => {
  const { body } = await render(
    '<body><div class="a"><span>orig</span></div></body>',
    ".a->get { t: '/extra.tss'; }",
    {},
    'http://localhost/',
    { '/extra.tss': { text: "span->inner { h: 'FETCHED'; }" } }
  );
  assert.equal(body, '<div class="a"><span>FETCHED</span></div>');
});

// Ancestor-scope (Gate-B): fetched TSS is scoped UNDER the get target (`.a span`,
// not bare `span`) so a matching element OUTSIDE the get element is untouched.
// Delivered by the core ancestor-scope (prepend) mechanism `v.c.a` — the same
// seam `ui` component injection needs (ui-method builds `{s: target, m: 'get'}`).
// The fetched `span->inner` re-selects with its own `s='span'`, so a top-node
// prefix can't reach it; `set()` prepends `v.c.a` to EVERY selector in the
// subtree. See docs/backlog.md / continue.md.
test('get { t } scopes fetched rules under the get target (no element leak)', async () => {
  const { body } = await render(
    '<body><div class="a"><span>orig</span></div><span>outside</span></body>',
    ".a->get { t: '/extra.tss'; }",
    {},
    'http://localhost/',
    { '/extra.tss': { text: "span->inner { h: 'FETCHED'; }" } }
  );
  assert.equal(body, '<div class="a"><span>FETCHED</span></div><span>outside</span>');
});

// No-leak-to-siblings: the get target ancestor (`v.c.a`) is lexical to the get
// subtree — a SIBLING rule that follows the get must NOT inherit the `.a` scope.
// Here the trailing `span->attr` is bare `span` (both spans tagged); if `v.c.a`
// leaked it would collapse to `.a span` and skip the outside span.
test('get { t } ancestor scope does not leak to a following sibling rule', async () => {
  const { body } = await render(
    '<body><div class="a"><span>orig</span></div><span>outside</span></body>',
    ".a->get { t: '/extra.tss'; } span->attr { n: 'data-x'; v: '1'; }",
    {},
    'http://localhost/',
    { '/extra.tss': { text: "span->inner { h: 'FETCHED'; }" } }
  );
  assert.equal(
    body,
    '<div class="a"><span data-x="1">FETCHED</span></div><span data-x="1">outside</span>'
  );
});

// Selectorless fetched rule: a fetched transform with NO selector (`{s:false}`)
// — e.g. ui component TSS like html-ui/global.tss, which starts `->attr {…}` —
// must apply to the get TARGET itself, not produce an invalid `.a false` selector.
// `getSelector` returns `false` for a selectorless rule; under an ancestor the
// scoped selector must collapse to the ancestor (the target). This is the core ui
// component-injection path (ui builds `{s: target, m: 'get'}`, then the component's
// selectorless rules land on the target).
test('get { t } applies a selectorless fetched rule to the get target', async () => {
  const { body } = await render(
    '<body><div class="a"><span>orig</span></div></body>',
    ".a->get { t: '/c.tss'; }",
    {},
    'http://localhost/',
    { '/c.tss': { text: "->attr { n: 'data-x'; v: '1'; }" } }
  );
  assert.equal(body, '<div class="a" data-x="1"><span>orig</span></div>');
});

// Selector-list scoping: a comma-list get TARGET must scope every branch. `.a, .b`
// + fetched `span` must become `.a span, .b span` — NOT `.a, .b span` (= `.a` OR
// `.b span`), which would hit `.a` itself and miss `.a span`. The ancestor is
// distributed across each branch (cross product).
test('get { t } distributes the ancestor over a comma-list get target', async () => {
  const { body } = await render(
    '<body><div class="a"><span>x</span></div><div class="b"><span>y</span></div><span>out</span></body>',
    ".a, .b->get { t: '/c.tss'; }",
    {},
    'http://localhost/',
    { '/c.tss': { text: "span->inner { h: 'Z'; }" } }
  );
  assert.equal(
    body,
    '<div class="a"><span>Z</span></div><div class="b"><span>Z</span></div><span>out</span>'
  );
});

// Selector-list scoping: a comma-list FETCHED rule must keep every branch under the
// target. `span, b` under `.a` must become `.a span, .a b` — NOT `.a span, b`,
// which leaks bare `b` to the outside `<b>`.
test('get { t } scopes every branch of a comma-list fetched rule under the target', async () => {
  const { body } = await render(
    '<body><div class="a"><span>s</span><b>in</b></div><b>out</b></body>',
    ".a->get { t: '/c.tss'; }",
    {},
    'http://localhost/',
    { '/c.tss': { text: "span, b->attr { n: 'data-x'; v: '1'; }" } }
  );
  assert.equal(
    body,
    '<div class="a"><span data-x="1">s</span><b data-x="1">in</b></div><b>out</b>'
  );
});

// Selector internals: a comma INSIDE a selector (attribute value, :is()/:has()) is
// not a list separator and must survive scoping. `span[data-x='a,b']` under `.a`
// must be queried natively (qsa parses CSS), not corrupted to the invalid
// `.a span[data-x='a, .a b']`.
test('get { t } preserves commas inside a fetched selector when scoping', async () => {
  const { body } = await render(
    '<body><div class="a"><span data-x="a,b">s</span><span>t</span></div></body>',
    ".a->get { t: '/c.tss'; }",
    {},
    'http://localhost/',
    { '/c.tss': { text: "span[data-x='a,b']->attr { n: 'z'; v: '1'; }" } }
  );
  assert.equal(
    body,
    '<div class="a"><span data-x="a,b" z="1">s</span><span>t</span></div>'
  );
});

// Nested SAME-TAG get — element-scope (the keystone fix). A fetched rule whose own
// `->get` re-wraps the SAME tag must keep boiling on the SAME element, not look for that
// tag INSIDE itself. wrap.tss `input { ->get '/inner.tss' }` + inner.tss `input { attr }`
// is the html-ui input-email→input shape: the nested get resolves the ancestor to the
// injected <input> ELEMENT; document-model.scope is descendant-first → else SELF, so
// inner.tss's `input` (no descendant input exists) matches the <input> itself. Was the
// deferred "input input not found" — the nested get clobbered v.c.a with the bare tag, so
// scope('input','input') searched for an input INSIDE the input.
test('get { t } nested same-tag get keeps the outer element scope (descendant-first, else self)', async () => {
  const { body } = await render(
    '<body><div class="a"><input></div></body>',
    ".a->get { t: '/wrap.tss'; }",
    {},
    'http://localhost/',
    {
      '/wrap.tss': { text: "input { ->get { t: '/inner.tss'; } }" },
      '/inner.tss': { text: "input->attr { n: 'data-z'; v: '1'; }" }
    }
  );
  assert.equal(body, '<div class="a"><input data-z="1"></div>');
});

// ...and it does NOT leak to a same-tag SIBLING outside the get target — the isolation the
// reverted `g===a` fix LOST (returning the ancestor itself scoped 'input' document-wide →
// every <input>). The element-ref ancestor confines inner.tss's attrs to the injected
// <input>; the sibling <input> outside .a is untouched.
test('get { t } nested same-tag get does not leak to a same-tag sibling outside the target', async () => {
  const { body } = await render(
    '<body><div class="a"><input></div><input class="sibling"></body>',
    ".a->get { t: '/wrap.tss'; }",
    {},
    'http://localhost/',
    {
      '/wrap.tss': { text: "input { ->get { t: '/inner.tss'; } }" },
      '/inner.tss': { text: "input->attr { n: 'data-z'; v: '1'; }" }
    }
  );
  assert.equal(body, '<div class="a"><input data-z="1"></div><input class="sibling">');
});

// Comma-list ancestor × nested same-tag get — the cross-product survives (PR #3's comma
// correctness, preserved by reusing scope() to resolve the get target rather than
// composing selector strings). Each branch's <p> is scoped independently; the <p> outside
// .a/.b is untouched.
test('get { t } nested same-tag get distributes over a comma-list ancestor (no leak)', async () => {
  const { body } = await render(
    '<body><div class="a"><p>x</p></div><div class="b"><p>y</p></div><p>out</p></body>',
    ".a, .b->get { t: '/outer.tss'; }",
    {},
    'http://localhost/',
    {
      '/outer.tss': { text: "p->get { t: '/inner.tss'; }" },
      '/inner.tss': { text: "p->attr { n: 'data-z'; v: '1'; }" }
    }
  );
  assert.equal(
    body,
    '<div class="a"><p data-z="1">x</p></div><div class="b"><p data-z="1">y</p></div><p>out</p>'
  );
});

// A structural verb (wrap) UNDER a get ancestor scopes via the element-ref ancestor too:
// wrap's nested set() carries v.c (the element-ref v.c.a), and the new wrapper — inserted
// INSIDE the target, hence a descendant of the ancestor — resolves. Locks that the
// element-ref change doesn't regress wrap-under-ancestor (no shipped component exercises it
// yet, but grid/wrapper + web-page-boxed use wrap).
test('get { t } wrap under a get ancestor scopes the new wrapper element', async () => {
  const { body } = await render(
    '<body><div class="a"><span>orig</span></div></body>',
    ".a->get { t: '/w.tss'; }",
    {},
    'http://localhost/',
    { '/w.tss': { text: "span->wrap { s: '.box'; h: '<div class=\"box\"></div>'; }" } }
  );
  assert.equal(body, '<div class="a"><span><div class="box">orig</div></span></div>');
});

// Root replacement under a get ancestor fails LOUD, not silent (Codex PR#12 P2). A fetched
// selectorless rule that structurally REPLACES its own scoped root (->swap runs
// el.parentNode.replaceChild, detaching the element v.c.a points at) leaves later rules
// with a stale ancestor ref. scope() skips the detached node, so the trailing ->attr hits
// zero matches and THROWS (the zero-match drift detector) rather than silently writing to
// the orphaned node. jTorm does not follow a scope across a root replacement (a separate
// robustness feature — see backlog); use a selector rule, not a self-replacing root, for
// post-swap transforms. (Old string-tag v.c.a re-queried and sometimes found the
// replacement by luck; element-refs make the unsupported pattern loud and predictable.)
test('get { t } a fetched rule replacing its own ancestor root makes later rules throw loud (not silent)', async () => {
  await assert.rejects(
    render(
      '<body><div class="a">x</div></body>',
      ".a->get { t: '/swaproot.tss'; }",
      {},
      'http://localhost/',
      { '/swaproot.tss': { text: "->swap { s: 'section'; a: '1'; } ->attr { n: 'data-z'; v: '1'; }" } }
    ),
    /not found/
  );
});
