/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */

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

        /** @param {ViewModel} v */
        validate: function (v) {
            return !!v.d.src;
        },

        /**
         * Collect the `<script>` descriptor (`v.d`) into jsPlugin for injection, deduped by src.
         * @param {ViewModel} v
         */
        handle: function (v) {
            const
                p = this.jsPlugin,
                s = p.state ? p.state(v) : p
            ;

            if (v.c.c || !s.cache[v.t.p.src]) {
                s.cache[v.t.p.src] = 0;
                s.collection.push(v.d);
            }

            v.io = {c: 1};
        }
    }
};
