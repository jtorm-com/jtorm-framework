/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormIfMethod: {
        // DI
        // dataParser: null,
        // handler: null,

        or: '||',
        and: '&&',
        params: ['d', 'v', 'el', 'to'],

        validate: function () {
            return 1;
        },

        handle: async function (v) {
            let r, e, t = [], k, to = 1, o = this.or, a = this.and, d = this.dataParser;

            if (v.d.d === undefined)
                v.d.d = v.m;

            if (v.d.to) {
                if (v.d.to === 'array') {
                    to = Array.isArray(v.d.d);
                } else if (typeof v.d.d !== v.d.to)
                    to = 0;
            }

            if (v.d.d === null) {
                if (v.t.p.d.indexOf(o) !== -1) {
                    t = v.t.p.d.split(o);
                    for (k in t) {
                        if (d.parse(v.m, t[k].trim())) {
                            v.d.d = 1;
                            break;
                        }
                    }
                } else if (v.t.p.d.indexOf(a) !== -1) {
                    t = v.t.p.d.split(a);
                    v.d.d = 1;
                    for (k in t) {
                        if (!d.parse(v.m, t[k].trim())) {
                            v.d.d = 0;
                            break;
                        }
                    }
                }

                t = [];
            }

            if (v.d.v !== undefined) {
                if (v._.isBoolean(v.d.v) && v.d.d === v.d.v)
                    v.d.d = 1;
                else
                    r = new RegExp(v.d.v, 'm');
            }

            if (v.d.el)
                e = v.h.select(v.d.el);

            if (
                to
                && (
                    (v.d.el && e)
                    || (!v.d.el && v.d.d && (!r || r.test(v.d.d)))
                )
            ) {
                for (k in v.t.c) {
                    if (v.t.c[k].m !== 'else')
                        t.push(v.t.c[k]);
                }
            } else {
                for (k in v.t.c) {
                    if (v.t.c[k].m === 'else') {
                        t = v.t.c[k].c;
                        break;
                    }
                }
            }

            if (t.length)
                await this.handler.handle(v.h, t, v.m, v.c);

            v.io = {};
        }
    }
};
