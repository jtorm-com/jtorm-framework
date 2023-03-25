/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormJsPlugin: {
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

        process: async function(v, js) {
            if (!this.cache[js.src]) {
                const s = v.t.s;
                v.t.s = 'head';

                await v.h.set(v, e => {
                    const po = v.h.d.createElement('script');
                    po.type = 'text/javascript';
                    po.defer = true;
                    // po.async = true;// does not work
                    po.setAttribute('async', '');
                    po.src = this.uiMethod.parseUrl(js.src);

                    e.appendChild(po);

                    v.t.s = s;

                    this.cache[js.src] = true;
                });
            }
        },

        afterView:  async function(v) {
            for (let js of this.collection)
                await this.process(v, js);

            this.cache = {};
            this.collection = [];

            return v.h;
        }
    }
};
