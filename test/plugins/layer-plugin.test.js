'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const { jTormEventModel } = require('../../src/models/event-model/src/event-model.js');
const { jTormLayerModel } = require('../../src/models/layer-model/src/layer-model.js');
const { jTormLayerPlugin } = require('../../src/plugins/layer-plugin/src/layer-plugin.js');
const { jTormUiCachePlugin } = require('../../src/plugins/ui-cache-plugin/src/ui-cache-plugin.js');

// event-model.init() PUSHES each plugin into the event buckets its `event` block
// names, so start every case from a fresh empty tree (the model is a shared
// singleton within this file).
const freshTree = () => ({
    before: { iteration: [], method: [], view: [] },
    after: { iteration: [], method: [], view: [] }
});

const freshLayer = () => ({ before: { iteration: [] }, after: { iteration: [], view: [] } });
const _ = {
    remove(a, fn) {
        for (let i = a.length - 1; i >= 0; i--)
            if (fn(a[i]))
                a.splice(i, 1)
        ;
    }
};

function resetLayer() {
    jTormLayerModel.cid = null;
    jTormLayerModel.event = freshLayer();
    jTormLayerModel.layers = {};
    jTormLayerModel.updated = 0;
    jTormLayerModel.saveModel = null;
    jTormLayerPlugin.currentCid = [];
    jTormLayerPlugin.layerModel = jTormLayerModel;
}

// Regression lock for the working-tree bug: the `v1.0.0` commit (4675148) that
// converted DI placeholders to comments ALSO dropped layer-plugin's `event`
// block. event-model.init does `p.event[k]` for every plugin, so the moment
// jTormLayerPlugin was added to eventModel.plugins it threw (undefined['before']).
test('layer-plugin registers into the event tree without throwing (event block present)', () => {
    jTormEventModel.event = freshTree();
    jTormEventModel.plugins = [jTormLayerPlugin];

    assert.doesNotThrow(() => jTormEventModel.init());

    const e = jTormEventModel.event;
    // Registered exactly where its handlers fire.
    assert.ok(e.before.iteration.includes(jTormLayerPlugin), 'before.iteration (beforeIteration)');
    assert.ok(e.after.iteration.includes(jTormLayerPlugin), 'after.iteration (afterIteration)');
    assert.ok(e.after.view.includes(jTormLayerPlugin), 'after.view (afterView)');
    // Not registered where it has no handler.
    assert.ok(!e.before.view.includes(jTormLayerPlugin), 'not before.view');
    assert.ok(!e.before.method.includes(jTormLayerPlugin), 'not before.method');
    assert.ok(!e.after.method.includes(jTormLayerPlugin), 'not after.method');
});

// The deferred layer fragments must be replayed INTO the document before ui-cache
// snapshots the final body — otherwise the cache would miss the layer transforms.
// event-model.init orders after.view by the nested weight (@jtorm/event-model 1.0.1):
// layer's after.view weight is 0, ui-cache's is 100, so layer sorts first regardless
// of insertion order. (The harness also lists layer before ui-cache, mirroring the
// engine's css/js/layer/ui-cache order.)
test('layer is ordered before ui-cache in after.view (deferred transforms precede the cache snapshot)', () => {
    jTormEventModel.event = freshTree();
    jTormEventModel.plugins = [jTormLayerPlugin, jTormUiCachePlugin]; // harness/engine order
    jTormEventModel.init();

    const av = jTormEventModel.event.after.view;
    assert.ok(
        av.indexOf(jTormLayerPlugin) < av.indexOf(jTormUiCachePlugin),
        'layer must precede ui-cache in after.view so deferred transforms land before the cache snapshot'
    );
});

test('implicit layer cid stack is scoped to the current root context', async () => {
    resetLayer();
    try {
        const
            a = { _: _, c: { c: 1, s: null, a: null }, cid: 'render-a' },
            b = {
                c: { c: 1, s: null, a: null },
                cid: null,
                d: { e: 'after', t: 'view', z: '0' },
                t: { c: [{ s: 'p', m: 'attr', p: { n: 'data-x', v: 'B' }, c: [] }] }
            }
        ;

        await jTormLayerPlugin.beforeIteration(a);

        assert.throws(
            () => jTormLayerModel.set(b),
            /ID not set/,
            'render B must not fall back to render A cid'
        );
    } finally {
        resetLayer();
    }
});
