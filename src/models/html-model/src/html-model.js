/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

function conditional(s) {
    let f;

    try {
        f = s.validators === true && s.requestModel && s.requestModel.conditional;
        return typeof f === 'function' ? f : undefined;
    } catch (e) {}
}

function transaction(x) {
    try {
        return !!x && typeof x.validator === 'function'
            && typeof x.accept === 'function' && typeof x.reuse === 'function';
    } catch (e) {
        return false;
    }
}

module.exports = {
    jTormHtmlModel: {
        // DI
        // promiseCacheModel
        // requestModel

        c: new Map(),
        max: 512,// DI: LRU cap on cached fetch promises; least-recently-used evicted beyond this
        ttl: 300000,// DI: absolute successful-result retention in milliseconds; Infinity opts out
        staleWindow: 0,// DI: opt-in request-triggered stale service after ttl; 0 waits for replacement
        validators: false,// DI: exact true opts into paired HTTP-validator revalidation

        key: function (v, c) {
            const q = this.requestModel && typeof this.requestModel.cacheKey === 'function'
                ? this.requestModel.cacheKey(v, c) : undefined;

            return q == null || q === '' ? undefined : q;
        },

        get: async function (v, c) {
            const s = this;
            const q = s.key(v, c), f = conditional(s);

            return s.promiseCacheModel.get(s, q, {
                validators: !!f,
                load: function (x) {
                    if (!f || !transaction(x))
                        return s.requestModel.get(v, c).text()
                    ;

                    return f.call(s.requestModel, v, c, {
                        key: q,
                        validator: function () { return x.validator(); }
                    }).text().then(function (r) {
                        if (r.status === 304)
                            return x.reuse(r.validator)
                        ;
                        x.accept(r.validator);
                        return r.value;
                    });
                }
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
