'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');

// #27 fix: find { e: X } scopes chained children to descendant X *within* the
// matched element (effective selector `<rule> X`), not the rule's own element.
test('find scopes a chained child to the descendant of the matched element', async () => {
    const { body } = await render(
        '<body><div><b>X</b><i>Y</i></div></body>',
        "div->find { e: 'b'; ->attr { n: 'data-f'; v: '1'; } }",
        {}
    );
    assert.equal(body, '<div><b data-f="1">X</b><i>Y</i></div>');
});

test('find scoping stays within the matched element, not the whole document', async () => {
    const { body } = await render(
        '<body><b>OUT</b><div><b>IN</b></div></body>',
        "div->find { e: 'b'; ->attr { n: 'data-f'; v: '1'; } }",
        {}
    );
    assert.equal(body, '<b>OUT</b><div><b data-f="1">IN</b></div>');
});
