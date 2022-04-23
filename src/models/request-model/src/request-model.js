/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormDataModel: {
        cache: {},

        get: async function (j, v, url) {
            if (!this.cache[url])
                await this.set(j, v, url);

            return this.cache[url];
        },

        set: async function (j, v, url) {
            this.cache[url] = await v.h.request(j, url, "application/json");
        }
    }
};
