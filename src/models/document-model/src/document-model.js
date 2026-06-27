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
                        // v.c.a is an ANCESTOR scope prepended to every selector in the
                        // subtree (get{t}/ui component scoping); v.c.s is the find
                        // DESCENDANT, appended by getSelector. Opposite roles. getSelector
                        // returns false for a selectorless rule (s:false, e.g. a component's
                        // bare `->attr`); under an ancestor that collapses to the ancestor
                        // itself (the get/ui target) so the transform lands on the target,
                        // not an invalid `.a false`.
                        g = this.getSelector(v.t.s, v.c.s),
                        s = v.c.a ? (g ? v.c.a + ' ' + g : v.c.a) : g,
                        c = this.selectAll(s)
                    ;

                    if (c.length)
                        for (let i = 0; i < c.length; i++)
                            await fn(c[i])
                    ;
                    else
                        this.errorHandler.handle(s + ' not found', v)
                    ;
                }
            };

            if (b)
                h = "<body>" + h + "</body>"
            ;

            if (h)
                r.d.documentElement.innerHTML = h
            ;

            return r;
        }
    }
};
