/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormViewModel: {
        // DI
        _: null,
        documentModel: null,
        tssParser: null,

        copyAttrs: ['_', 't', 'params', 'io', 'c'],
        data: {
            cid: null,// cache id
            cs: null,// cache scope
            c: {
                c: 1,// create doc
                s: null,// parent selector
            },
            h: null,// html
            m: null,// model
            d: null,// method data
            tss: null,
            t: null,// method tss
            r: null, // result from handlechildren
            io: {
                d: null, // alt data
                c: 1, // handle children
                r: 1, // repeat current iteration
                v: 0 // validated
            }
        },

        create: async function(h, t, m, c, b) {
            let v = this._.create(this.data, {
                _: this._
            });

            if (this._.isObject(c))
                v.c = c;
            else
                v.c.c = c;

            v.m = m;

            if (this._.isString(t))
                t = await this.tssParser.handle(t);

            v.tss = t;

            if (this._.isString(h))
                h = this.documentModel.create(h, v, b);

            v.h = h;

            return v;
        },

        copy: function(v, h, t, d, a) {
            let sv = {}, k;

            if (!a)
                a = this.copyAttrs;

            for (k in v) {
                if (k === 'h')
                    sv[k] = h ? h : v[k];
                else if (k === 'tss')
                    sv[k] = t ? t : v[k];
                else if (k === 'm')
                    sv[k] = d ? d : v[k];
                else if (a.indexOf(k) !== -1)
                    sv[k] = v[k];
                else
                    sv[k] = this._.cloneDeep(v[k]);
            }

            return sv;
        }
    }
};
