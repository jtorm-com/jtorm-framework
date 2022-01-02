/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';
module.exports = {
    jTormLayerMethod: {
        alias: 'l',
        params: [
            'e',// event when to process e.g. after
            't',// type when to process e.g. iteration
            'z'// int:z-index
        ],
        validate: function (j, v) {
            return (v.t.c && v.t.c.length);
        },
        handle: function (j, v) {
            j.context.models.layer.set(j, v);

            v.io = {};
        }
    }
};