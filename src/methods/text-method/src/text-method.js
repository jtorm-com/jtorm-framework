/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */
/** @typedef {import('@jtorm/types').MethodEffect} MethodEffect */

module.exports = {
    jTormTextMethod: {
        // DI
        // dataParser
        // languageModel

        alias: 't',
        params: [],

        validate: function () {
            return 1;
        },

        /**
         * Resolve each `v.t.p` value against `v.m` via dataParser, translate it through languageModel, write it back onto `v.m`, and return the model as child data.
         * @param {ViewModel} v
         * @returns {Promise<MethodEffect>}
         */
        handle: async function (v) {
            const d = this.dataParser, b = d.bindings(v.t, v.t.p, v._);
            let x, k;

            for (k in v.t.p) {
                x = d.evaluate(v.m, b[k]);

                v.m[k] = this.languageModel.get(x ? x : v.t.p[k], v.c.locale);
            }

            return {children: true, data: v.m};
        }
    }
};
