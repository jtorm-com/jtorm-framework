/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

function measure(v, l, d, n) {
    let k;

    if (d > l.valueDepth || ++n.v > l.values)
        throw new Error('Manifest compiler value limit')
    ;
    if (Array.isArray(v))
        for (k of v)
            measure(k, l, d + 1, n)
        ;
    else if (v && typeof v === 'object') {
        if (Object.getPrototypeOf(v) !== Object.prototype
            && Object.getPrototypeOf(v) !== null)
            throw new Error('Manifest compiler value invalid')
        ;
        for (k of Object.keys(v))
            measure(v[k], l, d + 1, n)
        ;
    } else if (v !== null && typeof v !== 'string'
        && typeof v !== 'boolean'
        && (typeof v !== 'number' || !Number.isFinite(v)))
        throw new Error('Manifest compiler value invalid')
    ;
}

module.exports = measure;
