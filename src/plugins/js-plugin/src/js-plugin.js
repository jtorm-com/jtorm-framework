/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormJsPlugin: {
        // DI
        uiMethod: null,

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
//      if (!this.after.cache[js.src]) {
            let po = v.h.d.createElement('script');
            po.type = 'text/javascript';
//        po.defer = true;// before render we should do things like client resolution
//        po.async = true;// not working
//        po.setAttribute('async', "");
            po.src = this.uiMethod.parseUrl(js.src);
//        console.log(po.outerHTML);
            await v.h.set('head', function (e) {
                e.appendChild(po);
            });
//        this.after.cache[js.src] = true;
//      }
        },

        afterView:  async function(v) {
            for (let js of this.collection)
                await this.process(j, v, js);

            this.cache = {};
            this.collection = [];

            return v.h;
        }
    }
};
