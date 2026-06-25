'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');

// Characterizations of suspect/known-broken behavior. As items are fixed, their
// test moves to the relevant positive suite. See jtorm-code-review.md #25-27.
//
// RESOLVED:
//   #25 unwrap/wrap set() signature mismatch — FIXED (test/pipeline/wrap-unwrap.test.js)
//   #26 data-parser unresolved-var regression (incl. dead if &&/||) — FIXED
//       (test/parsers/data-parser-var-semantics.test.js)

// OPEN — #27: `find` sets v.c.s = the descendant selector, but the chained child
// transform still targets the find rule's own selector (here `div`), not the
// descendant. Locked as characterization; intended semantics unverified.
test('KNOWN ISSUE #27: find chained child targets the find rule selector, not the descendant', async () => {
  const { body } = await render(
    '<body><div><b>X</b><i>Y</i></div></body>',
    "div->find { e: 'b'; ->attr { n: 'data-f'; v: '1'; } }",
    {}
  );
  assert.equal(body, '<div data-f="1"><b>X</b><i>Y</i></div>');
});
