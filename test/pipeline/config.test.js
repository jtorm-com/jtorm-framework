'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');
const { jTormConfigModel } = require('../../src/models/config-model/src/config-model.js');

// `config` looks up a value in the host config store (config-model) by its DATA key
// and binds it into the data scope for children. The key param is `d` (Data) — the
// framework-wide convention (each/if/insert/time all use `d`). The shipped components
// use `->config(d: …)` (site-navigation-element, web-page ×2); only one outlier used
// `k:`. The `v1.0.0` commit 4675148 renamed the param `d`→`k` but never updated the
// call-sites, silently breaking those lookups — reverted here.

// --- config(d: key) → look up + bind under the key (the site-navigation-element form) ---
//
// This is site-navigation-element's real active-link mechanism: config provides
// current_url (NOT the model data), the deferred find→attr marks the matching link.
test('config(d: key) looks up the config value and binds it for children', async () => {
    jTormConfigModel.d = { current_url: '/y' }; // host-provided config
    try {
        const { body } = await render(
            '<ul><li><a href="/x">A</a></li><li><a href="/y">B</a></li></ul>',
            `->config(d: 'current_url')->find(e: 'a[href="' + current_url + '"]')->attr { n: 'class'; v: 'active'; }`,
            {}
        );
        assert.equal(body, '<ul><li><a href="/x">A</a></li><li><a href="/y" class="active">B</a></li></ul>');
    } finally {
        jTormConfigModel.d = {};
    }
});

// --- config(d: key, a: alias) → bind under the alias (the web-page form) ---
//
// web-page-default.tss: `html->config(d:'dir', a:'dir')->attr{ n:'dir'; v:dir; }`. The
// looked-up config key and the binding name differ here to prove the alias is honored.
test('config(d: key, a: alias) binds the looked-up value under the alias', async () => {
    jTormConfigModel.d = { site_theme: 'dark' };
    try {
        const { body } = await render(
            '<div></div>',
            `div->config(d: 'site_theme', a: 'theme')->attr { n: 'data-theme'; v: theme; }`,
            {}
        );
        assert.equal(body, '<div data-theme="dark"></div>');
    } finally {
        jTormConfigModel.d = {};
    }
});
