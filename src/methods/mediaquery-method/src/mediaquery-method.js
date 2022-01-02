/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';
module.exports = {
    jTormMediaqueryMethod: {
        alias: 'mq',
        params: ['q'],
        validate: function (j, v) {
            return !!v.d.q;
        },
        handle: function (j, v) {
            v.io = {c: this.process(v.d.q, j.context.models.window)};
        },
        process: function (q, w) {
            var m = w.matchMedia || w.msMatchMedia, r;
            if (m) {
                r = m(q);
                return (r && r.matches);
            }
            return false;
        }
    }
};