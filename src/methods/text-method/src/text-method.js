/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

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

        handle: async function (v) {
            let x, k;

            for (k in v.t.p) {
                x = this.dataParser.parse(v.m, v.t.p[k]);

                v.m[k] = this.languageModel.get(x ? x : v.t.p[k]);
            }

            v.io = {c: 1, d: v.m};
        }
    }
};
