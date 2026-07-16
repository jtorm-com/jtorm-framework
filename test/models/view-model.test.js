'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const _ = require('lodash');
const { jTormViewModel: vm } = require('../../src/models/view-model/src/view-model.js');
const { makeTssParser } = require('../helpers/parser.js');

function reset() {
    vm._ = _;
    vm.data.c = { c: 1, s: null, a: null };
}

test('view-model.create gives root renders distinct own context objects and no mutable io side channel', async () => {
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

        assert.ok(!Object.hasOwn(v1, 'io'));
        assert.ok(!Object.hasOwn(v2, 'io'));
        assert.ok(!Object.hasOwn(vm.data, 'io'));

        v1.c.s = '.one';
        assert.equal(v2.c.s, null);
        assert.deepEqual(vm.data.c, { c: 1, s: null, a: null });
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

test('view-model.create preserves parser error identity and source position', async () => {
    reset();
    const parser = makeTssParser();
    let observed;
    vm.tssParser = {
        handle: function (source) {
            try {
                return parser.handle(source);
            } catch (error) {
                observed = error;
                throw error;
            }
        }
    };

    try {
        await assert.rejects(
            () => vm.create({}, 'a{', {}, 1),
            error => {
                assert.strictEqual(error, observed);
                assert.ok(error instanceof SyntaxError);
                assert.deepEqual(
                    [error.line, error.column, error.offset],
                    [1, 2, 1]
                );
                return true;
            }
        );
    } finally {
        delete vm.tssParser;
        reset();
    }
});
