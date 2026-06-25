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
