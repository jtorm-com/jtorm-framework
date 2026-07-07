/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormHtmlModel: {
        // DI
        // requestModel

        c: new Map(),
        max: 512,// DI: LRU cap on cached fetch promises; least-recently-used evicted beyond this

        get: async function (v) {
            const s = this;
            const c = String(v);// Map keys arrays/numbers by identity; coerce to a stable string (mirrors the old object cache) — v (e.g. an array of URLs) stays fresh per render
            let p = s.c.get(c), k;

            if (p !== undefined) {// hit: re-insert to bump recency (Map keeps true insertion order)
                s.c.delete(c);
                s.c.set(c, p);
                return p;
            }

            p = s.requestModel.get(v).text();
            p.catch(function () { if (s.c.get(c) === p) s.c.delete(c); });// clear only if still this promise
            s.c.set(c, p);

            while (s.c.size > s.max) {// evict LRU; never the entry just added (guards max <= 0)
                k = s.c.keys().next().value;
                if (k === c) break;
                s.c.delete(k);
            }

            return p;
        }
    }
};
