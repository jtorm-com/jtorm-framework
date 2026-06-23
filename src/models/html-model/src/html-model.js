/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormHtmlModel: {
        // DI
        // requestModel

        c: {},

        get: async function (v) {
            const s = this;

            if (!s.c[v]) {
                s.c[v] = s.requestModel.get(v).text();
                s.c[v].catch(function () { delete s.c[v]; });
            }

            return s.c[v];
        }
    }
};
