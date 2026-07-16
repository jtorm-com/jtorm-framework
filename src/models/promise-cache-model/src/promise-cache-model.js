/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormPromiseCacheModel: {
        get: function (o, q, x) {
            let p = o.c.get(q), k;

            if (p !== undefined) {
                o.c.delete(q);
                o.c.set(q, p);

                if (x.hit)
                    return (async function () { await x.hit(); return p; })()
                ;

                return p;
            }

            p = x.load();
            p.catch(function () { if (o.c.get(q) === p) o.c.delete(q); });
            o.c.set(q, p);

            while (o.c.size > o.max) {
                k = o.c.keys().next().value;
                if (k === q) break;
                o.c.delete(k);
            }

            return p;
        }
    }
};
