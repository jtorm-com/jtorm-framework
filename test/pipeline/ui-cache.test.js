'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');
const { jTormUiCacheModel } = require('../../src/models/ui-cache-model/src/ui-cache-model.js');

test('ui-cache dirty flag from a detached append fragment is saved at root after-view', async () => {
    const store = { sets: 0, o: null, set(o) { this.o = o; this.sets++; } };

    try {
        await render(
            '<div></div>',
            `div->append { cid: 'frag'; ->inner { t: 'cached'; } }`,
            {}, 'http://localhost/', null, 0, null, 0,
            {clock: () => 0, persistenceClock: () => 0, uiCacheStore: store}
        );

        assert.equal(store.sets, 1, 'root after-view save must persist the fragment cache write');
        assert.deepEqual(store.o, {version: 1, fragments: [{
            language: 'null', cid: 'frag', variant: 'http://localhost\0default',
            html: 'cached', settledAt: 0
        }]});
    } finally {
        jTormUiCacheModel.saveModel = null;
    }
});

test('the pipeline harness does not leak an injected persistence adapter into the next render', async () => {
    const store = {sets: 0, set() { this.sets++; }};
    const options = {clock: () => 0, persistenceClock: () => 0, uiCacheStore: store};

    await render(
        '<div></div>', `div->append { cid: 'first'; ->inner { t: 'A'; } }`,
        {}, 'http://localhost/', null, 0, null, 0, options
    );
    assert.equal(store.sets, 1);

    await render(
        '<div></div>', `div->append { cid: 'second'; ->inner { t: 'B'; } }`,
        {}, 'http://localhost/', null, 0, null, 0,
        {clock: () => 0, persistenceClock: () => 0}
    );
    assert.equal(store.sets, 1, 'an omitted adapter means persistence is disabled for that render');
});

test('persisted scoped fragments survive restart only for remaining ttl and never serve an unscoped render', async () => {
    let now = 0;
    const clock = () => now;
    const store = {
        uiCacheScoped: true,
        value: null,
        get() { return this.value; },
        set(value) { this.value = value; }
    };
    const scoped = {c: 0, s: null, a: null, request: {tenant: 'tenant-a'}};
    const options = {clock, persistenceClock: clock, ttl: 10, uiCacheStore: store, uiCacheInit: true};

    try {
        const first = await render(
            '<div></div>', "div->append { cid: 'same'; ->inner { t: 'A'; } }", {},
            'http://localhost/', null, scoped, null, 0, options
        );
        assert.equal(first.body, '<div>A</div>');
        assert.equal(store.value.fragments[0].settledAt, 0);

        now = 9;
        const remaining = await render(
            '<div></div>', "div->append { cid: 'same'; ->inner { t: 'B'; } }", {},
            'http://localhost/', null, scoped, null, 0, options
        );
        assert.equal(remaining.body, '<div>A</div>', 'restart reuses the fragment before its original boundary');

        now = 10;
        const expired = await render(
            '<div></div>', "div->append { cid: 'same'; ->inner { t: 'B'; } }", {},
            'http://localhost/', null, scoped, null, 0, options
        );
        assert.equal(expired.body, '<div>B</div>', 'the original boundary renders fresh source');
        assert.equal(store.value.fragments[0].settledAt, 10);

        now = 11;
        const fresh = await render(
            '<div></div>', "div->append { cid: 'same'; ->inner { t: 'C'; } }", {},
            'http://localhost/', null, {c: 0, s: null, a: null}, null, 0, options
        );
        assert.equal(fresh.body, '<div>C</div>', 'an unscoped same-identity render cannot consume persisted tenant bytes');
    } finally {
        jTormUiCacheModel.saveModel = null;
    }
});
