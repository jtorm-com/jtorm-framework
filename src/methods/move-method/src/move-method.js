/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormMoveMethod: {
        // DI
        // methods[]
        // viewModel

        alias: 'm',
        params: [
            'l',// Location
            'm',// Method
            'k'// Keep element / create copy
        ],

        validate: function (v) {
            return (v.t.s && v.d.l && v.d.m);
        },

        handle: async function (v) {
            const s = this;

            await v.h.set(v, async function (e) {
                const sv = s.viewModel.copy(v);

                sv.d = {h: e.outerHTML};
                sv.t = {s: v.d.l, m: v.d.m, c: [], p: {}};

                if (!parseInt(v.d.k))
                    e.parentElement.removeChild(e)
                ;

                await s.methods[v.d.m].handle(sv);
            });

            v.io = {};
        }
    }
};
