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
            refreshDrop(s, s.order, e, new Error('Rendered fragment refresh evicted'));
            s.prune(o.l, o.id, o.c);
        }
        if (!p.size) s.settlements.delete(s.order);
        refreshDrop(s, s.order, k, new Error('Rendered fragment refresh superseded'));
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

const refreshReady = function (s, h) {
    try {
        return !!h && h === s.refreshModel
            && typeof h.authorize === 'function' && typeof h.current === 'function'
            && typeof h.render === 'function' && typeof h.session === 'function'
            && typeof h.owns === 'function';
    } catch (e) {
        return false;
    }
};

const refreshHost = function (s) {
    let h;

    try {
        if (!s.refreshHosts.has(s.order)) return;
        h = s.refreshHosts.get(s.order);
    } catch (e) { return; }

    return refreshReady(s, h) ? h : undefined;
};

const refreshMap = function (s, o, add) {
    let m;

    try { m = s.refreshes.get(o); } catch (e) { return; }
    if (!m && add) {
        m = new Map();
        try { s.refreshes.set(o, m); } catch (e) { return; }
    }

    return m;
};

const restoreMap = function (m, entries) {
    m.clear();
    for (const x of entries) m.set(x[0], x[1]);
};

const restoreProperty = function (o, k, d) {
    if (d) Object.defineProperty(o, k, d);
    else delete o[k];
};

const refreshBase = function (s, r) {
    let d, p, q;

    try {
        if (!r || s.cache !== r.cache || s.order !== r.order
            || s.store() !== r.store || limit(s) !== r.limit
            || s.promiseCacheModel.policy(s) !== r.ttl
            || s.promiseCacheModel.windowPolicy(s) !== r.window)
            return false
        ;
        d = lookup(s.cache, r.l, r.id, r.c);
        p = pairs(s, s.order);
        q = s.promiseCacheModel.record(s.order, r.k, r.value, r.store);
        return d.status === 1 && d.value === r.html
            && s.order.get(r.k) === r.value && p && p.get(r.k) === r.pair
            && r.pair.value === r.value && r.pair.scope === r.store
            && r.pair.html === r.html && q === r.record;
    } catch (e) {
        return false;
    }
};

const refreshCurrent = function (s, r) {
    const m = r && refreshMap(s, r.order);

    return !r.detached && !r.completed && refreshBase(s, r)
        && m && m.get(r.k) === r;
};

const refreshAuthorized = function (s, r, v, owned) {
    if (!refreshCurrent(s, r) || refreshHost(s) !== r.host)
        return false
    ;
    try {
        if (s.scope(v, r.coordinates.variant) !== r.c)
            return false
        ;
        if (r.host.current(v, r.authority, r.coordinates) !== true)
            return false
        ;
        if (owned && r.host.owns(v, r.session, r.cap, r.authority, r.coordinates) !== true)
            return false
        ;
    } catch (e) {
        return false;
    }

    try {
        return refreshHost(s) === r.host
            && s.scope(v, r.coordinates.variant) === r.c && refreshCurrent(s, r);
    } catch (e) { return false; }
};

const refreshCaller = function (s, r, v, variant, active) {
    try {
        if (refreshHost(s) !== r.host || s.scope(v, variant) !== r.c
            || (active ? !refreshCurrent(s, r) : !r.completed || r.failed || r.detached))
            return false
        ;
        if (r.host.authorize(v, r.coordinates) !== r.authority
            || r.host.current(v, r.authority, r.coordinates) !== true)
            return false
        ;
        return refreshHost(s) === r.host && s.scope(v, variant) === r.c
            && (active ? refreshCurrent(s, r) : r.completed && !r.failed && !r.detached);
    } catch (e) {
        return false;
    }
};

const refreshClose = function (s, r) {
    if (!r || !r.completed || r.viewClosed)
        return 0
    ;
    r.viewClosed = 1;
    if (r.root && s.executions.get(r.root) === r) s.executions.delete(r.root);
    delete r.root;
    delete r.session;
    return 1;
};

const refreshFail = function (s, r, e) {
    if (!r || r.failed || r.detached)
        return 0
    ;
    if (r.completed) return refreshClose(s, r);
    r.failed = 1;
    r.running = 0;
    r.error = e === undefined ? new Error('Rendered fragment refresh failed') : e;
    if (r.iteration) s.iterations.delete(r.iteration);
    if (r.root && s.executions.get(r.root) === r) s.executions.delete(r.root);
    delete r.iteration;
    delete r.root;
    delete r.session;
    if (!r.settled) {
        r.settled = 1;
        r.reject(r.error);
    }

    return 1;
};

