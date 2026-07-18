/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

const state = Object.freeze({n: 'uiCache', f: 'freshState'});

module.exports = {
    jTormUiCacheModel: {
        // DI
        // promiseCacheModel
        // renderContextModel
        // requestModel
        // saveModel

        cache: {},// exported nested store {l:{id:{c:d}}} the host persists via saveModel — the source of truth
        order: new Map(),// LRU recency tracker parallel to `cache`: composite-key -> {l,id,c}; drives eviction
        max: 512,// DI: LRU cap on cached fragments; least-recently-used evicted beyond this
        ttl: 300000,// DI: absolute successful-render retention in milliseconds; Infinity opts out
        updated: 0,
        revision: 0,
        flights: new WeakMap(),// current order Map -> bounded exact-key render leases
        iterations: new WeakMap(),// ephemeral handler-wrapper iteration token -> leader lease
        stores: new WeakMap(),// cache object -> opaque identity; never retains a replaced exported cache
        sep: String.fromCharCode(0),// NUL order-key separator (runtime-built, never a raw NUL in source); can't occur in a language/id/variant, so distinct (l,id,c) never collide

        freshState: function () {
            return {updated: 0, revision: 0};
        },

        context: function (v) {
            return this.renderContextModel.cacheContext(v);
        },

        state: function (v) {
            return this.renderContextModel.state(this, v, state);
        },

        touch: function (s) {
            s.updated = 1;
            s.revision = Number.isSafeInteger(s.revision) && s.revision >= 0
                ? s.revision + 1 : 1;
        },

        key: function (l, id, c) {
            return l + this.sep + id + this.sep + c;
        },

        store: function (add) {
            let n;

            if (!this.cache || typeof this.cache !== 'object') return;
            n = this.stores.get(this.cache);
            if (!n && add) {
                n = {};
                this.stores.set(this.cache, n);
            }

            return n;
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
            let a, o, l, id, c;
            const old = this.order;

            this.cache = {};
            this.order = new Map();
            this.updated = 0;// a reloaded cache is clean — never carry a stale dirty flag into the next save()
            this.revision = 0;
            this.stores = new WeakMap();
            if (this.promiseCacheModel && typeof this.promiseCacheModel.reset === 'function')
                this.promiseCacheModel.reset(this, old)
            ;

            if (this.saveModel && Object.prototype.hasOwnProperty.call(this.saveModel, 'uiCacheScoped')
                && this.saveModel.uiCacheScoped === true
                && (o = this.saveModel.get())) {// reload an explicitly migrated scoped store, rebuilding recency and bounding to max
                try { a = this.promiseCacheModel.time(this); } catch (e) { return; }
                if (a === undefined) return;
                for (l in o)
                    for (id in o[l])
                        for (c in o[l][id])
                            this.put(l, id, c, o[l][id][c], a)
                ;
            }
        },

        flight: function (add) {
            let f = this.flights.get(this.order);

            if (!f && add) {
                f = new Map();
                this.flights.set(this.order, f);
            }

            return f;
        },

        acquire: function (v, l, id, c, k, x, n) {
            const f = this.flight(1);
            let p, reject, resolve, root, r = f.get(k), z;

            try { root = this.context(v); } catch (e) { root = null; }

            if (r) {
                if (r.store !== n) {
                    f.delete(k);
                    r = null;
                } else if (r.root === root)
                    return null
                ;
                if (r) {
                    f.delete(k);
                    f.set(k, r);
                    return r.promise;
                }
            }

            p = new Promise(function (a, b) { resolve = a; reject = b; });
            p.catch(function () {});
            r = {key: k, l: l, id: id, c: c, root: root, store: n, promise: p,
                resolve: resolve, reject: reject, staged: 0, data: null};
            this.iterations.set(x, r);
            f.set(k, r);

            z = Number.isSafeInteger(this.max) && this.max > 0 ? this.max : 1;
            while (f.size > z) {
                const q = f.keys().next().value;
                if (q === k) break;
                f.delete(q);
            }

            return null;
        },

        get: async function (v, l, id, c, x) {
            const s = this;
            let d, k, n, o, q;

            if (!s.part(l) || !s.part(id))
                return null
            ;
            c = s.scope(v, c);

            if (c === undefined)
                return null
            ;

            k = s.key(l, id, c);
            n = s.store(x && typeof x === 'object');
            if (s.cache[l] && s.cache[l][id] && s.cache[l][id][c] !== undefined) {
                d = s.cache[l][id][c];
                o = s.order.get(k);
                try { q = n && o && s.promiseCacheModel.fresh(s, s.order, k, o, n); } catch (e) { q = false; }
                if (q) {// hit: bump recency without replacing timestamp identity
                    s.order.delete(k);
                    s.order.set(k, o);
                    return d;
                }

                try { q = s.state(v); } catch (e) { return null; }
                s.order.delete(k);
                s.promiseCacheModel.forget(s.order, k);
                s.prune(l, id, c);
                s.touch(q);
            }

            if (x && typeof x === 'object')
                return s.acquire(v, l, id, c, k, x, n)
            ;

            return null;
        },

        set: function (v, l, id, c, d) {
            let a, q;

            if (!this.part(l) || !this.part(id))
                return
            ;
            c = this.scope(v, c);

            if (c === undefined)
                return
            ;

            if (!this.cache[l] || !this.cache[l][id] || this.cache[l][id][c] === undefined) {// write-once per live (l,id,c)
                try {
                    a = this.promiseCacheModel.time(this);
                    if (a === undefined) return;
                    q = this.state(v);
                } catch (e) {
                    return;
                }
                if (this.put(l, id, c, d, a)) this.touch(q);
            }
        },

        put: function (l, id, c, d, a) {// write the nested entry, track recency/timestamp, LRU-evict; shared by set() and init()
            const s = this;
            let e, n, o;

            if (!s.part(l) || !s.part(id) || typeof c !== 'string'
                || c.indexOf(s.sep) <= 0 || c.indexOf(s.sep, c.indexOf(s.sep) + 1) !== -1)
                return false
            ;

            if (arguments.length < 5)
                try { a = s.promiseCacheModel.time(s); } catch (x) { return false; }
            ;
            if (a === undefined)
                return false
            ;

            const k = s.key(l, id, c);
            n = s.store(1);
            if (!n) return false;

            o = s.order.get(k);
            s.order.delete(k);
            if (o === undefined) s.promiseCacheModel.forget(s.order, k);
            else s.promiseCacheModel.forget(s.order, k, o);
            if (!s.cache[l]) s.cache[l] = {};
            if (!s.cache[l][id]) s.cache[l][id] = {};
            s.cache[l][id][c] = d;

            o = {l: l, id: id, c: c};
            s.order.set(k, o);
            s.promiseCacheModel.stamp(s, s.order, k, o, a, n);

            while (s.order.size > s.max) {// evict LRU; never the entry just added (guards max <= 0)
                e = s.order.keys().next().value;
                if (e === k) break;
                o = s.order.get(e);
                s.order.delete(e);
                s.promiseCacheModel.forget(s.order, e, o);
                s.prune(o.l, o.id, o.c);
            }

            return true;
        },

        prune: function (l, id, c) {// drop cache[l][id][c] and any parent object it leaves empty
            const s = this;

            if (!s.cache[l] || !s.cache[l][id]) return;

            delete s.cache[l][id][c];
            if (Object.keys(s.cache[l][id]).length === 0) delete s.cache[l][id];
            if (Object.keys(s.cache[l]).length === 0) delete s.cache[l];
        },

        stage: function (v, l, id, c, d, x) {
            const r = x && this.iterations.get(x);

            if (!r || !this.part(l) || !this.part(id)) return;
            c = this.scope(v, c);
            if (c === undefined || this.key(l, id, c) !== r.key) return;
            r.data = d;
            r.staged = 1;
        },

        complete: function (v, x) {
            const r = x && this.iterations.get(x), f = this.flight();
            let a, q;

            if (!r) return;
            this.iterations.delete(x);
            if (f && f.get(r.key) === r) {
                f.delete(r.key);
                if (this.store() === r.store && r.staged) {
                    try {
                        a = this.promiseCacheModel.time(this);
                        if (a !== undefined) q = this.state(v);
                        if (a !== undefined && this.put(r.l, r.id, r.c, r.data, a)) this.touch(q);
                    } catch (e) {
                        a = undefined;
                    }
                }
            }
            r.resolve(r.data);
        },

        abort: function (v, x, e) {
            const r = x && this.iterations.get(x), f = this.flight();

            if (!r) return;
            this.iterations.delete(x);
            if (f && f.get(r.key) === r) f.delete(r.key);
            r.reject(e);
        },

        purge: function (v, l, id, c) {
            let f, k, live, o, q, r, tracked;

            if (!this.part(l) || !this.part(id))
                return 0
            ;
            c = this.scope(v, c);
            if (c === undefined)
                return 0
            ;

            k = this.key(l, id, c);
            live = !!(this.cache[l] && this.cache[l][id] && this.cache[l][id][c] !== undefined);
            tracked = this.order.has(k);
            f = this.flight();
            r = f && f.get(k);
            if (!live && !tracked && !r)
                return 0
            ;

            if (live)
                try { q = this.state(v); } catch (e) { return 0; }
            ;

            if (live || tracked) {
                o = this.order.get(k);
                this.order.delete(k);
                if (o === undefined) this.promiseCacheModel.forget(this.order, k);
                else this.promiseCacheModel.forget(this.order, k, o);
                if (live) {
                    this.prune(l, id, c);
                    this.touch(q);
                }
            }
            if (r) f.delete(k);
            return 1;
        },

        purgeAll: function (v) {
            const f = this.flight(), q = new Set();
            let id, l, c, s;

            if (!this.tenant(v))
                return 0
            ;

            try {
                for (l of Object.keys(this.cache))
                    for (id of Object.keys(this.cache[l]))
                        for (c of Object.keys(this.cache[l][id]))
                            q.add(this.key(l, id, c))
                ;
                for (const k of this.order.keys()) q.add(k);
                if (f) for (const k of f.keys()) q.add(k);
                if (Object.keys(this.cache).length) s = this.state(v);
            } catch (e) {
                return 0;
            }

            if (!q.size)
                return 0
            ;

            if (Object.keys(this.cache).length) {
                this.cache = {};
                this.order.clear();
                this.promiseCacheModel.clear(this.order);
                this.touch(s);
            } else if (this.order.size) {
                this.order.clear();
                this.promiseCacheModel.clear(this.order);
            }
            if (f) f.clear();
            return q.size;
        },

        save: async function (v) {
            if (!this.tenant(v))
                return
            ;

            const s = this.state(v), n = s.revision;

            if (this.saveModel && s.updated)// persist the nested cache unchanged (shape identical to the pre-LRU model)
                await this.saveModel.set(this.cache)
            ;

            if (s.revision === n) s.updated = 0;
        }
    }
};
