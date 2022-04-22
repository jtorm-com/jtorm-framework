/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormGetMethod: {
        // DI
        getModel: null,

        params: ['h', 't', 'd'],

        validate: function (j, v) {
            return !!(v.d.h || v.d.t || v.d.d);
        },

        get: async function(j, v, t, u) {
            let r = await this.getModel[t].get(j, v, u);
            return r.d;
        },

        async handle(j, v) {
            let r, p, k, k2, nD, nT;

            if (v.d.d) {
                nD = v._.cloneDeep(v.m);

                // todo test komt het voor dat dit nog een string is?
                if (v._.isString(d.d)) {
                    v.d.d = [v.d.d];
                    for (k in v.d.d) {
                        r = await this.get(j, v, 'data', v.d.d[k]);

                        for (k2 in r)
                            nD[k] = r[k];
                    }
                } else {
                    r = d.d;

                    for (k in r)
                        nD[k] = r[k];
                }

            }

            if (v.d.h) {
                r = '';

                // todo test komt het voor dat dit nog een string is?
                v.d.h = v._.isString(v.d.h) ? [v.d.h] : v.d.h;

                for (k in v.d.h) {
                    p = await this.get(j, v, 'html', v.d.h[k]);
                    r += p;
                }

                await v.h.set(v.t.s, function (el) {
                    el.innerHTML = r;
                }, v);
            }

            if (v.d.t) {
                // todo test komt het voor dat dit nog een string is?
                v.d.t = v._.isString(v.d.t) ? [v.d.t] : v.d.t;

                nT = {
                    // s: v.t.s,
                    s: false,
                    c: []
                };

                for (k in v.d.t) {
                    r = await this.get(j, v, 'tss', v.d.t[k]);

                    if (v.t.s)
                        v.c.s = v.t.s;

                    for (k in r)
                        nT.c.unshift(r[k]);
                }

                for (k in v.t.c)
                    nT.c.push(v.t.c[k]);

                // nT = j.context.parsers.data.freeze(nT);

                v.t = nT;
            }

            v.io = {c: 1, d: nD};
        }
    }
};
