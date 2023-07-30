/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormConfigMethod: {
        // DI
        // configModel: null,

        alias: 'c',
        params: ['d', 'v'],

        validate: function (v) {
            return v.d.d !== undefined;
        },

        handle: async function (v) {
            const r = this.configModel.get(v.d.d);

            if (r && (v.t.p.v === undefined || r === v.d.v)) {
                const d = {};

                if (v.d.a)
                    d[v.d.a] = r;
                else
                    d[v.d.d] = r;

                v.io = {c: 1, d: d};
            } else
                v.io = {};
        }
    }
};
