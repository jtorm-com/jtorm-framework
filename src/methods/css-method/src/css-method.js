/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */
/** @typedef {import('@jtorm/types').MethodEffect} MethodEffect */

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

        /** @param {ViewModel} v */
        validate: function (v) {
            return !!v.d.href;
        },

        /**
         * Collect the stylesheet `<link>` descriptor (`v.d`) into cssPlugin for head injection, deduped by href.
         * @param {ViewModel} v
         * @returns {MethodEffect}
         */
        handle: function (v) {
            const
                p = this.cssPlugin,
                s = p.state ? p.state(v) : p
            ;

            if (v.c.c || !s.cache[v.t.p.href]) {
                s.cache[v.d.href] = 0;
                s.collection.push(v.d);
            }

            return {children: true};
        }
    }
};
