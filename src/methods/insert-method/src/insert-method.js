/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormInsertMethod: {
        // DI
        handler: null,
        handlerWrapper: null,

        alias: 'i',
        params: [
            'h',// html
            'p',// html prefix
            's',// html suffix
            'd',// data
            'm',// method
            'cid',// cache id
            'cs'// cache scope
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

            if (v.d.h) {
                if (v.d.p)
                    v.d.h = v.d.p + v.d.h;
                if (v.d.s)
                    v.d.h += v.d.s;

                await this.process(v.h, v.d.h, null, v.d.m, v);

                v.d.m = 'r';
            }

            if (v.d.d === null)
                c = 0;
            else if (
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

                    await this.process(v.h, h, null, v.d.m, v);

                    c = 0;
                } else {
                    console.error(v.h.html());
                    throw new Error('Invalid select ' + v.t.s);
                }
            }

            v.cid = null;
            v.cs = null;

            v.io = {c: c};
        },

        process: async function (h, h2, s, m, v) {
            await h.set(v, async e => {
                const o = v._.isObject(h2);

                if (m === 'r') {
                    // todo test this properly
                    if (!o)
                        h2 = await j.handle(h2, [], {});

                    e.parentNode.replaceChild(h2.select(h2.getSelector(s, v.c.s)), e);
                } else {
                    const c = o
                        ? h2.select('body').innerHTML
                        : h2;

                    if (m === 'i')
                        e.innerHTML = c;
                    else
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
                        );
                }
            });
        }
    }
};
