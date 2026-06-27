/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormDataParser: {
        // DI
        // tssParser

        append: '+',
        current: '@c',
        objectSeparator: '.',

        init: function () {
            const q = this.tssParser.c.quotes;

            this.appendRegex = new RegExp('(\\' + this.append + ')(?=(?:[^' + q + ']|[' + q + '][^' + q + ']*[' + q + '])*$)', '');
            this.dataRegex = new RegExp('(' + q + ')+', 'gm');
        },

        handle: function (v, a) {
            let p, k, z = 0;
            const
                d = {...v.t.p},
                tD = {}
            ;

            // No explicit props: auto-bind each declared param (a = method
            // params) from the model by name — "inspect an out-of-scope model
            // in a loop". z flags the unresolved-omit mode for parse().
            // (Guarded on `a` so a param-less method is a safe no-op.)
            // Leaf-only: a child-bearing node is a structural wrapper (e.g.
            // `->append->ui`), whose params (h/d/m) must NOT be synthesized from
            // colliding model keys — that would turn unrelated fields into insert input.
            if (a && v._.isEmpty(d) && !(v.t.c && v.t.c.length)) {
                z = 1;
                a = Object.values(a);
                for (k in a)
                    d[a[k]] = a[k]
                ;
            }

            for (p in d) {
                if (d[p]) {
                    if (v._.isString(d[p]))
                        tD[p] = this.parse(v.m, d[p], z)
                    ; else if (v._.isArray(d[p])) {
                        tD[p] = [];
                        for (k in d[p])
                            tD[p].push(this.parse(v.m, d[p][k], z))
                        ;
                    }
                }
            }

            v.d = tD;
        },

        parse: function (d, k, a) {
            if (!k)
                return null
            ;

            const s = this;
            let m, q, i = 0, tmp = d, p, ps;

            m = k.split(s.appendRegex);

            if (m.length > 1) {
                tmp = '';

                for (p of m) {
                    p = p.trim();

                    if (p !== '+') {// application/ld+json
                        q = s.parse(d, p);

                        if (q)
                            tmp += q
                        ;
                    }
                }

                return tmp;
            }

            if (k.match(s.dataRegex))
                return k.replace(s.dataRegex, '')
            ; else if (k === 'true')
                return true
            ; else if (k === 'false')
                return false
            ; else if (!isNaN(parseFloat(k)) && isFinite(k)) {
                i = 1;
                if (k % 1 === 0)
                    k = parseInt(k)
                ; else
                    k = parseFloat(k)
                ;
            } else if (!d)
                return null
            ;

            ps = i
                ? [k]
                : k.split(s.objectSeparator)
            ;

            for (p of ps) {
                if (p === s.current)
                    tmp = tmp[Object.keys(tmp)[0]]
                ; else {
                    if (!tmp || tmp[p] === undefined) {
                        // out-of-scope auto-bind mode: omit unresolved (undefined)
                        if (a)
                            return
                        ;

                        if (i)
                            return k
                        ;

                        // unquoted var that does not resolve = undefined var → null.
                        // (Quoted literals are handled earlier, at the dataRegex match.)
                        return null;
                    }

                    tmp = tmp[p];
                }
            }

            return tmp;
        }
    }
};
