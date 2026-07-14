/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormCssPlugin: {
        // DI
        // cssMethod
        // requestModel
        // uiResolverModel

        cache: {},
        collection: [],
        event: {
            after: {
                view: {
                    weight: 0
                }
            }
        },

        context: function (v) {
            let c = v && v.c;

            if (!c || typeof c !== 'object')
                return null
            ;

            while (c.p && typeof c.p === 'object')
                c = c.p
            ;

            return c;
        },

        state: function (v) {
            const c = this.context(v);

            if (!c)
                return this
            ;

            if (!c.css)
                c.css = { cache: {}, collection: [] }
            ;

            if (v.c !== c)
                v.c.css = c.css
            ;

            return c.css;
        },

        adopt: function (v) {
            const s = this.state(v);

            if (s !== this && this.collection.length) {
                for (let css of this.collection)
                    s.collection.push(css)
                ;

                this.cache = {};
                this.collection = [];
            }

            return s;
        },

        process: async function(v, css) {
            const s = this.state(v);
            let c = v.c, d, u;

            if(!s.cache[css.href]) {
                u = this.uiResolverModel.parseUrl(css.href);

                if (!this.requestModel.option(c, 'base', this.requestModel.base)) {
                    d = v.h.d;

                    try { u = new URL(u, d.baseURI).href; } catch (e) {}

                    if (/^https?:\/\//i.test(d.URL))
                        c = {...(this.requestModel.context(c) || {}), base: d.URL}
                    ;
                }

                u = this.requestModel.url(u, c);

                if (!(await this.requestModel.allow(u, c)))
                    throw new Error('URL blocked ' + u)
                ;

                await v.h.set({t: {s: 'head'}, c: {s: null}}, el => {
                    const
                        po = v.h.d.createElement('link'),
                        p = this.cssMethod.params
                    ;

                    for (let k in p)
                        if (
                            css[p[k]]
                            && ['defer', 'href'].indexOf(p[k]) === -1
                        )
                            po.setAttribute(p[k], css[p[k]])
                    ;

                    po.href = u;
                    po.rel = css.rel ? css.rel : 'stylesheet';

                    // defer: load without blocking via the media=print swap (main's
                    // "Bugfix defer method"), then restore the INTENDED media on load —
                    // not hardcoded 'all', or a deferred media='print'/responsive sheet
                    // would apply everywhere after load. The real media is passed as DATA
                    // (data-media), not interpolated into the inline handler, so a media
                    // string can never break out into the onload JS.
                    if (css.defer) {
                        if (css.media)
                            po.setAttribute('data-media', css.media)
                        ;
                        po.media = 'print';
                        po.setAttribute('onload', "this.media=this.getAttribute('data-media')||'all'; this.onload=null;");
                    }

                    el.appendChild(po);

                    s.cache[css.href] = true;
                });
            }
        },

        afterView: async function(v) {
            const s = this.adopt(v);

            try {
                for (let css of s.collection)
                    await this.process(v, css)
                ;
            } finally {
                s.cache = {};
                s.collection = [];
            }

            return v.h;
        }
    }
};
