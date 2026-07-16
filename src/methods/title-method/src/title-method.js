/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */
/** @typedef {import('@jtorm/types').MethodEffect} MethodEffect */

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
         * @returns {MethodEffect}
         */
        handle(v) {
            v.h.d.title = v.d.t;

            return {children: true};
        }
    }
};
