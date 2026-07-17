/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

const state = Object.freeze({n: 'uiCache', f: 'freshState'});

module.exports = {
    jTormUiCacheModel: {
        // DI
        // renderContextModel
        // requestModel
        // saveModel

        cache: {},// exported nested store {l:{id:{c:d}}} the host persists via saveModel — the source of truth
        order: new Map(),// LRU recency tracker parallel to `cache`: composite-key -> {l,id,c}; drives eviction
        max: 512,// DI: LRU cap on cached fragments; least-recently-used evicted beyond this
        updated: 0,
        sep: String.fromCharCode(0),// NUL order-key separator (runtime-built, never a raw NUL in source); can't occur in a language/id/variant, so distinct (l,id,c) never collide

        freshState: function () {
            return { updated: 0 };
        },

        context: function (v) {
            return this.renderContextModel.cacheContext(v);
        },

        state: function (v) {
            return this.renderContextModel.state(this, v, state);
        },

        key: function (l, id, c) {
            return l + this.sep + id + this.sep + c;
        },

        part: function (v) {
            if (v != null && !['string', 'number', 'boolean', 'bigint'].includes(typeof v))
                return false
            ;

            return String(v).indexOf(this.sep) === -1;
        },

        tenant: function (v) {
            let c, t;

            try {
                c = this.context(v);
                if (!c && v != null)
                    return ''
                ;
                if (!this.requestModel || typeof this.requestModel.discriminator !== 'function')
                    return ''
                ;
                t = this.requestModel.discriminator(c);
            } catch (e) {
                return '';
            }

            return typeof t === 'string' && t.indexOf(this.sep) === -1 ? t : '';
        },

        scope: function (v, c) {
            const t = this.tenant(v);

            return t && this.part(c) ? t + this.sep + c : undefined;
        },

        init: async function () {
            let o, l, id, c;

            this.cache = {};
            this.order = new Map();
            this.updated = 0;// a reloaded cache is clean — never carry a stale dirty flag into the next save()

            if (this.saveModel && Object.prototype.hasOwnProperty.call(this.saveModel, 'uiCacheScoped')
                && this.saveModel.uiCacheScoped === true
                && (o = this.saveModel.get())) {// reload an explicitly migrated scoped store, rebuilding recency and bounding to max
                for (l in o)
                    for (id in o[l])
                        for (c in o[l][id])
                            this.put(l, id, c, o[l][id][c])
                ;
            }
        },

        get: async function (v, l, id, c) {
            const s = this;

            if (!s.part(l) || !s.part(id))
                return null
            ;
            c = s.scope(v, c);

            if (c === undefined)
                return null
            ;

            if (s.cache[l] && s.cache[l][id] && s.cache[l][id][c] !== undefined) {// hit: bump recency (Map keeps insertion order)
                const k = s.key(l, id, c);
                s.order.delete(k);
                s.order.set(k, {l: l, id: id, c: c});
                return s.cache[l][id][c];
            }

            return null;
        },

        set: function (v, l, id, c, d) {
            if (!this.part(l) || !this.part(id))
                return
            ;
            c = this.scope(v, c);

            if (c === undefined)
                return
            ;

            if (!this.cache[l] || !this.cache[l][id] || this.cache[l][id][c] === undefined) {// write-once per (l,id,c)
                this.put(l, id, c, d);
                this.state(v).updated = 1;
            }
        },

        put: function (l, id, c, d) {// write the nested entry, track recency, LRU-evict; shared by set() and init()
            const s = this;
            let e, o;

            if (!s.part(l) || !s.part(id) || typeof c !== 'string'
                || c.indexOf(s.sep) <= 0 || c.indexOf(s.sep, c.indexOf(s.sep) + 1) !== -1)
                return
            ;

            const k = s.key(l, id, c);

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
            if (!this.tenant(v))
                return
            ;

            const s = this.state(v);

            if (this.saveModel && s.updated)// persist the nested cache unchanged (shape identical to the pre-LRU model)
                this.saveModel.set(this.cache)
            ;

            s.updated = 0;
        }
    }
};
