/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormHandler: {
        // DI
        // dataParser: null,
        // eventModel: null,
        // methods: null,
        // viewModel: null,

        handle: async function (h, t, m, c, v) {
            let e = this.eventModel,
                ms = this.methods,
                r,
                k,
                k2;

            if (!v)
                v = await this.viewModel.create(h, t, m, c);

            for (k in v.tss) {
                v.t = v.tss[k];

                do {
                    r = 0;

                    if (v.t.m && ms[v.t.m])
                        r = ms[v.t.m];
                    else {
                        for (k2 in ms) {
                            if (ms[k2].alias === v.t.m) {
                                r = ms[k2];
                                break;
                            }
                        }
                    }

                    if (r) {
                        if (v._.isFunction(r.data))
                            await r.data(v);
                        else
                            this.dataParser.handle(v, r.params);

                        v.io.v = await r.validate(v);

                        await e.handle(v, 'before', 'method');

                        if (v.io.v && v._.isFunction(r.handle))
                            await r.handle(v);
                        else
                            v.io.r = 0;

                        await e.handle(v, 'after', 'method');
                    } else {
                        v.io.r = 0;
                        v.io.c = 1;
                    }
                } while (v.io.r);

                if (v.io.c && v.t.c.length)
                    await this.handle(v.h, v.t.c, v.io.d ? v.io.d : v.m, v.c);

                v.io.d = null;
            }

            return v.h;
        }
    }
};