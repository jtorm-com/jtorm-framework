/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormUnwrapMethod: {
        alias: 'u',
        params: [
            's'// Selector
        ],

        validate: function (v) {
            return !!v.d.s;
        },

        handle: async function (v) {
            await v.h.set({t: {s: v.d.s}, c: v.c}, async function (e) {
                const h = e.innerHTML;

                await v.h.set(v, function (e2) {
                    e2.innerHTML = h;
                });
            });

            v.io = {c: 1};
        }
    }
};
