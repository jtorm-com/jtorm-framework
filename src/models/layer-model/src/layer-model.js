/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormLayerModel: {
        // DI
        // saveModel: null

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

        emptyEvent: function () {
            return { before: { iteration: [] }, after: { iteration: [], view: [] } };
        },

        context: function (v) {
            let c = v && v.c;

            if (!c || typeof c !== 'object')
                return null
            ;

            while (c.p && typeof c.p === 'object')
                c = c.p
            ;

            return c;
        },

        state: function (v) {
            const c = this.context(v);

            if (!c)
                return this
            ;

            if (!c.layer)
                c.layer = { cid: null, currentCid: [], event: this.emptyEvent(), layers: {}, updated: 0 }
            ;

            if (v.c !== c)
                v.c.layer = c.layer
            ;

            return c.layer;
        },

        get: function (v, e, t) {
            const s = this.state(v);
            e = s.event[e][t];

            const
                l = s.layers,
                o = []
            ;

            for (let i in e) {
                const
                    r = l[e[i]]
                        ? l[e[i]]
                        : null
                ;

                if (r) {
                    r.sort(function (a, b) {
                        return a.z - b.z;
                    });

                    for (let k in r)
                        o.push(r[k].t)
                    ;
                }
            }

            return o;
        },

        set: function (v) {
            const s = this.state(v);
            const i = v.d.i
                ? v.d.i
                : v.d.cid
                    ? v.d.cid
                    : v.cid
                        ? v.cid
                        : s.cid
            ;

            if (!i)
                throw new Error('ID not set')
            ;

            if (!v.d.z)
                v.d.z = 0
            ;

            if (!s.layers[i])
                s.layers[i] = []
            ;

            for (let k in v.t.c)
                s.layers[i].push({
                    z: parseInt(v.d.z),
                    t: v.t.c[k]
                })
            ;

            if (s.event[v.d.e][v.d.t].indexOf(i) === -1)
                s.event[v.d.e][v.d.t].push(i)
            ;

            s.updated = 1;
        },

        initCache: async function () {
            const cache = await this.saveModel.get();
            if (cache) {
                this.event = cache.event;
                this.layers = cache.layers;
            }
        },

        save: async function (v) {
            const s = this.state(v);

            if (this.saveModel && s.updated)
                this.saveModel.set(s.layers, s.event)
            ;

            s.cid = null;
            s.currentCid = [];
            s.event = this.emptyEvent();
            s.layers = {};
            s.updated = 0;
        }
    }
};
