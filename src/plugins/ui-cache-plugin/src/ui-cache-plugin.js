/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormUiCachePlugin: {
        // DI
        // uiCacheModel: null,

        event: {
            before: {
                iteration: {
                    weight: 0
                }
            },
            after: {
                iteration: {
                    weight: 0
                },
                view: {
                    weight: 100
                }
            }
        },

        beforeIteration: async function (v) {
            if (v.cid)
                v.r = await this.uiCacheModel.get(v, v.cid, v.cs ? v.cs : 'global');
        },

        afterIteration: function (v) {
            if (v.cid)
                this.uiCacheModel.set(v, v.cid, v.cs ? v.cs : 'global', v.h.body());
        },

        afterView: function (v) {
            this.uiCacheModel.save(v);
        }
    }
};