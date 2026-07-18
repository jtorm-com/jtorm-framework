/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/**
 * @callback jTormTransport
 * @param {string} url Fully-resolved URL (already passed through url()).
 * @param {object} [opts] Fetch options (e.g. { signal }).
 * @returns {Promise<object>} Fetch-shaped, minimal Response-like (.ok/.status/.json()/.text()).
 */
/**
 * @callback jTormUrlGuard
 * @param {string} url Fully-resolved URL (already passed through url()).
 * @returns {boolean|Promise<boolean>} True when the request may be sent.
 */

module.exports = {
    jTormRequestModel: {
        // DI
        // renderContextModel

        // dependency-free isomorphic native-fetch client (Node 18+ / browser global fetch)

        base: '',   // optional base-URL prefix for relative URLs (host sets for SSR)
        timeout: 0, // ms; 0 = no timeout
        sep: String.fromCharCode(0),

        context: function (c) {
            c = this.renderContextModel.context(c);

            return c && c.request && typeof c.request === 'object' ? c.request : c;
        },

        option: function (c, k, d) {
            const r = this.context(c);

            return r && r[k] != null ? r[k] : d;
        },

        plain: function (v) {
            if (!v || typeof v !== 'object' || Array.isArray(v))
                return false
            ;

            const p = Object.getPrototypeOf(v);
            return p === Object.prototype || p === null;
        },

        own: function (v, k) {
            return !!v && Object.prototype.hasOwnProperty.call(v, k);
        },

        cacheBase: function (c, r, e) {
            let p, d, i = 0;

            if (r && !this.own(r, 'base') && 'base' in r) {
                p = Object.getPrototypeOf(r);
                while (p && i++ < 128 && !(d = Object.getOwnPropertyDescriptor(p, 'base')))
                    p = Object.getPrototypeOf(p)
                ;
                if (!d || !this.own(d, 'value'))
                    return null
                ;
            }

            const v = this.option(c, 'base', this.base);

            if (d && d.value != null && Object.is(v, d.value))
                return null
            ;

            return {explicit: !!(e !== false && r && this.own(r, 'base') && r.base != null), value: v};
        },

        cacheRoot: function (c) {
            let r, d;

            if (c == null)
                return {root: null}
            ;

            try {
                if (!this.renderContextModel || typeof this.renderContextModel.cacheContext !== 'function')
                    return null
                ;

                r = this.renderContextModel.cacheContext(c);
                if (!r || typeof r !== 'object' || Array.isArray(r))
                    return null
                ;
                if ('c' in r) {
                    d = r.c;
                    if (d != null && typeof d !== 'number' && typeof d !== 'boolean')
                        return null
                    ;
                }
            } catch (e) {
                return null;
            }

            return {root: r};
        },

        cacheContext: function (c, x) {
            let r, q, d;

            x = x || this.cacheRoot(c);
            if (!x)
                return null
            ;
            r = x.root;

            try {
                if (r && !this.own(r, 'request') && 'request' in r)
                    return null
                ;
                q = this.context(c);
                if (q != null && (typeof q !== 'object' || Array.isArray(q)
                    || q !== r && !this.plain(q)))
                    return null
                ;
                if (r) {
                    d = r.request;
                    if (q === d && !this.own(r, 'request'))
                        return null
                    ;
                    if ((q === r || q === d) && d != null
                        && (d === r || !this.plain(d)))
                        return null
                    ;
                }
            } catch (e) {
                return null;
            }

            return {root: r, request: q};
        },

        primitive: function (v) {
            if (v == null || v === '')
                return
            ;
            if (!['string', 'number', 'boolean', 'bigint'].includes(typeof v))
                return null
            ;

            v = String(v);
            return v.indexOf(this.sep) === -1 ? v : null;
        },

        url: function (u, c) {
            let r;
            const b = this.option(c, 'base', this.base);

            try {
                r = new URL(u).href;
            } catch (e) {
                r = /^https?:\/\//i.test(u) ? u : b + u;
            }

            return r;
        },

        policy: function (c) {
            const x = this.cacheContext(c), a = [];
            let r, b, v;

            if (!x)
                return ''
            ;

            try {
                r = x.request;

                v = this.primitive(r && this.own(r, 'tenant') ? r.tenant : undefined);
                if (v === null) return '';
                if (v !== undefined) a.push('t:' + v);

                v = this.primitive(r && this.own(r, 'origin') ? r.origin : undefined);
                if (v === null) return '';
                if (v !== undefined) a.push('o:' + v);

                b = this.cacheBase(c, r);
                if (!b) return '';
                if (b.value) {
                    v = this.primitive(b.value);
                    if (v === null) return '';
                    if (v !== undefined) a.push('b:' + v);
                }
            } catch (e) {
                return '';
            }

            return a.join(this.sep);
        },

        discriminator: function (c) {
            let x = this.cacheRoot(c);
            let r, v, b, n;

            if (!x)
                return ''
            ;

            try {
                r = x.root;
                v = this.primitive(r && this.own(r, 'tenant') ? r.tenant : undefined);
                if (v === null) return '';
                if (v !== undefined) return v;

                x = this.cacheContext(c, x);
                if (!x) return '';
                r = x.request;
                n = r !== x.root;
                v = this.primitive(n && this.own(r, 'tenant') ? r.tenant : undefined);
                if (v === null) return '';
                if (v !== undefined) return v;

                v = this.primitive(n && this.own(r, 'origin') ? r.origin : undefined);
                if (v === null) return '';
                if (v !== undefined) return v;

                if (!n && r && this.own(r, 'origin')) {
                    v = this.primitive(r.origin);
                    if (v === null || v !== undefined) return '';
                }

                b = this.cacheBase(c, r, n);
                if (!b) return '';
                if (!n && r && 'base' in r && r.base != null && Object.is(b.value, r.base))
                    return ''
                ;
                if (b.explicit) {
                    v = this.primitive(b.value);
                    return v === null || v === undefined ? '' : v;
                }

                if (!b.value) return '';
                v = this.primitive(b.value);
                return v === null || v === undefined ? '' : v;
            } catch (e) {
                return '';
            }
        },

        cacheKey: function (u, c) {
            const p = this.policy(c);
            let r;

            if (!p)
                return
            ;

            r = String(this.url(u, c));
            if (r.indexOf(this.sep) !== -1)
                return
            ;

            return p + this.sep + r;
        },

        /** @type {jTormUrlGuard} */
        allow: function (u, c) {
            const b = this.option(c, 'base', this.base);
            let r;

            if (/^[\u0000-\u0020]*[\\/]{2}/.test(u))
                return false
            ;

            if (/[\u0000-\u001F\u007F]/.test(u))
                return false
            ;

            if (!/^[a-z][a-z0-9+.-]*:/i.test(u))
                return true
            ;

            if (!/^https?:\/\//i.test(u) || !/^https?:\/\//i.test(b))
                return false
            ;

            try {
                r = new URL(u).origin === new URL(b).origin;
            } catch (e) {
                r = false;
            }

            return r;
        },

        // DI (optional) — swappable HTTP transport; defaults to the global fetch.
        // Override (host or test) to substitute it: an edge fetch, an axios/ky
        // adapter, an SSRF-guarded client, or a deterministic test fixture. Must be
        // the wrapper form (resolves `fetch` at call time), not `transport: fetch`.
        // Injected transports must honor opts.signal to keep `timeout` semantics.
        /** @type {jTormTransport} */
        transport: function (u, o) { return fetch(u, o); },

        fetch: async function (url, c) {
            const o = {},
                u = this.url(url, c),
                t = this.option(c, 'timeout', this.timeout)
            ;

            if (t)
                o.signal = AbortSignal.timeout(t)
            ;

            if (!(await this.allow(u, c)))
                throw new Error('URL blocked ' + u)
            ;

            const r = await this.transport(u, o);

            if (!r.ok)
                throw new Error('HTTP ' + r.status + ' for ' + url)
            ;

            return r;
        },

        get: function (url, c) {
            const s = this;

            return {
                json: function () { return s.fetch(url, c).then(function (r) { return r.json(); }); },
                text: function () { return s.fetch(url, c).then(function (r) { return r.text(); }); }
            };
        }
    }
};
