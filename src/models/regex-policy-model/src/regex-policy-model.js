/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

const
    rp = 256,
    ri = 1024,
    rd = '^([0-9]+x[0-9]+)|(any)$',
    rl = '(?!ListItem$)',
    rc = ['.', '0-9', 'a-z', 'A-Z', '\\x0A\\x0D\\u2028\\u2029']
;

const valid = function (p) {
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
                    if ((x.t !== 'c' && x.t !== '.') || x.n)
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

                x = {t: 'c', n: p.slice(i + 1, j) === rc[4]};
                i = j + 1;
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
    jTormRegexPolicyModel: {
        validate: function (p) {
            if (!valid(p))
                throw new Error('Unsafe regex pattern')
            ;

            return 1;
        },

        test: function (p, s) {
            this.validate(p);
            s = String(s);

            if (s.length > ri)
                throw new Error('Unsafe regex input')
            ;

            // valid structurally allowlists and bounds the dynamic source.
            return new RegExp(p, 'm').test(s); // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp
        }
    }
};