const refreshDetach = function (s, r, e) {
    let m;

    if (!r || r.detached || r.completed)
        return 0
    ;
    r.detached = 1;
    r.running = 0;
    m = refreshMap(s, r.order);
    if (m && m.get(r.k) === r) {
        m.delete(r.k);
        if (!m.size) try { s.refreshes.delete(r.order); } catch (x) {}
    }
    if (r.iteration) s.iterations.delete(r.iteration);
    if (r.root && s.executions.get(r.root) === r) s.executions.delete(r.root);
    try { s.requests.delete(r.cap); } catch (x) {}
    delete r.iteration;
    delete r.root;
    delete r.session;
    if (!r.settled) {
        r.settled = 1;
        r.reject(e === undefined ? new Error('Rendered fragment refresh detached') : e);
    }

    return 1;
};

const refreshDrop = function (s, o, k, e) {
    const m = refreshMap(s, o), r = m && m.get(k);

    return r ? refreshDetach(s, r, e) : 0;
};

const refreshDropAll = function (s, o, e) {
    const m = refreshMap(s, o);

    if (!m) return;
    for (const r of [...m.values()]) refreshDetach(s, r, e);
};

const dirtyCapture = function (s, v) {
    let c, cd, q, rd, root, ud, vd;

    try {
        root = s.context(v);
        c = v && v.c && typeof v.c === 'object' ? v.c : null;
        if (!root || typeof root !== 'object') return;
        rd = descriptor(root, state.n);
        if (rd === false || !rd && state.n in root) return;
        q = rd ? rd.value : s.freshState();
        if (!q || typeof q !== 'object') return;
        if (c && c !== root) {
            cd = descriptor(c, state.n);
            if (cd === false || !cd && state.n in c) return;
        } else cd = null;
        ud = descriptor(q, 'updated');
        vd = descriptor(q, 'revision');
        if (ud === false || vd === false
            || !ud && 'updated' in q || !vd && 'revision' in q)
            return
        ;
    } catch (e) {
        return;
    }

    return {context: c, contextDescriptor: cd, root: root, rootDescriptor: rd,
        state: q, updated: ud, revision: vd};
};

const dirtyApply = function (d) {
    if (!d.rootDescriptor) d.root[state.n] = d.state;
    if (d.context && d.context !== d.root
        && (!d.contextDescriptor || d.contextDescriptor.value !== d.state))
        d.context[state.n] = d.state
    ;
    d.state.updated = 1;
    d.state.revision = Number.isSafeInteger(d.state.revision) && d.state.revision >= 0
        ? d.state.revision + 1 : 1;
};

const dirtyUndo = function (d) {
    if (!d) return;
    try { restoreProperty(d.state, 'updated', d.updated); } catch (e) {}
    try { restoreProperty(d.state, 'revision', d.revision); } catch (e) {}
    if (d.context && d.context !== d.root)
        try { restoreProperty(d.context, state.n, d.contextDescriptor); } catch (e) {}
    ;
    try { restoreProperty(d.root, state.n, d.rootDescriptor); } catch (e) {}
};

const refreshPublish = function (s, r, v) {
    let a, checkpoint, dirty, made, observed, observedValue,
        orderEntries, p, pairEntries, t, undo, value;

    if (!r.staged || !refreshAuthorized(s, r, v, 1))
        return false
    ;
    try {
        a = s.promiseCacheModel.time(s);
        t = absolute(s, s.order);
        dirty = dirtyCapture(s, v);
        p = pairs(s, s.order);
        if (a === undefined || t === undefined || !dirty || !p)
            return false
        ;
        checkpoint = s.promiseCacheModel.checkpointRecords(s.order);
        if (!checkpoint) return false;
        orderEntries = [...s.order.entries()];
        pairEntries = [...p.entries()];
        observed = s.persistenceObserved.has(s.order);
        observedValue = s.persistenceObserved.get(s.order);

        undo = write(s.cache, r.l, r.id, r.c, r.data);
        if (!undo) throw new Error('cache');
        s.order.delete(r.k);
        s.promiseCacheModel.forget(s.order, r.k, r.value);
        value = {l: r.l, id: r.id, c: r.c};
        s.order.set(r.k, value);
        if (!s.promiseCacheModel.stamp(s, s.order, r.k, value, a, r.store))
            throw new Error('stamp')
        ;
        p.set(r.k, {value: value, scope: r.store, html: r.data, settledAt: t});
        dirtyApply(dirty);
        s.persistenceObserved.set(s.order, t);
        made = 1;
    } catch (e) {
        try { if (undo) undo(); } catch (x) {}
        try { restoreMap(s.order, orderEntries || []); } catch (x) {}
        try { if (checkpoint) s.promiseCacheModel.restoreRecords(s.order, checkpoint); } catch (x) {}
        try {
            if (p) {
                s.settlements.set(s.order, p);
                restoreMap(p, pairEntries || []);
            }
        } catch (x) {}
        try {
            if (observed) s.persistenceObserved.set(s.order, observedValue);
            else s.persistenceObserved.delete(s.order);
        } catch (x) {}
        dirtyUndo(dirty);
    }
    if (!made) return false;
    try { s.promiseCacheModel.releaseRecords(checkpoint); } catch (e) {}
    change();
    return true;
};

