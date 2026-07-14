/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */

const
    rp = 256,
    ri = 1024,
    rd = '^([0-9]+x[0-9]+)|(any)$',
    rl = '(?!ListItem$)',
    rc = ['.', '0-9', 'a-z', 'A-Z', '\\x0A\\x0D\\u2028\\u2029']
;

const safeRegex = function (p) {
    if (typeof p !== 'string' || !p.length || p.length > rp)
        return 0
    ;

    let i = 0, ps = 0, qs = 0, ra = 0;

    const parse = function (z, d) {
        if (d > 2)
            return 0
        ;

        let n = 0, h = 0, e = 0, q = 0, c, j, g, x;

        while (i < p.length && (!z || p[i] !== z)) {
            c = p[i];

            if (e && c !== '|')
                return 0
            ;

            if (c === '|') {
                if (!n)
                    return 0
                ;

                if (!d)
                    ra = 1
                ;

                i++;
                n = h = e = 0;
                x = 0;
                continue;
            }

            if (c === '^') {
                if (n || h)
                    return 0
                ;

                h = 1;
                x = 0;
                i++;
                continue;
            }

            if (c === '$') {
                if (!n || (p[i + 1] && p[i + 1] !== '|' && p[i + 1] !== z))
                    return 0
                ;

                e = 1;
                x = 0;
                i++;
                continue;
            }

            if (c === '?' || c === '+') {
                if (!x || x.a)
                    return 0
                ;

                if (c === '+') {
                    if (x.t !== 'c' && x.t !== '.')
                        return 0
                    ;
                    ps++;
                } else {
                    if ('lc.g'.indexOf(x.t) === -1 || (x.t === 'g' && x.q))
                        return 0
                    ;
                    qs++;
                }

                x.a = q = 1;
                i++;
                continue;
            }

            if (c === '(') {
                if (p.slice(i, i + rl.length) === rl) {
                    if (d || !h || n)
                        return 0
                    ;

                    i += rl.length;
                    x = {t: 'a'};
                } else {
                    i++;
                    g = parse(')', d + 1);
                    if (!g || p[i] !== ')')
                        return 0
                    ;

                    i++;
                    q = q || g.q;
                    x = {t: 'g', q: g.q};
                }
            } else if (c === '[') {
                j = p.indexOf(']', i + 1);
                if (
                    j === -1
                    || rc.indexOf(p.slice(i + 1, j)) === -1
                )
                    return 0
                ;

                i = j + 1;
                x = {t: 'c'};
            } else if (c === '\\') {
                if (p[i + 1] !== '.' && p[i + 1] !== '/')
                    return 0
                ;

                i += 2;
                x = {t: 'l'};
            } else {
                if (c !== '.' && !/[A-Za-z0-9:/-]/.test(c))
                    return 0
                ;

                i++;
                x = {t: c === '.' ? '.' : 'l'};
            }

            n++;
        }

        if (!n || (z && p[i] !== z))
            return 0
        ;

        return {q: q};
    };

    const r = parse(0, 0);
    return r
        && i === p.length
        && qs <= 2
        && (ps <= 1 || p === rd)
        && (!ps || (p[0] === '^' && (!ra || p === rd)))
};

module.exports = {
    jTormIfMethod: {
        // DI
        // dataParser
        // handler

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

        /**
         * Evaluate `v.d.d` (with `||`/`&&`, type, literal/trusted-regex, or element tests) and boil either the matching children or the `->else` branch.
         * @param {ViewModel} v
         */
        handle: async function (v) {
            const
                d = this.dataParser,
                q = d.tssParser.c.quotes,
                o = this.or,
                a = this.and
            ;

            let
                r,
                e,
                t,
                k,
                s,
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
                if (v.t.p.d.indexOf(o) !== -1) {
                    t = v.t.p.d.split(o);
                    for (k in t) {
                        if (d.parse(v.m, t[k].trim())) {
                            v.d.d = 1;
                            break;
                        }
                    }
                } else if (v.t.p.d.indexOf(a) !== -1) {
                    t = v.t.p.d.split(a);
                    v.d.d = 1;

                    for (k in t) {
                        if (!d.parse(v.m, t[k].trim())) {
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
                    if (!v._.isString(v.t.p.v) || v.t.p.v !== q + v.d.v + q || !safeRegex(v.d.v))
                        throw new Error('Unsafe regex pattern')
                    ;

                    // safeRegex structurally allowlists and bounds the dynamic source.
                    r = new RegExp(v.d.v, 'm'); // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp
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

            if (to && !v.d.el && x && v.d.d) {
                s = String(v.d.d);
                if (s.length > ri)
                    throw new Error('Unsafe regex input')
                ;

                r = r.test(s);
            }

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
