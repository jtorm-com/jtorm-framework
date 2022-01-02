/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';
module.exports = {
    jTormAttrsMethod: {
        alias: 'as',
        separator: ',',
        params: ['n', 'v', 'm'],
        parsed: function (j, v) {
            var t = j.clone(v.t),
                p = j.context.parsers.tss;
            t.p.n = p.quotes(t.p.n);
            t.p.v = p.quotes(t.p.v);
            if (t.p.m) t.p.m = p.quotes(t.p.m);
            return t;
        },
        validate: function (j, v) {
            var t = this.parsed(j, v);
            v.d.parsed = t;
            return (
                t.p.n
                && (t.p.v || t.p.m === 'r')
                && (!t.p.m || ['p', 'a', 'r'].indexOf(t.p.m) !== -1)
            );
        },
        handle: async function (j, v) {
            var t = v.d.parsed,
                s = this,
                k,
                names = t.p.n.split(s.separator),
                values = t.p.v.split(s.separator),
                tR = {
                    s: t.s,
                    m: 'attr'
                },
                tD,
                sv,
                d = j.context.parsers.data;

            for (k in names) {
                if (!values[k]) continue;

                tD = {
                    n: names[k],
                    v: d.parse(v.m, values[k]) || values[k],
                    m: t.p.m
                };

                sv = j.copyViewModel(v, null, tR);
                sv.d = tD;

                await j.context.methods.attr.handle(j, sv);
            }

            v.io = {c: 1};
        }
    }
};