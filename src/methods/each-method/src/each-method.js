/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';
module.exports = {
    jTormEachMethod: {
        alias: "e",
        params: [
            'd',
            'm',
            'e',
            'a'
        ],
        validate: function (j, v) {
            return (
                (
                    v._.isArray(v.d.d)
                    || v._.isArray(v.m)
                )
                && v.t.c.length
            );
        },
        handle: async function (j, v) {
            var r = '', d, k, h, sv, i = 0, e;

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
// console.log(d);
                if (v.t.p.e) {
                    if (e.length && e[i])
                        h = e[i].outerHTML;
                    else
                        h = e[0].outerHTML;

                    h = await j.handle('<body>' + h + '</body>', v.t.c, d, 1);
                    e[i].parentNode.replaceChild(h.select(v.t.s), e[i]);
                } else {
                    await j.handleChildren("", v.t, d, v);
                    r += v.r.select('body').innerHTML;
                }

                v.r = null;

                i++;
            }

            if (!v.t.p.e) {
                sv = j.copyViewModel(v);
                sv.t = {s: v.t.s, m: v.d.m, c: []};
                sv.d = {h: r};
                await j.context.methods[v.d.m].handle(j, sv);
            }

            v.io = {};
        }
    }
};