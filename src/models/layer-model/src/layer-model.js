/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';
module.exports = {
    jTormLayerModel: {
        cid: null,
        layers: {},
        get: function (j, v, e, t) {
            if (!v.cid) v.cid = 'default';
            // console.log(v.cid, this.layers);
            var r = (this.layers[e] && this.layers[e][t]) ? this.layers[e][t][v.cid] : null,
                o = [];

            if (r) {
                r.sort(function (a, b) {
                    return a.z - b.z;
                });

                for (let k in r)
                    o.push(r[k].t);
            }

            return o;
        },
        set: function (j, v) {// todo de layers moeten ook worden opgeslagen anders kans dat er iets wordt gemist? bij een refresh van de pagina bv
            if (!v.cid && v.d.cid && !this.cid) {
                console.log('jTormLayerModel set', v.t.c);
                throw new Error('Cache ID not set');
            }

            if (v.d.cid) this.cid = v.d.cid;
            else if (v.cid) this.cid = v.cid;

            if (!v.d.e) v.d.e = 'after';
            if (!v.d.t) v.d.t = 'iteration';
            if (!v.d.z) v.d.z = 0;

            if (!this.layers[v.d.e]) this.layers[v.d.e] = {};
            if (!this.layers[v.d.e][v.d.t]) this.layers[v.d.e][v.d.t] = {};
            if (!this.layers[v.d.e][v.d.t][this.cid]) this.layers[v.d.e][v.d.t][this.cid] = [];

            for (let k in v.t.c)
                this.layers[v.d.e][v.d.t][this.cid].push({
                    z: v.d.z,
                    t: v.t.c[k]
                });
        },
        reset: function(e, t, cid) {
            if (!cid) cid = this.cid;
            if (this.layers[e] && this.layers[e][t])
                delete this.layers[e][t][cid];
        }
    }
};