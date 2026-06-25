'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const _ = require('lodash');
const { makeDataParser } = require('../helpers/parser.js');

// Ported from main ("out of scope model to inspect ... in a loop"): when a
// method is invoked with NO explicit props, the parser auto-binds each declared
// param from the model by name. Unresolved auto-bound params are omitted
// (undefined), not null, so they don't clobber. dev's handler already passes
// r.params as handle()'s 2nd arg — the feature was dormant.

function view(props, model) {
    return { _, t: { p: props }, m: model, d: null };
}

test('handle(): empty props auto-bind declared params from the model', () => {
    const dp = makeDataParser();
    const v = view({}, { src: 'a.jpg', alt: 'cat' });
    dp.handle(v, ['src', 'alt']);
    assert.equal(v.d.src, 'a.jpg');
    assert.equal(v.d.alt, 'cat');
});

test('handle(): an unresolved auto-bound param is omitted (undefined), not null', () => {
    const dp = makeDataParser();
    const v = view({}, { src: 'a.jpg' });
    dp.handle(v, ['src', 'alt']);
    assert.equal(v.d.src, 'a.jpg');
    assert.equal(v.d.alt, undefined);
});

test('handle(): explicit props still win, var semantics preserved', () => {
    const dp = makeDataParser();
    const v = view({ n: "'data-x'", v: 'val' }, { val: '1' });
    dp.handle(v, ['n', 'v']);
    assert.equal(v.d.n, 'data-x'); // quoted literal
    assert.equal(v.d.v, '1');      // resolved var
});

test('handle(): no props and no params is a safe no-op (v.d = {})', () => {
    const dp = makeDataParser();
    const v = view({}, { src: 'a.jpg' });
    dp.handle(v); // a undefined — must not throw
    assert.deepEqual(v.d, {});
});
