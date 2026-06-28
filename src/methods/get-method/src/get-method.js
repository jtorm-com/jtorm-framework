/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('../../../../types.js').ViewModel} ViewModel */

module.exports = {
    jTormGetMethod: {
        // DI
        // models[],

        params: ['h', 't', 'd', 'a'],

        /** @param {ViewModel} v */
        validate: function (v) {
            return !!(v.d.h || v.d.t || v.d.d);
        },

        get: async function(t, u) {
            let r = await this.models[t].get(u);

            return r; // raw model result (data: JSON, html: text, tss: parsed tree)
        },

        /**
         * Fetch data/html/tss models (`v.d.d`/`v.d.h`/`v.d.t`) and merge them into the model, the DOM, or the `v.t` subtree (setting ancestor scope `v.c.a`).
         * @param {ViewModel} v
         */
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

                // Ancestor-scope: fetched rules boil UNDER the get target, not
                // document-global. v.t.s is the get target (the ancestor); set v.c.a
                // so document-model.set prepends it to every selector in the fetched
                // subtree — fetched TSS re-selects with its OWN `s` (`span->inner`
                // parses to nested {s:'span'} nodes), so prefixing the top node alone
                // can't reach them. This is also the mechanism `ui` component
                // injection needs (ui-method builds {s: target, m: 'get'}). The
                // handler restores v.c.a after this subtree so it can't leak to
                // following sibling rules. Captured before v.t is replaced below.
                if (v.t.s)
                    v.c.a = v.t.s
                ;

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
