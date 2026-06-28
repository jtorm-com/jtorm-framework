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

        handle: async function(v, e, t) {
            const c = this.layerModel.get(v, e, t);
            if (c && c.length)
                await this.handler.handle(null, null, null, 0, this.viewModel.copy(v, null, c))
            ;
        },

        beforeIteration: async function(v) {
            if (v.cid) {
                this.currentCid.push(v.cid);

                this.layerModel.cid = v.cid;
            }
        },

        afterIteration: async function(v) {
            if (v.cid) {
                await this.handle(v, 'after', 'iteration');

                v._.remove(this.currentCid, function (el) {
                    return el === v.cid;
                });

                this.layerModel.cid = this.currentCid.length
                    ? this.currentCid.pop()
                    : 'default';
            }
        },

        afterView: async function(v) {
            await this.handle(v, 'after', 'view');

            this.layerModel.save(v);
        }
    }
};