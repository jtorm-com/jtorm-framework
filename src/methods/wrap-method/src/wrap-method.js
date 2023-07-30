/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormWrapMethod: {
        // DI
        // handlerWrapper: null,

        alias: 'w',
        params: ['s', 'h', 'd'],

        validate: function (v) {
            return (v.d.s && (v.d.h || v.t.c.length > 0));
        },

        handle: async function (v) {
            const s = this;

            if (v.d.h)
                await s.process(v.h, v.t.s, v.d.s, v.d.h, v.d, v);

            if (v.t.c.length > 0) {
                let h = await s.handlerWrapper.handle(v.h, v.t, v.d, v);
                await s.process(v.h, v.t.s, v.d.s, h, v.d, v);
            }

            v.io = {};
        },

        process: async function (jD, s, w, h, d, v) {
            await jD.set(s, async function (el) {
                const tH = el.innerHTML;
                el.innerHTML = h;

                await jD.set(w, function (el2) {
                    el2.innerHTML = tH;
                }, v);
            }, v);
        }
    }
};
