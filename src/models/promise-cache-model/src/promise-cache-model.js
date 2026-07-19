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

        windowPolicy: function (o) {
            let w;

            try { w = o.staleWindow; } catch (e) { return 0; }

            if (w === undefined)
                return 0
            ;
            if (typeof w !== 'number' || !Number.isFinite(w) || w < 0)
                return 0
            ;

            return w;
        },

        phase: function (o, a) {// 0 hard/cold, 1 fresh, 2 stale
            const t = this.policy(o);
            let n, w;

            if (a === undefined || t === undefined || t === 0)
                return 0
            ;
            if (t === Infinity)
                return 1
            ;

            w = this.windowPolicy(o);
            if (!a || a === Infinity || typeof a.value !== 'number')
                return 0
            ;

            n = this.read(o);
            if (!n || n.clock !== a.clock || n.value < a.value)
                return 0
            ;
            n = n.value - a.value;
            if (n < t)
                return 1
            ;

            return w > 0 && n - t < w ? 2 : 0;
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

                r.token = null;
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

        touch: function (c, q, p) {
            try {
                if (c.get(q) !== p)
                    return 0
                ;
                c.delete(q);
                c.set(q, p);
                return 1;
            } catch (e) {
                return 0;
            }
        },

        refresh: function (o, q, x, p, r) {
            let d, f, n;

            if (r.refresh)
                return r.refresh.value
            ;

            try { f = x.load(); } catch (e) { return; }
            n = {};
            d = {value: f, token: n};
            r.refresh = d;

            try {
                f.then(
                    () => { this.publish(o, q, p, r, f, n, 1); },
                    () => { this.publish(o, q, p, r, f, n, 0); }
                );
            } catch (e) {
                if (r.refresh === d) delete r.refresh;
                return;
            }

            return f;
        },

        publish: function (o, q, p, r, f, n, ok) {
            let a, c, d = r.refresh;

            if (!d || d.value !== f || d.token !== n)
                return
            ;
            if (!ok) {
                delete r.refresh;
                return;
            }

            try {
                c = o.c;
                if (c.get(q) !== p || this.record(c, q, p) !== r) {
                    delete r.refresh;
                    return;
                }

                a = this.time(o);
                if (a === undefined) {
                    delete r.refresh;
                    this.remove(o, c, q, p);
                    return;
                }

                c.set(q, f);
                this.records(c, 1).set(q, {
                    value: f, token: null, pending: 0, at: a, scope: r.scope
                });
            } catch (e) {
                if (r.refresh === d) delete r.refresh;
                try {
                    c = o.c;
                    if (c.get(q) === p || c.get(q) === f) {
                        c.delete(q);
                        this.forget(c, q);
                    }
                } catch (x) {}
            }
        },

        insert: function (o, q, x, c) {
            let k, n, p = x.load();

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
        },

        current: function (o, q, x, a) {
            let c, p, r, same, z;

            try {
                c = o.c;
                p = c.get(q);
            } catch (e) {
                return x.load();
            }

            if (p === undefined)
                return this.insert(o, q, x, c)
            ;

            r = this.record(c, q, p);
            if (!r) {
                if (a) return x.load();
                this.remove(o, c, q, p);
                return this.insert(o, q, x, c);
            }

            same = !!a && a.c === c && a.p === p && a.r === r;
            if (r.pending) {
                if (!same || !a.touched) this.touch(c, q, p);
                return p;
            }

            z = this.phase(o, r.at);
            if (z) {
                if (!same || !a.touched) this.touch(c, q, p);
                if (z === 2) this.refresh(o, q, x, p, r);
                return p;
            }
            if (r.refresh)
                return r.refresh.value
            ;

            this.remove(o, c, q, p, r.token);
            return this.insert(o, q, x, c);
        },

        guard: function (o, q, x, a) {
            const s = this;

            return (async function () {
                await x.hit();
                if (x.check) x.check(q);
                return s.current(o, q, x, a);
            })();
        },

        get: function (o, q, x) {
            let a, c, p, r, z;

            if (q === undefined)
                return x.load()
            ;
            if (!x.hit)
                return this.current(o, q, x)
            ;

            try {
                c = o.c;
                p = c.get(q);
            } catch (e) {
                return x.load();
            }

            if (p !== undefined) {
                r = this.record(c, q, p);
                if (r && r.pending) {
                    a = {c: c, p: p, r: r, touched: this.touch(c, q, p)};
                    return this.guard(o, q, x, a);
                }
                if (r) {
                    z = this.phase(o, r.at);
                    if (z) {
                        a = {c: c, p: p, r: r, touched: z === 1 ? this.touch(c, q, p) : 0};
                        return this.guard(o, q, x, a);
                    }
                    if (r.refresh)
                        return this.guard(o, q, x, {c: c, p: p, r: r, touched: 0})
                        ;

                    // Initial hard state is a miss; never reclassify it without the hit guard.
                    this.remove(o, c, q, p, r.token);
                    return this.insert(o, q, x, c);
                }
            }

            return this.current(o, q, x);
        }
    }
};
