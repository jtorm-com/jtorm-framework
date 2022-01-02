/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';
module.exports = {
    jTormSessionMethod: {
        alias: 'ses',
        params: ['k', 'v', 'a'],
        validate: function (j, v) {
            return (v.d.k && j.context.models.session);
        },
        handle: async function (j, v) {
            var p = j.context.models.session.get(j, v.d.k);
            if (p && (v.t.p.v === undefined || p === v.d.v)) {
                if (v.d.a)
                    oD[v.d.a] = p;
                v.io = {c: 1};
            } else
                v.io = {};
        }
    }
};