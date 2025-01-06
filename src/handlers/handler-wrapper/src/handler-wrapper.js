/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormHandlerWrapper: {
        // DI
        // eventModel
        // handler
        // viewModel

        handle: async function (h, t, m, v) {
            const
                t2 = t.c,
                s = this,
                e = s.eventModel
            ;

            for (let k in t2)
                t2[k].s = 'body'
            ;

            if (t.s)
                v.c.s = t.s
            ;

            await e.handle(v, 'before', 'iteration');

            if (v.r)// if cache set, then disable saving cache since it already is saved
                v.cid = 0
            ; else
                v.r = await s.handler.handle(v.r ? v.r : h, t2, m, 1)
            ;

            await e.handle(v, 'after', 'iteration');

            return v.r.body();
        }
    }
};