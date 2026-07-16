/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormAssetPluginModel: {
        // DI
        // renderContextModel

        context: function (p, v) {
            return this.renderContextModel.context(v);
        },

        state: function (p, v, d) {
            const s = this.renderContextModel.state(p, v, d);

            if (s !== p && Object.keys(s).length === 0) {
                s.cache = {};
                s.collection = [];
            }

            return s;
        },

        adopt: function (p, v) {
            const s = p.state(v);

            if (s !== p && p.collection.length) {
                for (const a of p.collection)
                    s.collection.push(a)
                ;

                p.cache = {};
                p.collection = [];
            }

            return s;
        },

        url: function (p, v, u) {
            let c = v.c, d;
            u = p.uiResolverModel.parseUrl(u);

            if (!p.requestModel.option(c, 'base', p.requestModel.base)) {
                d = v.h.d;

                try { u = new URL(u, d.baseURI).href; } catch (e) {}

                if (/^https?:\/\//i.test(d.URL))
                    c = {...(p.requestModel.context(c) || {}), base: d.URL}
                ;
            }

            return { c: c, u: p.requestModel.url(u, c) };
        },

        element: function (p, v, x) {
            const
                a = x.asset,
                d = x.profile,
                e = v.h.d.createElement(d.t),
                q = p[d.m].params
            ;

            for (const k in q)
                if (a[q[k]] && d.x.indexOf(q[k]) === -1)
                    e.setAttribute(q[k], a[q[k]])
                ;

            e[d.k] = x.resolvedUrl;

            if (d.r)
                e.rel = a.rel ? a.rel : d.r
            ;

            if (d.d && a.defer) {
                if (a.media)
                    e.setAttribute('data-media', a.media)
                ;
                e.media = 'print';
                e.setAttribute('onload', "this.media=this.getAttribute('data-media')||'all'; this.onload=null;");
            }

            return e;
        },

        process: async function (p, v, x) {
            const a = x.asset, d = x.profile, s = p.state(v), q = a[d.k];
            let u;

            if (!s.cache[q]) {
                u = this.url(p, v, q);

                if (!(await p.requestModel.allow(u.u, u.c)))
                    throw new Error('URL blocked ' + u.u)
                ;

                await v.h.set({t: {s: 'head'}, c: {s: null}}, e => {
                    e.appendChild(this.element(p, v, {
                        asset: a,
                        profile: d,
                        resolvedUrl: u.u
                    }));
                    s.cache[q] = true;
                });
            }
        },

        afterView: async function (p, v) {
            const s = p.adopt(v);

            try {
                for (const a of s.collection)
                    await p.process(v, a)
                ;
            } finally {
                s.cache = {};
                s.collection = [];
            }

            return v.h;
        }
    }
};
