/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormGetMethod: {
        // DI
        // models[],

        params: ['h', 't', 'd', 'a'],

        validate: function (v) {
            return !!(v.d.h || v.d.t || v.d.d);
        },

        get: async function(t, u) {
            let r = await this.models[t].get(u);

            return r; // raw model result (data: JSON, html: text, tss: parsed tree)
        },

        async handle(v) {
            let r, k, nD, nT;

            if (v.d.d) {
                nD = {...v.m};

                r = await this.get('data', v.d.d);

                if (v.d.a)
                    v._.set(nD, v.d.a, r)
                ; else
                    nD = {...nD, ...r}
                ;
            }

            if (v.d.h) {
                r = await this.get('html', v.d.h);

                await v.h.set(v, function (el) {
                    el.innerHTML = r;
                });
            }

            if (v.d.t) {
                nT = {
                    s: false,
                    c: []
                };

                r = await this.get('tss', v.d.t);

                // Fetched TSS boils with its own selectors (document-global) —
                // matching the data/html paths. (Was `if (v.t.s) v.c.s = v.t.s`
                // since the initial dev commit, but dormant: the old getSelector
                // returned the rule selector and ignored v.c.s. With the #27
                // string-only getSelector it would instead scope as `<rule>
                // <fetched>` — the WRONG order, v.t.s is the descendant here —
                // and break get{t}. Scoping fetched TSS under the get target is
                // a deliberate future enhancement; see docs/backlog.md.)

                for (k in r)
                    nT.c.push(r[k])
                ;

                for (k in v.t.c)
                    nT.c.push(v.t.c[k])
                ;

                v.t = nT;
            }

            v.io = {c: 1, d: nD};
        }
    }
};
