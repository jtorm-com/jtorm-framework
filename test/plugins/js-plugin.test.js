'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { jTormJsPlugin } = require('../../src/plugins/js-plugin/src/js-plugin.js');
const { jTormJsMethod } = require('../../src/methods/js-method/src/js-method.js');

// A minimal view object: dev's document-model.set(v, fn) reads v.t.s / v.c.s,
// so the fake set() mirrors that contract and runs the callback against <head>.
function fakeView() {
    const { window } = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    const doc = window.document;
    return {
        t: { s: 'body' },
        c: { c: 1, s: null },
        d: null,
        io: null,
        h: {
            d: doc,
            set: async (vo, fn) => {
                const el = doc.querySelector(vo.t.s);
                if (el) await fn(el);
            }
        }
    };
}

function setup() {
    jTormJsPlugin.cache = {};
    jTormJsPlugin.collection = [];
    jTormJsPlugin.uiMethod = { parseUrl: u => u };
    jTormJsPlugin.jsMethod = jTormJsMethod;
    jTormJsMethod.jsPlugin = jTormJsPlugin;
}

// Ported from main: the <script> element must carry every declared attribute,
// not just src + a hardcoded defer.
test('js-plugin renders all declared <script> attributes onto the element', async () => {
    setup();
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
    setup();
    jTormJsPlugin.jsMethod = { params: ['src', 'type'] };

    const v = fakeView();
    await jTormJsPlugin.process(v, { src: 'once.js' });
    await jTormJsPlugin.process(v, { src: 'once.js' });

    assert.equal(v.h.d.querySelectorAll('head script').length, 1);
});

test('js collection is isolated between interleaved root contexts', async () => {
    setup();

    const a = fakeView(), b = fakeView();

    a.t = { p: { src: 'a.js' } };
    a.d = { src: 'a.js' };
    jTormJsMethod.handle(a);

    b.t = { p: { src: 'b.js' } };
    b.d = { src: 'b.js' };
    jTormJsMethod.handle(b);

    await jTormJsPlugin.afterView(b);
    await jTormJsPlugin.afterView(a);

    assert.deepEqual([...b.h.d.querySelectorAll('head script')].map(e => e.getAttribute('src')), ['b.js']);
    assert.deepEqual([...a.h.d.querySelectorAll('head script')].map(e => e.getAttribute('src')), ['a.js']);
});

test('js collection left by a thrown render does not affect the next root context', async () => {
    setup();

    const thrown = fakeView();
    thrown.t = { p: { src: 'stale.js' } };
    thrown.d = { src: 'stale.js' };
    jTormJsMethod.handle(thrown);

    const next = fakeView();
    next.t = { p: { src: 'fresh.js' } };
    next.d = { src: 'fresh.js' };
    jTormJsMethod.handle(next);

    await jTormJsPlugin.afterView(next);

    assert.deepEqual([...next.h.d.querySelectorAll('head script')].map(e => e.getAttribute('src')), ['fresh.js']);
});
