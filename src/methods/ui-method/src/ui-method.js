/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */

module.exports = {
    jTormUiMethod: {
        // DI
        // errorHandler
        // mediatargetMethod
        // methods[]
        // viewModel

        cache: {},
        default: 'default',
        framework: 'h',
        params: [
            'f',// Framework
            'c',// Component
            't',// Use component tss
            'h',// Use component html
            'm' // Use mediatarget
        ],
        regexp: {},
        ui: {
            mapper: {}
        },
        uis: {},

        init: async function () {
            let ui, k, k2;

            for (k in this.uis) {
                ui = this.uis[k];

                this.regexp[ui.alias] = {
                    alias: new RegExp("^" + ui.alias + "\/", ''),
                    mapper: {}
                };

                if (ui.mapperAlias)
                    for (k2 in ui.mapperAlias)
                        this.regexp[ui.alias].mapper[k2] = new RegExp("@" + k2 + '([\.\/])', '')
                ;
            }
        },

        /** @param {ViewModel} v */
        validate: function (v) {
            v.d.t = v.d.t === undefined
                ? 1
                : parseInt(v.d.t)
            ;

            v.d.m = v.d.m === undefined
                ? 0
                : parseInt(v.d.m)
            ;

            v.d.h = v.d.h === undefined
                ? 1
                : parseInt(v.d.h)
            ;

            if (Number.isNaN(v.d.t))
                this.errorHandler.handle('t is NaN', v)
            ;

            v.d.c = this.parseComponent(v.d.c);

            return !!v.d.c;
        },

        /**
         * Resolve the schema.org component `v.d.c` for the chosen framework and rewrite `v.t` into its get/ui subtree (adding mediatarget variants).
         * @param {ViewModel} v
         */
        handle: async function (v) {
            const s = this;
            let f = v.d.f,
                c = v.d.c,
                r,
                i,
                t,
                n,
                k
            ;

            if (!f)
                f = s.framework
            ;

            r = await s.getComponent(c, f);
            if (!r)
                s.errorHandler.handle('Invalid UI Component', v)
            ;

            t = await s.processComponent(v, r);

            if (!t)
                v.io = {c: 0, r: 0}
            ; else {
                if (v.d.m) {
                    r = s.mediatargetMethod;

                    if (r) {
                        for (i in r.current) {
                            k = await s.getComponent(c + r.current[i], f);
                            if (k) {
                                n = await s.processComponent(v, k);
                                n.c = [];

                                t.c.push(n);
                            }
                        }
                    }
                }

                for (i of s.params)
                    delete v.d[i]
                ;

                v.t = t;
                v.io = {c: 1, r: 1};
            }
        },

        getComponent: async function (c, f, d) {
            const s = this;

            if (s.cache[c] && s.cache[c][f] !== undefined)
                return s.cache[c][f]
            ;

            let
                i,
                r = await s.findUIComponent(f, c)
            ;

            if (!r) {
                for (i in s.uis) {
                    if (s.uis[i] && s.uis[i].framework !== f) {
                        r = await s.findUIComponent(s.uis[i].framework, c);
                        if (r)
                            break
                        ;
                    }
                }
            }

            if (!s.cache[c])
                s.cache[c] = {}
            ;

            s.cache[c][f] = r;

            return r;
        },

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
                    r = await s.add(tR.di.m, v);
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

        add: async function (di, v) {
            if (di && di.m) {
                let i, sV;
                for (i in di.m) {
                    sV = this.viewModel.copy(v);
                    sV.d = di.m[i];

                    await this.methods[i].handle(sV);

                    return sV.io.c;
                }
            }

            return 1;
        },

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

            // An empty artifact list (a pure `ui:{c:Parent}` delegator with `t:[]`, or
            // one whose every entry was di-gated off) must NOT emit an empty get param:
            // `f.t = []` reaches get as a truthy `v.d.t`, fetching an empty URL → 404.
            // Drop the key so the get sees nothing to fetch and the delegation is clean.
            if (!f[k].length) {
                delete f[k];
                return f;
            }

            f[k] = s.quotes(f[k]);
        },

        findUIComponent(f, c) {
            const
                s = this,
                uis = s.uis.filter(ui => ui.framework === f || ui.alias === f)
            ;

            if (!uis.length)
                return 0
            ;

            const ui = uis[0];

            let k, r, p;

            r = ui.mapper;

            if (!r)
                return 0
            ;

            p = c.split('.');

            for (k in p) {
                if (r[p[k]])
                    r = r[p[k]]
                ; else
                    return 0
                ;
            }

            if (r[s.default])
                r = r[s.default]
            ;

            return {c: r, ui: ui, f: f};
        },

        parseAlias: function (ui, v) {
            if (ui.mapperAlias) {
                for (let k in ui.mapperAlias)
                    if (this.regexp[ui.alias].mapper[k].test(v))
                        return v.replace(this.regexp[ui.alias].mapper[k], ui.mapperAlias[k] + '$1')
                ;

                return 0;
            }

            return 0;
        },

        parseUrl: function (url) {
            const s = this;
            let r, k, ui;

            for (k in s.uis) {
                ui = s.uis[k];

                if (s.regexp[ui.alias].alias.test(url)) {
                    url = url.replace(s.regexp[ui.alias].alias, ui.id + "/");

                    r = s.parseComponent(url);

                    if (r)
                        url = r
                    ;

                    if (ui.url)
                        url = ui.url + url
                    ;

                    break;
                }
            }

            return url;
        },

        quotes: function (d) {
            for (let k in d)
                d[k] = "'" + d[k] + "'"
            ;

            return d;
        },

        parseComponent: function (c) {
            if (/@/.test(c)) {
                let f, r;

                for (f in this.uis) {
                    r = this.parseAlias(this.uis[f], c);

                    if (r) {
                        c = r;
                        break;
                    }
                }
            }

            return c;
        }
    }
};
