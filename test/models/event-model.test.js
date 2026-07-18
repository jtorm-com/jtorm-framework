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

test('event-model forwards opaque arguments and dispatches optional complete/abort hooks over the unchanged after bucket', async () => {
    const calls = [], token = {};
    const plain = {
        event: {before: {iteration: {weight: 0}}, after: {iteration: {weight: 0}}},
        beforeIteration(v, x) { calls.push(['before', v, x]); },
        afterIteration(v, x) { calls.push(['after', v, x]); }
    };
    const lifecycle = {
        event: {after: {iteration: {weight: 1}}},
        afterIteration(v, x) { calls.push(['after-lifecycle', v, x]); },
        completeIteration(v, x) { calls.push(['complete', v, x]); },
        abortIteration(v, x, error) { calls.push(['abort', v, x, error]); }
    };
    const beforeTree = Object.keys(jTormEventModel.event).sort();
    jTormEventModel.event = freshTree();
    jTormEventModel.plugins = [plain, lifecycle];
    jTormEventModel.init();
    const v = {}, error = new Error('original');

    await jTormEventModel.handle(v, 'before', 'iteration', token);
    await jTormEventModel.handle(v, 'after', 'iteration', token);
    await jTormEventModel.complete(v, 'iteration', token);
    await jTormEventModel.abort(v, 'iteration', token, error);

    assert.deepEqual(calls.map(value => value[0]), ['before', 'after', 'after-lifecycle', 'complete', 'abort']);
    for (const value of calls) {
        assert.strictEqual(value[1], v);
        assert.strictEqual(value[2], token);
    }
    assert.strictEqual(calls[4][3], error);
    assert.deepEqual(Object.keys(jTormEventModel.event).sort(), beforeTree, 'no complete/abort event buckets are added');
});

test('event-model defers one commit until every completion hook succeeds', async () => {
    const calls = [], token = {};
    const staged = {
        event: {after: {iteration: {weight: 0}}},
        completeIteration() {
            calls.push('prepare');
            return function () { calls.push('commit'); };
        }
    };
    const later = {
        event: {after: {iteration: {weight: 1}}},
        completeIteration() { calls.push('later'); }
    };
    jTormEventModel.event = freshTree();
    jTormEventModel.plugins = [staged, later];
    jTormEventModel.init();

    await jTormEventModel.complete({}, 'iteration', token);
    assert.deepEqual(calls, ['prepare', 'later', 'commit']);
});

test('event-model rejects competing deferred commits before either can publish', async () => {
    let commits = 0;
    const plugin = weight => ({
        event: {after: {iteration: {weight}}},
        completeIteration() { return function () { commits++; }; }
    });
    jTormEventModel.event = freshTree();
    jTormEventModel.plugins = [plugin(0), plugin(1)];
    jTormEventModel.init();

    await assert.rejects(
        () => jTormEventModel.complete({}, 'iteration', {}),
        /Multiple completion commits/
    );
    assert.equal(commits, 0);
});

test('event-model attempts every abort hook and suppresses cleanup failures', async () => {
    const calls = [], original = new Error('original');
    const failed = {
        event: {after: {iteration: {weight: 0}}},
        abortIteration() { calls.push('failed'); throw new Error('cleanup'); }
    };
    const later = {
        event: {after: {iteration: {weight: 1}}},
        abortIteration() { calls.push('later'); }
    };
    jTormEventModel.event = freshTree();
    jTormEventModel.plugins = [failed, later];
    jTormEventModel.init();

    await assert.doesNotReject(() => jTormEventModel.abort({}, 'iteration', {}, original));
    assert.deepEqual(calls, ['failed', 'later']);
});
