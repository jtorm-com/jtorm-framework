/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormPromiseCacheModel: {
        clock: function () { return Date.now(); },// DI: monotonic-enough millisecond wall clock
        metadata: new WeakMap(),// cache Map -> exact-key insertion records; weakly releases replaced host maps
        observed: new WeakMap(),// owner -> {clock,last}; detects regressions across that owner's keys

        policy: function (o) {
            let t;

            try { t = o.ttl; } catch (e) { return; }

            if (t === Infinity)
                return t
            ;
            if (typeof t !== 'number' || !Number.isFinite(t) || t < 0)
                return
            ;

            return t;
        },

        read: function (o) {
            let f, n, r;

            try {
                f = this.clock;
                if (typeof f !== 'function') return;
                n = f.call(this);
            } catch (e) {
                return;
            }

            if (typeof n !== 'number' || !Number.isFinite(n) || n < 0)
                return
            ;

            r = this.observed.get(o);
            if (!r || r.clock !== f) {
                this.observed.set(o, {clock: f, last: n});
                return {clock: f, value: n};
            }
            if (n < r.last)
                return
            ;

            r.last = n;
            return {clock: f, value: n};
        },

        time: function (o) {
            const t = this.policy(o);

            if (t === Infinity)
                return Infinity
            ;
            if (t === undefined || t === 0)
                return
            ;

            return this.read(o);
        },

        restore: function (o, age, a) {// restore a settled insertion point from trusted elapsed age; representation stays private here
            const t = this.policy(o);
            let r;

            if (!Number.isSafeInteger(age) || age < 0 || t === undefined || t === 0)
                return
            ;
            if (t === Infinity)
                return Infinity
            ;
            if (age >= t || !a || a === Infinity || typeof a.clock !== 'function'
                || typeof a.value !== 'number' || !Number.isFinite(a.value) || a.value < 0)
                return
            ;

            r = this.observed.get(o);
            if (!r || r.clock !== a.clock || r.last < a.value)
                return
            ;

            return {clock: a.clock, value: a.value - age};
        },

        live: function (o, a) {
            const t = this.policy(o);
            let n;

            if (a === undefined || t === undefined || t === 0)
                return false
            ;
            if (t === Infinity)
                return true
            ;
            if (!a || a === Infinity || typeof a.value !== 'number')
                return false
            ;

            n = this.read(o);
            return !!n && n.clock === a.clock && n.value >= a.value && n.value - a.value < t;
        },

        records: function (m, add) {
            let r = this.metadata.get(m);

            if (!r && add) {
                r = new Map();
                this.metadata.set(m, r);
            }

            return r;
        },

        record: function (m, q, v) {
            const a = this.records(m), r = a && a.get(q);

            return r && r.value === v ? r : undefined;
        },

        pending: function (m, q, v, n) {
            this.records(m, 1).set(q, {value: v, token: n, pending: 1, at: undefined});
        },

        stamp: function (o, m, q, v, a, s) {
            if (arguments.length < 5)
                a = this.time(o)
            ;
            if (a === undefined) {
                this.forget(m, q, v);
                return false;
            }

            this.records(m, 1).set(q, {value: v, token: null, pending: 0, at: a, scope: s});
            return true;
        },

        fresh: function (o, m, q, v, s) {
            const r = this.record(m, q, v);

            return !!r && !r.pending
                && (arguments.length < 5 || r.scope === s)
                && this.live(o, r.at);
        },

        forget: function (m, q, v, n) {
            const a = this.records(m), r = a && a.get(q);

            if (!r || arguments.length > 2 && r.value !== v
                || arguments.length > 3 && r.token !== n)
                return 0
            ;

            a.delete(q);
            if (!a.size) this.metadata.delete(m);
            return 1;
        },

        clear: function (m) {
            this.metadata.delete(m);
        },

        settle: function (o, q, p, n, ok) {
            let a, c, r;

            try {
                c = o.c;
                r = this.record(c, q, p);
                if (!r || r.token !== n || c.get(q) !== p)
                    return
                ;

                if (!ok) {
                    c.delete(q);
                    this.forget(c, q, p, n);
                    return;
                }

                a = this.time(o);
                if (a === undefined) {
                    c.delete(q);
                    this.forget(c, q, p, n);
                    return;
                }

                r.pending = 0;
                r.at = a;
            } catch (e) {
                try {
                    c = o.c;
                    r = this.record(c, q, p);
                    if (r && r.token === n && c.get(q) === p) {
                        c.delete(q);
                        this.forget(c, q, p, n);
                    }
                } catch (x) {}
            }
        },

        remove: function (o, c, q, p, n) {
            try {
                if (c.get(q) !== p)
                    return 0
                ;
                if (n !== undefined) {
                    const r = this.record(c, q, p);
                    if (!r || r.token !== n) return 0;
                }
                c.delete(q);
                if (n === undefined) this.forget(c, q, p);
                else this.forget(c, q, p, n);
                return 1;
            } catch (e) {
                return 0;
            }
        },

        purge: function (o, q) {
            let c;

            if (q === undefined)
                return 0
            ;

            try {
                c = o.c;
                if (!c.has(q)) {
                    this.forget(c, q);
                    return 0;
                }
                c.delete(q);
                this.forget(c, q);
                return 1;
            } catch (e) {
                return 0;
            }
        },

        purgeAll: function (o) {
            let c, n;

            try {
                c = o.c;
                n = c.size;
                c.clear();
                this.metadata.delete(c);
                return n;
            } catch (e) {
                return 0;
            }
        },

        reset: function (o, m) {
            try {
                if (!m) m = o.c || o.order;
                if (m && typeof m === 'object') this.metadata.delete(m);
                this.observed.delete(o);
            } catch (e) {}
        },

        get: function (o, q, x) {
            let c, p, k, n, r;

            if (q === undefined)
                return x.load()
            ;

            try {
                c = o.c;
                p = c.get(q);
            } catch (e) {
                return x.load();
            }

            if (p !== undefined) {
                r = this.record(c, q, p);
                if (r && (r.pending || this.live(o, r.at))) {
                    c.delete(q);
                    c.set(q, p);

                    if (x.hit)
                        return (async function () { await x.hit(); return p; })()
                    ;

                    return p;
                }

                this.remove(o, c, q, p, r && r.token);
            }

            p = x.load();
            n = {};
            this.pending(c, q, p, n);
            p.then(
                () => { this.settle(o, q, p, n, 1); },
                () => { this.settle(o, q, p, n, 0); }
            );
            c.set(q, p);

            while (c.size > o.max) {
                k = c.keys().next().value;
                if (k === q) break;
                this.forget(c, k, c.get(k));
                c.delete(k);
            }

            return p;
        }
    }
};
