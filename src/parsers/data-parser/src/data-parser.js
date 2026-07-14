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

        grammar: function () {
            const
                a = this.appendRegex,
                d = this.dataRegex,
                q = this.tssParser.regexes.quotes
            ;

            return [a.source, a.flags, d.source, d.flags, q.source, q.flags, this.current, this.objectSeparator].join('\u0000');
        },

        items: function (a, b) {
            if (!a || !b || a.length !== b.length)
                return 0
            ;

            for (let i = 0; i < a.length; i++)
                if (a[i] !== b[i])
                    return 0
                ;

            return 1;
        },

        snapshot: function (p) {
            const r = [];
            let k, v;

            for (k of Object.keys(p || {})) {
                v = p[k];
                r.push([k, Array.isArray(v) ? v.slice() : v]);
            }

            return r;
        },

        same: function (r, p) {
            const k = Object.keys(p || {});
            let a, b;

            if (!r || r.length !== k.length)
                return 0
            ;

            for (let i = 0; i < k.length; i++) {
                if (r[i][0] !== k[i])
                    return 0
                ;

                a = r[i][1];
                b = p[k[i]];
                if (Array.isArray(a) || Array.isArray(b)) {
                    if (!Array.isArray(a) || !Array.isArray(b) || !this.items(a, b))
                        return 0
                    ;
                } else if (a !== b)
                    return 0
                ;
            }

            return 1;
        },

        cache: function (t) {
            const p = t.p || {}, k = this.grammar();

            if (!t.b || t.b.k !== k || !this.same(t.b.r, p))
                t.b = {k: k, r: this.snapshot(p), p: null, x: {}}
            ;

            return t.b;
        },

        bindings: function (t, d, l, a) {
            const b = this.cache(t);
            let r = a ? b.x.a : b.p, p, k, c;

            if (a && r && this.items(r.r, a))
                return r.p
            ;

            if (!a && r)
                return r
            ;

            c = {};
            for (p in d) {
                if (d[p]) {
                    if (l.isString(d[p]))
                        c[p] = this.compile(d[p])
                    ; else if (l.isArray(d[p])) {
                        c[p] = [];
                        for (k in d[p])
                            c[p].push(this.compile(d[p][k]))
                        ;
                    }
                }
            }

            if (a)
                b.x.a = {r: a.slice(), p: c}
            ; else
                b.p = c
            ;

            return c;
        },

        handle: function (v, a) {
            let p, k, b, z = 0;
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

            b = this.bindings(v.t, d, v._, z ? a : null);

            for (p in d) {
                if (d[p]) {
                    if (v._.isString(d[p]))
                        tD[p] = this.evaluate(v.m, b[p], z)
                    ; else if (v._.isArray(d[p])) {
                        tD[p] = [];
                        for (k in d[p])
                            tD[p].push(this.evaluate(v.m, b[p][k], z))
                        ;
                    }
                }
            }

            v.d = tD;
        },

        compile: function (k) {
            if (!k)
                return null
            ;

            const s = this;
            let m, i = 0, p, ps;

            m = k.split(s.appendRegex);

            if (m.length > 1) {
                ps = [];

                for (p of m) {
                    p = p.trim();

                    if (p !== '+')// application/ld+json
                        ps.push(s.compile(p))
                    ;
                }

                return {t: 'a', v: ps};
            }

            if (k.match(s.dataRegex))
                return {t: 'v', v: k.replace(s.dataRegex, '')}
            ; else if (k === 'true')
                return {t: 'v', v: true}
            ; else if (k === 'false')
                return {t: 'v', v: false}
            ; else if (!isNaN(parseFloat(k)) && isFinite(k)) {
                i = 1;
                if (k % 1 === 0)
                    k = parseInt(k)
                ; else
                    k = parseFloat(k)
                ;
            }
            ;

            ps = i
                ? [k]
                : k.split(s.objectSeparator)
            ;

            return {t: 'p', v: ps, n: i};
        },

        evaluate: function (d, b, a) {
            if (!b)
                return null
            ;

            const s = this;
            let q, p, tmp = d;

            if (b.t === 'a') {
                tmp = '';
                for (p of b.v) {
                    q = s.evaluate(d, p);
                    if (q)
                        tmp += q
                    ;
                }

                return tmp;
            }

            if (b.t === 'v')
                return b.v
            ;

            if (!b.n && !d)
                return null
            ;

            for (p of b.v) {
                if (p === s.current)
                    tmp = tmp[Object.keys(tmp)[0]]
                ; else {
                    if (!tmp || tmp[p] === undefined) {
                        // out-of-scope auto-bind mode: omit unresolved (undefined)
                        if (a)
                            return
                        ;

                        if (b.n)
                            return b.v[0]
                        ;

                        // unquoted var that does not resolve = undefined var → null.
                        // (Quoted literals are handled earlier, at the dataRegex match.)
                        return null;
                    }

                    tmp = tmp[p];
                }
            }

            return tmp;
        },

        parse: function (d, k, a) {
            return this.evaluate(d, this.compile(k), a);
        }
    }
};
