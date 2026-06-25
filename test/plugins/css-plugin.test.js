'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { jTormCssPlugin } = require('../../src/plugins/css-plugin/src/css-plugin.js');

function fakeView() {
    const { window } = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    const doc = window.document;
    return {
        t: { s: 'body' },
        c: { s: null },
        h: {
            d: doc,
            set: async (vo, fn) => {
                const el = doc.querySelector(vo.t.s);
                if (el) await fn(el);
            }
        }
    };
}

// Synthesis (decided): adopt main's reliable media=print defer swap (its
// "Bugfix defer method"), drop dev's rel=preload/as=style approach.
test('css-plugin defer uses the media=print swap, not rel=preload', async () => {
    jTormCssPlugin.cache = {};
    jTormCssPlugin.uiMethod = { parseUrl: u => u };
    jTormCssPlugin.cssMethod = { params: ['crossorigin', 'defer', 'href', 'integrity', 'media', 'rel'] };

    const v = fakeView();
    await jTormCssPlugin.process(v, { href: 'a.css', defer: true });

    const link = v.h.d.querySelector('head link');
    assert.ok(link, 'link appended to <head>');
    assert.equal(link.getAttribute('rel'), 'stylesheet');
    assert.equal(link.getAttribute('media'), 'print');
    assert.match(link.getAttribute('onload'), /this\.media='all'/);
    assert.equal(link.getAttribute('as'), null, 'no leftover preload as=style');
});

// Retain dev capability: custom rel on non-deferred links.
test('css-plugin keeps a custom rel on non-deferred links', async () => {
    jTormCssPlugin.cache = {};
    jTormCssPlugin.uiMethod = { parseUrl: u => u };
    jTormCssPlugin.cssMethod = { params: ['href', 'rel'] };

    const v = fakeView();
    await jTormCssPlugin.process(v, { href: 'b.css', rel: 'alternate stylesheet' });

    const link = v.h.d.querySelector('head link');
    assert.equal(link.getAttribute('rel'), 'alternate stylesheet');
});
