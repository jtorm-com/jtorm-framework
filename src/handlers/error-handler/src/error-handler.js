/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('../../../../types.js').ViewModel} ViewModel */

module.exports = {
    jTormErrorHandler: {
        // DI
        // util

        /**
         * Dump every populated `v` field for debugging, then throw `e` — the
         * upgrade-safe drift detector for zero-match transform verbs.
         * @param {string} e       error message to throw
         * @param {ViewModel} v    view object whose fields are logged
         */
        handle: function (e, v) {
            for (let k in v) {
                if (
                    !v[k]
                    || k === '_'
                    || k === 'm'
                ) continue;

                console.log('');
                console.log('---- Param: ' + k + ' ----');
                if (k === 'html' || k === 'h' || k === 'r')
                    console.log(v[k].html());
                else
                    console.log(this.util.inspect(v[k], false, 10, true /* enable colors */));

                console.log('');
            }

            throw new Error(e);
        }
    }
};