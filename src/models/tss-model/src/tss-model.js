/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormTssModel: {
        // DI
        requestModel: null,
        tssParser: null,

        cache: {},

        get: async function (j, v, url) {
            if (!this.cache[url])
                await this.set(j, v, url);

            return this.cache[url];
        },

        set: async function (j, v, url) {
            this.cache[url] = await this.requestModel.request(j, url, "text/plain");

            this.cache[url].d = await this.tssParser.handle(this.cache[url].d);
        }
    }
}
