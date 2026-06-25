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

// Pre-existing bug (both branches): the object/nested set() branch referenced an
// undeclared `k2`, clobbered the outer key `k` in the for-in, and dropped the
// recursion target — so any nested config threw / mis-keyed. Fixed here.
test('config-model.set stores a nested object recursively', () => {
    jTormConfigModel.d = {};
    jTormConfigModel.set('site', { title: 'X', nav: { home: '/' } });
    assert.deepEqual(jTormConfigModel.get('site'), { title: 'X', nav: { home: '/' } });
});

test('config-model.set keeps the top-level key (for-in must not clobber it)', () => {
    jTormConfigModel.d = {};
    jTormConfigModel.set('a', { x: '1', y: '2' });
    assert.deepEqual(Object.keys(jTormConfigModel.get()), ['a']);
});

test('config-model.set defines keys as non-writable (write-once, preserved)', () => {
    jTormConfigModel.d = {};
    jTormConfigModel.set('k', 'v');
    assert.equal(Object.getOwnPropertyDescriptor(jTormConfigModel.d, 'k').writable, false);
});
