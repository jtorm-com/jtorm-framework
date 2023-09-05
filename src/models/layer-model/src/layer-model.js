/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormLayerModel: {
        // DI
        // saveModel: null,

        cid: null,
        event: {
            before: {
                iteration: []
            },
            after: {
                iteration: [],
                view: []
            }
        },
        layers: {},
        updated: 0,

        init: async function () {
            if (this.saveModel) {
                const cache = this.saveModel.get();
                if (cache) {
                    this.event = cache.event;
                    this.layers = cache.layers;
                }
            }
        },

        get: function (v, e, t) {
            e = this.event[e][t]

            const
                l = this.layers,
                o = [];

            for (let i in e) {
                const
                    r = l[e[i]]
                        ? l[e[i]]
                        : null;

                if (r) {
                    r.sort(function (a, b) {
                        return a.z - b.z;
                    });

                    for (let k in r)
                        o.push(r[k].t);
                }
            }

            return o;
        },

        set: function (v) {
            const i = v.d.i
                ? v.d.i
                : v.d.cid
                    ? v.d.cid
                    : v.cid
                        ? v.cid
                        : this.cid;

            if (!i)
                throw new Error('ID not set');

            if (!v.d.z)
                v.d.z = 0;

            if (!this.layers[i])
                this.layers[i] = [];

            for (let k in v.t.c)
                this.layers[i].push({
                    z: parseInt(v.d.z),
                    t: v.t.c[k]
                });

            if (this.event[v.d.e][v.d.t].indexOf(i) === -1)
                this.event[v.d.e][v.d.t].push(i);

            this.updated = 1;
        },

        save: async function () {
            if (this.saveModel && this.updated)
                this.saveModel.set(this.layers, this.event);

            this.updated = 0;
        }
    }
};
