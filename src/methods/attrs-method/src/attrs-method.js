/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */

module.exports = {
    jTormAttrsMethod: {
        // DI
        // attrMethod
        // dataParser
        // tssParser
        // viewModel

        alias: 'as',
        separator: ',',
        params: [
            'n',// Name
            'v',// Value
            'm'// Method
        ],

        parsed: function (v) {
            let t = v._.cloneDeep(v.t),
                p = this.tssParser;

            t.p.n = p.quotes(t.p.n);
            t.p.v = p.quotes(t.p.v);

            if (t.p.m)
                t.p.m = p.quotes(t.p.m);

            return t;
        },

        bindings: function (v, t, c) {
            const
                d = this.dataParser,
                b = d.cache(v.t),
                q = this.tssParser.regexes.quotes,
                k = [this.separator, q.source, q.flags].join('\u0000'),
                p = {n: t.p.n, v: t.p.v, m: t.p.m}
            ;
            let x = b.x.as, r, i;

            if (
                x
                && x.k === k
                && x.p.n === p.n
                && x.p.v === p.v
                && x.p.m === p.m
            )
                return x
            ;

            r = {k: k, p: p, n: p.n.split(this.separator), v: p.v.split(this.separator), d: []};
            for (i in r.v)
                r.d.push(r.v[i] ? d.compile(r.v[i]) : null)
            ;

            if (c)
                b.x.as = r
            ;

            return r;
        },

        /** @param {ViewModel} v */
        validate: function (v) {
            let t = this.parsed(v);
            v.d.parsed = t;

            const r = (
                t.p.n
                && (t.p.v || t.p.m === 'r')
                && (!t.p.m || ['p', 'a', 'r'].indexOf(t.p.m) !== -1)
            );

            if (r)
                this.bindings(v, t, 1)
            ;

            return r;
        },

        /**
         * Split the comma-lists in `v.d` into one `attr` call per name/value pair across the selected elements.
         * @param {ViewModel} v
         */
        handle: async function (v) {
            let t = v.d.parsed,
                k,
                x = this.bindings(v, t),
                names = x.n,
                values = x.v,
                tR = {
                    s: t.s,
                    m: 'attr'
                },
                tD,
                sv
            ;

            for (k in names) {
                if (!values[k])
                    continue
                ;

                tD = {
                    n: names[k],
                    v: this.dataParser.evaluate(v.m, x.d[k]) || values[k],
                    m: t.p.m
                };

                sv = this.viewModel.copy(v, null, tR);
                sv.d = tD;

                await this.attrMethod.handle(sv);
            }

            v.io = {c: 1};
        }
    }
};
