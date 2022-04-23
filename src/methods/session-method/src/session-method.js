/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormSessionMethod: {
        // DI
        sessionModel: null,

        alias: 'ses',
        params: ['k', 'v', 'a'],

        validate: function (j, v) {
            return !!v.d.k;
        },

        handle: async function (j, v) {
            let p = this.sessionModel.get(j, v.d.k);

            if (p && (v.t.p.v === undefined || p === v.d.v)) {
                if (v.d.a)
                    oD[v.d.a] = p;

                v.io = {c: 1};
            } else
                v.io = {};
        }
    }
};
