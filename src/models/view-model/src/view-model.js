/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

const jTormViewModel = {
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

    create: async function(j, h, t, m, c, b) {
        let sC = j.context,
            v = sC.models.view.data;

        v = sC._.create(v, {
            _: sC._
        });

        if (v._.isObject(c))
            v.c = c;
        else
            v.c.c = c;

        v.m = m;

        if (v._.isString(t))
            t = await sC.parsers.tss.handle(t);

        v.tss = t;

        if (v._.isString(h))
            h = new sC.models.document(j, h, v, b);

        v.h = h;

        return v;
    },

    copy: function(j, v, h, t, d, a) {
        var sv = {};

        if (!a) a = j.context.models.view.copyAttrs;

        for (let k in v) {
            if (k === 'h')
                sv[k] = h ? h : v[k];
            else if (k === 'tss')
                sv[k] = t ? t : v[k];
            else if (k === 'm')
                sv[k] = d ? d : v[k];
            else if (a.indexOf(k) !== -1)
                sv[k] = v[k];
            else
                sv[k] = j.context._.cloneDeep(v[k]);
        }

        return sv;
    }
};

module.exports = {
    jTormViewModel
};
