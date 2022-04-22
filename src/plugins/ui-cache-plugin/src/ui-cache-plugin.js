/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    // DI
    uiCache: null,// todo

    before: {
        iteration: {
            weight: 0,
            handle: async function (j, v) {
                if (j.context.models.uiCache && v.cid)
                    v.r = await j.context.models.uiCache.get(j, v, v.cid, v.cs ? v.cs : 'global');
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