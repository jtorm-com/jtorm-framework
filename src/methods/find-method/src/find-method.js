/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */
/** @typedef {import('@jtorm/types').MethodEffect} MethodEffect */

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
         * @returns {Promise<MethodEffect>}
         */
        handle: async function (v) {
            v.c.s = v.d.e;

            return {children: true};
        }
    }
};
