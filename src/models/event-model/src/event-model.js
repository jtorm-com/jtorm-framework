/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormEventModel: {
        // DI
        plugins: null,

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
            let k,
                p = this.plugins,
                c = this.data[e][t];

            if (!c) {
                c = [];

                for (k in p)
                    if (p[k][e] && p[k][e][t])
                        c.push(p[k][e][t]);

                c.sort(function (a, b) {
                    return a.weight - b.weight;
                });

                this.data[e][t] = c;
            }

            for (let k in c)
                await c[k].handle(j, v);
        }
    }
};
