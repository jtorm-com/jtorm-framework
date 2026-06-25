'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');

// Keystone proof of the request transport seam: `get` boils end-to-end against an
// INJECTED fixture transport (no network). Children written inside the get brace
// become the get node's children and boil with the merged data (handler.js:65-66);
// `inner { h: name }` writes the resolved value to the DOM (text alone only preps
// the model — see text.test.js).
//
// NOTE the `{ d: ... }` envelope: get-method.get() unwraps `r.d` (get-method.js:15),
// so the data payload must be enveloped. That unwrap is drift vs the raw values the
// html/tss models return post native-fetch — characterized below and parked in the
// backlog (seam spec §5). Here it works *because* data is enveloped.
test('get { d } boils fetched (enveloped) data through the injected transport', async () => {
  const { body } = await render(
    '<body><div class="a"><span>placeholder</span></div></body>',
    ".a->get { d: '/d.json'; span->inner { h: name; } }",
    {},
    'http://localhost/',
    { '/d.json': { json: { d: { name: 'Ada' } } } }
  );
  assert.equal(body, '<div class="a"><span>Ada</span></div>');
});

// Characterization of the get-method `r.d` drift (seam spec §5; backlog item). These
// lock the CURRENT (drifted) behavior; they will flip when get-method is fixed.
// get{h}: the html model returns a raw text string, but get-method.get() unwraps
// `r.d` → undefined → innerHTML = "undefined" (the fetched fragment is dropped).
test('get { h } — r.d drift: innerHTML becomes "undefined" (characterization)', async () => {
  const { body } = await render(
    '<body><div class="a">orig</div></body>',
    ".a->get { h: '/frag.html'; }",
    {},
    'http://localhost/',
    { '/frag.html': { text: '<b>hi</b>' } }
  );
  assert.equal(body, '<div class="a">undefined</div>');
});

// get{t}: the tss model returns a parsed-TSS array, but get-method.get() unwraps
// `r.d` → undefined → the fetched rules are dropped; only the original child boils.
test('get { t } — r.d drift: fetched TSS is dropped (characterization)', async () => {
  const { body } = await render(
    '<body><div class="a"><span>orig</span></div></body>',
    ".a->get { t: '/extra.tss'; span->inner { h: name; } }",
    { name: 'X' },
    'http://localhost/',
    { '/extra.tss': { text: "span->inner { h: 'FETCHED'; }" } }
  );
  // the fetched 'FETCHED' rule is silently ignored; original data 'X' renders instead.
  assert.equal(body, '<div class="a"><span>X</span></div>');
});
