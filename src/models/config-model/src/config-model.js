/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';
module.exports = {
    jTormConfigModel: {
        d: {},
        get: function (k) {
            return k ? this.d[k] : this.d;
        },
        set: function (k, v, d) {
            if (typeof v === 'object') {
                var a = Array.isArray(v), k2;

                if (d && d[k] === undefined) d[k] = a ? [] : {};
                else if (this.d[k] === undefined) this.d[k] = a ? [] : {};

                for (k2 in v)
                    this.set(k2, v[k2], d ? d[k] : this.d[k]);
            } else {
                if (d) d[k] = v;
                else this.d[k] = v;
            }

            Object.defineProperty(d ? d : this.d, k, {
                enumerable: 1,
                configurable: 0,
                writable: 0
            });
        }
    }
};