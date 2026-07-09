/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */

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
         * Resolve each `v.t.p` value against `v.m` via dataParser, translate it through languageModel, write it back onto `v.m`, and emit the model on `v.io.d`.
         * @param {ViewModel} v
         */
        handle: async function (v) {
            let x, k;

            for (k in v.t.p) {
                x = this.dataParser.parse(v.m, v.t.p[k]);

                v.m[k] = this.languageModel.get(x ? x : v.t.p[k], v.c.locale);
            }

            v.io = {c: 1, d: v.m};
        }
    }
};
