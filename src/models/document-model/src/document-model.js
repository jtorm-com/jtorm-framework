/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormDocumentModel: {
        // DI
        windowModel: null,

        charset: 'utf-8',

        create: function(h, v, b) {
            const r = {
                d: v.c.c
                    ? this.windowModel.document.implementation.createHTMLDocument()
                    : this.windowModel.document,

                head: function() {
                    return this.d.head.innerHTML;
                },

                body: function() {
                    return this.d.body.innerHTML;
                },

                html: function() {
                    return this.d.documentElement.outerHTML;
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

                set: async function(sl, fn, v) {// todo sl moet v worden
                    let c, e;
                    sl = this.getSelector(sl, v ? v.c.s : null);

                    c = this.selectAll(sl);

                    if (c.length)
                        for (e of c)
                            await fn(e);
                    else {
                        console.error(sl + ' not found', s.html());
                        throw new Error();
                    }
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
