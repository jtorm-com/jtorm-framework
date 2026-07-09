/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormUiCacheModel: {
        // DI
        // saveModel

        cache: {},// exported nested store {l:{id:{c:d}}} the host persists via saveModel — the source of truth
        order: new Map(),// LRU recency tracker parallel to `cache`: composite-key -> {l,id,c}; drives eviction
        max: 512,// DI: LRU cap on cached fragments; least-recently-used evicted beyond this
        updated: 0,
        sep: String.fromCharCode(0),// NUL order-key separator (runtime-built, never a raw NUL in source); can't occur in a language/id/variant, so distinct (l,id,c) never collide

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

            if (!c.uiCache)
                c.uiCache = { updated: 0 }
            ;

            if (v.c !== c)
                v.c.uiCache = c.uiCache
            ;

            return c.uiCache;
        },

        key: function (l, id, c) {
            return l + this.sep + id + this.sep + c;
        },

        tenant: function (v) {
            const c = this.context(v), r = c && c.request;

            if (c && c.tenant != null)
                return String(c.tenant)
            ;

            if (r && r.tenant != null)
                return String(r.tenant)
            ;

            if (r && r.origin != null)
                return String(r.origin)
            ;

            if (r && r.base != null)
                return String(r.base)
            ;

            return '';
        },

        scope: function (v, c) {
            const t = this.tenant(v);

            return t ? t + this.sep + c : c;
        },

        init: async function () {
            let o, l, id, c;

            this.cache = {};
            this.order = new Map();
            this.updated = 0;// a reloaded cache is clean — never carry a stale dirty flag into the next save()

            if (this.saveModel && (o = this.saveModel.get())) {// reload the persisted nested cache, rebuilding recency and bounding to max
                for (l in o)
                    for (id in o[l])
                        for (c in o[l][id])
                            this.put(l, id, c, o[l][id][c])
                ;
            }
        },

        get: async function (v, l, id, c) {
            const s = this;
            c = s.scope(v, c);

            if (s.cache[l] && s.cache[l][id] && s.cache[l][id][c] !== undefined) {// hit: bump recency (Map keeps insertion order)
                const k = s.key(l, id, c);
                s.order.delete(k);
                s.order.set(k, {l: l, id: id, c: c});
                return s.cache[l][id][c];
            }

            return null;
        },

        set: function (v, l, id, c, d) {
            c = this.scope(v, c);

            if (!this.cache[l] || !this.cache[l][id] || this.cache[l][id][c] === undefined) {// write-once per (l,id,c)
                this.put(l, id, c, d);
                this.state(v).updated = 1;
            }
        },

        put: function (l, id, c, d) {// write the nested entry, track recency, LRU-evict; shared by set() and init()
            const s = this, k = s.key(l, id, c);
            let e, o;

            if (!s.cache[l]) s.cache[l] = {};
            if (!s.cache[l][id]) s.cache[l][id] = {};
            s.cache[l][id][c] = d;

            s.order.delete(k);
            s.order.set(k, {l: l, id: id, c: c});

            while (s.order.size > s.max) {// evict LRU; never the entry just added (guards max <= 0)
                e = s.order.keys().next().value;
                if (e === k) break;
                o = s.order.get(e);
                s.order.delete(e);
                s.prune(o.l, o.id, o.c);
            }
        },

        prune: function (l, id, c) {// drop cache[l][id][c] and any parent object it leaves empty
            const s = this;

            if (!s.cache[l] || !s.cache[l][id]) return;

            delete s.cache[l][id][c];
            if (Object.keys(s.cache[l][id]).length === 0) delete s.cache[l][id];
            if (Object.keys(s.cache[l]).length === 0) delete s.cache[l];
        },

        save: async function (v) {
            const s = this.state(v);

            if (this.saveModel && s.updated)// persist the nested cache unchanged (shape identical to the pre-LRU model)
                this.saveModel.set(this.cache)
            ;

            s.updated = 0;
        }
    }
};
