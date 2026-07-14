'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { jTormCssPlugin } = require('../../src/plugins/css-plugin/src/css-plugin.js');
const { jTormCssMethod } = require('../../src/methods/css-method/src/css-method.js');
const { jTormRequestModel } = require('../../src/models/request-model/src/request-model.js');

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
    jTormCssPlugin.cache = {};
    jTormCssPlugin.collection = [];
    jTormCssPlugin.uiResolverModel = { parseUrl: u => u };
    jTormCssPlugin.requestModel = jTormRequestModel;
    jTormCssPlugin.cssMethod = jTormCssMethod;
    jTormCssMethod.cssPlugin = jTormCssPlugin;
}

// Synthesis (decided): adopt main's reliable media=print defer swap (its
// "Bugfix defer method"), drop dev's rel=preload/as=style approach.
test('css-plugin defer uses the media=print swap, not rel=preload', async () => {
    setup();
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
    setup();
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
    setup();
    jTormCssPlugin.cssMethod = { params: ['href', 'rel'] };

    const v = fakeView();
    await jTormCssPlugin.process(v, { href: 'b.css', rel: 'alternate stylesheet' });

    const link = v.h.d.querySelector('head link');
    assert.equal(link.getAttribute('rel'), 'alternate stylesheet');
});

test('css-plugin expands href through the injected UI resolver', async () => {
    setup();
    const seen = [];
    jTormCssPlugin.uiResolverModel = {
        parseUrl: u => { seen.push(u); return 'assets/' + u; }
    };

    const v = fakeView();
    v.c.request = { base: 'https://cdn.example/' };
    await jTormCssPlugin.process(v, { href: 'theme.css' });

    assert.deepEqual(seen, ['theme.css']);
    assert.equal(v.h.d.querySelector('head link').href, 'https://cdn.example/assets/theme.css');
});

test('css-plugin blocks an expanded external href before DOM injection', async () => {
    setup();
    jTormCssPlugin.uiResolverModel = {
        parseUrl: () => 'https://evil.example/x.css'
    };

    const v = fakeView();
    v.c.request = { base: 'https://cdn.example/' };

    await assert.rejects(
        () => jTormCssPlugin.process(v, { href: '@x/theme.css' }),
        /URL blocked https:\/\/evil\.example\/x\.css/
    );
    assert.equal(v.h.d.querySelector('head link'), null);
});

test('css collection is isolated between interleaved root contexts', async () => {
    setup();

    const a = fakeView(), b = fakeView();

    a.t = { p: { href: 'a.css' } };
    a.d = { href: 'a.css' };
    jTormCssMethod.handle(a);

    b.t = { p: { href: 'b.css' } };
    b.d = { href: 'b.css' };
    jTormCssMethod.handle(b);

    await jTormCssPlugin.afterView(b);
    await jTormCssPlugin.afterView(a);

    assert.deepEqual([...b.h.d.querySelectorAll('head link')].map(e => e.getAttribute('href')), ['b.css']);
    assert.deepEqual([...a.h.d.querySelectorAll('head link')].map(e => e.getAttribute('href')), ['a.css']);
});

test('css collection left by a thrown render does not affect the next root context', async () => {
    setup();

    const thrown = fakeView();
    thrown.t = { p: { href: 'stale.css' } };
    thrown.d = { href: 'stale.css' };
    jTormCssMethod.handle(thrown);

    const next = fakeView();
    next.t = { p: { href: 'fresh.css' } };
    next.d = { href: 'fresh.css' };
    jTormCssMethod.handle(next);

    await jTormCssPlugin.afterView(next);

    assert.deepEqual([...next.h.d.querySelectorAll('head link')].map(e => e.getAttribute('href')), ['fresh.css']);
});

test('css afterView drains a legacy singleton queue when paired with an old/custom method', async () => {
    setup();

    const v = fakeView();
    jTormCssPlugin.collection.push({ href: 'legacy.css' });

    await jTormCssPlugin.afterView(v);

    assert.deepEqual([...v.h.d.querySelectorAll('head link')].map(e => e.getAttribute('href')), ['legacy.css']);
    assert.deepEqual(jTormCssPlugin.collection, []);
});
