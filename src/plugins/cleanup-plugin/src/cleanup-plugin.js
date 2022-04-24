/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormCleanupPlugin: {
        cleanup: ['.meta', '.header', '.body', '.footer'],
        event: {
            after: {
                iteration: {
                    weight: 1000
                }
            }
        },

        afterIteration: async function(v) {
            let col, k, k2;

            for (k in this.cleanup) {
                col = v.h.selectAll(this.cleanup[k]);

                for (k2 of col) {
                    if (k2.innerHTML.trim() === '')
                        k2.parentElement.removeChild(k2);
                }
            }
        }
    }
};
