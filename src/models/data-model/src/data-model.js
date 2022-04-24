/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormDataModel: {
        // DI
        requestModel: null,

        cache: {},

        get: async function (v, url) {
            if (!this.cache[url])
                await this.set(v, url);

            return this.cache[url];
        },

        set: async function (v, url) {
            this.cache[url] = await this.requestModel.request(url, "application/json");
        }
    }
};
