/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */

module.exports = {
    jTormWrapMethod: {
        // DI
        // handlerWrapper
        // sanitize

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
            const z = this;
            let c, done;

            await jD.set({t: {s: s}, c: v.c}, async function (el) {
                if (!done) {
                    c = await z.clean(h);
                    done = 1;
                }

                const tH = el.innerHTML;
                el.innerHTML = c;

                await jD.set({t: {s: w}, c: v.c}, function (el2) {
                    el2.innerHTML = tH;
                });
            });
        },

        // Host XSS sanitizer seam (DI): raw wrap{h} markup is parsed through
        // innerHTML, so an injected sanitizer must see it before it becomes DOM.
        // Invoked lazily from process() after target resolution so zero-match drift
        // errors win and a sanitizer rejection cannot leave a partial write.
        clean: function (h) {
            const s = this.sanitize;

            return s ? s(h) : h;
        }
    }
};
