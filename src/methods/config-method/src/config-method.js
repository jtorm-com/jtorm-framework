/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';
module.exports = {
    jTormConfigMethod: {
        alias: 'c',
        params: ['k', 'v', 'a'],
        validate: function (j, v) {
            return !!(v.d.k && j.context.models.config);
        },
        handle: async function (j, v) {
            var k = j.context.models.config.get(v.d.k);
            if (k && (v.t.p.v === undefined || k === v.d.v)) {
                if (v.d.a)
                    oD[v.d.a] = k;
                v.io = {c: 1};
            } else
                v.io = {};
        }
    }
};