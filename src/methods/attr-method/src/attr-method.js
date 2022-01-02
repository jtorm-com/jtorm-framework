/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';
module.exports = {
    jTormAttrMethod: {
        alias: 'a',
        params: ['n', 'v', 'm', 'ns', 'a', 'p'],
        validate: function (j, v) {
            return !!(v.d.n && (v.d.v || v.d.m === 'r'));
        },
        handle: async function (j, v) {
            var s = this;
            await v.h.set(v.t.s, function (e) {
                let tV;
                tV = s.get(e, v.d.n);
                if (v.d.v) {
                    if (v.d.a) v.d.v += v.d.a;
                    if (v.d.p) v.d.v = v.d.p + v.d.v;
                    if (v.d.m === 'p') s.set(e, v.d.n, v.d.v + (v.d.ns ? tV : (tV ? ' ' + tV : '')));
                    else if (v.d.m === 'a') s.set(e, v.d.n, (v.d.ns ? tV : (tV ? tV + ' ' : '')) + v.d.v);
                    else if (v.d.m === 'r') {
                        if (tV) tV = tV.replace(new RegExp('\\b' + v.d.v + '\\b', 'gm'), "");
                        if (tV) s.set(e, v.d.n, tV);
                        else s.del(e, v.d.n);
                    } else s.set(e, v.d.n, v.d.v);
                } else if (v.d.m === 'r') s.del(e, v.d.n);
            }, v);
            v.io = {c: 1};
        },
        get: function (e, n) {
            return e.getAttribute(n);
        },
        set: function (e, n, v) {
            e.setAttribute(n, v);
        },
        del: function (e, n) {
            e.removeAttribute(n);
        }
    }
};