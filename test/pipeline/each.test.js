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
