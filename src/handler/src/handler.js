/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormHandler: {
        context: {},

        handle: async function (h, t, m, c, v) {
            let s = this,
                sC = s.context,
                e = sC.models.event,
                r,
                ms = sC.methods,
                k,
                k2;

            if (!v)
                v = await s.context.models.view.create(s, h, t, m, c);

            for (k in v.tss) {
                v.t = v.tss[k];

                do {
                    r = 0;

                    if (v.t.m && ms[v.t.m])
                        r = ms[v.t.m];
                    else {
                        for (k2 in ms) {
                            if (ms[k2].alias === v.t.m) {
                                r = ms[k2];
                                break;
                            }
                        }
                    }

                    if (r) {
                        if (v._.isFunction(r.data))
                            await r.data(s, v);
                        else
                            sC.parsers.data.handle(s, v, r.params);

                        v.io.v = await r.validate(s, v);

                        await e.handle(s, v, 'before', 'method');

                        if (v.io.v && v._.isFunction(r.handle))
                            await r.handle(s, v);
                        else
                            v.io.r = 0;

                        await e.handle(s, v, 'after', 'method');
                    } else {
                        v.io.r = 0;
                        v.io.c = 1;
                    }
                } while (v.io.r);

                if (v.io.c && v.t.c.length)
                    await s.handle(v.h, v.t.c, v.io.d ? v.io.d : v.m, v.c);

                v.io.d = null;
            }

            return v.h;
        },

        handleChildren: async function (h, t, m, v) {
            let s = this,
                sC = s.context,
                cM = sC.models,
                e = cM.event,
                k,
                t2 = t.c,
                v2;

            for (k in t2)
                t2[k].s = 'body';

            v2 = await cM.view.create(s, "<body>" + h + "</body>", t2, m, v.c);
            v2.cid = v.cid;

            if (t.s)
                v.c.s = t.s;

            v2.c = {
                s: 'body',
                c: 1
            };

            await e.handle(s, v, 'before', 'iteration');

            if (v.r)
                return v.r;

            v.r = await s.handle("<body>" + h + "</body>", t2, m, v.c, v2);

            v2.cid = v.cid;

            await e.handle(s, v2, 'after', 'iteration');

            return v.r;
        }
    }
};