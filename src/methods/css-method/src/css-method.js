/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormCssMethod: {
        // DI
        cssPlugin: null,

        params: ['href'],

        validate: function (j, v) {
            return !!v.d.href;
        },

        handle: function (j, v) {
            let s = this.cssPlugin.after.view;

            if (v.c.c || !s.cache[v.t.p.href])
                s.cache[v.d.href] = 0;

            v.io = {c: 1};
        }
    }
};
