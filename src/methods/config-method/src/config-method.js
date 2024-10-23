/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormConfigMethod: {
        // DI
        // configModel

        alias: 'c',
        params: [
            'k',// Key
            'v',// Value
            'a'// As
        ],

        validate: function (v) {
            return v.d.k !== undefined;
        },

        handle: async function (v) {
            const r = this.configModel.get(v.d.k);

            if (
                (r === undefined && v.t.p.v !== undefined)
                || (r !== undefined && v.d.v !== undefined && r !== v.d.v)
            )
                v.io = {}
            ; else {
                const d = {};

                if (v.d.a)
                    d[v.d.a] = r
                ; else
                    d[v.d.k] = r
                ;

                v.io = {c: 1, d: {...v.m, ...d}};
            }
        }
    }
};
