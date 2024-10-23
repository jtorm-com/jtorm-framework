/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormInsertMethod: {
        // DI
        // errorHandler
        // handlerWrapper
        // viewModel

        alias: 'i',
        params: [
            'h',// Html
            'p',// Html prefix
            's',// Html suffix
            'd',// Data
            'm',// Method
            'l',// Cache language
            'cid',// Cache id
            'cs'// Cache scope
        ],

        validate: function (v) {
            return (
                (v.d.h || v.t.c.length)
                && (v.d.m || this.m)
            );
        },

        handle: async function (v) {
            let e, h, c = 1;

            v.cid = v.d.cid;
            v.cs = v.d.cs;
            v.l = v.d.l;

            if (v.d.h) {
                if (v.d.p)
                    v.d.h = v.d.p + v.d.h
                ;

                if (v.d.s)
                    v.d.h += v.d.s
                ;

                await this.process(v.h, v.d.h, v.d.m, v);
            } else if (v.d.d === null)
                c = 0
            ; else if (
                (v.d.d === undefined || v.d.d)
                && v.t.c.length > 0
            ) {
                e = v.h.select(
                    v.t.s
                        ? v.t.s
                        : 'body'
                );

                if (e) {
                    h = await this.handlerWrapper.handle('', v.t, v.d.d ? v.d.d : v.m, v);

                    v.r = null;

                    await this.process(v.h, h, v.d.m, v);

                    c = 0;
                } else
                    this.errorHandler.handle(v.t.s + ' not found', v)
                ;
            }

            v.cid = v.cs = v.l = null;

            v.io = {c: c};
        },

        process: async function (h, h2, m, v) {
            await h.set(v, async e => {
                const o = v._.isObject(h2);

                if (m === 'r') {
                    if (!o)
                        h2 = await this.viewModel.create(h2)
                    ;

                    e.parentNode.replaceChild(h2.h.select(h2.h.getSelector(v.d.s, v.c.s)), e);
                } else {
                    const c = o
                        ? h2.select('body').innerHTML
                        : h2
                    ;

                    if (m === 'i')
                        e.innerHTML = c
                    ; else
                        e.insertAdjacentHTML(
                            m === 'b'
                                ? 'beforebegin'
                                : m === 'p'
                                    ? 'afterbegin'
                                    : m === 'a'
                                        ? 'beforeend'
                                        : m === 'af'
                                            ? 'afterend'
                                            : m,
                            c
                        )
                    ;
                }
            });
        }
    }
};
