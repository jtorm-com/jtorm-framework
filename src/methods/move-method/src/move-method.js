/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */
/** @typedef {import('@jtorm/types').MethodEffect} MethodEffect */

module.exports = {
    jTormMoveMethod: {
        // DI
        // handler
        // viewModel

        alias: 'm',
        params: [
            'l',// Location
            'm',// Method
            'k'// Keep element / create copy
        ],

        /** @param {ViewModel} v */
        validate: function (v) {
            return (v.t.s && v.d.l && v.d.m);
        },

        /**
         * Move (or copy, when `v.d.k`) each selected element to `v.d.l` via the chosen method.
         * @param {ViewModel} v
         * @returns {Promise<MethodEffect>}
         */
        handle: async function (v) {
            const s = this;

            await v.h.set(v, async function (e) {
                const sv = s.viewModel.copy(v);

                sv.t = {s: v.d.l, m: v.d.m, c: [], p: {}};

                if (!parseInt(v.d.k))
                    e.parentElement.removeChild(e)
                ;

                await s.handler.dispatch(sv, {h: e.outerHTML});
            });

            return {children: false};
        }
    }
};
