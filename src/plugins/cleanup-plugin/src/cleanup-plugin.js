/*! (c) jTorm and other contributors | www.jtorm.com/license */
module.exports = {
    after: {
        view: {
            weight: 0,
            cleanup: ['.meta', '.header', '.body', '.footer'],
            handle: async function (j, v) {
                console.log('clean');
                var s = this, col, k, k2;
                for (k in s.cleanup) {
                    col = v.h.selectAll(s.cleanup[k]);
                    for (k2 of col) {
                        if (k2.innerHTML.trim() === '')
                            k2.parentElement.removeChild(k2);
                    }
                }
            }
        }
    }
};
// todo deze moet denk ik na een iteratie ivm cache? anders wordt die altijd uitgevoerd,
// todo maar per iteratie is ook wat overkill, voordat het wordt opgeslagen in cache oid?