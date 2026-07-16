/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */

module.exports = {
    jTormErrorHandler: {
        debug: false,

        // DI
        // util

        /**
         * When explicitly enabled, dump every populated `v` field for debugging;
         * always throw `e` as the upgrade-safe zero-match drift detector.
         * @param {string} e       error message to throw
         * @param {ViewModel} v    view object logged only when debug is true
         */
        handle: function (e, v) {
            try {
                if (this.debug === true) {
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
                }
            } finally {
                throw new Error(e);
            }
        }
    }
};
