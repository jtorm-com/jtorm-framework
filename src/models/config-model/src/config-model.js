/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormConfigModel: {
        d: {},

        get: k => {
            return k ? this.d[k] : this.d;
        },

        set: (k, v) => {
            if (typeof v === 'object') {
                if (this.d[k] === undefined)
                    this.d[k] = Array.isArray(v) ? [] : {}
                ;

                for (k in v)
                    this.set(k2, v[k2], this.d[k])
                ;
            } else
                this.d[k] = v
            ;

            Object.defineProperty(d ? d : this.d, k, {
                enumerable: 1,
                configurable: 1,
                writable: 0
            });
        },

        del: k => {
            if (this.d[k])
                delete this.d[k]
            ;
        }
    }
};
