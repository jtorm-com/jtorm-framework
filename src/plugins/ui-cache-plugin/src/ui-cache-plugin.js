/*! (c) jTorm and other contributors | www.jtorm.com/license */
var r;
module.exports = {
    before: {
        iteration: {
            weight: 0,
            handle: async function (j, v) {
                if (j.context.models.uiCache && v.cid) {
                    // console.log('find cache', v.cid);
                    r = await j.context.models.uiCache.get(j, v, v.cid, v.cs ? v.cs : 'global');
                    if (r) {
                        // console.log('cache found', r);
                        v.r = new j.context.models.document(j, r, v);
                        v.cache = null;
                    }
                }
            }
        },
        view: {
            weight: 0,
            handle: async function (j, v) {
                // load cache from model
                if (j.context.models.uiCache)
                    await j.context.models.uiCache.init();
            }
        }
    },
    after: {
        iteration: {
            weight: 0,
            handle: function (j, v) {
                if (v.cid) {
                    // console.log('set to model', v.cid);
                    // console.log(v.h.body());
                    j.context.models.uiCache.set(j, v, v.cid, v.cs ? v.cs : 'global', v.h.body());
                }

                v.cache = null;
            }
        },
        view: {
            weight: 100,
            handle: function (j, v) {
                if (j.context.models.uiCache)
                    j.context.models.uiCache.save(j, v);
            }
        }
    }
};