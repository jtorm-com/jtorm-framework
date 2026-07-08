/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */

module.exports = {
    jTormMediaqueryMethod: {
        // DI
        // windowModel

        alias: 'mq',
        // Child gate: handle sets v.io.c from the media match. On a validate MISS (no `q`)
        // the handler fails CLOSED (skip children) rather than leak the guarded content.
        gate: 1,
        m: null,
        params: [
            'q'// Query
        ],

        init: function() {
            let w = this.windowModel;
            this.m = w.matchMedia || w.msMatchMedia;
        },

        /** @param {ViewModel} v */
        validate: function (v) {
            return !!v.d.q;
        },

        /**
         * Set `v.io.c` from whether the media query `v.d.q` currently matches (windowModel.matchMedia).
         * @param {ViewModel} v
         */
        handle: function (v) {
            v.io = {c: this.process(v.d.q)};
        },

        process: function (q) {
            if (this.m) {
                let r = this.m(q);
                return (r && r.matches);
            }

            return false;
        }
    }
};
