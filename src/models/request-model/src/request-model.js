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
        // dependency-free isomorphic native-fetch client (Node 18+ / browser global fetch)

        base: '',   // optional base-URL prefix for relative URLs (host sets for SSR)
        timeout: 0, // ms; 0 = no timeout
        sep: String.fromCharCode(0),

        context: function (c) {
            if (c && c.c && typeof c.c === 'object')
                c = c.c
            ;

            while (c && c.p && typeof c.p === 'object')
                c = c.p
            ;

            return c && c.request && typeof c.request === 'object' ? c.request : c;
        },

        option: function (c, k, d) {
            const r = this.context(c);

            return r && r[k] != null ? r[k] : d;
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
            const r = this.context(c), b = this.option(c, 'base', this.base), a = [];

            if (r && r.tenant != null)
                a.push('t:' + r.tenant)
            ;

            if (r && r.origin != null)
                a.push('o:' + r.origin)
            ;

            if (b)
                a.push('b:' + b)
            ;

            return a.join(this.sep);
        },

        cacheKey: function (u, c) {
            const p = this.policy(c), r = this.url(u, c);

            return p ? p + this.sep + r : r;
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
