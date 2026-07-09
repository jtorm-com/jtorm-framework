'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const _ = require('lodash');
const { jTormViewModel: vm } = require('../../src/models/view-model/src/view-model.js');

function reset() {
    vm._ = _;
    vm.data.c = { c: 1, s: null, a: null };
    vm.data.io = { d: null, c: 1, r: 1, v: 0 };
}

test('view-model.create gives root renders distinct own context and io objects', async () => {
    reset();
    try {
        const v1 = await vm.create({}, [], { id: 1 }, 1);
        const v2 = await vm.create({}, [], { id: 2 }, 0);

        assert.ok(Object.hasOwn(v1, 'c'));
        assert.ok(Object.hasOwn(v2, 'c'));
        assert.notStrictEqual(v1.c, v2.c);
        assert.notStrictEqual(v1.c, vm.data.c);
        assert.notStrictEqual(v2.c, vm.data.c);
        assert.deepEqual(v1.c, { c: 1, s: null, a: null });
        assert.deepEqual(v2.c, { c: 0, s: null, a: null });
        assert.deepEqual(vm.data.c, { c: 1, s: null, a: null });

        assert.ok(Object.hasOwn(v1, 'io'));
        assert.ok(Object.hasOwn(v2, 'io'));
        assert.notStrictEqual(v1.io, v2.io);
        assert.notStrictEqual(v1.io, vm.data.io);
        assert.notStrictEqual(v2.io, vm.data.io);
        assert.deepEqual(v1.io, { d: null, c: 1, r: 1, v: 0 });
        assert.deepEqual(v2.io, { d: null, c: 1, r: 1, v: 0 });

        v1.c.s = '.one';
        v1.io.c = 0;
        assert.equal(v2.c.s, null);
        assert.equal(v2.io.c, 1);
        assert.deepEqual(vm.data.c, { c: 1, s: null, a: null });
        assert.deepEqual(vm.data.io, { d: null, c: 1, r: 1, v: 0 });
    } finally {
        reset();
    }
});

test('view-model.create preserves object context by reference for child scopes', async () => {
    reset();
    try {
        const c = { c: 1, s: '.find', a: ['.anc'] };
        const v = await vm.create({}, [], {}, c);

        assert.ok(Object.hasOwn(v, 'c'));
        assert.strictEqual(v.c, c);
        v.c.s = '.next';
        assert.equal(c.s, '.next');
        assert.deepEqual(vm.data.c, { c: 1, s: null, a: null });
    } finally {
        reset();
    }
});
