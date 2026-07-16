/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */
/** @typedef {import('@jtorm/types').MethodEffect} MethodEffect */
/** @typedef {import('@jtorm/types').ViewEffect} ViewEffect */

const MAX_REPEAT = 100;
const OWN = Object.prototype.hasOwnProperty;

/**
 * Normalize one method's partial intent, reading each own field once.
 * @param {MethodEffect|void} e
 * @param {boolean} children
 * @returns {ViewEffect}
 */
function effect(e, children) {
    let c, r, d;
    e = e && typeof e === 'object' ? e : {};
    c = OWN.call(e, 'children') ? e.children : undefined;
    r = OWN.call(e, 'repeat') ? e.repeat : undefined;
    d = OWN.call(e, 'data') ? e.data : undefined;

    return {
        children: typeof c === 'boolean' ? c : children,
        repeat: typeof r === 'boolean' ? r : false,
        data: d
    };
}

module.exports = {
    jTormHandler: {
        // DI
        // dataParser
        // eventModel
        // methods[]
        // viewModel

        /**
         * Execute one normal, aliased, or synthesized method through the same
         * data/validate/event lifecycle and return a complete safe effect.
         * @param {ViewModel} v
         * @param {*} [d] prepared method data
         * @returns {Promise<ViewEffect>}
         */
        dispatch: async function(v, d) {
            let e = this.eventModel,
                ms = this.methods,
                prepared = arguments.length > 1,
                r,
                k,
                x,
                valid,
                n = 0
            ;

            do {
                r = 0;

                if (
                    v.t.m
                    && Object.prototype.hasOwnProperty.call(ms, v.t.m)
                )
                    r = ms[v.t.m]
                ; else {
                    for (k in ms) {
                        if (
                            Object.prototype.hasOwnProperty.call(ms, k)
                            && ms[k].alias === v.t.m
                        ) {
                            r = ms[k];
                            break;
                        }
                    }
                }

                if (v.t.m && !r)
                    throw new Error('Unknown method ' + v.t.m)
                ;

                if (!r)
                    return effect(undefined, true)
                ;

                if (prepared)
                    v.d = d
                ;

                x = undefined;
                if (v._.isFunction(r.data))
                    x = prepared ? await r.data(v, d) : await r.data(v)
                ; else if (!prepared)
                    this.dataParser.handle(v, r.params)
                ;

                prepared = false;
                valid = await r.validate(v);

                await e.handle(v, 'before', 'method');

                if (valid && v._.isFunction(r.handle))
                    x = await r.handle(v)
                ; else if (!valid)
                    x = undefined
                ;

                await e.handle(v, 'after', 'method');

                x = effect(x, !r.gate);
                n++;
                if (x.repeat && n >= MAX_REPEAT)
                    throw new Error('Method ' + v.t.m + ' repeat limit exceeded')
                ;
            } while (x.repeat);

            return x;
        },

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
            let k;

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
                    const x = await this.dispatch(v);

                    if (x.children && v.t.c.length)
                        await this.handle(v.h, v.t.c, x.data === undefined ? v.m : x.data, v.c)
                    ;
                } finally {
                    oc.s = cs;
                    oc.a = ca;
                    v.c = oc;
                }
            }

            return v.h;
        }
    }
};
