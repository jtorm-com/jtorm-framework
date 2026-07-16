/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */
/** @typedef {import('@jtorm/types').MethodEffect} MethodEffect */

module.exports = {
    jTormEachMethod: {
        // DI
        // handler
        // handlerWrapper
        // viewModel

        defaultMethod: 'append',
        alias: 'e',
        params: [
            'a',// As reference
            'd',// Data
            'e',// Element
            'm' // Method
        ],

        /** @param {ViewModel} v */
        validate: function (v) {
            return (
                (
                    v.d.d
                    || v.m
                )
                && v.t.c.length
            );
        },

        /**
         * Iterate `v.d.d` (or `v.m`), boil `v.t.c` per item, and apply the collected fragment via the chosen insert method (default append).
         * @param {ViewModel} v
         * @returns {Promise<MethodEffect>}
         */
        handle: async function (v) {
            const s = this;
            let r = '', d, k, h, sv, i = 0, e, pc = v.c && typeof v.c === 'object' ? v.c : null, l = pc && pc.locale, c;

            if (!v.d.d)
                v.d.d = v.m
            ;

            if (!Array.isArray(v.d.d))
                v.d.d = [v.d.d]
            ;

            if (v.d.e) {
                e = v.h.selectAll(v.d.e);
                v.c = 1;
            }

            for (k in v.d.d) {
                if (['isLoop', 'index'].indexOf(k) !== -1)
                    continue
                ;

                d = {};

                if (v.d.a)
                    d[v.d.a] = v.d.d[k]
                ; else
                    d = v.d.d[k]
                ;

                if (typeof d !== 'object')
                    d = [d]
                ;

                d.isLoop = 1;
                d.index = k;

                if (v.t.p.e && e.length) {
                    if (e[i])
                        h = e[i].outerHTML
                    ; else
                        h = e[0].outerHTML
                    ;

                    c = {c: 1, s: null, a: null};

                    if (pc)
                        c.p = pc
                    ;

                    if (l != null)
                        c.locale = l
                    ;

                    h = await s.handler.handle(
                        '<body>' + h + '</body>',
                        v.t.c,
                        d,
                        c
                    );

                    if (e[i])
                        e[i].parentNode.replaceChild(h.select(v.d.e ?? v.t.s), e[i])
                    ;

                    r += h.body();
                } else {
                    h = await s.handlerWrapper.handle("", v.t, d, v);
                    r += h;
                }

                v.r = null;

                i++;
            }

            if (!v.d.m)
                v.d.m = s.defaultMethod
            ;

            sv = s.viewModel.copy(v);
            sv.t = {s: v.t.s, m: v.d.m, p: {}, c: []};
            await s.handler.dispatch(sv, {h: r});

            return {children: false};
        }
    }
};
