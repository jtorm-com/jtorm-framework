/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormTssModel: {
        // DI
        // promiseCacheModel
        // requestModel
        // tssParser

        c: new Map(),
        max: 512,// DI: LRU cap on cached fetch promises; least-recently-used evicted beyond this
        ttl: 300000,// DI: absolute successful-result retention in milliseconds; Infinity opts out
        staleWindow: 0,// DI: opt-in request-triggered stale service after ttl; 0 waits for replacement

        key: function (v, c) {
            const q = this.requestModel && typeof this.requestModel.cacheKey === 'function'
                ? this.requestModel.cacheKey(v, c) : undefined;

            return q == null || q === '' ? undefined : q;
        },

        get: async function (v, c) {
            const s = this;
            let r, k, q;

            if (Array.isArray(v)) {
                r = [];
                for (k in v)
                    r = r.concat(await s.get(v[k], c))
                ;

                return r;
            }

            q = s.key(v, c);

            return s.promiseCacheModel.get(s, q, {
                load: function () {
                    return s.requestModel.get(v, c).text().then(function (t) { return s.tssParser.handle(t); });
                }
            });
        },

        purge: function (v, c) {
            const a = [v], q = new Set(), seen = new Set();
            let n, x;

            try {
                while (a.length) {
                    x = a.pop();
                    if (Array.isArray(x)) {
                        if (seen.has(x)) continue;
                        seen.add(x);
                        for (let k = x.length - 1; k >= 0; k--) a.push(x[k]);
                    } else {
                        n = this.key(x, c);
                        if (n !== undefined) q.add(n);
                    }
                }
            } catch (e) {
                return 0;
            }

            n = 0;
            for (x of q) n += this.promiseCacheModel.purge(this, x);
            return n;
        },

        purgeAll: function () {
            return this.promiseCacheModel.purgeAll(this);
        }
    }
};
