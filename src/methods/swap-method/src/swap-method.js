/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */

module.exports = {
    jTormSwapMethod: {
        // DI
        // handler: null,
        // sanitize

        alias: 's',
        params: [
            's',// Selector
            'a',// Attributes
            'ui',// UI
            'h'// HTML
        ],

        /** @param {ViewModel} v */
        validate: function (v) {
            return !!v.d.s;
        },

        /**
         * Replace each selected element with a new `v.d.s` wrapper (optionally built from `ui`/`h`), carrying over inner HTML and attributes.
         * @param {ViewModel} v
         */
        handle: async function (v) {
            const s = this;
            let w = v.d.s ? v.d.s : v.c.s, a = v.d.a, i, done;

            await v.h.set(v, async function (el) {
                if ((v.d.ui || v.d.h) && !done) {
                    const h = v.d.h ? await s.clean(v.d.h) : '';
                    const jD2 = await s.handler.handle(h, v.d.ui ? [ { s: false, m: 'ui', p: { c: '"' + v.d.ui + '"', t: '0' }, c: [] } ]: [], {}, 1);
                    v.d.s = jD2.select(v.d.s);
                    done = 1;
                }

                if (typeof w === 'string')
                    w = v.h.d.createElement(w)
                ;

                w.innerHTML = el.innerHTML;

                if (a && el.hasAttributes()) {
                    a = el.attributes;

                    for (i = a.length - 1; i >= 0; i--)
                        if (!w.getAttribute(a[i].name))
                            w.setAttribute(a[i].name, a[i].value)
                    ;
                }

                el.parentNode.replaceChild(w, el);
            });

            v.io = {c: 1};
        },

        // Host XSS sanitizer seam (DI): swap{h} is parsed as raw HTML by the
        // handler path above. Clean lazily after the swap target exists so a
        // drifted selector throws not-found before sanitizer errors.
        clean: function (h) {
            const s = this.sanitize;

            return s ? s(h) : h;
        }
    }
};
