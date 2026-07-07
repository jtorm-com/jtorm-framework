/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */

module.exports = {
    jTormAttrMethod: {
        alias: 'a',
        params: [
            'n',// Name
            'v',// Value
            'm',// Method
            'ns',// No space
            'a',// Append
            'p'// Prepend
        ],
        urlAttrs: {
            cite: 1,
            href: 1,
            longdesc: 1,
            src: 1,
            srcset: 1,
            action: 1,
            formaction: 1,
            poster: 1,
            data: 1,
            'xlink:href': 1
        },

        /** @param {ViewModel} v */
        validate: function (v) {
            return !!(v.d.n && (v.d.v || v.d.m === 'r'));
        },

        /**
         * Set, append, prepend, or remove a single attribute (`v.d.n`) on each selected element via `v.h.set`.
         * @param {ViewModel} v
         */
        handle: async function (v) {
            const s = this;

            await v.h.set(v, function (e) {
                if (v.d.v) {
                    let tV = s.get(e, v.d.n);

                    if (v.d.a)
                        v.d.v += v.d.a
                    ;

                    if (v.d.p)
                        v.d.v = v.d.p + v.d.v
                    ;

                    if (v.d.m === 'p')
                        s.set(e, v.d.n, v.d.v + (v.d.ns ? tV : (tV ? ' ' + tV : '')))
                    ; else if (v.d.m === 'a')
                        s.set(e, v.d.n, (v.d.ns ? tV : (tV ? tV + ' ' : '')) + v.d.v)
                    ; else if (v.d.m === 'r') {
                        const r = String(v.d.v).trim();

                        if (tV)
                            tV = tV.split(/\s+/).filter(t => t !== r).join(' ')
                        ;

                        if (tV)
                            s.set(e, v.d.n, tV)
                        ; else
                            s.del(e, v.d.n)
                        ;
                    } else
                        s.set(e, v.d.n, v.d.v)
                    ;
                } else if (v.d.m === 'r')
                    s.del(e, v.d.n)
                ;
            });

            v.io = {c: 1};
        },

        get: function (e, n) {
            return e.getAttribute(n);
        },

        safe: function (e, n, v) {
            const a = n.trim().toLowerCase();

            if (
                /^on/.test(a)
                || (a === 'srcdoc' && (!e.hasAttribute('sandbox') || /\ballow-scripts\b/i.test(e.getAttribute('sandbox'))))
                || (a === 'sandbox' && e.hasAttribute('srcdoc') && /\ballow-scripts\b/i.test(v))
                || (
                    this.urlAttrs[a]
                    && (a === 'srcset' ? v.split(',') : [v]).some(u => /^(javascript|data|vbscript):/i.test(u.trim().replace(/[\u0000-\u0020\u007f]+/g, '')))
                )
            )
                throw new Error('Unsafe attribute ' + n)
            ;
        },

        set: function (e, n, v) {
            n = String(n);

            if (v === true)
                v = ''
            ; else
                v = String(v)
            ;

            this.safe(e, n, v);
            e.setAttribute(n, v);
        },

        del: function (e, n) {
            n = String(n);

            if (n.trim().toLowerCase() === 'sandbox' && e.hasAttribute('srcdoc'))
                throw new Error('Unsafe attribute ' + n)
            ;

            e.removeAttribute(n);
        }
    }
};
