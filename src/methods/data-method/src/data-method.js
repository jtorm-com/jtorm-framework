/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormDataMethod: {
        // DI
        dataParser: null,

        alias: 'd',
        params: [],
        or: '||',

        validate: function () {
            return 1;
        },

        data: async function (v) {
            let tT, ks, k, k2, p, t = v.t, tD = {};

            for (k in t.p) {
                if (t.p[k].indexOf(this.or) !== -1)
                    tT = t.p[k].split(this.or);
                else
                    tT = [t.p[k]];

                for (k2 in tT) {
                    p = this.dataParser.parse(v.m, tT[k2]);
                    if (p)
                        break;
                }

                ks = k.split('.');
                this.set(tD, ks, p);
            }

            v.io = {d: tD, c: 1};
        },

        set: function (d, ks, v) {
            let k = ks.shift();

            if (ks.length > 0) {
                if (d[k] === undefined)
                    d[k] = {};

                return this.set(d[k], ks, v);
            }

            d[k] = v;

            return d;
        }
    }
};