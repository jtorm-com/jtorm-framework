/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/**
 * @callback jTormTransport
 * @param {string} url Fully-resolved URL (already passed through url()).
 * @param {object} [opts] Fetch options (e.g. { signal }).
 * @returns {Promise<object>} Fetch-shaped, minimal Response-like (.ok/.status/.json()/.text()).
 */

module.exports = {
    jTormRequestModel: {
        // dependency-free isomorphic native-fetch client (Node 18+ / browser global fetch)

        base: '',   // optional base-URL prefix for relative URLs (host sets for SSR)
        timeout: 0, // ms; 0 = no timeout

        url: function (u) {
            return /^https?:\/\//.test(u) ? u : this.base + u;
        },

        // DI (optional) — swappable HTTP transport; defaults to the global fetch.
        // Override (host or test) to substitute it: an edge fetch, an axios/ky
        // adapter, an SSRF-guarded client, or a deterministic test fixture. Must be
        // the wrapper form (resolves `fetch` at call time), not `transport: fetch`.
        // Injected transports must honor opts.signal to keep `timeout` semantics.
        /** @type {jTormTransport} */
        transport: function (u, o) { return fetch(u, o); },

        fetch: async function (url) {
            const o = {};

            if (this.timeout)
                o.signal = AbortSignal.timeout(this.timeout)
            ;

            const r = await this.transport(this.url(url), o);

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
