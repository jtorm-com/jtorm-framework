'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js'); // wires jTormDocumentModel (errorHandler etc.)
const { JSDOM } = require('jsdom');
const { jTormDocumentModel } = require('../../src/models/document-model/src/document-model.js');

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

// Client path (v.c.c falsy → the live document is REUSED across renders): the root
// attr copy must CLEAR stale attrs first, or a render whose <html> dropped lang/class
// keeps the previous render's values (innerHTML doesn't reset the root's own attrs).
test('a reused document clears stale root <html> attrs between full-document renders', () => {
    const { window } = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    jTormDocumentModel.windowModel = window; // errorHandler already wired via the engine import

    const v = { c: { c: 0 } }; // reuse window.document (live/client path)

    jTormDocumentModel.create('<html lang="nl" class="no-js"><head></head><body><p>1</p></body></html>', v, false);
    const r = jTormDocumentModel.create('<html><head></head><body><p>2</p></body></html>', v, false);

    assert.equal(r.d.documentElement.getAttribute('lang'), null, 'stale lang cleared');
    assert.equal(r.d.documentElement.hasAttribute('class'), false, 'stale class cleared');
    assert.match(r.d.body.innerHTML, /<p>2<\/p>/, 'new content applied');
});
