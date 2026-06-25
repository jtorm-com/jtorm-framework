/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormJsMethod: {
        // DI
        // jsPlugin

        params: [
            'async',
            'crossorigin',
            'defer',
            'integrity',
            'nomodule',
            'referrerpolicy',
            'src',
            'type'
        ],

        validate: function (v) {
            return !!v.d.src;
        },

        handle: function (v) {
            const s = this.jsPlugin;

            if (v.c.c || !s.cache[v.t.p.src]) {
                s.cache[v.t.p.src] = 0;
                s.collection.push(v.d);
            }

            v.io = {c: 1};
        }
    }
};
