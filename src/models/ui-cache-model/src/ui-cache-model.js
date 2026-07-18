/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

const state = Object.freeze({n: 'uiCache', f: 'freshState'});
const fields = Object.freeze(['language', 'cid', 'variant', 'html', 'settledAt']);
const version = 1;
let lifecycle = 0;

const change = function () {
    lifecycle = lifecycle === Number.MAX_SAFE_INTEGER ? 1 : lifecycle + 1;
    return lifecycle;
};

const plain = function (o) {
    let p;

    if (!o || typeof o !== 'object' || Array.isArray(o)) return false;
    try { p = Object.getPrototypeOf(o); } catch (e) { return false; }
    return p === Object.prototype || p === null;
};

const descriptor = function (o, k) {
    let d;

    try { d = Object.getOwnPropertyDescriptor(o, k); } catch (e) { return false; }
    if (!d) return null;
    return Object.prototype.hasOwnProperty.call(d, 'value') ? d : false;
};

const promised = function (o) {
    let ok = 1, p;

    try {
        p = new Promise(function (resolve, reject) {
            try { Promise.prototype.then.call(o, resolve, reject); }
            catch (e) { ok = 0; resolve(); }
        });
    } catch (e) { return; }

    return ok ? p : undefined;
};

const exact = function (o, names) {
    let keys;

    if (!plain(o)) return false;
    try { keys = Reflect.ownKeys(o); } catch (e) { return false; }
    if (keys.length !== names.length || keys.some(function (k) { return typeof k !== 'string' || !names.includes(k); }))
        return false
    ;
    return names.every(function (k) { return !!descriptor(o, k); });
};

const limit = function (s) {
    return Number.isSafeInteger(s.max) && s.max > 0 ? s.max : 1;
};

const scoped = function (s, c) {
    const i = typeof c === 'string' ? c.indexOf(s.sep) : -1;

    return i > 0 && c.indexOf(s.sep, i + 1) === -1;
};

const lookup = function (o, l, id, c) {
    let a, b, d;

    if (!plain(o)) return {status: -1};
    l = String(l); id = String(id);
    d = descriptor(o, l);
    if (d === false || d && !plain(d.value)) return {status: -1};
    if (!d) return {status: 0};
    a = d.value;
    d = descriptor(a, id);
    if (d === false || d && !plain(d.value)) return {status: -1};
    if (!d) return {status: 0};
    b = d.value;
    d = descriptor(b, c);
    if (d === false) return {status: -1};
    return d ? {status: 1, value: d.value} : {status: 0};
};

const write = function (o, l, id, c, v) {
    const changes = [];
    let a = o, d, k, ok = 1;

    if (!plain(o)) return;
    for (k of [String(l), String(id)]) {
        d = descriptor(a, k);
        if (d === false || d && !plain(d.value)) { ok = 0; break; }
        if (!d) {
            const n = {};
            try {
                Object.defineProperty(a, k, {value: n, writable: true, enumerable: true, configurable: true});
            } catch (e) { ok = 0; break; }
            changes.push({o: a, k: k, d: null});
            a = n;
        } else a = d.value;
    }
    if (!ok) {
        for (let i = changes.length - 1; i >= 0; i--)
            try { delete changes[i].o[changes[i].k]; } catch (e) {}
        ;
        return;
    }

    d = descriptor(a, c);
    if (d === false) return;
    try {
        Object.defineProperty(a, c, {value: v, writable: true, enumerable: true, configurable: true});
    } catch (e) {
        for (let i = changes.length - 1; i >= 0; i--)
            try { delete changes[i].o[changes[i].k]; } catch (x) {}
        ;
        return;
    }
    changes.push({o: a, k: c, d: d});

    return function () {
        for (let i = changes.length - 1; i >= 0; i--)
            try {
                if (changes[i].d) Object.defineProperty(changes[i].o, changes[i].k, changes[i].d);
                else delete changes[i].o[changes[i].k];
            } catch (e) {}
        ;
    };
};

