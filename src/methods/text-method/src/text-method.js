/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';
module.exports = {
    jTormTextMethod: {
        alias: 't',
        params: [],
        validate: function (j) {
            return j.context.models.language !== undefined;
        },
        handle: async function (j, v) {
            let nD = j.context._.cloneDeep(v.m), x, l = j.context.models.language, k;

            for (k in v.t.p) {
                x = j.context.parsers.data.parse(v.m, v.t.p[k]);
                nD[k] = l.get(l.getCurrent(j), x ? x : v.t.p[k]);
            }

            v.io = {c: 1, d: nD};
        }
    }
};