/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    after: {
        view: {
            cache: {},
            weight: 0,
            process: async function (j, v, href) {
//      if(!this.after.view.cache[href]) {
                await v.h.set('head', function (el) {
                    let po = v.h.d.createElement('link');
                    po.type = 'text/css';
                    po.rel = 'stylesheet';
                    po.href = j.context.methods.ui.parseUrl(href);

                    el.appendChild(po);
                });
//        this.cache[href] = true;
//      }
            },
            handle: async function (j, v) {
                for (let href in this.cache)
                    await this.process(j, v, href);

                this.cache = {};

                return v.h;
            }
        }
    }
};