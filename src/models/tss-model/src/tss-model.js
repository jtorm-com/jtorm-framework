/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormTssModel: {
        // DI
        // requestModel
        // tssParser

        c: {},

        get: async function (v) {
            const s = this;
            let r, k;

            if (Array.isArray(v)) {
                r = [];
                for (k in v)
                    r = r.concat(await s.get(v[k]))
                ;

                return r;
            }

            if (!s.c[v]) {
                s.c[v] = s.requestModel.get(v).text().then(function (t) { return s.tssParser.handle(t); });
                s.c[v].catch(function () { delete s.c[v]; });
            }

            return s.c[v];
        }
    }
};
