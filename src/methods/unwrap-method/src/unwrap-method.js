/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormUnwrapMethod: {
        alias: 'u',
        params: ['s'],

        validate: function (v) {
            return !!v.d.s;
        },

        handle: async function (v) {
            await v.h.set(v.d.s, async function (e) {
                const h = e.innerHTML;

                await v.h.set(v.t.s, function (e2) {
                    e2.innerHTML = h;
                }, v);
            }, v);

            v.io = {c: 1};
        }
    }
};
