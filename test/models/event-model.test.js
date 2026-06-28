'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormEventModel } = require('../../src/models/event-model/src/event-model.js');

// init() pushes plugins into the buckets their `event` block names, so start each
// case from a fresh empty tree (the model is a shared singleton within this file).
const freshTree = () => ({
    before: { iteration: [], method: [], view: [] },
    after: { iteration: [], method: [], view: [] }
});

// Regression lock: the original sort compared `a.weight` — a plugin's absent
// TOP-LEVEL weight (undefined) — instead of the per-phase weight at
// plugin.event[phase][type].weight. So `undefined - undefined` (NaN) left every
// bucket in array INSERTION ORDER and the declared weights (e.g. debug's 9999,
// ui-cache's after.view 100) were silently never honored. Fixed to read the nested
// weight for the phase/type being sorted.
test('event-model.init orders a bucket by the plugin nested weight, not insertion order', () => {
    const low = { event: { after: { view: { weight: 0 } } } };
    const high = { event: { after: { view: { weight: 100 } } } };

    jTormEventModel.event = freshTree();
    jTormEventModel.plugins = [high, low]; // inserted high-first

    jTormEventModel.init();

    const av = jTormEventModel.event.after.view;
    assert.ok(
        av.indexOf(low) < av.indexOf(high),
        'lower-weight plugin must sort first regardless of insertion order'
    );
});

// Coverage for the previously-untested registration guard: a plugin lands only in the
// phases/types its `event` block names (init guards on `p.event[k] && p.event[k][k2]`).
test('event-model.init registers a plugin only where its event block names a weight', () => {
    const p = { event: { before: { iteration: { weight: 5 } }, after: { view: { weight: 9 } } } };

    jTormEventModel.event = freshTree();
    jTormEventModel.plugins = [p];

    jTormEventModel.init();

    const e = jTormEventModel.event;
    assert.ok(e.before.iteration.includes(p), 'before.iteration');
    assert.ok(e.after.view.includes(p), 'after.view');
    assert.ok(!e.after.iteration.includes(p), 'not after.iteration');
    assert.ok(!e.before.view.includes(p), 'not before.view');
});
