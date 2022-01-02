/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';
module.exports = {
    jTormHandler: {
        context: {},
        event: {
            before: {
                method: null,
                view: null
            },
            after: {
                method: null,
                view: null
            }
        },
        handle: async function (h, t, m, c, v) {
            var s = this;
            if (!v)
                v = await s.viewModel(h, t, m, c);
            await s.parse(v);
            return v.h;
        },
        viewModel: async function(h, t, m, c) {
            var s = this,
                sC = s.context,
                v = sC.models.view;

            v = sC._.create(v, {
                _: sC._
            });

            if (v._.isObject(c))
                v.c = c;
            else
                v.c.c = c;

            v.m = m;

            if (sC._.isString(t))
                t = await sC.parsers.tss.handle(t);
            v.tss = t;

            if (s.context._.isString(h))
                h = new sC.models.document(s, h, v);
            v.h = h;

            return v;
        },
        copyViewModelAttrs: ['_', 't', 'params', 'io', 'c'],
        copyViewModel: function(v, h, t, d, a) {
            var sv = {}, s = this;

            if (!a) a = s.copyViewModelAttrs;

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
                    sv[k] = s.context._.cloneDeep(v[k]);
            }
            return sv;
        },
        handleChildren: async function (h, t, m, v) {
            var ja = 0;
            if (v.cid) ja = v.cid;

            // this one needs 100% isolation for head and body
            // const util = require('util');
            // console.log('handleChildren');
            // console.log(util.inspect(t, false, null, true /* enable colors */));
            var s = this,
                // selector = v.c.s,
                v2;

            // if (!s.context._.isString(h))
            //     h = h.select(v.c.s ? v.c.s : t.s).innerHTML;

            var t2 = s.clone(t);

            for (let k in t2.c)
                t2.c[k].s = 'body';

            v2 = await s.viewModel("<body>" + h + "</body>", t2.c, m, v.c);
            v2.cid = v.cid;

            if (t.s)
                v.c.s = t.s;

            v2.c = {
                // s: t.s,
                s: 'body',
                c: 1
            };

            await s.loopEvent(s, v2, 'before', 'iteration');
            // console.log('start jaaa', v2.m, v.r);
            if (!v.r)
                v.r = await s.handle("<body>" + h + "</body>", t2.c, m, v.c, v2);
            v2.cid = v.cid;


            // v.c.s = selector;// kan weg?

            // if (ja) console.log('resultaat', ja, v2.h.html());

            await s.loopEvent(s, v2, 'after', 'iteration');

            return v.r;
        },
        parse: async function (v) {
            var s = this, m, ms = s.context.methods;
            let k, k2;
            for (k in v.tss) {
                v.t = v.tss[k];

                do {
                    m = 0;
                    if (v.t.m && ms[v.t.m])
                        m = ms[v.t.m];
                    else {
                        for (k2 in ms) {
                            if (ms[k2].alias === v.t.m) {
                                m = ms[k2];
                                break;
                            }
                        }
                    }

                    if (m) {
                        if (v._.isFunction(m.data))
                            await m.data(s, v);
                        else
                            s.context.parsers.data.handle(s, v, m.params);

                        v.io.v = await m.validate(s, v);

                        await s.loopEvent(s, v, 'before', 'method');
                        if (v.io.v && v._.isFunction(m.handle))
                            await m.handle(s, v);
                        else
                            v.io.r = 0;
                        await s.loopEvent(s, v, 'after', 'method');
                    } else {
                        v.io.r = 0;
                        v.io.c = 1;
                    }
                } while (v.io.r);

                if (v.io.c && v.t.c.length) {
                    // const util = require('util');
                    // console.log('handleChildren');
                    // console.log(util.inspect(v.t.c, false, null, true /* enable colors */));
                    // console.log(v.h.html());
                    await s.handle(v.h, v.t.c, v.io.d ? v.io.d : v.m, v.c);
                }

                v.io.d = null;
            }
        },
        clone: function (o) {
            return this.context._.cloneDeep(o);
        },
        get: function(object, path) {
            return this.context._.get(object, path);
        },
        set: function(object, path, value) {
            this.context._.set(object, path, value);
        },
        loopEvent: async function (j, v, e, t) {
            var s = this,
                k,
                p = j.context.plugins,
                c = s.event[e][t];

            if (!c) {
                c = [];
                for (k in p) {
                    if (p[k][e] && p[k][e][t]) {
                        c.push(p[k][e][t]);
                    }
                }

                c.sort(function (a, b) {
                    return a.weight - b.weight;
                });

                s.event[e][t] = c;
            }

            for (let k in c)
                await c[k].handle(s, v);
        }
    }
};