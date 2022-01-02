/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';
module.exports = {
    jTormWrapMethod: {
        alias: 'w',
        params: ['s', 'h', 'd'],
        validate: function (j, v) {
            return (v.d.s && (v.d.h || v.t.c.length > 0));
        },
        handle: async function (j, v) {
            if (v.d.h)
                await this.process(v.h, v.t.s, v.d.s, v.d.h, v.d, v);

            if (v.t.c.length > 0) {
                let h = await j.handleChildren(v.h, v.t, v.d, v);
                await this.process(v.h, v.t.s, v.d.s, h.body(), v.d, v);
            }

            v.io = {};
        },
        process: async function (jD, s, w, h, d, v) {
            await jD.set(s, async function (el) {
                var tH = el.innerHTML;
                el.innerHTML = h;
                await jD.set(w, function (el2) {
                    el2.innerHTML = tH;
                }, v);
            }, v);
        }
    }
};