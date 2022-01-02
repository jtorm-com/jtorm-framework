/*! (c) jTorm and other contributors | www.jtorm.com/license */
module.exports = {
    after: {
        view: {
            cache: {},
            collection: [],
            weight: 0,
            process: async function (j, v, js) {
//      if (!this.after.cache[js.src]) {
                var po = v.h.d.createElement('script');
                po.type = 'text/javascript';
//        po.defer = true;// before render we should do things like client resolution
//        po.async = true;// not working
//        po.setAttribute('async', "");
                po.src = j.context.methods.ui.parseUrl(js.src);
//        console.log(po.outerHTML);
                await v.h.set('head', function (e) {
                    e.appendChild(po);
                });
//        this.after.cache[js.src] = true;
//      }
            },
            handle: async function (j, v) {
                var s = this;
                for (var js of s.collection)
                    await s.process(j, v, js);
                s.cache = {};
                s.collection = [];
                return v.h;
            }
        }
    }
};