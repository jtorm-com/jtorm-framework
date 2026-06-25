'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormConfigModel } = require('../../src/models/config-model/src/config-model.js');

// Ported from main: get/set/del must be regular functions so `this` binds to
// the singleton (dev's arrow-fn versions read `this.d` off module scope =
// undefined, throwing for any key). Covers the scalar path that consumers
// (config-method, language-model.init) actually use.
//
// NOTE: the object/nested `set` branch has a separate pre-existing bug on BOTH
// branches (`k2` undefined + 3-arg recursion) — out of scope here, flagged.

test('config-model.get returns a stored scalar by key', () => {
    jTormConfigModel.d = {};
    jTormConfigModel.set('language', 'nl-NL');
    assert.equal(jTormConfigModel.get('language'), 'nl-NL');
});

test('config-model.get() with no key returns the whole config bag', () => {
    jTormConfigModel.d = {};
    jTormConfigModel.set('a', '1');
    assert.deepEqual(jTormConfigModel.get(), { a: '1' });
});

test('config-model.del removes a key', () => {
    jTormConfigModel.d = {};
    jTormConfigModel.set('x', 'y');
    jTormConfigModel.del('x');
    assert.equal(jTormConfigModel.get('x'), undefined);
});
