/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */
/** @typedef {import('@jtorm/types').MethodEffect} MethodEffect */

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
         * @returns {Promise<MethodEffect>}
         */
        handle: async function (v) {
            const s = this, d = v.h.root;

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
                        s.set(e, v.d.n, v.d.v + (v.d.ns ? tV : (tV ? ' ' + tV : '')), d)
                    ; else if (v.d.m === 'a')
                        s.set(e, v.d.n, (v.d.ns ? tV : (tV ? tV + ' ' : '')) + v.d.v, d)
                    ; else if (v.d.m === 'r') {
                        const r = String(v.d.v).trim();

                        if (tV)
                            tV = tV.split(/\s+/).filter(t => t !== r).join(' ')
                        ;

                        if (tV)
                            s.set(e, v.d.n, tV, d)
                        ; else
                            s.del(e, v.d.n)
                        ;
                    } else
                        s.set(e, v.d.n, v.d.v, d)
                    ;
                } else if (v.d.m === 'r')
                    s.del(e, v.d.n)
                ;
            });

            return {children: true};
        },

        get: function (e, n) {
            return e.getAttribute(n);
        },

        // SECURITY: explicit color micro-grammar, not general CSS sanitization.
        style: function (v) {
            let d = v.split(';');

            if (!d[d.length - 1].trim())
                d.pop()
            ;

            return !v.trim() || !!(
                d.length
                && d.every(p => /^\s*(?:background-color|color)\s*:\s*(?:#[\da-f]{3}|#[\da-f]{4}|#[\da-f]{6}|#[\da-f]{8}|transparent|currentcolor)\s*$/i.test(p))
            );
        },

        // SECURITY: resolve and pin every target against the live HTTP(S) document.
        ping: function (e, v, d) {
            let a = [],
                b,
                u
            ;

            d = d || e.ownerDocument;

            try {
                b = d.baseURI;
                d = new URL(d.URL);
            } catch (e) {
                return false;
            }

            if (!/^https?:$/.test(d.protocol))
                return false
            ;

            for (let p of v.trim().split(/\s+/).filter(Boolean)) {
                try { u = new URL(p, b); } catch (e) { return false; }

                if (!/^https?:$/.test(u.protocol) || u.origin !== d.origin)
                    return false
                ;

                a.push(u.href);
            }

            return a;
        },

        safe: function (e, n, v, d) {
            const a = n.trim().toLowerCase();
            let p;

            if (a === 'ping')
                p = this.ping(e, v, d)
            ;

            if (
                /^on/.test(a)
                || (a === 'style' && !this.style(v))
                || (a === 'ping' && !p)
                || (a === 'srcdoc' && (!e.hasAttribute('sandbox') || /\ballow-scripts\b/i.test(e.getAttribute('sandbox'))))
                || (a === 'sandbox' && e.hasAttribute('srcdoc') && /\ballow-scripts\b/i.test(v))
                || (
                    this.urlAttrs[a]
                    && (a === 'srcset' ? v.split(',') : [v]).some(u => /^(javascript|data|vbscript):/i.test(u.trim().replace(/[\u0000-\u0020\u007f]+/g, '')))
                )
            )
                throw new Error('Unsafe attribute ' + n)
            ;

            return p;
        },

        set: function (e, n, v, d) {
            n = String(n);

            if (v === true)
                v = ''
            ; else
                v = String(v)
            ;

            const p = this.safe(e, n, v, d);

            if (p)
                v = p.join(' ')
            ;

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
