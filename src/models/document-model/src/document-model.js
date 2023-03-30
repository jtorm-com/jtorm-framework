/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormDocumentModel: {
        // DI
        // errorHandler: null,
        // windowModel: null,

        charset: 'utf-8',

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

                getSelector: function(s, m) {
                    if (!m)
                        return s;

                    if (s) {
                        s = s.replace(/(?=[()\[\]])/g, '\\');

                        let r = new RegExp(s, "m");

                        if (m && r.test(m))
                            s = s.replace(m, '');

                        return s
                            ? s
                            : m;
                    }

                    return m;
                },

                set: async function(v, fn) {
                    const
                        s = this.getSelector(v.t.s, v.c.s),
                        c = this.selectAll(s);

                    if (c.length)
                        for (let i = 0; i < c.length; i++)
                            await fn(c[i]);
                    else
                        this.errorHandler.handle(s + ' not found', v);
                }
            };

            if (b)
                h = "<body>" + h + "</body>";

            if (h)
                r.d.documentElement.innerHTML = h;

            return r;
        }
    }
};
