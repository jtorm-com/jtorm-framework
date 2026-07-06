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

        url: function (u) {
            let r;

            try {
                r = new URL(u).href;
            } catch (e) {
                r = /^https?:\/\//i.test(u) ? u : this.base + u;
            }

            return r;
        },

        /** @type {jTormUrlGuard} */
        allow: function (u) {
            const b = this.base;
            let r;

            if (/^[\u0000-\u0020]*\/\//.test(u))
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

        fetch: async function (url) {
            const o = {},
                u = this.url(url)
            ;

            if (this.timeout)
                o.signal = AbortSignal.timeout(this.timeout)
            ;

            if (!(await this.allow(u)))
                throw new Error('URL blocked ' + u)
            ;

            const r = await this.transport(u, o);

            if (!r.ok)
                throw new Error('HTTP ' + r.status + ' for ' + url)
            ;

            return r;
        },

        get: function (url) {
            const s = this;

            return {
                json: function () { return s.fetch(url).then(function (r) { return r.json(); }); },
                text: function () { return s.fetch(url).then(function (r) { return r.text(); }); }
            };
        }
    }
};
