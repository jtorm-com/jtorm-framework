/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormMediaqueryMethod: {
        // DI
        windowModel: null,

        alias: 'mq',
        m: null,
        params: ['q'],

        init: function() {
            let w = this.windowModel;
            this.m = w.matchMedia || w.msMatchMedia;
        },

        validate: function (j, v) {
            return !!v.d.q;
        },

        handle: function (j, v) {
            v.io = {c: this.process(v.d.q)};
        },

        process: function (q) {
            if (this.m) {
                let r = this.m(q);
                return (r && r.matches);
            }

            return false;
        }
    }
};
