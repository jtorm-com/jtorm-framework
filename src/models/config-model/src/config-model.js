/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormConfigModel: {
        d: {},

        get: function(k) {
            return k ? this.d[k] : this.d;
        },

        set: function(k, v, t) {
            t = t ? t : this.d;

            if (typeof v === 'object') {
                if (t[k] === undefined)
                    t[k] = Array.isArray(v) ? [] : {}
                ;

                for (let p in v)
                    this.set(p, v[p], t[k])
                ;
            } else
                t[k] = v
            ;

            Object.defineProperty(t, k, {
                enumerable: 1,
                configurable: 1,
                writable: 0
            });
        },

        del: function(k) {
            if (this.d[k])
                delete this.d[k]
            ;
        }
    }
};
