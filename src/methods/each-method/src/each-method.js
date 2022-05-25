/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormEachMethod: {
        // DI
        handler: null,
        handlerWrapper: null,
        methods: null,
        viewModel: null,

        alias: "e",
        params: [
            'd',
            'm',
            'e',
            'a'
        ],

        validate: function (v) {
            return (
                (
                    v._.isArray(v.d.d)
                    || v._.isArray(v.m)
                )
                && v.t.c.length
            );
        },

        handle: async function (v) {
            let r = '', d, k, h, sv, i = 0, e;

            if (!v.d.d)
                v.d.d = v.m;

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

                d.isLoop = 1;
                d.index = k;

                if (v.t.p.e) {
                    if (e.length && e[i])
                        h = e[i].outerHTML;
                    else
                        h = e[0].outerHTML;

                    h = await this.handler.handle('<body>' + h + '</body>', v.t.c, d, 1);
                    e[i].parentNode.replaceChild(h.select(v.t.s), e[i]);
                } else {
                    console.log(d);
                    h = await this.handlerWrapper.handle("", v.t, d, v);
                    r += h;
                }

                v.r = null;

                i++;
            }

            if (!v.t.p.e) {
                sv = this.viewModel.copy(v);
                sv.t = {s: v.t.s, m: v.d.m, c: []};
                sv.d = {h: r};
                await this.methods[v.d.m].handle(sv);// todo different method than this with tss repeat
            }

            v.io = {};
        }
    }
};
