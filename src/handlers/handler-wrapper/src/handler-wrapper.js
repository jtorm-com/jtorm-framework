/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormHandlerWrapper: {
        // DI
        event: null,
        handler: null,
        viewModel: null,

        handle: async function (h, t, m, v) {
            if (t.s)
                v.c.s = t.s;

            await this.event.handle(v, 'before', 'iteration');

            let k,
                t2 = t.c,
                v2;

            for (k in t2)
                t2[k].s = 'body';

            v2 = await this.viewModel.create(v.r ? v.r : h, t2, m, v.c, 1);// todo performance issue
            v2.cid = v.cid;
            v2.cs = v.cs;
            v2.c = {
                s: 'body',
                c: 1
            };

            if (!v.r)
                v.r = await this.handler.handle("<body>" + h + "</body>", t2, m, v.c, v2);

            v2.cid = v.cid;
            v2.cs = v.cs;

            await this.event.handle(v2, 'after', 'iteration');

            return v2.h.body();
        }
    }
};