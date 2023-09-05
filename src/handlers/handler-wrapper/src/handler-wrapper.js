/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormHandlerWrapper: {
        // DI
        // eventModel: null,
        // handler: null,
        // viewModel: null,

        handle: async function (h, t, m, v) {
            const
                t2 = t.c,
                s = this,
                e = s.eventModel;

            if (t.s)
                v.c.s = t.s;

            await e.handle(v, 'before', 'iteration');

            for (let k in t2)
                t2[k].s = 'body';

            const v2 = await s.viewModel.create(v.r ? v.r : h, t2, m, v.c, 1);

            v2.cid = v.cid;
            v2.cs = v.cs;
            v2.c = {
                s: 'body',
                c: 1
            };

            if (!v.r)
                v.r = await s.handler.handle(null, null, null, null, v2);

            v2.cid = v.cid;
            v2.cs = v.cs;

            await e.handle(v2, 'after', 'iteration');

            return v2.h.body();
        }
    }
};