/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormDataModel: {
        // DI
        // promiseCacheModel
        // requestModel

        c: new Map(),
        max: 512,// DI: LRU cap on cached fetch promises; least-recently-used evicted beyond this
        ttl: 300000,// DI: absolute successful-result retention in milliseconds; Infinity opts out

        key: function (v, c) {
            const q = this.requestModel && typeof this.requestModel.cacheKey === 'function'
                ? this.requestModel.cacheKey(v, c) : undefined;

            return q == null || q === '' ? undefined : q;
        },

        get: async function (v, c) {
            const s = this;
            const q = s.key(v, c);

            return s.promiseCacheModel.get(s, q, {
                load: function () { return s.requestModel.get(v, c).json(); }
            });
        },

        purge: function (v, c) {
            let q;

            try { q = this.key(v, c); } catch (e) { return 0; }
            return this.promiseCacheModel.purge(this, q);
        },

        purgeAll: function () {
            return this.promiseCacheModel.purgeAll(this);
        }
    }
};
