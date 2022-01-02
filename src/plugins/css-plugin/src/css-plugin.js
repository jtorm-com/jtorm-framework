/*! (c) jTorm and other contributors | www.jtorm.com/license */
module.exports = {
    after: {
        view: {
            cache: {},
            weight: 0,
            process: async function (j, v, href) {
//      if(!this.after.view.cache[href]) {
                await v.h.set('head', function (el) {
                    var po = v.h.d.createElement('link');
                    po.type = 'text/css';
                    po.rel = 'stylesheet';
                    po.href = j.context.methods.ui.parseUrl(href);
                    el.appendChild(po);
                });
//        this.cache[href] = true;
//      }
            },
            handle: async function (j, v) {
                var s = this, href;
                for (href in s.cache)
                    await s.process(j, v, href);
                s.cache = {};
                return v.h;
            }
        }
    }
};