/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';
module.exports = {
    jTormTitleMethod: {
        params: ['t'],
        validate: function (j, v) {
            return !!v.d.t;
        },
        handle(j, v) {
            v.h.d.title = v.d.t;
            v.io = {c: 1};
        }
    }
};