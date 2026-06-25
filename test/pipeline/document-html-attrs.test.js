'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');

// Ported from main ("Bugfix missing attributes on html tag"): the root <html>
// element's own attributes (lang, class, …) must survive a full-document boil.
// dev's `documentElement.innerHTML = h` drops them.
test('root <html> attributes (lang, class) survive a full-document render', async () => {
    const { html } = await render(
        '<html lang="nl" class="no-js"><head></head><body><p>x</p></body></html>',
        "p->text(label: greeting)->inner { h: label; }",
        { greeting: 'hi' }
    );
    assert.match(html, /<html[^>]*\blang="nl"/, 'lang preserved');
    assert.match(html, /<html[^>]*\bclass="no-js"/, 'class preserved');
    assert.match(html, /<p>hi<\/p>/, 'transform still applied on full-document input');
});
