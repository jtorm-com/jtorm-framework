/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';
module.exports = {
    jTormMoveMethod: {
        alias: 'm',
        params: ['l', 'm'],
        validate: function (j, v) {
            return (v.t.s && v.d.l && v.d.m);
        },
        handle: async function (j, v) {
            await v.h.set(v.t.s, async function (e) {
                var sv = j.context.models.view.copy(j, v);
                sv.d = {h: e.outerHTML};
                sv.t = {s: v.d.l, m: v.d.m, c: [], p: {}};

                e.parentElement.removeChild(e);

                await j.context.methods[v.d.m].handle(j, sv);
            }, v);

            v.io = {};
        }
    }
};