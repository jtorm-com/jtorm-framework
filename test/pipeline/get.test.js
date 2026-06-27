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
