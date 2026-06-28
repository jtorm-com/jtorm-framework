/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormConfigMethod: {
        // DI
        // configModel

        alias: 'c',
        params: [
            'd',// Data (the config key — `d` is the framework-wide data param)
            'v',// Value
            'a'// As
        ],

        validate: function (v) {
            return v.d.d !== undefined;
        },

        handle: async function (v) {
            const r = this.configModel.get(v.d.d);

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
                    d[v.d.d] = r
                ;

                v.io = {c: 1, d: {...v.m, ...d}};
            }
        }
    }
};
