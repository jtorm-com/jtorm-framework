/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormErrorHandler: {
        // DI
        util: null,

        handle: function (e, v) {
            for (let k in v) {
                if (
                    !v[k]
                    || k === '_'
                    // || k === 'tss'
                    // || k === 'model'
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

            console.error(e);
        }
    }
};