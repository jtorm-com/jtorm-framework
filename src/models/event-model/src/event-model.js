/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';
module.exports = {
    jTormEventModel: {
        data: {
            before: {
                method: null,
                view: null
            },
            after: {
                method: null,
                view: null
            }
        },
        handle: async function (j, v, e, t) {
            var s = this,
                k,
                p = j.context.plugins,
                c = j.context.models.event.data[e][t];

            if (!c) {
                c = [];
                for (k in p) {
                    if (p[k][e] && p[k][e][t]) {
                        c.push(p[k][e][t]);
                    }
                }

                c.sort(function (a, b) {
                    return a.weight - b.weight;
                });

                j.context.models.event.data[e][t] = c;
            }

            for (let k in c)
                await c[k].handle(j, v);
        }
    }
};