'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');

// Regression locks for resolved review findings (jtorm-code-review.md #25-27).
// Each formerly-characterized bug keeps a test here asserting the FIXED
// behaviour, so the bug cannot silently return. Broader positive coverage for
// each lives in its feature suite:
//   #25 unwrap/wrap set() signature   — test/pipeline/wrap-unwrap.test.js
//   #26 data-parser unresolved var    — test/parsers/data-parser-var-semantics.test.js
//   #27 find child-scoping            — test/pipeline/find.test.js

// #27: the chained child of a block-form `find` inherits the rule selector
// (`div`); it must target the descendant `e` *within* that element, not the
// rule element itself. (Was: `<div data-f="1">…` — attr on the div.)
test('#27 regression: find block-form child targets the descendant, not the rule element', async () => {
    const { body } = await render(
        '<body><div><b>X</b><i>Y</i></div></body>',
        "div->find { e: 'b'; ->attr { n: 'data-f'; v: '1'; } }",
        {}
    );
    assert.equal(body, '<div><b data-f="1">X</b><i>Y</i></div>');
});
