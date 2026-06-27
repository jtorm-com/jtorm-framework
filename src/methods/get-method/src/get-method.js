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

                // Fetched TSS boils with its own selectors (document-global),
                // matching the data/html paths. The dormant `if (v.t.s) v.c.s =
                // v.t.s` (initial dev commit) tried to scope under the get target
                // but never worked: the old getSelector ignored v.c.s. The #27
                // string-only getSelector WOULD honour it — but as `<rule>
                // <target>` (wrong order: here v.t.s is the descendant and v.c.s
                // the ancestor, the opposite of find), so it must stay removed.
                // Proper scoping (`<target> <rule>`, the mechanism `ui` injection
                // also needs) requires a core ancestor-scope/prepend and is owned
                // by the Gate-B/schema-ui work — locked by the test.todo in
                // test/pipeline/get.test.js. See docs/backlog.md.
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
