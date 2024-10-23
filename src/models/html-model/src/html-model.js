/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormHtmlModel: {
        // DI
        // requestModel

        cache: {},

        get: async function (v) {
            if (!this.cache[v])
                await this.set(v)
            ;

            return this.cache[v];
        },

        set: async function (v) {
            this.cache[v] = await this.requestModel.request(v, "text/html");
        }
    }
};
