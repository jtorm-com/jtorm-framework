/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormEventModel: {
        // DI
        // plugins: null,

        event: {
            before: {
                iteration: [],
                method: [],
                view: []
            },
            after: {
                iteration: [],
                method: [],
                view: []
            }
        },
        handlerName: {
            before: {
                iteration: 'beforeIteration',
                method: 'beforeMethod',
                view: 'beforeView'
            },
            after: {
                iteration: 'afterIteration',
                method: 'afterMethod',
                view: 'afterView'
            }
        },

        init: function () {
            let k,
                k2,
                k3,
                e = this.event,
                p = this.plugins;

            for (k in e) {
                for (k2 in e[k]) {
                    for (k3 in p) {
                        if (p[k3].event[k] && p[k3].event[k][k2])
                            e[k][k2].push(p[k3]);
                    }

                    e[k][k2].sort(function (a, b) {
                        return a.weight - b.weight;
                    });
                }
            }
        },

        handle: async function (v, e, t) {
            let k, c = this.event[e][t];

            for (k in c)
                await c[k][this.handlerName[e][t]](v);
        }
    }
};
