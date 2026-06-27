'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { jTormJsPlugin } = require('../../src/plugins/js-plugin/src/js-plugin.js');

// A minimal view object: dev's document-model.set(v, fn) reads v.t.s / v.c.s,
// so the fake set() mirrors that contract and runs the callback against <head>.
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

// Ported from main: the <script> element must carry every declared attribute,
// not just src + a hardcoded defer.
test('js-plugin renders all declared <script> attributes onto the element', async () => {
    jTormJsPlugin.cache = {};
    jTormJsPlugin.uiMethod = { parseUrl: u => u };
    jTormJsPlugin.jsMethod = { params: ['async', 'crossorigin', 'defer', 'integrity', 'nomodule', 'referrerpolicy', 'src', 'type'] };

    const v = fakeView();
    await jTormJsPlugin.process(v, { src: 'app.js', async: 'async', type: 'module', integrity: 'sha384-x' });

    const s = v.h.d.querySelector('head script');
    assert.ok(s, 'script appended to <head>');
    assert.equal(s.getAttribute('src'), 'app.js');
    assert.equal(s.getAttribute('async'), 'async');
    assert.equal(s.getAttribute('type'), 'module');
    assert.equal(s.getAttribute('integrity'), 'sha384-x');
});

test('js-plugin de-dupes by src via its cache', async () => {
    jTormJsPlugin.cache = {};
    jTormJsPlugin.uiMethod = { parseUrl: u => u };
    jTormJsPlugin.jsMethod = { params: ['src', 'type'] };

    const v = fakeView();
    await jTormJsPlugin.process(v, { src: 'once.js' });
    await jTormJsPlugin.process(v, { src: 'once.js' });

    assert.equal(v.h.d.querySelectorAll('head script').length, 1);
});
