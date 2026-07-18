'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');
const { jTormUiCacheModel } = require('../../src/models/ui-cache-model/src/ui-cache-model.js');

test('ui-cache dirty flag from a detached append fragment is saved at root after-view', async () => {
    const store = { sets: 0, o: null, set(o) { this.o = o; this.sets++; } };
    jTormUiCacheModel.saveModel = store;

    try {
        await render(
            '<div></div>',
            `div->append { cid: 'frag'; ->inner { t: 'cached'; } }`,
            {}
        );

        assert.equal(store.sets, 1, 'root after-view save must persist the fragment cache write');
        assert.equal(store.o.null.frag['http://localhost\0default'], 'cached');
    } finally {
        jTormUiCacheModel.saveModel = null;
    }
});
