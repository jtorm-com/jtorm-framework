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
        }
    }
};
