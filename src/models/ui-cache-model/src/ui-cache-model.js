/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormUiCacheModel: {
        // DI
        // saveModel: null,

        cache: {},
        updated: 0,

        init: async function () {
            if (this.saveModel)
                this.cache = this.saveModel.get();
        },

        get: async function (v, id, c) {
            if (this.cache[id] && this.cache[id][c])
                return this.cache[id][c];

            return null;
        },

        set: function (v, id, c, d) {
            if (!this.cache[id]) this.cache[id] = {};

            if (this.cache[id][c] === undefined) {
                this.cache[id][c] = d;
                this.updated = 1;
            }
        },

        save: async function () {
            if (this.saveModel && this.updated)
                this.saveModel.set(this.cache);

            this.updated = 0;
        }
    }
};