/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('../../../../types.js').ViewModel} ViewModel */

module.exports = {
    jTormDataMethod: {
        // DI
        // dataParser

        alias: 'd',
        params: [],
        or: '||',

        validate: function () {
            return 1;
        },

        /**
         * Resolve each declaration (honouring `||` fallbacks) from `v.m` into a nested object and merge it onto `v.io.d`.
         * @param {ViewModel} v
         */
        data: async function (v) {
            let tT, ks, k, k2, p;
            const t = v.t, tD = {};

            for (k in t.p) {
                if (t.p[k].indexOf(this.or) !== -1)
                    tT = t.p[k].split(this.or).map(s => s.trim())
                ; else
                    tT = [t.p[k]]
                ;

                for (k2 in tT) {
                    p = this.dataParser.parse(v.m, tT[k2]);
                    if (p)
                        break
                    ;
                }

                if (p !== null) {
                    ks = k.split('.');
                    this.set(tD, ks, p);
                }
            }

            if (v._.isEmpty(tD))
                v.io = {c: 0}
            ; else
                v.io = {d: {...v.m, ...tD}, c: 1}
            ;
        },

        set: function (d, ks, v) {
            const k = ks.shift();

            if (ks.length > 0) {
                if (d[k] === undefined)
                    d[k] = {}
                ;

                return this.set(d[k], ks, v);
            }

            d[k] = v;

            return d;
        }
    }
};