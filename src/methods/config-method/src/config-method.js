/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormConfigMethod: {
        // DI
        configModel: null,

        alias: 'c',
        params: ['k', 'v', 'a'],

        validate: function (v) {
            return !!v.d.k;
        },

        handle: async function (v) {
            let k = this.configModel.get(v.d.k);

            if (k && (v.t.p.v === undefined || k === v.d.v)) {
                if (v.d.a)
                    oD[v.d.a] = k;

                v.io = {c: 1};
            } else
                v.io = {};
        }
    }
};
