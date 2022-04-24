/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormRemoveMethod: {
        alias: 'r',
        params: [],

        validate: function (v) {
            return !!v.t.s;
        },

        handle: async function (v) {
            await v.h.set(v.t.s, function (e) {
                e.parentElement.removeChild(e);
            }, v);

            v.io = {};
        }
    }
};
