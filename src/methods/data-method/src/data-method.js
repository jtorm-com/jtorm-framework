/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */
/** @typedef {import('@jtorm/types').MethodEffect} MethodEffect */

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

        bindings: function (t) {
            const d = this.dataParser, b = d.cache(t), k = this.or;
            let x = b.x.d, r = [], p, v;

            if (x && x.k === k)
                return x.d
            ;

            for (p in t.p) {
                if (t.p[p].indexOf(k) !== -1)
                    v = t.p[p].split(k).map(s => s.trim())
                ; else
                    v = [t.p[p]]
                ;

                r.push({k: p.split('.'), v: v.map(s => d.compile(s))});
            }

            b.x.d = {k: k, d: r};

            return r;
        },

        /**
         * Resolve each declaration (honouring `||` fallbacks) from `v.m` into nested child data.
         * @param {ViewModel} v
         * @returns {Promise<MethodEffect>}
         */
        data: async function (v) {
            let ks, k, k2, p;
            const d = this.dataParser, tD = {}, tT = this.bindings(v.t);

            for (k in tT) {
                for (k2 in tT[k].v) {
                    p = d.evaluate(v.m, tT[k].v[k2]);
                    if (p)
                        break
                    ;
                }

                if (p !== null) {
                    ks = tT[k].k.slice();
                    this.set(tD, ks, p);
                }
            }

            if (v._.isEmpty(tD))
                return {children: false}
            ;

            return {children: true, data: {...v.m, ...tD}};
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
