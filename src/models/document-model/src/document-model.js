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
                        // v.c.a is an ANCESTOR scope (get{t}/ui component scoping); v.c.s
                        // is the find DESCENDANT, folded into the rule selector by
                        // getSelector. Under an ancestor we DON'T compose selector strings
                        // (commas in lists / [brackets] / :is() corrupt that) — we select
                        // the target(s) and run the rule WITHIN each via native
                        // querySelectorAll, which parses CSS correctly. Selectorless rule
                        // (g === false) → the target itself.
                        g = this.getSelector(v.t.s, v.c.s),
                        c = v.c.a ? this.scope(v.c.a, g) : this.selectAll(g)
                    ;

                    if (c.length)
                        for (let i = 0; i < c.length; i++)
                            await fn(c[i])
                    ;
                    else
                        this.errorHandler.handle((v.c.a ? v.c.a + ' ' + (g || '') : g) + ' not found', v)
                    ;
                },

                // Ancestor-scope: rule matches WITHIN each target element, deduped, in
                // document order. el.querySelectorAll lets the CSS engine parse the rule
                // (commas, [brackets], quotes, :is()/:has()) — no selector-string surgery.
                // Cross-browser by design: querySelectorAll (universal), Array indexOf/push,
                // indexed loops — no Set/for-of/spread. g === false (selectorless) → target.
                scope: function(a, g) {
                    const out = [], anc = this.d.querySelectorAll(a);

                    for (let i = 0; i < anc.length; i++) {
                        const m = g ? anc[i].querySelectorAll(g) : [anc[i]];

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
