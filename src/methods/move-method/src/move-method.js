/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormMoveMethod: {
        // DI
        // methods: null,
        // viewModel: null,

        alias: 'm',
        params: ['l', 'm'],

        validate: function (v) {
            return (v.t.s && v.d.l && v.d.m);
        },

        handle: async function (v) {
            const s = this;

            await v.h.set(v, async function (e) {
                let sv = s.viewModel.copy(v);

                sv.d = {h: e.outerHTML};
                sv.t = {s: v.d.l, m: v.d.m, c: [], p: {}};

                e.parentElement.removeChild(e);

                await s.methods[v.d.m].handle(sv);
            });

            v.io = {};
        }
    }
};
