'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');

// THE ZERO-MATCH CONTRACT (Gate A / code-review #14, reframed):
// - transform verbs (route through document-model.set) THROW loud on a zero-match
//   selector — this IS the upgrade-safe drift detector (a consumer overlay that
//   targets a vanished selector fails loud, never silent-wrong).
// - `text` is data-prep (no DOM target) → no-op, no throw.
// - `->if(el: X)` makes a target OPTIONAL (no-op if absent) — the escape hatch.
// (if/else and each are conditional/iteration control flow, covered elsewhere.)

const HTML = '<body><p>x</p></body>';

for (const [verb, params] of [
  ['attr', "n: 'a'; v: '1';"],
  ['insert', "h: '<b>y</b>'; m: 'i';"],
  ['move', "l: '#d'; m: 'append';"],
  ['swap', "s: 'span';"],
  ['remove', '']
]) {
  test(`zero-match selector → ${verb} throws loud (drift detector)`, async () => {
    await assert.rejects(render(HTML, `.none->${verb} { ${params} }`, {}), /\.none not found/);
  });
}

test('text on a zero-match selector is a no-op (data-prep, no DOM target)', async () => {
  const { body } = await render(HTML, ".none->text { k: '1'; }", {});
  assert.equal(body, '<p>x</p>');
});

test('->if(el: X) makes a transform optional: no-op (no throw) when X is absent', async () => {
  const { body } = await render(
    '<body><a>x</a></body>',
    "a->if(el: '.none')->attr { n: 'data-a'; v: '1'; }",
    {}
  );
  assert.equal(body, '<a>x</a>');
});
