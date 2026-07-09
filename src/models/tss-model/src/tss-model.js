/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormTssModel: {
        // DI
        // requestModel
        // tssParser

        c: new Map(),
        max: 512,// DI: LRU cap on cached fetch promises; least-recently-used evicted beyond this

        key: function (v, c) {
            return this.requestModel && this.requestModel.url ? this.requestModel.url(v, c) : String(v);
        },

        get: async function (v, c) {
            const s = this;
            let r, k, p, q;

            if (Array.isArray(v)) {
                r = [];
                for (k in v)
                    r = r.concat(await s.get(v[k], c))
                ;

                return r;
            }

            q = s.key(v, c);
            p = s.c.get(q);

            if (p !== undefined) {// hit: re-insert to bump recency (Map keeps true insertion order)
                s.c.delete(q);
                s.c.set(q, p);
                return p;
            }

            p = s.requestModel.get(v, c).text().then(function (t) { return s.tssParser.handle(t); });
            p.catch(function () { if (s.c.get(q) === p) s.c.delete(q); });// clear only if still this promise
            s.c.set(q, p);

            while (s.c.size > s.max) {// evict LRU; never the entry just added (guards max <= 0)
                k = s.c.keys().next().value;
                if (k === q) break;
                s.c.delete(k);
            }

            return p;
        }
    }
};
