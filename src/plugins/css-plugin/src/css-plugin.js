/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormCssPlugin: {
        // DI
        // uiMethod: null,

        cache: {},
        collection: [],
        event: {
            after: {
                view: {
                    weight: 0
                }
            }
        },

        process: async function(v, css) {
            if(!this.cache[css.href]) {
                const s = v.t.s;
                v.t.s = 'head';

                await v.h.set(v, el => {
                    const po = v.h.d.createElement('link');
                    po.type = 'text/css';
                    po.rel = 'stylesheet';
                    po.href = this.uiMethod.parseUrl(css.href);

                    el.appendChild(po);

                    v.t.s = s;

                    this.cache[css.href] = true;
                });
            }
        },

        afterView: async function(v) {
            for (let css of this.collection)
                await this.process(v, css);

            this.cache = {};
            this.collection = [];

            return v.h;
        }
    }
};
