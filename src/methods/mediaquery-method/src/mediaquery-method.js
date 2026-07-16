/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */
/** @typedef {import('@jtorm/types').MethodEffect} MethodEffect */

module.exports = {
    jTormMediaqueryMethod: {
        // DI
        // windowModel

        alias: 'mq',
        // Child gate: handle returns the media match. On a validate MISS (no `q`)
        // the handler fails CLOSED rather than leak the guarded content.
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
         * Return whether the media query `v.d.q` currently matches (windowModel.matchMedia).
         * @param {ViewModel} v
         * @returns {MethodEffect}
         */
        handle: function (v) {
            return {children: !!this.process(v.d.q)};
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
