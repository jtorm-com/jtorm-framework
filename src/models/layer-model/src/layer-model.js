/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormLayerModel: {
        // DI
        saveModel: null,

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
                let cache = this.saveModel.get();
                if (cache) {
                    this.event = cache.event;
                    this.layers = cache.layers;
                }
            }
        },

        get: function (v, e, t) {
            let o = [];

            if (
                v.cid
                && this.event[e][t].indexOf(v.cid) !== -1
            ) {
                let r = this.layers[v.cid]
                        ? this.layers[v.cid]
                        : null,
                    k;

                if (r) {
                    r.sort(function (a, b) {
                        return a.z - b.z;
                    });

                    for (k in r)
                        o.push(r[k].t);
                }
            }

            return o;
        },

        set: function (v) {
            if (!v.cid && !v.d.cid && !this.cid)
                throw new Error('Cache ID not set');

            if (v.d.cid)
                this.cid = v.d.cid;
            else if (v.cid)
                this.cid = v.cid;

            if (!v.d.z)
                v.d.z = 0;

            if (!this.layers[this.cid])
                this.layers[this.cid] = [];

            for (let k in v.t.c)
                this.layers[this.cid].push({
                    c: parseInt(v.d.c),
                    z: parseInt(v.d.z),
                    t: v.t.c[k]
                });

            this.event[v.d.e][v.d.t].push(this.cid);

            this.updated = 1;
        },

        save: async function () {
            if (this.saveModel && this.updated)
                this.saveModel.set(this.layers, this.event);

            this.updated = 0;
        }
    }
};
