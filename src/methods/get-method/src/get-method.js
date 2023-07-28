/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormGetMethod: {
        // DI
        // models: null,

        params: ['h', 't', 'd', 'a'],

        validate: function (v) {
            return !!(v.d.h || v.d.t || v.d.d);
        },

        get: async function(v, t, u) {
            let r = await this.models[t].get(v, u);

            return r.d;
        },

        async handle(v) {
            let r, k, nD, nT;

            if (v.d.d) {
                nD = {...v.m};

                r = await this.get(v, 'data', v.d.d);

                if (v.d.a)
                    v._.set(nD, v.d.a, r);
                else
                    nD = {...nD, ...r};
            }

            if (v.d.h) {
                r = '';

                if (v._.isString(v.d.h))
                    v.d.h = [v.d.h];

                for (k in v.d.h)
                    r += await this.get(v, 'html', v.d.h[k]);

                await v.h.set(v, function (el) {
                    el.innerHTML = r;
                });
            }

            if (v.d.t) {
                if (v._.isString(v.d.t))
                    v.d.t = [v.d.t];

                nT = {
                    // s: v.t.s,
                    s: false,
                    c: []
                };

                for (k in v.d.t) {
                    r = await this.get(v, 'tss', v.d.t[k]);

                    if (v.t.s)
                        v.c.s = v.t.s;

                    for (k in r)
                        nT.c.push(r[k]);
                }

                for (k in v.t.c)
                    nT.c.push(v.t.c[k]);

                v.t = nT;
            }

            v.io = {c: 1, d: nD};
        }
    }
};
