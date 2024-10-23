/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormCssMethod: {
        // DI
        // cssPlugin

        params: [
            'crossorigin',
            'href',
            'hreflang',
            'media',
            'referrerpolicy',
            'rel',
            'sizes',
            'title',
            'type'
        ],

        validate: function (v) {
            return !!v.d.href;
        },

        handle: function (v) {
            const s = this.cssPlugin;

            if (v.c.c || !s.cache[v.t.p.href]) {
                s.cache[v.d.href] = 0;
                s.collection.push(v.d);
            }

            v.io = {c: 1};
        }
    }
};
