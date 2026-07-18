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

        beforeIteration: async function (v, x) {
            if (v.cid)
                v.r = await this.uiCacheModel.get(v, v.l == null ? null : v.l, v.cid, v.cs ? v.cs : 'default', x);
        },

        afterIteration: function (v, x) {
            if (v.cid)
                this.uiCacheModel.stage(v, v.l == null ? null : v.l, v.cid, v.cs ? v.cs : 'default', v.h.body(), x);
        },

        completeIteration: function (v, x) {
            const s = this;

            return function () { s.uiCacheModel.complete(v, x); };
        },

        abortIteration: function (v, x, e) {
            this.uiCacheModel.abort(v, x, e);
        },

        afterView: function (v) {
            this.uiCacheModel.save(v);
        }
    }
};
