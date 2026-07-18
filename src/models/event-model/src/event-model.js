/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormEventModel: {
        // DI
        // plugins[]

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
                p = this.plugins
            ;

            for (k in e) {
                for (k2 in e[k]) {
                    for (k3 in p)
                        if (p[k3].event[k] && p[k3].event[k][k2])
                            e[k][k2].push(p[k3])
                    ;

                    // Order by each plugin's weight FOR THIS phase/type — the weight
                    // lives at plugin.event[k][k2].weight, not on the plugin itself.
                    // (Every plugin in this bucket has event[k][k2]: the push above
                    // guards on it.) Ties keep insertion order (stable sort).
                    e[k][k2].sort((a, b) => {
                        return a.event[k][k2].weight - b.event[k][k2].weight;
                    });
                }
            }
        },

        handle: async function (v, e, t, x) {
            let k, c = this.event[e][t];

            for (k in c)
                await c[k][this.handlerName[e][t]](v, x)
            ;
        },

        complete: async function (v, t, x) {
            const c = this.event.after[t], n = 'complete' + t[0].toUpperCase() + t.slice(1);
            let f, q;

            for (const p of c)
                if (typeof p[n] === 'function') {
                    q = await p[n](v, x);
                    if (typeof q === 'function') {
                        if (f) throw new Error('Multiple completion commits');
                        f = q;
                    }
                }
            ;
            if (f) await f();
        },

        abort: async function (v, t, x, e) {
            const c = this.event.after[t], n = 'abort' + t[0].toUpperCase() + t.slice(1);

            for (const p of c)
                if (typeof p[n] === 'function')
                    try { await p[n](v, x, e); } catch (q) {}
                ;
        }
    }
};
