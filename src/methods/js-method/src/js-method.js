/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormJsMethod: {
        // DI
        jsPlugin: null,

        params: ['src'],

        validate: function (v) {
            return !!v.d.src;
        },

        handle: function (v) {
            const s = this.jsPlugin.after.view;

            if (v.c.c || !s.cache[v.t.p.src]) {
                s.cache[v.t.p.src] = 0;
                s.collection.push({src: v.d.src});
            }

            v.io = {c: 1};
        }
    }
};
