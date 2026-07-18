/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormRenderContextModel: {
        max: 128,

        context: function (v) {
            let c = v && v.c && typeof v.c === 'object' ? v.c : v,
                i = 0
            ;
            const s = new Set();

            if (!c || typeof c !== 'object')
                return null
            ;

            while (c.p && typeof c.p === 'object') {
                if (s.has(c) || i >= this.max)
                    return null
                ;
                s.add(c);
                c = c.p;
                i++;
            }

            return c;
        },

        cacheContext: function (v) {
            let c = v, d, i = 0;
            const s = new Set();

            if (c && typeof c === 'object') {
                d = c.c;
                if (d && typeof d === 'object') {
                    if (!Object.prototype.hasOwnProperty.call(c, 'c')) return null;
                    c = d;
                }
            }

            if (!c || typeof c !== 'object')
                return null
            ;

            while (c) {
                d = c.p;
                if (!d || typeof d !== 'object') break;
                if (!Object.prototype.hasOwnProperty.call(c, 'p') || s.has(c) || i >= this.max)
                    return null
                ;
                s.add(c);
                c = d;
                i++;
            }

            return c;
        },

        state: function (o, v, d) {
            const c = o.context(v), x = v && v.c && typeof v.c === 'object' ? v.c : null;

            if (!c)
                return o
            ;

            if (!c[d.n])
                c[d.n] = d.f ? o[d.f]() : {}
            ;

            if (x && x !== c)
                x[d.n] = c[d.n]
            ;

            return c[d.n];
        }
    }
};
