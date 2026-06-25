'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');

// find { e: X } scopes chained children to descendant X *within* the matched
// element (effective selector `<rule> X`), not the rule's own element. The
// canonical #27 block-form regression lives in known-bugs.test.js; these cover
// the boundary and the real-world inline form.
test('find scoping stays within the matched element, not the whole document', async () => {
    const { body } = await render(
        '<body><b>OUT</b><div><b>IN</b></div></body>',
        "div->find { e: 'b'; ->attr { n: 'data-f'; v: '1'; } }",
        {}
    );
    assert.equal(body, '<b>OUT</b><div><b data-f="1">IN</b></div>');
});

// Real-world form (site-navigation-element): an inline `->find(e: …)->attr`
// chain with no leading selector (every node parses s=false). The found
// selector is used directly — this path was already correct and must stay so.
test('find inline chain (empty selector) scopes to the found element only', async () => {
    const { body } = await render(
        '<body><a href="/x">A</a><a href="/y">B</a></body>',
        `->find(e: 'a[href="/y"]')->attr { n: 'class'; v: 'active'; }`,
        {}
    );
    assert.equal(body, '<a href="/x">A</a><a href="/y" class="active">B</a>');
});
