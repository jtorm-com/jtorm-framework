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
                e = s.eventModel;

            if (t.s)
                v.c.s = t.s;

            await e.handle(v, 'before', 'iteration');

            for (let k in t2)
                t2[k].s = 'body'
            ;

            // The iteration body builds a DETACHED fragment that the caller (each's
            // append / insert / wrap) then re-inserts into the parent doc. Pass the
            // fresh-doc context {c:1} AT create time, not after: documentModel.create
            // reads v.c.c to choose fresh-detached vs. the live document, so setting
            // {c:1} only afterwards (the old `v2.c = …`) left the fragment bound to the
            // live document in client/live mode — its <body> reset then WIPED the live
            // doc (e.g. the ancestor `.a` an each appends into → "not found"). s:'body'
            // scopes the fragment's rules to its body via selectAll, so an explicit
            // `body` rule AND the body element itself both match (BreadcrumbList's
            // `body->append`); a nested get/ui that sets v.c.a re-scopes its own subtree
            // and does NOT inherit this 'body' (see document-model.set). Mirrors the
            // each(e:) path, which already creates with c:1.
            const v2 = await s.viewModel.create(v.r ? v.r : h, t2, m, {s: 'body', c: 1}, 1);

            v2.cid = v.cid;
            v2.cs = v.cs;

            if (!v.r)
                v.r = await s.handler.handle(null, null, null, null, v2)
            ;

            v2.cid = v.cid;
            v2.cs = v.cs;

            await e.handle(v2, 'after', 'iteration');

            return v2.h.body();
        }
    }
};