const coldCurrent = function (s, r) {
    let d, p;

    try {
        if (!r || s.cache !== r.cache || s.order !== r.order || s.store() !== r.store)
            return false
        ;
        d = lookup(s.cache, r.l, r.id, r.c);
        p = pairs(s, s.order);
        return (d.status !== 1 || d.value === undefined) && !s.order.has(r.k)
            && !(p && p.has(r.k)) && !s.promiseCacheModel.record(s.order, r.k, r.value);
    } catch (e) {
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
        staleWindow: 0,// DI: optional host-authorized rendered-fragment stale window; zero is blocking
        refreshModel: null,// DI: one stable host lifecycle/session owner, configured before init
        persistenceClock: function () { return Date.now(); },// DI: restart-stable Unix-epoch milliseconds
        updated: 0,
        revision: 0,
        flights: new WeakMap(),// current order Map -> bounded exact-key render leases
        iterations: new WeakMap(),// ephemeral handler-wrapper iteration token -> leader lease
        stores: new WeakMap(),// cache object -> opaque identity; never retains a replaced exported cache
        refreshHosts: new WeakMap(),// initialized order Map -> stable admitted refresh host (or null)
        settlements: new WeakMap(),// current order Map -> bounded exact fragment/timestamp pairs
        persistenceObserved: new WeakMap(),// current order Map -> absolute-clock high-water
        refreshes: new WeakMap(),// current order Map -> bounded exact-generation attempt records
        requests: new WeakMap(),// frozen metadata-free capability -> private refresh record
        executions: new WeakMap(),// exact isolated root -> active refresh lifecycle
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
            let a, candidateOrder, d, g, host, m, n, now, o, p, records,
                requiresHost = 0, sampled = 0;
            const old = this.order, token = change();

            host = refreshReady(this, this.refreshModel) ? this.refreshModel : null;
            refreshDropAll(this, old, new Error('Rendered fragment refresh reset'));
            this.cache = {};
            this.order = new Map();
            this.updated = 0;// a reloaded cache is clean — never carry a stale dirty flag into the next save()
            this.revision = 0;
            this.stores = new WeakMap();
            this.settlements = new WeakMap();
            this.persistenceObserved = new WeakMap();
            this.refreshes = new WeakMap();
            this.requests = new WeakMap();
            this.executions = new WeakMap();
            this.refreshHosts = new WeakMap();
            this.refreshHosts.set(this.order, host);
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
                    let at = this.promiseCacheModel.restore(this, now - r.settledAt, a);
                    if (at === undefined && host && this.refreshModel === host
                        && refreshReady(this, host)) {
                        at = this.promiseCacheModel.restorePhase(this, now - r.settledAt, a);
                        if (at !== undefined) requiresHost = 1;
                    }
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
                    || requiresHost && (this.refreshModel !== host || !refreshReady(this, host))
                    || Reflect.ownKeys(cache).length || order.size)
                    { discard(); return; }
            } catch (e) { discard(); return; }

            this.cache = candidate;
            this.order = candidateOrder;
            this.refreshHosts.set(candidateOrder, host);
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
            r = {key: k, k: k, cache: this.cache, order: this.order, l: l, id: id, c: c, root: root, store: n, promise: p,
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

        reserve: function (v, l, id, variant, c, k, d, o, q, n, z) {
            const s = this;
            let a, cap, h, m, p, reject, resolve, root, r;

            h = refreshHost(s);
            if (!h) return;
            try {
                root = s.context(v);
                if (!root || typeof root !== 'object') return;
                r = {cache: s.cache, order: s.order, store: n, key: k, k: k, l: l, id: id,
                    c: c, html: d, value: o, pair: q, record: z, host: h,
                    coordinates: Object.freeze({language: l, cid: id, variant: variant}),
                    limit: limit(s), ttl: s.promiseCacheModel.policy(s),
                    window: s.promiseCacheModel.windowPolicy(s)};
                if (!refreshBase(s, r)) return;
                a = h.authorize(v, r.coordinates);
                if (!a || !['object', 'function'].includes(typeof a)
                    || h.current(v, a, r.coordinates) !== true
                    || refreshHost(s) !== h || s.scope(v, variant) !== c
                    || !refreshBase(s, r))
                    return
                ;
                m = refreshMap(s, s.order, 1);
                if (!m || m.has(k)) return;
                cap = Object.freeze({});
                p = new Promise(function (yes, no) { resolve = yes; reject = no; });
                p.catch(function () {});
                Object.assign(r, {authority: a, cap: cap, promise: p, reject: reject,
                    resolve: resolve, foregrounds: new WeakSet(), started: 0,
                    running: 0, failed: 0, completed: 0, detached: 0, settled: 0, refresh: 1,
                    staged: 0, data: null});
                r.foregrounds.add(root);
                s.requests.set(cap, r);
                m.set(k, r);
                while (m.size > limit(s)) {
                    const x = m.keys().next().value;
                    if (x === k) break;
                    refreshDetach(s, m.get(x));
                }
                change();
                return cap;
            } catch (e) {
                return;
            }
        },

        lookup: async function (v, l, id, c, x) {
            const s = this, variant = c;
            let cap, d, k, m, n, o, p, phase, q, r, root, target = 0, valid, z;

            try { root = s.context(v); } catch (e) { root = null; }
            r = root && s.executions.get(root);
            if (r) {
                try {
                    target = String(r.l) === String(l) && String(r.id) === String(id)
                        && String(r.coordinates.variant) === String(variant);
                } catch (e) { target = 1; }
            }
            valid = s.part(l) && s.part(id);
            c = valid ? s.scope(v, c) : undefined;
            if (!valid || c === undefined) {
                if (r && (!r.iteration || !valid || target)) {
                    const e = new Error('Rendered fragment refresh execution denied');
                    refreshFail(s, r, e);
                    throw e;
                }
                return Object.freeze({value: null, refresh: undefined});
            }
            k = s['key'](l, id, c);
            if (r && (!r.iteration || r.k === k || target)) {
                if (r.k !== k || !x || typeof x !== 'object' || r.iteration
                    || !refreshAuthorized(s, r, v, 1)) {
                    const e = new Error('Rendered fragment refresh execution denied');
                    refreshFail(s, r, e);
                    throw e;
                }
                r.iteration = x;
                s.iterations.set(x, r);
                return Object.freeze({value: null, refresh: undefined});
            }

            try {
                n = s.store(x && typeof x === 'object');
                d = lookup(s.cache, l, id, c);
                o = s.order.get(k);
                p = pairs(s, s.order);
                q = p && p.get(k);
                z = o && s.promiseCacheModel.record(s.order, k, o, n);
                phase = d.status === 1 && d.value !== undefined && n && o && q
                    && q.value === o && q.scope === n && q.html === d.value
                    && Number.isSafeInteger(q.settledAt) && q.settledAt >= 0
                    ? s.promiseCacheModel.entryPhase(s, s.order, k, o, n) : 0;
                m = refreshMap(s, s.order);
                r = m && m.get(k);
            } catch (e) {
                return Object.freeze({value: null, refresh: undefined});
            }

            if (phase === 1) {
                if (r) refreshFail(s, r, new Error('Rendered fragment refresh became fresh'));
                s.order.delete(k);
                s.order.set(k, o);
                return Object.freeze({value: d.value, refresh: undefined});
            }

            if (phase === 2) {
                if (r && refreshAuthorized(s, r, v, 0))
                    return Object.freeze({value: d.value, refresh: undefined})
                ;
                if (r) refreshDetach(s, r);
                else {
                    cap = s.reserve(v, l, id, variant, c, k, d.value, o, q, n, z);
                    if (cap)
                        return Object.freeze({value: d.value, refresh: cap})
                    ;
                }
            }

            if (phase === 0 && r && refreshCurrent(s, r) && r.running && !r.failed) {
                if (root && (r.foregrounds.has(root) || r.root === root))
                    return Object.freeze({value: null, refresh: undefined})
                ;
                if (refreshCaller(s, r, v, variant, 1)) {
                    await r.promise;
                    if (!refreshCaller(s, r, v, variant, 0))
                        throw new Error('Rendered fragment refresh join denied')
                    ;
                    return s.lookup(v, l, id, variant, x);
                }
            }

            if (d.status === 1 && d.value !== undefined || o || q || r) {
                try { z = s.state(v); } catch (e) {
                    return Object.freeze({value: null, refresh: undefined});
                }
                s.order.delete(k);
                if (o === undefined) s.promiseCacheModel.forget(s.order, k);
                else s.promiseCacheModel.forget(s.order, k, o);
                unpair(s, k);
                s.prune(l, id, c);
                refreshDrop(s, s.order, k);
                s.touch(z);
                change();
            }

            if (x && typeof x === 'object') {
                z = s.acquire(v, l, id, c, k, x, n);
                if (z && typeof z.then === 'function') z = await z;
                return Object.freeze({value: z, refresh: undefined});
            }

            return Object.freeze({value: null, refresh: undefined});
        },

        start: function (v, cap) {
            const s = this;
            let o, p, r, root;

            try { r = cap && s.requests.get(cap); } catch (e) { return false; }
            if (!r || r.cap !== cap || r.started)
                return false
            ;
            r.started = 1;
            try { root = s.context(v); } catch (e) { root = null; }
            if (!root || !r.foregrounds.has(root) || !refreshAuthorized(s, r, v, 0)) {
                refreshFail(s, r, new Error('Rendered fragment refresh start denied'));
                return false;
            }
            r.running = 1;
            try { o = r.host.render(v, cap, r.coordinates, r.authority); }
            catch (e) { refreshFail(s, r, e); return false; }
            p = promised(o);
            if (!p) {
                refreshFail(s, r, new Error('Rendered fragment refresh must return a native Promise'));
                return false;
            }
            r.observed = p;
            p.then(function () {
                if (!r.completed && !r.failed && !r.detached)
                    refreshFail(s, r, new Error('Rendered fragment refresh lifecycle incomplete'))
                ;
            }, function (e) { refreshFail(s, r, e); }).catch(function () {});
            return true;
        },

        fail: function (cap, e) {
            let r;

            try { r = cap && this.requests.get(cap); } catch (x) { return false; }
            return !!refreshFail(this, r, e);
        },

        activate: function (v, cap, session) {
            const s = this;
            let r, root;

            try {
                r = cap && s.requests.get(cap);
                root = s.context(v);
            } catch (e) { return false; }
            if (!r || r.cap !== cap || !r.started || !r.running || r.activated
                || !root || typeof root !== 'object' || r.foregrounds.has(root)
                || !session || !['object', 'function'].includes(typeof session)
                || s.executions.get(root))
                return false
            ;
            r.session = session;
            if (!refreshAuthorized(s, r, v, 1)) {
                delete r.session;
                return false;
            }
            r.activated = 1;
            r.root = root;
            s.executions.set(root, r);
            return true;
        },

        refreshView: function (v) {
            let r, root;

            try { root = this.context(v); r = root && this.executions.get(root); }
            catch (e) { return false; }
            return !!r && r.root === root && r.completed && !r.viewClosed;
        },

        closeRefreshView: function (v) {
            let r, root;

            try { root = this.context(v); r = root && this.executions.get(root); }
            catch (e) { return false; }
            return !!r && r.root === root && !!refreshClose(this, r);
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
            let a, c, i, m, q;

            if (!r) return;
            this.iterations.delete(x);
            if (r.refresh) {
                delete r.iteration;
                if (refreshPublish(this, r, v)) {
                    r.completed = 1;
                    r.running = 0;
                    m = refreshMap(this, r.order);
                    if (m && m.get(r.k) === r) {
                        m.delete(r.k);
                        if (!m.size) this.refreshes.delete(r.order);
                    }
                    this.requests.delete(r.cap);
                    r.settled = 1;
                    r.resolve(r.data);
                } else
                    refreshFail(this, r, new Error('Rendered fragment refresh publication denied'))
                ;
                return;
            }
            if (f && f.get(r.key) === r) {
                f.delete(r.key);
                if (this.store() === r.store && r.staged && coldCurrent(this, r)) {
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
            if (r.refresh) {
                delete r.iteration;
                refreshFail(this, r, e);
                return;
            }
            if (f && f.get(r.key) === r) f.delete(r.key);
            r.reject(e);
        },

        purge: function (v, l, id, c) {
            let d, f, k, live, o, p, q, r, tracked, z;

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
                z = refreshMap(this, this.order); z = z && z.get(k);
                if (!live && !tracked && !p && !r && !z) return 0;
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
            if (z) refreshDetach(this, z, new Error('Rendered fragment refresh purged'));
            change();
            return 1;
        },

        purgeAll: function (v) {
            const f = this.flight(), m = refreshMap(this, this.order), q = new Set();
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
                if (m) for (const k of m.keys()) q.add(k);
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
            refreshDropAll(this, this.order, new Error('Rendered fragment refresh purge-all'));
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
