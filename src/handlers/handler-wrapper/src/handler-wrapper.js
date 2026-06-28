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

            // Rewrite each direct child selectorless: under the v.c.a='body' ancestor
            // (set on the iteration context below) a selectorless rule resolves to the
            // fragment's own <body> via document-model.scope.
            for (let k in t2)
                t2[k].s = false
            ;

            // The iteration body builds a DETACHED fragment that the caller (each's
            // append / insert / wrap) then re-inserts into the parent doc. Scope it via
            // the ANCESTOR channel (v.c.a), NOT the descendant channel (v.c.s):
            //  - {c:1} AT create time so documentModel.create makes a fresh detached doc
            //    (it reads v.c.c); set only afterwards (the old `v2.c = …`) the fragment
            //    stayed bound to the live document in client/live mode and its <body>
            //    reset WIPED it — destroying the ancestor an each then appends into
            //    ("`.a` not found").
            //  - a:'body' (with the children rewritten selectorless above) scopes the
            //    fragment's rules to its <body>. A nested get/ui OVERRIDES v.c.a with
            //    its own target (e.g. 'span'), so its rules scope there and the handler
            //    restores 'body' after. Using v.c.s here instead would leak 'body' as a
            //    find-descendant into those nested component subtrees, turning their
            //    selectorless rules into 'body' lookups under the component ancestor
            //    ("span body not found"). Mirrors the each(e:) path (creates with c:1).
            const v2 = await s.viewModel.create(v.r ? v.r : h, t2, m, {a: 'body', c: 1}, 1);

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