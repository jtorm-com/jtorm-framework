/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

const profile = Object.freeze({n: 'css', k: 'href', t: 'link', m: 'cssMethod', x: ['defer', 'href'], r: 'stylesheet', d: 1});

module.exports = {
    jTormCssPlugin: {
        // DI
        // assetPluginModel
        // cssMethod
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

        process: async function(v, css) {
            return this.assetPluginModel.process(this, v, {asset: css, profile: profile});
        },

        afterView: async function(v) {
            return this.assetPluginModel.afterView(this, v, profile);
        }
    }
};
