/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormSwapMethod: {
        // DI
        // handler: null,

        alias: 's',
        params: ['s', 'a', 'ui', 'h'],

        validate: function (v) {
            return !!v.d.s;
        },

        handle: async function (v) {
            let w = v.d.s ? v.d.s : v.c.s, a = v.d.a, i;

            if (v.d.ui || v.d.h) {
                const jD2 = await this.handler.handle(v.d.h ? v.d.h : '', v.d.ui ? [ { s: false, m: 'ui', p: { c: '"' + v.d.ui + '"', t: '0' }, c: [] } ]: [], {}, 1);
                v.d.s = jD2.select(v.d.s);
            }

            await v.h.set(v, function (el) {
                if (typeof w === 'string')
                    w = v.h.d.createElement(w);

                w.innerHTML = el.innerHTML;

                if (a && el.hasAttributes()) {
                    a = el.attributes;

                    for (i = a.length - 1; i >= 0; i--)
                        if (!w.getAttribute(a[i].name))
                            w.setAttribute(a[i].name, a[i].value);
                }

                el.parentNode.replaceChild(w, el);
            });

            v.io = {c: 1};
        }
    }
};
