/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormUiCacheModel: {
        // DI
        // saveModel

        c: new Map(),// composite-key -> {l,id,c,d}; LRU-bounded rendered-fragment cache
        max: 512,// DI: LRU cap on cached fragments; least-recently-used evicted beyond this
        updated: 0,
        sep: String.fromCharCode(0),// NUL key separator (built at runtime, never a raw NUL in source); can't occur in a language/id/variant, so distinct (l,id,c) never collide

        key: function (l, id, c) {
            return l + this.sep + id + this.sep + c;
        },

        init: async function () {
            let o, l, id, c;

            this.c = new Map();
            this.updated = 0;// a reloaded cache is clean — never carry a stale dirty flag into the next save()

            if (this.saveModel && (o = this.saveModel.get())) {// flatten the persisted nested {l:{id:{c:d}}} into the LRU Map (bounded to max)
                for (l in o)
                    for (id in o[l])
                        for (c in o[l][id])
                            this.put(l, id, c, o[l][id][c])
                ;
            }
        },

        get: async function (v, l, id, c) {
            const s = this, k = s.key(l, id, c), e = s.c.get(k);

            if (e !== undefined) {// hit: re-insert to bump recency (Map keeps insertion order)
                s.c.delete(k);
                s.c.set(k, e);
                return e.d;
            }

            return null;
        },

        set: function (v, l, id, c, d) {
            if (!this.c.has(this.key(l, id, c))) {// write-once per key (mirrors the old `=== undefined` guard)
                this.put(l, id, c, d);
                this.updated = 1;
            }
        },

        put: function (l, id, c, d) {// insert + LRU-evict; shared by set() and init()
            const s = this, k = s.key(l, id, c);
            let e;

            s.c.set(k, {l: l, id: id, c: c, d: d});

            while (s.c.size > s.max) {// evict LRU; never the entry just added (guards max <= 0)
                e = s.c.keys().next().value;
                if (e === k) break;
                s.c.delete(e);
            }
        },

        save: async function () {
            let o, e;

            if (this.saveModel && this.updated) {// rebuild the nested {l:{id:{c:d}}} shape the host persists (each entry carries its l/id/c)
                o = {};

                for (e of this.c.values()) {
                    if (!o[e.l]) o[e.l] = {};
                    if (!o[e.l][e.id]) o[e.l][e.id] = {};
                    o[e.l][e.id][e.c] = e.d;
                }

                this.saveModel.set(o);
            }

            this.updated = 0;
        }
    }
};
