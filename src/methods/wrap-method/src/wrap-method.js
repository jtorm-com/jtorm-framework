/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('../../../../types.js').ViewModel} ViewModel */

module.exports = {
    jTormWrapMethod: {
        // DI
        // handlerWrapper

        alias: 'w',
        params: ['s', 'h', 'd'],

        /** @param {ViewModel} v */
        validate: function (v) {
            return (v.d.s && (v.d.h || v.t.c.length > 0));
        },

        /**
         * Wrap each element selected by `v.t.s` in the `v.d.s` element, filled from `v.d.h` or boiled children.
         * @param {ViewModel} v
         */
        handle: async function (v) {
            const s = this;

            if (v.d.h)
                await s.process(v.h, v.t.s, v.d.s, v.d.h, v.d, v)
            ;

            if (v.t.c.length > 0) {
                let h = await s.handlerWrapper.handle(v.h, v.t, v.d, v);
                await s.process(v.h, v.t.s, v.d.s, h, v.d, v);
            }

            v.io = {};
        },

        process: async function (jD, s, w, h, d, v) {
            await jD.set({t: {s: s}, c: v.c}, async function (el) {
                const tH = el.innerHTML;
                el.innerHTML = h;

                await jD.set({t: {s: w}, c: v.c}, function (el2) {
                    el2.innerHTML = tH;
                });
            });
        }
    }
};
