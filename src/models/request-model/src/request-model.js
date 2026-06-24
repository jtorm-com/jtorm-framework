/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormRequestModel: {
        // dependency-free isomorphic native-fetch client (Node 18+ / browser global fetch)

        base: '',   // optional base-URL prefix for relative URLs (host sets for SSR)
        timeout: 0, // ms; 0 = no timeout

        url: function (u) {
            return /^https?:\/\//.test(u) ? u : this.base + u;
        },

        fetch: async function (url) {
            const o = {};

            if (this.timeout)
                o.signal = AbortSignal.timeout(this.timeout)
            ;

            const r = await fetch(this.url(url), o);

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
