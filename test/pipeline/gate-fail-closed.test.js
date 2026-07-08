'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');

// The handler's method loop runs each rule's validate(v); on a validate MISS it must skip
// that rule's children. Before the fix the miss branch set only v.io.r=0 and left v.io.c at
// whatever the previous sibling wrote — v.io persists across sibling rules within a handle()
// call — so a validate-failed rule inherited the prior rule's handle-children flag. Child
// rendering was therefore order-dependent and fail-OPEN. For a GATE verb (config "functions
// like an if") that is a security hole: a malformed gate renders the content it should block.
// Fix (handler.js): set v.io.c=0 on a validate miss -> deterministic fail-CLOSED for every verb.

// --- config gate with neither `d` nor `k` must FAIL CLOSED (PR #10 latent note) ---
//
// `config(v: '1')` omits the key param, so config.validate returns falsy and handle never
// runs. The gate is malformed -> its children must NOT render (previously they leaked because
// the child guard read a stale v.io.c defaulting to 1).
test('config gate with neither d nor k does not render its children (fail-closed)', async () => {
  const { body } = await render(
    '<body><div class="gate"><span class="gated">S</span></div></body>',
    ".gate -> config(v: '1') { .gated -> attr { n: 'data-x'; v: '1'; }; }",
    {}
  );
  assert.equal(body, '<div class="gate"><span class="gated">S</span></div>'); // no data-x leak
});

// --- the fail-closed decision must be order-INDEPENDENT (the leak was a stale v.io.c) ---
//
// Same malformed gate, two orderings inside one shared child loop: (A) after a BLOCKING config
// gate (leaves v.io={} -> io.c falsy) and (B) after a RENDERING sibling (text leaves io.c=1).
// Before the fix A blocked but B leaked (data-x on .y) — order-dependent. After the fix both block.
test('malformed config gate blocks children regardless of the preceding sibling', async () => {
  const html = '<body><div class="p"><span class="x">X</span><span class="y">Y</span></div></body>';
  const clean = '<div class="p"><span class="x">X</span><span class="y">Y</span></div>';

  // A: preceded by a blocking config gate (well-formed key, config value absent -> v.io={})
  const a = await render(
    html,
    ".p -> if(d: ok) { -> config(k: 'absent', v: '1') { .x -> attr { n: 'data-pre'; v: '1'; }; }; -> config(v: '1') { .y -> attr { n: 'data-x'; v: '1'; }; }; }",
    { ok: 'y' }
  );
  assert.equal(a.body, clean);

  // B: preceded by a rendering sibling (text -> v.io={c:1})
  const b = await render(
    html,
    ".p -> if(d: ok) { .x -> text { label: 'x'; }; -> config(v: '1') { .y -> attr { n: 'data-x'; v: '1'; }; }; }",
    { ok: 'y' }
  );
  assert.equal(b.body, clean);
});

// --- mediaquery / mediatarget are gates too: a missing param must fail CLOSED ---
//
// Both are documented child gates — mediaquery.handle sets v.io.c from the media match,
// mediatarget.handle from the active-target set. A param typo (no `q` / no `t`) makes their
// validate miss; without a gate marker the handler would treat them as pass-throughs and
// render the guarded children (the same fail-open class as config). They carry gate: 1.
test('mediaquery gate with no q does not render children (fail-closed)', async () => {
  const { body } = await render(
    '<body><div class="gate"><span class="gated">S</span></div></body>',
    ".gate -> mediaquery(x: '1') { .gated -> attr { n: 'data-x'; v: '1'; }; }",
    {}
  );
  assert.equal(body, '<div class="gate"><span class="gated">S</span></div>'); // no data-x leak
});

test('mediatarget gate with no t does not render children (fail-closed)', async () => {
  const { body } = await render(
    '<body><div class="gate"><span class="gated">S</span></div></body>',
    ".gate -> mediatarget(x: '1') { .gated -> attr { n: 'data-x'; v: '1'; }; }",
    {}
  );
  assert.equal(body, '<div class="gate"><span class="gated">S</span></div>'); // no data-x leak
});

// --- only GATES fail closed: a non-gate verb that misses validate is a pass-through ---
//
// The fail-closed decision is scoped to gate verbs (config.gate). A non-gate transform that
// misses validate (attr with a name but no value) is treated like a structural no-op node: its
// children still render. This is what the schema.org composition path relies on — e.g. an
// optional `get{d: <absent>}` binder must render its element chain even when the data is absent
// (locked by the ImageObject goldens in ui.test.js). The handler sets v.io.c deterministically
// here (=1), so the outcome no longer depends on the previous sibling's v.io.c.
test('a non-gate verb that fails validate is a pass-through (children still render)', async () => {
  const { body } = await render(
    '<body><div class="foo"><span class="bar">B</span></div></body>',
    ".foo -> attr(n: 'data-z') { .bar -> attr { n: 'data-y'; v: '1'; }; }",
    {}
  );
  assert.equal(body, '<div class="foo"><span class="bar" data-y="1">B</span></div>'); // child renders
});