const envelope = function (s, o) {
    let a, d, keys, seen;

    if (!exact(o, ['version', 'fragments']) || descriptor(o, 'version').value !== version)
        return
    ;
    a = descriptor(o, 'fragments').value;
    try {
        if (!Array.isArray(a) || Object.getPrototypeOf(a) !== Array.prototype
            || !Number.isSafeInteger(a.length) || a.length > limit(s)
            || Object.getOwnPropertySymbols(a).length)
            return
        ;
        keys = Object.getOwnPropertyNames(a);
    } catch (e) { return; }
    if (keys.length !== a.length + 1 || !keys.includes('length')) return;

    seen = new Set();
    const records = [];
    for (let i = 0; i < a.length; i++) {
        d = descriptor(a, String(i));
        if (!d || !exact(d.value, fields)) return;
        const r = {}, q = d.value;
        for (const k of fields) r[k] = descriptor(q, k).value;
        if (typeof r.language !== 'string' || r.language.indexOf(s.sep) !== -1
            || typeof r.cid !== 'string' || r.cid.indexOf(s.sep) !== -1
            || !scoped(s, r.variant) || typeof r.html !== 'string'
            || !Number.isSafeInteger(r.settledAt) || r.settledAt < 0)
            return
        ;
        const k = s.key(r.language, r.cid, r.variant);
        if (seen.has(k)) return;
        seen.add(k); records.push(r);
    }

    return records;
};

const absolute = function (s, o) {
    let f, n, p;

    try {
        f = s.persistenceClock;
        if (typeof f !== 'function') return;
        n = f.call(s);
        p = s.persistenceObserved.get(o);
    } catch (e) { return; }
    if (!Number.isSafeInteger(n) || n < 0
        || p !== undefined && (!Number.isSafeInteger(p) || p < 0 || n < p))
        return
    ;
    return n;
};

const pairs = function (s, o, add) {
    let p;

    try { p = s.settlements.get(o); } catch (e) { return; }
    if (!p && add) {
        p = new Map();
        try { s.settlements.set(o, p); } catch (e) { return; }
    }
    return p;
};

const unpair = function (s, k, o) {
    const p = pairs(s, s.order), r = p && p.get(k);

    if (!r || o !== undefined && r.value !== o) return 0;
    p.delete(k);
    if (!p.size) s.settlements.delete(s.order);
    return 1;
};

const publish = function (s, l, id, c, d, a, t) {
    let e, k, made = 0, n, o, old, p, undo;

    if (!s.part(l) || !s.part(id) || !scoped(s, c)
        || a === undefined || !Number.isSafeInteger(t) || t < 0)
        return false
    ;
    try {
        k = s.key(l, id, c);
        old = s.order.get(k);
        undo = write(s.cache, l, id, c, d);
        if (!undo) return false;
        n = s.store(1);
        p = pairs(s, s.order);
        if (!p) { p = pairs(s, s.order, 1); made = 1; }
        if (!n || !p) throw new Error('metadata');

        s.order.delete(k);
        if (old === undefined) s.promiseCacheModel.forget(s.order, k);
        o = {l: l, id: id, c: c};
        s.order.set(k, o);
        if (!s.promiseCacheModel.stamp(s, s.order, k, o, a, n)) throw new Error('stamp');
        p.set(k, {value: o, scope: n, html: d, settledAt: t});

        while (s.order.size > limit(s)) {
            e = s.order.keys().next().value;
            if (e === k) break;
            o = s.order.get(e);
            s.order.delete(e);
            s.promiseCacheModel.forget(s.order, e, o);
            p.delete(e);
            s.prune(o.l, o.id, o.c);
        }
        if (!p.size) s.settlements.delete(s.order);
        s.persistenceObserved.set(s.order, t);
        change();
        return true;
    } catch (e) {
        try {
            if (undo) undo();
            if (k !== undefined) {
                o = s.order.get(k);
                if (o !== undefined && o !== old) {
                    s.order.delete(k);
                    s.promiseCacheModel.forget(s.order, k, o);
                }
                if (old !== undefined) s.order.set(k, old);
                if (p) {
                    const r = p.get(k);
                    if (r && r.value !== old) p.delete(k);
                }
            }
            if (made && p && !p.size) s.settlements.delete(s.order);
        } catch (x) {}
        return false;
    }
};

