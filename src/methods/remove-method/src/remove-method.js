/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */
/** @typedef {import('@jtorm/types').MethodEffect} MethodEffect */

module.exports = {
    jTormRemoveMethod: {
        alias: 'r',
        params: [],

        /** @param {ViewModel} v */
        validate: function (v) {
            return !!v.t.s;
        },

        /**
         * Remove each element selected by `v.t.s` from its parent.
         * @param {ViewModel} v
         * @returns {Promise<MethodEffect>}
         */
        handle: async function (v) {
            await v.h.set(v, e => {
                e.parentElement.removeChild(e);
            }, v);

            return {children: false};
        }
    }
};
