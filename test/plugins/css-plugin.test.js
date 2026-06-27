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
    assert.match(link.getAttribute('onload'), /this\.media=this\.getAttribute\('data-media'\)\|\|'all'/);
    assert.equal(link.getAttribute('data-media'), null, 'no data-media when none given → defaults to all');
    assert.equal(link.getAttribute('as'), null, 'no leftover preload as=style');
});

// Defer + a specific media must restore THAT media on load, not hardcode 'all' —
// otherwise a deferred media='print'/responsive sheet applies everywhere after load.
// The media is passed as DATA (data-media) and the onload reads it, so a media string
// can never break out of the inline handler (no string interpolation into JS).
test('css-plugin defer preserves a custom media via data-media (not hardcoded all)', async () => {
    jTormCssPlugin.cache = {};
    jTormCssPlugin.uiMethod = { parseUrl: u => u };
    jTormCssPlugin.cssMethod = { params: ['crossorigin', 'defer', 'href', 'integrity', 'media', 'rel'] };

    const v = fakeView();
    await jTormCssPlugin.process(v, { href: 'p.css', defer: true, media: '(max-width: 600px)' });

    const link = v.h.d.querySelector('head link');
    assert.equal(link.getAttribute('media'), 'print', 'loads non-blocking');
    assert.equal(link.getAttribute('data-media'), '(max-width: 600px)', 'original media stashed as data');
    assert.match(link.getAttribute('onload'), /this\.media=this\.getAttribute\('data-media'\)/, 'restored from data, no interpolation');
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
