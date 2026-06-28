/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('../../../../types.js').ViewModel} ViewModel */

module.exports = {
    jTormLayerMethod: {
        // DI
        // layerModel

        alias: 'l',
        params: [
            'i',// ID
            'e',// Event
            't',// Type
            'z'// Z-index
        ],

        /** @param {ViewModel} v */
        validate: function (v) {
            return (v.t.c && v.t.c.length);
        },

        /**
         * Register the rule’s children as a deferred layer via layerModel.
         * @param {ViewModel} v
         */
        handle: function (v) {
            this.layerModel.set(v);

            v.io = {};
        }
    }
};
