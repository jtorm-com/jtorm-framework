/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */

module.exports = {
    jTormIfMethod: {
        // DI
        // dataParser
        // handler
        // regexPolicyModel

        or: '||',
        and: '&&',
        params: [
            'd',// Data
            'v',// Value
            'el',// Element
            'to',// To
            'r'// RegExp
        ],

        validate: function () {
            return 1;
        },

        bindings: function (t) {
            const
                d = this.dataParser,
                b = d.cache(t),
                o = this.or,
                a = this.and,
                k = o + '\u0000' + a
            ;
            let x = b.x.i, p = t.p.d, r = {k: k, o: 0, d: []};

            if (x && x.k === k)
                return x
            ;

            if (p.indexOf(o) !== -1) {
                r.o = 1;
                r.d = p.split(o).map(s => d.compile(s.trim()));
            } else if (p.indexOf(a) !== -1) {
                r.o = 2;
                r.d = p.split(a).map(s => d.compile(s.trim()));
            }

            b.x.i = r;

            return r;
        },

        /**
         * Evaluate `v.d.d` (with `||`/`&&`, type, literal/trusted-regex, or element tests) and boil either the matching children or the `->else` branch.
         * @param {ViewModel} v
         */
        handle: async function (v) {
            const
                d = this.dataParser,
                q = d.tssParser.c.quotes,
                g = this.regexPolicyModel
            ;

            let
                r,
                e,
                t,
                k,
                x = 0,
                to = 1
            ;

            if (v.d.d === undefined)
                v.d.d = v.m
            ;

            if (v.d.to) {
                if (v.d.to === 'array')
                    to = Array.isArray(v.d.d)
                ; else if (typeof v.d.d !== v.d.to)
                    to = 0
                ;
            }

            if (v.d.d === null) {
                t = this.bindings(v.t);
                if (t.o === 1) {
                    for (k in t.d) {
                        if (d.evaluate(v.m, t.d[k])) {
                            v.d.d = 1;
                            break;
                        }
                    }
                } else if (t.o === 2) {
                    v.d.d = 1;

                    for (k in t.d) {
                        if (!d.evaluate(v.m, t.d[k])) {
                            v.d.d = 0;
                            break;
                        }
                    }
                }
            }

            if (v.d.v !== undefined) {
                if (v._.isBoolean(v.d.v) && v.d.d === v.d.v)
                    v.d.d = 1
                ; else if (v.d.r) {
                    if (!v._.isString(v.t.p.v) || v.t.p.v !== q + v.d.v + q)
                        throw new Error('Unsafe regex pattern')
                    ;

                    if (!g || typeof g.validate !== 'function' || typeof g.test !== 'function')
                        throw new Error('Regex policy model not configured')
                    ;

                    g.validate(v.d.v);
                    x = 1;
                } else if (!v._.isBoolean(v.d.v) && v.d.d && String(v.d.d).indexOf(String(v.d.v)) !== -1)
                    v.d.d = 1
                ; else
                    v.d.d = 0
                ;
            }

            if (v.d.el)
                e = v.h.select(v.d.el)
            ;

            if (to && !v.d.el && x && v.d.d)
                r = g.test(v.d.v, v.d.d)
            ;

            t = [];
            if (
                to
                && (
                    (v.d.el && e)
                    || (!v.d.el && v.d.d && (!x || r))
                )
            ) {
                for (k in v.t.c) {
                    if (v.t.c[k].m !== 'else')
                        t.push(v.t.c[k])
                    ;
                }
            } else {
                for (k in v.t.c) {
                    if (v.t.c[k].m === 'else') {
                        t = v.t.c[k].c;
                        break;
                    }
                }
            }

            if (t.length)
                await this.handler.handle(v.h, t, v.m, v.c)
            ;

            v.io = {};
        }
    }
};
