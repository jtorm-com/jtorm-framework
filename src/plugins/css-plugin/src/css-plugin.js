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
                    po.href = this.uiMethod.parseUrl(css.href);

                    if (css.crossorigin)
                        po.setAttribute('crossorigin', css.crossorigin);

                    if (css.defer) {
                        po.rel = 'preload';
                        po.as = 'style';
                        po.setAttribute('as', 'style');
                        po.setAttribute('onload', "this.onload=null;this.rel='stylesheet'");
                    } else
                        po.rel = css.rel ? css.rel : 'stylesheet';

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
