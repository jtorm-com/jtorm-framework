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
