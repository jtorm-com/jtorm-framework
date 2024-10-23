/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormFindMethod: {
        // DI

        params: [
            'e'// Element
        ],

        validate: function (v) {
            return !!v.d.e;
        },

        handle: async function (v) {
            v.c.s = v.d.e;

            v.io = {c: 1};
        }
    }
};
