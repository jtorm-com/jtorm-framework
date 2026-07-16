/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

const profile = Object.freeze({n: 'js', k: 'src', t: 'script', m: 'jsMethod', x: ['src']});

module.exports = {
    jTormJsPlugin: {
        // DI
        // assetPluginModel
        // jsMethod
        // requestModel
        // uiResolverModel

        cache: {},
        collection: [],
        event: {
            after: {
                view: {
                    weight: 0
                }
            }
        },

        context: function (v) {
            return this.assetPluginModel.context(this, v, profile);
        },

        state: function (v) {
            return this.assetPluginModel.state(this, v, profile);
        },

        adopt: function (v) {
            return this.assetPluginModel.adopt(this, v, profile);
        },

        process: async function(v, js) {
            return this.assetPluginModel.process(this, v, {asset: js, profile: profile});
        },

        afterView:  async function(v) {
            return this.assetPluginModel.afterView(this, v, profile);
        }
    }
};
