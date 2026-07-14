/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormJsPlugin: {
        // DI
        // jsMethod
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

            if (!c.js)
                c.js = { cache: {}, collection: [] }
            ;

            if (v.c !== c)
                v.c.js = c.js
            ;

            return c.js;
        },

        adopt: function (v) {
            const s = this.state(v);

            if (s !== this && this.collection.length) {
                for (let js of this.collection)
                    s.collection.push(js)
                ;

                this.cache = {};
                this.collection = [];
            }

            return s;
        },

        process: async function(v, js) {
            const s = this.state(v);
            let c = v.c, d, u;

            if (!s.cache[js.src]) {
                u = this.uiResolverModel.parseUrl(js.src);

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

                await v.h.set({t: {s: 'head'}, c: {s: null}}, e => {
                    const
                        po = v.h.d.createElement('script'),
                        p = this.jsMethod.params
                    ;

                    for (let k in p)
                        if (
                            js[p[k]]
                            && ['src'].indexOf(p[k]) === -1
                        )
                            po.setAttribute(p[k], js[p[k]])
                    ;

                    po.src = u;

                    e.appendChild(po);

                    s.cache[js.src] = true;
                });
            }
        },

        afterView:  async function(v) {
            const s = this.adopt(v);

            try {
                for (let js of s.collection)
                    await this.process(v, js)
                ;
            } finally {
                s.cache = {};
                s.collection = [];
            }

            return v.h;
        }
    }
};
