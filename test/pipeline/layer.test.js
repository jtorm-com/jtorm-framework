'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');
const { jTormConfigModel } = require('../../src/models/config-model/src/config-model.js');

// `layer` — the deferred-fragment verb. layer-method stashes its child fragment via
// layer-model (registering it under event[e][t], e.g. after.view) and halts inline
// processing (v.io={}); the layer-plugin replays the stashed fragments at the matching
// event phase, against the FINISHED document. Its canonical use is marking the active
// nav link after the whole view has rendered (site-navigation-element).
//
// These goldens lock the layer MECHANISM (deferred after-view replay, the exact
// site-navigation-element active-link chain, and z-ordering). The FULL
// site-navigation-element component is NOT golden-able as one unit — it is blocked by
// two deeper, pre-existing issues (documented in docs/backlog.md), NOT by the layer wiring:
//   - cid coupling: its top-level `->layer` (no explicit `i:`) needs layerModel.cid set
//     by a host-supplied component cache id; ui-method emits no cid, so a pure boil has
//     v.cid=null → "ID not set" unless invoked host-style (insert with a cid).
//   - selectorless scope: invoking it cid-tagged (via an append iteration) drops the
//     ancestor scope its selectorless `->ui{@e.nav}` injection needs → "false not found"
//     (the same class as the deferred Thing.default composition).
// (The third issue once listed here — `->config(d: 'current_url')` being a no-op — was a
// real bug, now FIXED: config-method reads `v.d.d` again, so current_url reaches the layer
// from the host config store, exercised in golden #2 below.)

// --- the deferred after-view replay marks the matching element ---
//
// The find→attr fragment lives INSIDE `->layer`, so layer-method does NOT run it inline
// (v.io={}); it is the layer-plugin's afterView replay that boils it against the final
// document. The `class="active"` therefore only appears because the deferred replay ran
// — i.e. it proves the plugin wiring end-to-end. Only the matched href is marked.
test('layer defers a find→attr to after-view, marking only the matched link', async () => {
    const { body } = await render(
        '<ul><li><a href="/x">A</a></li><li><a href="/y">B</a></li></ul>',
        `->layer { i: 'nav'; e: 'after'; t: 'view'; ->find(e: 'a[href="/y"]')->attr { n: 'class'; v: 'active'; } }`,
        {}
    );
    assert.equal(body, '<ul><li><a href="/x">A</a></li><li><a href="/y" class="active">B</a></li></ul>');
});

// --- site-navigation-element's EXACT deferred active-link chain, in isolation ---
//
// Mirrors site-navigation-element-default.tss's `->layer { e:'after'; t:'view'; z:'1';
// ->config(d:'current_url')->find(e:'a[href="'+current_url+'"]')->attr{m:'a'} }`. Proves
// the full chain in the deferred replay: `config` looks up current_url in the HOST CONFIG
// STORE and binds it for the children, the inline `->find(e:…)->attr` (#27) scopes to the
// matched anchor, and `m:'a'` APPENDS `active` to the existing class (not replace).
test('layer config→find→attr appends active to the current_url link (m:a append)', async () => {
    jTormConfigModel.d = { current_url: '/y' }; // host config drives the active link
    try {
        const { body } = await render(
            '<ul><li><a href="/x">A</a></li><li><a href="/y" class="nav-link">B</a></li></ul>',
            `->layer { i: 'nav'; e: 'after'; t: 'view'; z: '1'; ` +
                `->config(d: 'current_url')` +
                `->find(e: 'a[href="' + current_url + '"]')` +
                `->attr { n: 'class'; v: 'active'; m: 'a'; } }`,
            {}
        );
        assert.equal(body, '<ul><li><a href="/x">A</a></li><li><a href="/y" class="nav-link active">B</a></li></ul>');
    } finally {
        jTormConfigModel.d = {};
    }
});

// --- z orders the deferred fragments (layer-model.get sorts by z ascending) ---
//
// Two fragments registered under the same id+phase: z:1 replays before z:2, so the
// appended classes land in z order ("first" then "second").
test('layer replays deferred fragments in z order (ascending)', async () => {
    const { body } = await render(
        '<p></p>',
        `->layer { i: 'x'; e: 'after'; t: 'view'; z: '2'; ->find(e: 'p')->attr { n: 'class'; v: 'second'; m: 'a'; } } ` +
        `->layer { i: 'x'; e: 'after'; t: 'view'; z: '1'; ->find(e: 'p')->attr { n: 'class'; v: 'first'; m: 'a'; } }`,
        {}
    );
    assert.equal(body, '<p class="first second"></p>');
});

test('layer registered inside a detached append fragment replays at root after-view', async () => {
    const { body } = await render(
        '<div><p></p></div>',
        `div->append { ` +
            `->layer { i: 'x'; e: 'after'; t: 'view'; ` +
                `->find(e: 'p')->attr { n: 'class'; v: 'active'; } } }`,
        {}
    );
    assert.equal(body, '<div><p class="active"></p></div>');
});

test('layer registered inside an each(e:) cloned element replays at root after-view', async () => {
    const { body } = await render(
        '<ul><li><a href="/x">A</a></li></ul>',
        `ul->each { e: 'li'; d: items; ` +
            `->layer { i: 'x'; e: 'after'; t: 'view'; ` +
                `->find(e: 'a[href="/x"]')->attr { n: 'class'; v: 'active'; } } }`,
        { items: [{ name: 'one' }] }
    );
    assert.equal(body, '<ul><li><a href="/x" class="active">A</a></li></ul>');
});
