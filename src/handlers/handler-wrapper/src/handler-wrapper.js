/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormHandlerWrapper: {
        // DI
        event: null,
        handler: null,
        viewModel: null,

        handle: async function (h, t, m, v) {
            let k,
                t2 = t.c,
                v2;

            for (k in t2)
                t2[k].s = 'body';

            v2 = await this.viewModel.create(h, t2, m, v.c, 1);// todo s.handler moet weg
            v2.cid = v.cid;

            if (t.s)
                v.c.s = t.s;

            v2.c = {
                s: 'body',
                c: 1
            };

            await this.event.handle(v, 'before', 'iteration');

            if (v.r)
                return v.r;

            v.r = await this.handler.handle("<body>" + h + "</body>", t2, m, v.c, v2);

            v2.cid = v.cid;
            v2.cs = v.cs;

            await this.event.handle(v2, 'after', 'iteration');

            return v.r.body();
        }
    }
};