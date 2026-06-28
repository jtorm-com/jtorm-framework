/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormConfigMethod: {
        // DI
        // configModel

        alias: 'c',
        params: [
            'd',// Data — the config key (`d` is the framework-wide data param)
            'k',// Key — alias for `d`, the form documented in the README (config gates)
            'v',// Value
            'a'// As
        ],

        validate: function (v) {
            return v.d.d !== undefined || v.d.k !== undefined;
        },

        handle: async function (v) {
            // Accept the key under `d` (the convention the components use) OR `k` (the
            // documented form) — dropping either silently fails-open documented gates.
            const k = v.d.d !== undefined ? v.d.d : v.d.k,
                r = this.configModel.get(k);

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
                    d[k] = r
                ;

                v.io = {c: 1, d: {...v.m, ...d}};
            }
        }
    }
};
