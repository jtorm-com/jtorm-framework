/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    before: {
        iteration: {
            weight: 0,
            handle: async function (j, v) {
                if (j.context.models.uiCache && v.cid) {
                    let r = await j.context.models.uiCache.get(j, v, v.cid, v.cs ? v.cs : 'global');
                    if (r)
                        v.r = new j.context.models.document(j, r, v);
                }
            }
        }
    },
    after: {
        iteration: {
            weight: 0,
            handle: function (j, v) {
                if (v.cid)
                    j.context.models.uiCache.set(j, v, v.cid, v.cs ? v.cs : 'global', v.h.body());
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