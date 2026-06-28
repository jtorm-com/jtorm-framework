/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('../../../../types.js').ViewModel} ViewModel */

module.exports = {
    jTormFindMethod: {
        // DI

        params: [
            'e'// Element
        ],

        /** @param {ViewModel} v */
        validate: function (v) {
            return !!v.d.e;
        },

        /**
         * Set the descendant scope `v.c.s` so the rule’s children select beneath `v.d.e`.
         * @param {ViewModel} v
         */
        handle: async function (v) {
            v.c.s = v.d.e;

            v.io = {c: 1};
        }
    }
};
