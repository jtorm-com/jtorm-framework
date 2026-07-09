/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormLayerPlugin: {
        // DI
        // handler
        // layerModel
        // viewModel

        currentCid: [],
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
                    weight: 0
                }
            }
        },

        stack: function (v) {
            const s = this.layerModel.state(v);
            return s.currentCid ? s.currentCid : this.currentCid;
        },

        handle: async function(v, e, t) {
            const c = this.layerModel.get(v, e, t);
            if (c && c.length)
                await this.handler.handle(null, null, null, 0, this.viewModel.copy(v, null, c))
            ;
        },

        beforeIteration: async function(v) {
            if (v.cid) {
                const s = this.layerModel.state(v);

                this.stack(v).push(v.cid);

                s.cid = v.cid;
            }
        },

        afterIteration: async function(v) {
            if (v.cid) {
                await this.handle(v, 'after', 'iteration');

                const c = this.stack(v);

                v._.remove(c, function (el) {
                    return el === v.cid;
                });

                this.layerModel.state(v).cid = c.length
                    ? c.pop()
                    : 'default';
            }
        },

        afterView: async function(v) {
            await this.handle(v, 'after', 'view');

            this.layerModel.save(v);
        }
    }
};
