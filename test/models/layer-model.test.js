'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormLayerModel: l } = require('../../src/models/layer-model/src/layer-model.js');
const { jTormRenderContextModel: cm } = require('../../src/models/render-context-model/src/render-context-model.js');

const ev = () => ({ before: { iteration: [] }, after: { iteration: [], view: [] } });

function reset() {
    l.renderContextModel = cm;
    l.cid = null;
    l.event = ev();
    l.layers = {};
    l.updated = 0;
    l.saveModel = null;
}

function v(c, i, n) {
    return {
        c: c,
        cid: null,
        d: { i: i, e: 'after', t: 'view', z: '0' },
        t: { c: [{ s: 'p', m: 'attr', p: { n: 'data-x', v: n }, c: [] }] }
    };
}

test('layer fragments are scoped to the root render context that registered them', () => {
    reset();
    try {
        const
            a = { c: 1, s: null, a: null },
            b = { c: 1, s: null, a: null },
            av = v(a, 'a', 'A'),
            bv = v(b, 'b', 'B')
        ;

        l.set(av);

        assert.deepEqual(l.get(bv, 'after', 'view'), [], 'a separate root context must not see render A layers');
        assert.deepEqual(l.get(av, 'after', 'view'), av.t.c, 'render A still sees its own layer');

        l.set(bv);

        assert.deepEqual(l.get(av, 'after', 'view'), av.t.c, 'render B layers must not join render A');
        assert.deepEqual(l.get(bv, 'after', 'view'), bv.t.c, 'render B sees only its own layer');
    } finally {
        reset();
    }
});

test('unsaved layer state left by a thrown render cannot affect the next root context', () => {
    reset();
    try {
        const
            a = { c: 1, s: null, a: null },
            b = { c: 1, s: null, a: null },
            av = v(a, 'throwing', 'A'),
            bv = v(b, 'next', 'B')
        ;

        l.set(av); // render A throws before after.view/save

        assert.deepEqual(l.get(bv, 'after', 'view'), [], 'next render starts without render A residue');

        l.set(bv);
        assert.deepEqual(l.get(bv, 'after', 'view'), bv.t.c, 'next render can still collect its own layer');
    } finally {
        reset();
    }
});

test('initCache-loaded layers seed a root render context', async () => {
    reset();
    try {
        const t = { s: 'p', m: 'attr', p: { n: 'data-x', v: 'cached' }, c: [] };
        l.saveModel = {
            get: async () => ({
                event: { before: { iteration: [] }, after: { iteration: [], view: ['cached'] } },
                layers: { cached: [{ z: 0, t: t }] }
            })
        };

        await l.initCache();

        assert.deepEqual(
            l.get({ c: { c: 1, s: null, a: null } }, 'after', 'view'),
            [t],
            'a context-backed render must see cached layer state loaded by initCache()'
        );
    } finally {
        reset();
    }
});
