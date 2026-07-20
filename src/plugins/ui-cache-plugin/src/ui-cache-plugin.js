/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

const refresh = function (m, h) {
    try {
        return !!h && h === m.refreshModel
            && typeof m.lookup === 'function' && typeof m.start === 'function'
            && typeof h.authorize === 'function' && typeof h.current === 'function'
            && typeof h.render === 'function' && typeof h.session === 'function'
            && typeof h.owns === 'function';
    } catch (e) {
        return false;
    }
};

module.exports = {
    jTormUiCachePlugin: {
        // DI
        // uiCacheModel: null,

        refreshModel: null,// DI: must be the same stable host configured on uiCacheModel
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
            if (v.cid) {
                const m = this.uiCacheModel, h = this.refreshModel;

                if (refresh(m, h)) {
                    const r = await m.lookup(v, v.l == null ? null : v.l,
                        v.cid, v.cs ? v.cs : 'default', x);
                    v.r = r.value;
                    if (r.refresh) m.start(v, r.refresh);
                } else
                    v.r = await m.get(v, v.l == null ? null : v.l,
                        v.cid, v.cs ? v.cs : 'default', x)
                ;
            }
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
            const m = this.uiCacheModel;

            if (typeof m.refreshView !== 'function' || m.refreshView(v) !== true) {
                m.save(v);
                return;
            }

            return (async function () {
                try { await m.save(v); }
                finally { m.closeRefreshView(v); }
            })();
        }
    }
};
