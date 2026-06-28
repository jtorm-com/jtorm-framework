/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('../../../../types.js').ViewModel} ViewModel */

module.exports = {
    jTormTitleMethod: {
        params: [
            't'// Title
        ],

        /** @param {ViewModel} v */
        validate: function (v) {
            return !!v.d.t;
        },

        /**
         * Set the document title from `v.d.t`.
         * @param {ViewModel} v
         */
        handle(v) {
            v.h.d.title = v.d.t;

            v.io = {c: 1};
        }
    }
};
