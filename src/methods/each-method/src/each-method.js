/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormEachMethod: {
        // DI
        // handler: null,
        // handlerWrapper: null,
        // methods: null,
        // viewModel: null,

        defaultMethod: 'append',
        alias: 'e',
        params: [
            'd',// Data
            'm',// Method
            'e',// Element
            'a'// As reference
        ],

        validate: function (v) {
            return (
                (
                    v.d.d
                    || v.m
                )
                && v.t.c.length
            );
        },

        handle: async function (v) {
            const s = this;
            let r = '', d, k, h, sv, i = 0, e;

            if (!v.d.d)
                v.d.d = v.m;

            if (!Array.isArray(v.d.d))
                v.d.d = [v.d.d];

            if (v.d.e) {
                e = v.h.selectAll(v.d.e);
                v.c = 1;
            }

            for (k in v.d.d) {
                d = {};

                if (v.d.a)
                    d[v.d.a] = v.d.d[k];
                else
                    d = v.d.d[k];

                if (typeof d !== 'object')
                    d = [d];

                d.isLoop = 1;
                d.index = k;

                if (v.t.p.e) {
                    if (e.length && e[i])
                        h = e[i].outerHTML;
                    else
                        h = e[0].outerHTML;

                    h = await s.handler.handle('<body>' + h + '</body>', v.t.c, d, 1);
                    e[i].parentNode.replaceChild(h.select(v.t.s), e[i]);
                } else {
                    h = await s.handlerWrapper.handle("", v.t, d, v);
                    r += h;
                }

                v.r = null;

                i++;
            }

            if (!v.t.p.e) {
                if (!v.d.m) v.d.m = s.defaultMethod;

                sv = s.viewModel.copy(v);
                sv.t = {s: v.t.s, m: v.d.m, c: []};
                sv.d = {h: r};
                await s.methods[v.d.m].handle(sv);
            }

            v.io = {};
        }
    }
};
