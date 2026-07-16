/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */
/** @typedef {import('@jtorm/types').UiResolution} UiResolution */

module.exports = {
    jTormUiCompilerModel: {
        // DI
        // handler
        // methods[]
        // viewModel

        /**
         * @param {ViewModel} v
         * @param {UiResolution} r
         */
        processComponent: async function (v, r) {
            const s = this;
            let f, tR, nT;

            tR = v._.cloneDeep(r.c);

            nT = v._.cloneDeep(v.t);
            nT.p = {};

            if (!v.d.t)
                delete tR.t
            ;

            if (!v.d.h)
                delete tR.h
            ;

            if (tR.h && !v._.isArray(tR.h))
                tR.h = [tR.h]
            ;

            f = {};
            await s.addLoop(tR, 'h', f, s, v);
            await s.addLoop(tR, 't', f, s, v);
            await s.addLoop(tR, 'd', f, s, v);

            if (tR.ui) {
                nT.m = 'ui';
                if (tR.ui.c !== undefined)
                    nT.p.c = "'" + tR.ui.c + "'"
                ;

                if (tR.ui.f !== undefined)
                    nT.p.f = "'" + tR.ui.f + "'"
                ;

                if (tR.ui.t !== undefined)
                    nT.p.t = "'" + tR.ui.t + "'"
                ;

                if (tR.ui.h !== undefined)
                    nT.p.h = "'" + tR.ui.h + "'"
                ;

                if (tR.ui.m !== undefined)
                    nT.p.m = "'" + tR.ui.m + "'"
                ;

                nT.c = [{s: nT.s, m: 'get', c: nT.c, p: f}];

                if (tR.di) {
                    r = await s.add(tR.di, v);
                    if (!r)
                        return null
                    ;
                }
            } else if (tR.pT) {
                if (!Array.isArray(tR.pT.c))
                    tR.pT.c = []
                ;

                tR.pT.c.push({s: v.t.s, m: 'get', c: v.t.c, p: f});

                nT.c = [tR.pT];
            } else {
                nT.m = 'get';
                nT.p = f;
            }

            return nT;
        },

        /** @param {ViewModel} v */
        add: async function (di, v) {
            if (di && di.m) {
                let i, sV;
                for (i in di.m) {
                    sV = this.viewModel.copy(v);
                    sV.t = {s: v.t.s, m: i, p: {}, c: []};

                    const e = await this.handler.dispatch(sV, di.m[i]);

                    return e.children;
                }
            }

            return 1;
        },

        /** @param {ViewModel} v */
        addLoop: async function (t, k, f, s, v) {
            if (!t[k])
                return f
            ;

            let r, i;

            f[k] = [];
            for (i in t[k]) {
                if (typeof t[k][i] === 'object') {
                    if (t[k][i].di) {
                        r = await s.add(t[k][i].di, v);
                        if (r)
                            f[k].push(t[k][i].url)
                        ;
                    } else
                        f[k].push(t[k][i].url)
                    ;
                } else
                    f[k].push(t[k][i])
                ;
            }

            if (!f[k].length) {
                delete f[k];
                return f;
            }

            f[k] = s.quotes(f[k]);
        },

        quotes: function (d) {
            for (let k in d)
                d[k] = "'" + d[k] + "'"
            ;

            return d;
        }
    }
};
