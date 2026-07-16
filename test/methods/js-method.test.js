'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormJsMethod } = require('../../src/methods/js-method/src/js-method.js');

// Ported from main (2025-01-06 "Add support for all possible attributes"):
// js-method must declare every <script> attribute and queue the full parsed
// attr set for the plugin — not just { src }.

test('js-method declares all <script> attribute params', () => {
    for (const p of ['async', 'crossorigin', 'defer', 'integrity', 'nomodule', 'referrerpolicy', 'src', 'type'])
        assert.ok(jTormJsMethod.params.includes(p), `missing param: ${p}`)
    ;
});

test('js-method queues the full parsed attr set (not just src)', () => {
    const plugin = { cache: {}, collection: [] };
    jTormJsMethod.jsPlugin = plugin;

    const v = {
        c: { c: 1 },
        t: { p: { src: 'a.js' } },
        d: { src: 'a.js', async: 'async', type: 'module' }
    };

    const effect = jTormJsMethod.handle(v);

    assert.equal(plugin.collection.length, 1);
    assert.deepEqual(plugin.collection[0], { src: 'a.js', async: 'async', type: 'module' });
    assert.deepEqual(effect, { children: true });
});
