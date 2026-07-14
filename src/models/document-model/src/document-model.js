/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormDocumentModel: {
        // DI
        // errorHandler
        // windowModel

        charset: 'utf-8',

        /**
         * @constructor
         * @param {string} h - HTML.
         * @param {object} v - ViewModel.
         * @param {boolean} b - Is HTML only body content.
         */
        create: function(h, v, b) {
            const r = {
                d: v.c.c
                    ? this.windowModel.document.implementation.createHTMLDocument()
                    : this.windowModel.document,

                // SECURITY: detached nodes validate URLs against the eventual page.
                root: this.windowModel.document,

                errorHandler: this.errorHandler,

                head: function() {
                    return this.d.head.innerHTML;
                },

                body: function() {
                    return this.d.body.innerHTML;
                },

                html: function() {
                    return '<!DOCTYPE html>' + this.d.documentElement.outerHTML;
                },

                select: function(s) {
                    return this.d.querySelector(s);
                },

                selectAll: function(s) {
                    return this.d.querySelectorAll(s);
                },

                getSelector: (s, m) => {
                    if (!m)
                        return s
                    ;

                    if (!s)
                        return m
                    ;

                    // String-only — selectors are NOT regexes (a `*`/`.`/`+`
                    // rule must neither throw via new RegExp nor match
                    // letter-wise, e.g. 'a' ∈ 'span'). If m already expresses
                    // the scope — iteration where s === m, or m already nested
                    // under s — use m as-is; otherwise m is a descendant to
                    // scope under s (the find case) → `s m`.
                    return (m === s || m.startsWith(s + ' '))
                        ? m
                        : s + ' ' + m
                    ;
                },

                set: async function(v, fn) {
                    const
                        // v.c.a is an ANCESTOR scope — the RESOLVED ancestor ELEMENT(S)
                        // (get{t}/ui set it; scope() matches the rule WITHIN them,
                        // descendant-first → else self). v.c.s is the find DESCENDANT,
                        // folded into the rule selector by getSelector. We DON'T compose
                        // selector strings (commas in lists / [brackets] / :is() corrupt
                        // that) — scope() runs the rule WITHIN each ancestor element via
                        // native querySelectorAll/matches. Selectorless rule (g === false)
                        // under an ancestor → the ancestor element(s) themselves.
                        //
                        // v.c.b is the iteration fragment's BODY DEFAULT (handler-wrapper):
                        // an unscoped selectorless rule (g falsy, no ancestor) targets the
                        // fragment <body>. It's a SEPARATE channel from v.c.s, so the
                        // iteration default neither folds into nor leaks out of find's
                        // descendant scope (a fetched component's selectorless rule under
                        // v.c.a stays g===false → the target itself, not a 'body' lookup),
                        // and a nested component's ancestor (v.c.a) overrides it as usual.
                        g = this.getSelector(v.t.s, v.c.s),
                        c = v.c.a ? this.scope(v.c.a, g) : this.selectAll(g || v.c.b)
                    ;

                    if (c.length)
                        for (let i = 0; i < c.length; i++)
                            await fn(c[i])
                    ;
                    else
                        this.errorHandler.handle((v.c.a && v.c.a.length ? '<' + v.c.a[0].tagName.toLowerCase() + '> ' + (g || '') : g) + ' not found', v)
                    ;
                },

                // Ancestor-scope: `a` is the RESOLVED ancestor ELEMENT(S) (an array — NOT a
                // selector string; get-method/ui resolve it). Per ancestor, match `g` WITHIN
                // it, DESCENDANT-FIRST → ELSE SELF: el.querySelectorAll(g); if none match, the
                // element ITSELF when el.matches(g) (a component re-naming its own root —
                // input.tss's `input{}` on the injected <input>). Selectorless (g === false)
                // → the element itself (short-circuit BEFORE matches, which shares qsa's CSS
                // parsing). Deduped, document order. qsa/matches let the CSS engine parse the
                // rule (commas, [brackets], :is()/:has()) — no string surgery; refs (not a
                // re-queried tag) can't leak to a same-tag sibling outside the ancestor.
                // Cross-browser: querySelectorAll/matches (universal), Array indexOf/push,
                // indexed loops — no Set/for-of/spread.
                scope: function(a, g) {
                    const out = [];

                    for (let i = 0; i < a.length; i++) {
                        // Skip a DETACHED ancestor: a fetched rule may have structurally
                        // replaced its own root (->swap/->move → replaceChild/removeChild),
                        // orphaning the snapshotted element. Don't scope into the dead node
                        // (a silent drop); drop it so a stale-only ancestor yields zero
                        // matches → set() throws LOUD (the zero-match drift detector). jTorm
                        // does not follow a scope across a root replacement (see AGENTS.md).
                        if (!a[i].isConnected)
                            continue
                        ;

                        let m = g ? a[i].querySelectorAll(g) : [a[i]];

                        if (g && !m.length)
                            m = a[i].matches(g) ? [a[i]] : []
                        ;

                        for (let j = 0; j < m.length; j++)
                            if (out.indexOf(m[j]) === -1)
                                out.push(m[j])
                        ;
                    }

                    return out;
                }
            };

            if (b)
                h = "<body>" + h + "</body>"
            ;

            if (h) {
                // A full document: setting documentElement.innerHTML drops the
                // root <html>'s own attributes (lang, class, …). Parse the
                // string and copy them across (main's "missing attributes on
                // html tag" fix, made environment-agnostic — bare document.write
                // is a no-op for this under jsdom).
                if (this.windowModel.DOMParser && /<html[\s>]/i.test(h)) {
                    const e = new this.windowModel.DOMParser()
                        .parseFromString(h, 'text/html').documentElement;

                    // Clear stale root attrs first — the live document is reused
                    // client-side, so a prior render's lang/class must not survive
                    // into one whose <html> dropped them (innerHTML doesn't reset
                    // the root element's own attributes).
                    while (r.d.documentElement.attributes.length)
                        r.d.documentElement.removeAttribute(r.d.documentElement.attributes[0].name)
                    ;

                    for (let i = 0; i < e.attributes.length; i++)
                        r.d.documentElement.setAttribute(e.attributes[i].name, e.attributes[i].value)
                    ;

                    r.d.documentElement.innerHTML = e.innerHTML;
                } else
                    r.d.documentElement.innerHTML = h
                ;
            }

            return r;
        }
    }
};
