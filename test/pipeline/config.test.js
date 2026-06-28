'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');
const { jTormConfigModel } = require('../../src/models/config-model/src/config-model.js');

// `config` looks up a value in the host config store (config-model) by its key and
// binds it into the data scope for children. It accepts the key under EITHER `d` (the
// framework-wide data param — each/if/insert/time all use `d`; what the shipped
// components use: site-navigation-element, web-page ×2) OR `k` (the form documented in
// the README, including config gates `config(k: X, v: 1)`). The `v1.0.0` commit 4675148
// renamed `d`→`k` but left the components on `d`, silently breaking their lookups;
// reading either un-breaks them while keeping documented `k:` gates from failing open.

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

// --- config(k: key) → the documented README form is still accepted (alongside d) ---
test('config(k: key) (the documented form) looks up and binds the value', async () => {
    jTormConfigModel.d = { current_url: '/y' };
    try {
        const { body } = await render(
            '<ul><li><a href="/x">A</a></li><li><a href="/y">B</a></li></ul>',
            `->config(k: 'current_url')->find(e: 'a[href="' + current_url + '"]')->attr { n: 'class'; v: 'active'; }`,
            {}
        );
        assert.equal(body, '<ul><li><a href="/x">A</a></li><li><a href="/y" class="active">B</a></li></ul>');
    } finally {
        jTormConfigModel.d = {};
    }
});

// --- config as a GATE must FAIL CLOSED, never open (README: "functions like an if") ---
//
// `config(…, v: 1)` gates its children on config[key] === 1. A key param the method
// does not read makes validate miss → the skip (v.io={}) never runs → children render
// anyway (fail-OPEN). Both documented key params (k and d) must reach the gate so a
// config-off value blocks the children. (Guards Codex P1 on PR #10.)
test('config(k: key, v: value) gate blocks children when the config value mismatches', async () => {
    jTormConfigModel.d = { createDoc: 0 }; // gate OFF
    try {
        const { body } = await render(
            '<body></body>',
            `body->config(k: 'createDoc', v: '1')->append { h: 'GATED'; }`,
            {}
        );
        assert.equal(body, ''); // blocked — must NOT leak 'GATED'
    } finally {
        jTormConfigModel.d = {};
    }
});
