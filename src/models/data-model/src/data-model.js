/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormDataModel: {
        // DI
        // promiseCacheModel
        // requestModel

        c: new Map(),
        max: 512,// DI: LRU cap on cached fetch promises; least-recently-used evicted beyond this

        key: function (v, c) {
            return this.requestModel && this.requestModel.cacheKey ? this.requestModel.cacheKey(v, c)
                : this.requestModel && this.requestModel.url ? this.requestModel.url(v, c) : String(v)
            ;
        },

        get: async function (v, c) {
            const s = this;
            const q = s.key(v, c);// Map keys arrays/numbers by identity; coerce to a stable string (mirrors the old object cache) — v (e.g. an array of URLs) stays fresh per render

            return s.promiseCacheModel.get(s, q, {
                load: function () { return s.requestModel.get(v, c).json(); }
            });
        }
    }
};
