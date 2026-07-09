/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */

module.exports = {
    jTormGetMethod: {
        // DI
        // models[],
        // sanitize

        params: ['h', 't', 'd', 'a'],

        /** @param {ViewModel} v */
        validate: function (v) {
            return !!(v.d.h || v.d.t || v.d.d);
        },

        get: async function(t, u, c) {
            let r = await this.models[t].get(u, c);

            return r; // raw model result (data: JSON, html: text, tss: parsed tree)
        },

        /**
         * Fetch data/html/tss models (`v.d.d`/`v.d.h`/`v.d.t`) and merge them into the model, the DOM, or the `v.t` subtree (setting ancestor scope `v.c.a`).
         * @param {ViewModel} v
         */
        async handle(v) {
            let r, k, nD, nT;

            if (v.d.d) {
                nD = {...v.m};

                r = await this.get('data', v.d.d, v.c);

                if (v.d.a)
                    v._.set(nD, v.d.a, r)
                ; else
                    nD = {...nD, ...r}
                ;
            }

            if (v.d.h) {
                r = await this.get('html', v.d.h, v.c);

                // RAW fetched-body sink → host XSS sanitizer seam (DI, DOMPurify-shaped,
                // sync/async; default null → PASSTHROUGH — the fragment is author-trusted
                // today). Sanitize LAZILY inside the set callback, once, on the first
                // matched element, so v.h.set() throws the zero-match drift error
                // ("<sel> not found") BEFORE the sanitizer runs — a drifted selector must
                // surface as drift, not a sanitizer error (mirrors insert-method's
                // clean()). Local `s` (not this.sanitize): see insert-method clean() for
                // the seam contract + this-binding note.
                const s = this.sanitize;
                let done;

                await v.h.set(v, async function (el) {
                    if (s && !done) {
                        r = await s(r);
                        done = 1;
                    }

                    el.innerHTML = r;
                });
            }

            if (v.d.t) {
                nT = {
                    s: false,
                    c: []
                };

                r = await this.get('tss', v.d.t, v.c);

                // Ancestor-scope: fetched rules boil UNDER the get target, not
                // document-global. Resolve the get target `v.t.s` to its actual
                // ELEMENT(S) and store them in v.c.a — NOT the tag string: a string is
                // re-queried document-wide, so a nested same-tag get then scopes `tag`
                // under `tag` (an element inside itself → ∅ → "input input not found"),
                // and it can leak to same-tag siblings. document-model.scope matches each
                // fetched rule WITHIN these elements (descendant-first → else self), so
                // input.tss's `input{}` lands on the injected <input> and selectorless
                // rules on the element itself; `ui` injection rides the same seam
                // (ui-method builds {s: target, m: 'get'}). Resolve WITHIN the current
                // ancestor when nested (reuse scope → comma-lists stay correct), else
                // selectAll — AFTER the v.d.h innerHTML write above so the injected
                // element exists. v.c.a is an element-ref ARRAY shared by-ref through
                // view-model.copy: always REPLACED here, never mutated in place; the
                // handler restores it after this subtree (no sibling leak).
                if (v.t.s)
                    v.c.a = v.c.a
                        ? v.h.scope(v.c.a, v.t.s)
                        : Array.prototype.slice.call(v.h.selectAll(v.t.s))
                ;

                for (k in r)
                    nT.c.push(r[k])
                ;

                for (k in v.t.c)
                    nT.c.push(v.t.c[k])
                ;

                v.t = nT;
            }

            v.io = {c: 1, d: nD};
        }
    }
};