const snapshot = function (s) {
    let n, p;
    const fragments = [];

    try {
        if (!(s.order instanceof Map) || Object.getPrototypeOf(s.order) !== Map.prototype
            || s.order.size > limit(s)) return;
        p = pairs(s, s.order);
        if ((p ? p.size : 0) !== s.order.size) return;
        n = s.store();
        for (const [k, o] of s.order) {
            if (!exact(o, ['l', 'id', 'c'])) return;
            const l = descriptor(o, 'l').value, id = descriptor(o, 'id').value,
                c = descriptor(o, 'c').value, d = lookup(s.cache, l, id, c), r = p.get(k);
            if (!s.part(l) || !s.part(id) || !scoped(s, c)
                || k !== s.key(l, id, c) || d.status !== 1 || typeof d.value !== 'string'
                || !r || r.value !== o || r.scope !== n || r.html !== d.value
                || !Number.isSafeInteger(r.settledAt) || r.settledAt < 0)
                return
            ;
            fragments.push(Object.freeze({
                language: String(l), cid: String(id), variant: c,
                html: d.value, settledAt: r.settledAt
            }));
        }
    } catch (e) { return; }

    return Object.freeze({version: version, fragments: Object.freeze(fragments)});
};

module.exports = {
    jTormUiCacheModel: {
        // DI
        // promiseCacheModel
        // renderContextModel
        // requestModel
        // saveModel

        cache: {},// exported live nested store {l:{id:{c:d}}}; persistence uses a versioned paired wire
        order: new Map(),// LRU recency tracker parallel to `cache`: composite-key -> {l,id,c}; drives eviction
        max: 512,// DI: LRU cap on cached fragments; least-recently-used evicted beyond this
        ttl: 300000,// DI: absolute successful-render retention in milliseconds; Infinity opts out
        persistenceClock: function () { return Date.now(); },// DI: restart-stable Unix-epoch milliseconds
        updated: 0,
        revision: 0,
        flights: new WeakMap(),// current order Map -> bounded exact-key render leases
        iterations: new WeakMap(),// ephemeral handler-wrapper iteration token -> leader lease
        stores: new WeakMap(),// cache object -> opaque identity; never retains a replaced exported cache
        settlements: new WeakMap(),// current order Map -> bounded exact fragment/timestamp pairs
        persistenceObserved: new WeakMap(),// current order Map -> absolute-clock high-water
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
            let a, candidateOrder, d, g, m, n, now, o, p, records, sampled = 0;
            const old = this.order, token = change();

            this.cache = {};
            this.order = new Map();
            this.updated = 0;// a reloaded cache is clean — never carry a stale dirty flag into the next save()
            this.revision = 0;
            this.stores = new WeakMap();
            this.settlements = new WeakMap();
            this.persistenceObserved = new WeakMap();
            if (this.promiseCacheModel && typeof this.promiseCacheModel.reset === 'function')
                this.promiseCacheModel.reset(this, old)
            ;

            const cache = this.cache, order = this.order, discard = () => {
                if (candidateOrder)
                    try { this.promiseCacheModel.clear(candidateOrder); } catch (e) {}
                ;
                if (sampled && lifecycle === token && this.cache === cache && this.order === order)
                    try { this.promiseCacheModel.reset(this, order); } catch (e) {}
                ;
            };

            m = this.saveModel;
            d = m && descriptor(m, 'uiCacheScoped');
            if (!d || d.value !== true)
                return
            ;
            try {
                g = m.get;
                if (typeof g !== 'function') return;
                o = g.call(m);
                p = promised(o);
                if (p) o = await p;
            } catch (e) { return; }
            if (lifecycle !== token || this.cache !== cache || this.order !== order) return;
            records = envelope(this, o);
            if (!records) return;

            try { a = this.promiseCacheModel.time(this); sampled = 1; } catch (e) { return; }
            now = absolute(this, order);
            if (now === undefined) { discard(); return; }
            for (const r of records)
                if (r.settledAt > now) { discard(); return; }
            ;

            const candidate = {}, candidateStores = new WeakMap(), candidatePairs = new Map();
            candidateOrder = new Map();
            try {
                for (const r of records) {
                    const at = this.promiseCacheModel.restore(this, now - r.settledAt, a);
                    if (at === undefined) continue;
                    if (!n) { n = {}; candidateStores.set(candidate, n); }
                    const k = this.key(r.language, r.cid, r.variant), value = {l: r.language, id: r.cid, c: r.variant};
                    if (!write(candidate, r.language, r.cid, r.variant, r.html)) throw new Error('cache');
                    candidateOrder.set(k, value);
                    if (!this.promiseCacheModel.stamp(this, candidateOrder, k, value, at, n)) throw new Error('stamp');
                    candidatePairs.set(k, {value: value, scope: n, html: r.html, settledAt: r.settledAt});
                }
            } catch (e) { discard(); return; }

            try {
                if (lifecycle !== token || this.cache !== cache || this.order !== order
                    || Reflect.ownKeys(cache).length || order.size)
                    { discard(); return; }
            } catch (e) { discard(); return; }

            this.cache = candidate;
            this.order = candidateOrder;
            this.stores = candidateStores;
            this.settlements = new WeakMap();
            if (candidatePairs.size) this.settlements.set(candidateOrder, candidatePairs);
            this.persistenceObserved = new WeakMap();
            this.persistenceObserved.set(candidateOrder, now);
            change();
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
            change();

            z = limit(this);
            while (f.size > z) {
                const q = f.keys().next().value;
                if (q === k) break;
                f.delete(q);
            }

            return null;
        },

        get: async function (v, l, id, c, x) {
            const s = this;
            let d, k, n, o, p, q, r;

            if (!s.part(l) || !s.part(id))
                return null
            ;
            c = s.scope(v, c);

            if (c === undefined)
                return null
            ;

            k = s.key(l, id, c);
            try {
                n = s.store(x && typeof x === 'object');
                d = lookup(s.cache, l, id, c);
                o = s.order.get(k);
                p = pairs(s, s.order);
                r = p && p.get(k);
            } catch (e) { return null; }
            if (d.status === 1 && d.value !== undefined) {
                try {
                    q = n && o && r && r.value === o && r.scope === n && r.html === d.value
                        && Number.isSafeInteger(r.settledAt) && r.settledAt >= 0
                        && s.promiseCacheModel.fresh(s, s.order, k, o, n);
                } catch (e) { q = false; }
                if (q) {// hit: bump recency without replacing timestamp identity
                    s.order.delete(k);
                    s.order.set(k, o);
                    return d.value;
                }
            }

            if (d.status === 1 && d.value !== undefined || o || r) {
                try { q = s.state(v); } catch (e) { return null; }
                s.order.delete(k);
                s.promiseCacheModel.forget(s.order, k);
                unpair(s, k);
                s.prune(l, id, c);
                s.touch(q);
                change();
            }

            if (x && typeof x === 'object')
                return s.acquire(v, l, id, c, k, x, n)
            ;

            return null;
        },

        set: function (v, l, id, c, d) {
            let a, n, q;

            if (!this.part(l) || !this.part(id))
                return
            ;
            c = this.scope(v, c);

            if (c === undefined)
                return
            ;

            try { n = lookup(this.cache, l, id, c); } catch (e) { return; }
            if (n.status < 0 || n.status === 1 && n.value !== undefined) return;
            try {
                a = this.promiseCacheModel.time(this);
                if (a === undefined) return;
                q = this.state(v);
                n = absolute(this, this.order);
            } catch (e) { return; }
            if (n !== undefined && publish(this, l, id, c, d, a, n)) this.touch(q);
        },

        put: function (l, id, c, d, a) {// publish one scoped live entry; optional process-local stamp stays compatible
            const s = this;
            let n;

            if (!s.part(l) || !s.part(id) || !scoped(s, c))
                return false
            ;

            if (arguments.length < 5)
                try { a = s.promiseCacheModel.time(s); } catch (x) { return false; }
            ;
            if (a === undefined)
                return false
            ;
            n = absolute(s, s.order);
            return n === undefined ? false : publish(s, l, id, c, d, a, n);
        },

        prune: function (l, id, c) {// drop cache[l][id][c] and any parent object it leaves empty
            const s = this;
            let a, b, d;

            try {
                l = String(l); id = String(id);
                d = descriptor(s.cache, l);
                if (!d || !plain(d.value)) return;
                a = d.value;
                d = descriptor(a, id);
                if (!d || !plain(d.value)) return;
                b = d.value;
                d = descriptor(b, c);
                if (!d) return;
                delete b[c];
                if (!Reflect.ownKeys(b).length) delete a[id];
                if (!Reflect.ownKeys(a).length) delete s.cache[l];
            } catch (e) {}
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
            let a, c, i, q;

            if (!r) return;
            this.iterations.delete(x);
            if (f && f.get(r.key) === r) {
                f.delete(r.key);
                if (this.store() === r.store && r.staged) {
                    try {
                        i = r.c.indexOf(this.sep);
                        c = i > 0 ? this.scope(v, r.c.slice(i + 1)) : undefined;
                        if (c === r.c) a = this.promiseCacheModel.time(this);
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
            let d, f, k, live, o, p, q, r, tracked;

            if (!this.part(l) || !this.part(id))
                return 0
            ;
            c = this.scope(v, c);
            if (c === undefined)
                return 0
            ;

            k = this.key(l, id, c);
            try {
                d = lookup(this.cache, l, id, c);
                live = d.status === 1 && d.value !== undefined;
                tracked = this.order.has(k);
                p = pairs(this, this.order);
                p = p && p.get(k);
                f = this.flight();
                r = f && f.get(k);
                if (!live && !tracked && !p && !r) return 0;
            } catch (e) { return 0; }

            if (live || p)
                try { q = this.state(v); } catch (e) { return 0; }
            ;

            if (live || tracked || p) {
                o = this.order.get(k);
                this.order.delete(k);
                if (o === undefined) this.promiseCacheModel.forget(this.order, k);
                else this.promiseCacheModel.forget(this.order, k, o);
                unpair(this, k);
                if (live) {
                    this.prune(l, id, c);
                }
                if (q) this.touch(q);
            }
            if (r) f.delete(k);
            change();
            return 1;
        },

        purgeAll: function (v) {
            const f = this.flight(), q = new Set();
            let d, id, l, c, p, s, stored = 0;

            if (!this.tenant(v))
                return 0
            ;

            try {
                if (!plain(this.cache)) return 0;
                for (l of Object.keys(this.cache)) {
                    d = descriptor(this.cache, l);
                    if (!d || !plain(d.value)) return 0;
                    for (id of Object.keys(d.value)) {
                        const x = descriptor(d.value, id);
                        if (!x || !plain(x.value)) return 0;
                        for (c of Object.keys(x.value))
                            q.add(this.key(l, id, c))
                        ;
                    }
                }
                for (const k of this.order.keys()) q.add(k);
                p = pairs(this, this.order);
                if (p) for (const k of p.keys()) q.add(k);
                if (f) for (const k of f.keys()) q.add(k);
                stored = Object.keys(this.cache).length || p && p.size;
                if (stored) s = this.state(v);
            } catch (e) {
                return 0;
            }

            if (!q.size)
                return 0
            ;

            if (stored) {
                this.cache = {};
                this.order.clear();
                this.promiseCacheModel.clear(this.order);
                if (p) p.clear();
                this.settlements.delete(this.order);
                this.touch(s);
            } else if (this.order.size) {
                this.order.clear();
                this.promiseCacheModel.clear(this.order);
            }
            if (f) f.clear();
            change();
            return q.size;
        },

        save: async function (v) {
            if (!this.tenant(v))
                return
            ;

            const s = this.state(v), n = s.revision;

            if (this.saveModel && s.updated) {
                const o = snapshot(this);
                if (!o) return;
                await this.saveModel.set(o);
            }

            if (s.revision === n) s.updated = 0;
        }
    }
};
