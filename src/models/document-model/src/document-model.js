/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormDocumentModel: class {

        constructor(j, h, v) {
            var s = this;
            s.charset = 'utf-8';// todo config

            s.w = j.context.models.window;
            if (v.c.c)
                s.d = s.w.document.implementation.createHTMLDocument();
            else
                s.d = s.w.document;

            if (h)
                s.d.documentElement.innerHTML = h;
        }

        getSelector (s, m) {
            if (!m) return s;

            if (s) {
                s = s.replace(/(?=[()\[\]])/g, '\\');

                var r = new RegExp(s, "m");
                if (m && r.test(m)) {
                    s = s.replace(m, '');
                }

                return s ? s : m;
            }

            return m;
        }

        async set(sl, fn, v) {// todo sl moet v worden
            var s = this, c, e;
            sl = s.getSelector(sl, v ? v.c.s : null);

            c = s.selectAll(sl);

            if (c.length)
                for (e of c)
                    await fn(e);
            else {
                console.error(sl + ' not found', s.html());
                throw new Error();
            }
        }

        select(selector) {
            return this.d.querySelector(selector);
        }

        selectAll(selector) {
            return this.d.querySelectorAll(selector);
        }

        async xhr(j, req) {
            var r, xhr,
                l = this.w.location;

            req.url = j.context.methods.ui.parseUrl(req.url);

            if (/^http/.test(req.url) === false)
                req.url = l.protocol + '//' + l.host + '/' + req.url;

            xhr = await j.context.models.axios.request(req);

            r = {
                t: xhr.headers["cache-control"],
                d: xhr.data
            };

            return r;
        }

        head() {
            return this.d.head.innerHTML;
        }

        body() {
            return this.d.body.innerHTML;
        }

        html() {
            return this.d.documentElement.outerHTML;
        }

        async request (j, url, h, m, c) {
            return await this.xhr(j, {
                method: m ? m : "GET",
                url: url,
                headers: {
                    "Content-Type": h + '; charset=' + (c ? c : this.charset)
                }
            });
        }
    }
};