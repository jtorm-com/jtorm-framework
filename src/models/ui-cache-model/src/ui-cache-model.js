/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormUiCacheModel: {
        saveModel: null,
        cache: {},

        init: async function () {
            if (this.saveModel)
                this.cache = this.saveModel.get();
        },

        get: async function (j, v, id, c) {
            if (this.cache[id] && this.cache[id][c])
                return this.cache[id][c];
            return null;
        },

        set: function (j, v, id, c, d) {
            if (!this.cache[id]) this.cache[id] = {};
            if (!this.cache[id][c]) this.cache[id][c] = {};
            this.cache[id][c] = d;
        },

        save: async function (j, v) {
            if (this.saveModel)
                this.saveModel.set(this.cache);
        }
    }
};