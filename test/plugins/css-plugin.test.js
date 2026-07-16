'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { jTormCssPlugin } = require('../../src/plugins/css-plugin/src/css-plugin.js');
const { jTormCssMethod } = require('../../src/methods/css-method/src/css-method.js');
const { jTormRequestModel } = require('../../src/models/request-model/src/request-model.js');
const { jTormAssetPluginModel } = require('../../src/models/asset-plugin-model/src/asset-plugin-model.js');
const { jTormRenderContextModel } = require('../../src/models/render-context-model/src/render-context-model.js');

function fakeView(html, url) {
    const { window } = new JSDOM(
        html || '<!DOCTYPE html><html><head></head><body></body></html>',
        url ? { url } : undefined
    );
    const doc = window.document;
    return {
        t: { s: 'body' },
        c: { c: 1, s: null },
        d: null,
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
    jTormAssetPluginModel.renderContextModel = jTormRenderContextModel;
    jTormCssPlugin.assetPluginModel = jTormAssetPluginModel;
    jTormCssPlugin.cache = {};
    jTormCssPlugin.collection = [];
    jTormCssPlugin.uiResolverModel = { parseUrl: u => u };
    jTormCssPlugin.requestModel = jTormRequestModel;
    jTormRequestModel.renderContextModel = jTormRenderContextModel;
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

test('css-plugin de-dupes by original href via its cache', async () => {
    setup();
    const v = fakeView();

    await jTormCssPlugin.process(v, { href: 'once.css' });
    await jTormCssPlugin.process(v, { href: 'once.css' });

    assert.equal(v.h.d.querySelectorAll('head link').length, 1);
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
    const create = v.h.d.createElement.bind(v.h.d);
    let creates = 0;
    v.h.d.createElement = (...args) => { creates++; return create(...args); };
    v.c.request = { base: 'https://cdn.example/' };

    await assert.rejects(
        () => jTormCssPlugin.process(v, { href: '@x/theme.css' }),
        /URL blocked https:\/\/evil\.example\/x\.css/
    );
    assert.equal(creates, 0, 'policy runs before element creation');
    assert.equal(v.h.d.querySelector('head link'), null);
});

test('css-plugin blocks a relative href resolved by an external document base', async () => {
    setup();
    const v = fakeView(
        '<!DOCTYPE html><html><head><base href="https://evil.example/"></head><body></body></html>',
        'https://app.example/page'
    );

    await assert.rejects(
        () => jTormCssPlugin.process(v, { href: 'theme.css' }),
        /URL blocked https:\/\/evil\.example\/theme\.css/
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

    const h = await jTormCssPlugin.afterView(v);

    assert.strictEqual(h, v.h);
    assert.deepEqual([...v.h.d.querySelectorAll('head link')].map(e => e.getAttribute('href')), ['legacy.css']);
    assert.deepEqual(jTormCssPlugin.collection, []);
});

test('css afterView clears render state when asset policy rejects', async () => {
    setup();
    const v = fakeView();
    v.c.request = { base: 'https://app.example/' };
    jTormCssPlugin.collection.push({ href: 'https://evil.example/x.css' });

    await assert.rejects(() => jTormCssPlugin.afterView(v), /URL blocked/);
    assert.deepEqual(v.c.css, { cache: {}, collection: [] });
    assert.deepEqual(jTormCssPlugin.collection, []);
});

test('css afterView clears render state when head insertion throws', async () => {
    setup();
    const v = fakeView();
    v.h.set = async (vo, fn) => fn({appendChild: () => { throw new Error('insert failed'); }});
    jTormCssPlugin.collection.push({ href: 'local.css' });

    await assert.rejects(() => jTormCssPlugin.afterView(v), /insert failed/);
    assert.deepEqual(v.c.css, { cache: {}, collection: [] });
    assert.deepEqual(jTormCssPlugin.collection, []);
});
