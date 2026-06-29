/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */

module.exports = {
    jTormHandlerWrapper: {
        // DI
        // eventModel
        // handler
        // viewModel

        /**
         * Boil one iteration body into a detached fragment and return its HTML.
         * @param {*} h            html string or DOM wrapper
         * @param {*} t            TSS node whose children form the body
         * @param {*} m            model / source data for this iteration
         * @param {ViewModel} v    parent view object (scope/cache carried over)
         * @returns {Promise<string>}
         */
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
            // doc (e.g. the ancestor `.a` an each appends into → "not found"). b:'body'
            // is the fragment's BODY DEFAULT: an unscoped selectorless rule (e.g. a
            // fetched element's get{h}) targets the fragment <body>. It's a distinct
            // channel from v.c.s (kept null here) so the default never folds into / leaks
            // out of find's descendant scope, while explicit `body` rules and the body
            // itself still selectAll (BreadcrumbList's `body->append`) and a nested get/ui
            // that sets v.c.a re-scopes its own subtree (see document-model.set). Mirrors
            // the each(e:) path, which already creates with c:1. a:null is explicit: v.c.a
            // is element-refs bound to the PARENT document — never inherit them into this
            // detached fragment (a fresh doc); a nested get/ui inside re-resolves its own.
            const v2 = await s.viewModel.create(v.r ? v.r : h, t2, m, {s: null, a: null, b: 'body', c: 1}, 1);

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