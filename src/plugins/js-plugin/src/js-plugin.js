/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormJsPlugin: {
        // DI
        // jsMethod
        // uiMethod

        cache: {},
        collection: [],
        event: {
            after: {
                view: {
                    weight: 0
                }
            }
        },

        process: async function(v, js) {
            if (!this.cache[js.src]) {
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

                    po.src = this.uiMethod.parseUrl(js.src);

                    e.appendChild(po);

                    this.cache[js.src] = true;
                });
            }
        },

        afterView:  async function(v) {
            for (let js of this.collection)
                await this.process(v, js)
                ;

            this.cache = {};
            this.collection = [];

            return v.h;
        }
    }
};
