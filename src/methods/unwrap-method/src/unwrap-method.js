/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */
/** @typedef {import('@jtorm/types').MethodEffect} MethodEffect */

module.exports = {
    jTormUnwrapMethod: {
        alias: 'u',
        params: [
            's'// Selector
        ],

        /** @param {ViewModel} v */
        validate: function (v) {
            return !!v.d.s;
        },

        /**
         * Replace each selected element’s content with the inner HTML of its `v.d.s` descendant.
         * @param {ViewModel} v
         * @returns {Promise<MethodEffect>}
         */
        handle: async function (v) {
            await v.h.set({t: {s: v.d.s}, c: v.c}, async function (e) {
                const h = e.innerHTML;

                await v.h.set(v, function (e2) {
                    e2.innerHTML = h;
                });
            });

            return {children: true};
        }
    }
};
