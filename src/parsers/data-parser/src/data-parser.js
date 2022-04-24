/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormDataParser: {
        // DI
        tssParser: null,

        append: '+',
        current: '@c',
        objectSeparator: '.',

        init: function (j) {
            let c = this.tssParser.c.quotes, q;

            this.dataRegex = new RegExp('(' + c.join('|') + ')+', 'gm');

            q = c.join('');
            this.appendRegex = new RegExp('(\\' + this.append + ')(?=(?:[^' + q + ']|[' + q + '][^' + q + ']*[' + q + '])*$)', '');
        },

        handle: function (v, params) {
            let tD = {}, p, k;

            for (p of params) {
                if (v.t.p[p]) {
                    if (v._.isString(v.t.p[p])) {
                        tD[p] = this.parse(v.m, v.t.p[p]);
                    } else if (v._.isArray(v.t.p[p])) {
                        tD[p] = [];
                        for (k in v.t.p[p]) {
                            tD[p].push(this.parse(v.m, v.t.p[p][k]));
                        }
                    }
                }
            }

            v.d = tD;
        },

        parse: function (d, k) {
            if (!k)
                return null;

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
                            tmp += s.parse(d, p);
                    }
                }

                return tmp;
            }

            if (k.match(s.dataRegex))
                return k.replace(s.dataRegex, '');
            else if (k === 'true')
                return true;
            else if (k === 'false')
                return false;
            else if (!isNaN(parseFloat(k)) && isFinite(k)) {
                i = 1;
                if (k % 1 === 0)
                    k = parseInt(k);
                else
                    k = parseFloat(k);
            } else if (!d)
                return null;

            ps = i
                ? [k]
                : k.split(s.objectSeparator);

            for (p of ps) {
                if (p === s.current)
                    tmp = tmp[Object.keys(tmp)[0]];
                else {
                    if (!tmp || tmp[p] === undefined) {
                        if (i)
                            return k;
                        else
                            return null;
                    }

                    tmp = tmp[p];
                }
            }

            return tmp;
        }
    }
};
