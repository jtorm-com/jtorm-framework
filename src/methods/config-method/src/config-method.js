/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormConfigMethod: {
        // DI
        // configModel: null,

        alias: 'c',
        params: ['d', 'v', 'a'],

        validate: function (v) {
            return v.d.d !== undefined;
        },

        handle: async function (v) {
            const r = this.configModel.get(v.d.d), d = {};

            if (
                (r === undefined && v.t.p.v !== undefined)
                || (r !== undefined && v.d.v !== undefined && r !== v.d.v)
            )
                v.io = {};
            else {
                const d = {};

                if (v.d.a)
                    d[v.d.a] = r;
                else
                    d[v.d.d] = r;

                v.io = {c: 1, d: {...v.m, ...d}};
            }
        }
    }
};
