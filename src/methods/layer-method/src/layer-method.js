/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

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

        validate: function (v) {
            return (v.t.c && v.t.c.length);
        },

        handle: function (v) {
            this.layerModel.set(v);

            v.io = {};
        }
    }
};
