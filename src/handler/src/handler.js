/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';
module.exports = {
    jTormHandler: {
        context: {},
        handle: async function (h, t, m, c, v) {
            var s = this;
            if (!v)
                v = await s.context.models.view.create(s, h, t, m, c);
            await s.parse(v);
            return v.h;
        },
        handleChildren: async function (h, t, m, v) {
            var s = this,
                // selector = v.c.s,
                v2;

            // if (!s.context._.isString(h))
            //     h = h.select(v.c.s ? v.c.s : t.s).innerHTML;

            var t2 = s.clone(t);

            for (let k in t2.c)
                t2.c[k].s = 'body';

            v2 = await s.context.models.view.create(s, "<body>" + h + "</body>", t2.c, m, v.c);
            v2.cid = v.cid;

            if (t.s)
                v.c.s = t.s;

            v2.c = {
                // s: t.s,
                s: 'body',
                c: 1
            };

            await s.context.models.event.handle(s, v2, 'before', 'iteration');

            if (!v.r)
                v.r = await s.handle("<body>" + h + "</body>", t2.c, m, v.c, v2);
            v2.cid = v.cid;

            // v.c.s = selector;// kan weg?

            await s.context.models.event.handle(s, v2, 'after', 'iteration');

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

                        await s.context.models.event.handle(s, v, 'before', 'method');
                        if (v.io.v && v._.isFunction(m.handle))
                            await m.handle(s, v);
                        else
                            v.io.r = 0;
                        await s.context.models.event.handle(s, v, 'after', 'method');
                    } else {
                        v.io.r = 0;
                        v.io.c = 1;
                    }
                } while (v.io.r);

                if (v.io.c && v.t.c.length) {
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
        }
    }
};