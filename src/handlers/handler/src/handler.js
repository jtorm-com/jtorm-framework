/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */

module.exports = {
    jTormHandler: {
        // DI
        // dataParser
        // eventModel
        // methods[]
        // viewModel

        /**
         * The method loop: build or receive `v`, resolve each TSS node’s verb,
         * run its data/validate/handle, then recurse into the node’s children
         * within the rule’s lexical scope (`v.c.s`/`v.c.a` captured + restored).
         * @param {*} h            html string or DOM wrapper
         * @param {*} t            TSS string or parsed tree
         * @param {*} m            model / source data
         * @param {*} c            create-doc flag or context object
         * @param {ViewModel} [v]  pre-built view object (created from h/t/m/c when absent)
         * @returns {Promise<*>}   the resulting DOM wrapper (`v.h`)
         */
        handle: async function (h, t, m, c, v) {
            let e = this.eventModel,
                ms = this.methods,
                r,
                k,
                k2
            ;

            if (!v)
                v = await this.viewModel.create(h, t, m, c)
            ;

            for (k in v.tss) {
                v.t = v.tss[k];

                // Scope (v.c.s find-descendant, v.c.a get/ui-ancestor) is lexical to
                // this rule's subtree. v.c is a shared/by-ref context, so capture and
                // restore it after the children boil — otherwise a scope set here
                // leaks to the following sibling rules (e.g. find's `v.c.s` collapsing
                // a later `i->attr` to `i b → not found`). Capture the object too:
                // some methods REPLACE v.c (each-method sets `v.c = 1` for its `e:`
                // path), so reset the captured object's fields and reinstate the ref
                // rather than writing onto a non-object (strict-mode TypeError). The
                // restore is a try/finally so it ALWAYS runs: a mid-render throw (e.g. a
                // zero-match drift in a fetched child) must not leave the shared context
                // mutated, or the leaked scope poisons the NEXT render on this worker
                // (per-request isolation — code-review #9 / backlog P0.2).
                const oc = v.c, cs = v.c.s, ca = v.c.a;

                try {
                    do {
                        r = 0;

                        if (
                            v.t.m
                            && Object.prototype.hasOwnProperty.call(ms, v.t.m)
                        )
                            r = ms[v.t.m]
                        ; else {
                            for (k2 in ms) {
                                if (
                                    Object.prototype.hasOwnProperty.call(ms, k2)
                                    && ms[k2].alias === v.t.m
                                ) {
                                    r = ms[k2];
                                    break;
                                }
                            }
                        }

                        if (v.t.m && !r)
                            throw new Error('Unknown method ' + v.t.m)
                        ;

                        if (r) {
                            if (v._.isFunction(r.data))
                                await r.data(v)
                            ; else
                                this.dataParser.handle(v, r.params)
                            ;

                            v.io.v = await r.validate(v);

                            await e.handle(v, 'before', 'method');

                            if (v.io.v && v._.isFunction(r.handle))
                                await r.handle(v)
                            ; else {
                                // No handle ran: either validate MISSED, or the verb is a pure
                                // data/scope binder (validate-pass + no handle, e.g. `data`) that
                                // already set its own v.io.c. Only on a MISS does the handler decide
                                // child handling — set v.io.c explicitly rather than inherit the
                                // previous sibling's stale flag: a gate verb fails CLOSED (skip
                                // children), any other verb is a pass-through and still renders them.
                                v.io.r = 0;
                                if (!v.io.v)
                                    v.io.c = r.gate ? 0 : 1;
                            }

                            await e.handle(v, 'after', 'method');
                        } else {
                            v.io.r = 0;
                            v.io.c = 1;
                        }
                    } while (v.io.r);

                    if (v.io.c && v.t.c.length)
                        await this.handle(v.h, v.t.c, v.io.d ? v.io.d : v.m, v.c)
                    ;
                } finally {
                    v.io.d = null;
                    oc.s = cs;
                    oc.a = ca;
                    v.c = oc;
                }
            }

            return v.h;
        }
    }
};
