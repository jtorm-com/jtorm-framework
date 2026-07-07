/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormDataModel: {
        // DI
        // requestModel

        c: new Map(),
        max: 512,// DI: LRU cap on cached fetch promises; least-recently-used evicted beyond this

        get: async function (v) {
            const s = this;
            let p = s.c.get(v), k;

            if (p !== undefined) {// hit: re-insert to bump recency (Map keeps true insertion order)
                s.c.delete(v);
                s.c.set(v, p);
                return p;
            }

            p = s.requestModel.get(v).json();
            p.catch(function () { if (s.c.get(v) === p) s.c.delete(v); });// clear only if still this promise
            s.c.set(v, p);

            while (s.c.size > s.max) {// evict LRU; never the entry just added (guards max <= 0)
                k = s.c.keys().next().value;
                if (k === v) break;
                s.c.delete(k);
            }

            return p;
        }
    }
};
