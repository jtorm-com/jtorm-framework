/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormMoveMethod: {
        // DI
        methods: null,
        viewModel: null,

        alias: 'm',
        params: ['l', 'm'],

        validate: function (j, v) {
            return (v.t.s && v.d.l && v.d.m);
        },

        handle: async function (j, v) {
            const s = this;

            await v.h.set(v.t.s, async function (e) {
                let sv = s.viewModel.copy(j, v);

                sv.d = {h: e.outerHTML};
                sv.t = {s: v.d.l, m: v.d.m, c: [], p: {}};

                e.parentElement.removeChild(e);

                await s.methods[v.d.m].handle(j, sv);
            }, v);

            v.io = {};
        }
    }
};
