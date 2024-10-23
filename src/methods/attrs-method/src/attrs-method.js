/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormAttrsMethod: {
        // DI
        // attrMethod
        // dataParser
        // tssParser
        // viewModel

        alias: 'as',
        separator: ',',
        params: [
            'n',// Name
            'v',// Value
            'm'// Method
        ],

        parsed: function (v) {
            let t = v._.cloneDeep(v.t),
                p = this.tssParser;

            t.p.n = p.quotes(t.p.n);
            t.p.v = p.quotes(t.p.v);

            if (t.p.m)
                t.p.m = p.quotes(t.p.m);

            return t;
        },

        validate: function (v) {
            let t = this.parsed(v);
            v.d.parsed = t;

            return (
                t.p.n
                && (t.p.v || t.p.m === 'r')
                && (!t.p.m || ['p', 'a', 'r'].indexOf(t.p.m) !== -1)
            );
        },

        handle: async function (v) {
            let t = v.d.parsed,
                k,
                s = this.separator,
                names = t.p.n.split(s),
                values = t.p.v.split(s),
                tR = {
                    s: t.s,
                    m: 'attr'
                },
                tD,
                sv
            ;

            for (k in names) {
                if (!values[k])
                    continue
                ;

                tD = {
                    n: names[k],
                    v: this.dataParser.parse(v.m, values[k]) || values[k],
                    m: t.p.m
                };

                sv = this.viewModel.copy(v, null, tR);
                sv.d = tD;

                await this.attrMethod.handle(sv);
            }

            v.io = {c: 1};
        }
    }
};
