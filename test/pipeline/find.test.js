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

// Scope-leak guard: a block-form find must resolve to `<rule> <e>` and stay
// within the matched element. The old `new RegExp(s).test(m)` containment proxy
// matched letter-wise — `/a/.test('span')` is true ('a' ∈ 'span') — so it
// dropped the parent scope and collapsed `a->find{e:'span'}` to bare `span`,
// tagging every span in the document.
test('find block-form does not leak to matching descendants outside the rule element', async () => {
    const { body } = await render(
        '<body><a href="/x"><span>IN</span></a><span>OUT</span></body>',
        "a->find { e: 'span'; ->attr { n: 'data-f'; v: '1'; } }",
        {}
    );
    assert.equal(body, '<a href="/x"><span data-f="1">IN</span></a><span>OUT</span>');
});

// Regex-injection guard: a rule selector with a regex metachar (`*`, here the
// universal selector) fed to `new RegExp(s)` threw ("nothing to repeat"). The
// regex-free getSelector must treat selectors as plain strings.
test('find block-form handles a metachar rule selector without throwing', async () => {
    const { body } = await render(
        '<body><p><em>X</em></p></body>',
        "*->find { e: 'em'; ->attr { n: 'data-f'; v: '1'; } }",
        {}
    );
    assert.equal(body, '<p><em data-f="1">X</em></p>');
});
