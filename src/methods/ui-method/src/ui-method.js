/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormUiMethod: {
        // DI
        errorHandler: null,
        mediatargetMethod: null,
        methods: null,
        viewModel: null,

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
                        this.regexp[ui.alias].mapper[k2] = new RegExp("@" + k2 + '([\.\/])', '');
            }
        },

        validate: function (v) {
            v.d.t = v.d.t === undefined
                ? 1
                : parseInt(v.d.t);

            v.d.m = v.d.m === undefined
                ? 0
                : parseInt(v.d.m);

            v.d.h = v.d.h === undefined
                ? 1
                : parseInt(v.d.h);

            if (Number.isNaN(v.d.t))
                this.errorHandler.handle('t is NaN', v);

            if (v.d.f && !this.uis[v.d.f])
                return 0;

            v.d.c = this.parseComponent(v.d.c, v.d.f);

            return !!v.d.c;
        },

        handle: async function (v) {
            const s = this;
            let f = v.d.f,
                c = v.d.c,
                r,
                i,
                t,
                n,
                k;

            if (!f)
                f = 'self';

            r = await s.getComponent(c, f, !v.d.m);
            if (!r)
                s.errorHandler.handle('Invalid UI Component', v);

            t = await s.processComponent(v, r);

            if (!t)
                v.io = {c: 0, r: 0};
            else {
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
                    delete v.d[i];

                v.t = t;
                v.io = {c: 1, r: 1};
            }
        },

        getComponent: async function (c, f, d) {
            const s = this;
            let r, i;

            if (s.cache[c] && s.cache[c][f] !== undefined)
                return s.cache[c][f];

            r = await s.findUIComponent(f, c, d);

            if (!r) {
                if (f === 'self')
                    r = await s.findUIComponent(s.framework, c, d);

                if (!r) {
                    for (i in s.uis) {
                        if (s.uis[i]) {
                            r = await s.findUIComponent(i, c, d);
                            if (r)
                                break;
                        }
                    }
                }
            }

            if (!s.cache[c])
                s.cache[c] = {};

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
                delete tR.t;
            if (!v.d.h)
                delete tR.h;
            if (tR.h)
                tR.h = [tR.h];

            f = {};
            await s.addLoop(tR, 'h', f, s, v);
            await s.addLoop(tR, 't', f, s, v);
            await s.addLoop(tR, 'd', f, s, v);

            if (tR.ui) {
                nT.m = 'ui';
                if (tR.ui.c !== undefined)
                    nT.p.c = "'" + tR.ui.c + "'";
                if (tR.ui.f !== undefined)
                    nT.p.f = "'" + tR.ui.f + "'";
                if (tR.ui.t !== undefined)
                    nT.p.t = "'" + tR.ui.t + "'";
                if (tR.ui.h !== undefined)
                    nT.p.h = "'" + tR.ui.h + "'";
                if (tR.ui.m !== undefined)
                    nT.p.m = "'" + tR.ui.m + "'";

                nT.c = [{s: nT.s, m: 'get', c: nT.c, p: f}];

                if (tR.di) {
                    r = await s.add(tR.di.m, v);
                    if (!r) {
                        return null;
                    }
                }
            } else if (tR.pT) {
                if (!Array.isArray(tR.pT.c))
                    tR.pT.c = [];
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

            return true;
        },

        addLoop: async function (t, k, f, s, v) {
            if (!t[k])
                return f;

            let r, i;

            f[k] = [];
            for (i in t[k]) {
                if (typeof t[k][i] === 'object') {
                    if (t[k][i].di) {
                        r = await s.add(t[k][i].di, v);
                        if (r)
                            f[k].push(t[k][i].url);
                    } else
                        f[k].push(t[k][i].url);
                } else
                    f[k].push(t[k][i]);
            }

            f[k] = s.quotes(f[k]);
        },

        findUIComponent(f, c, d) {
            const s = this;
            let ui, k, k2, k3, tmp, r2, r;

            if (f === 'self')
                ui = s.ui;
            else if (s.uis[f])
                ui = s.uis[f];
            else
                return 0;

            r = ui.mapper;
            c = c.split('.');

            for (k in c) {
                if (/&/.test(c[k])) {
                    tmp = c[k].split('&');
                    r2 = 0;
                    for (k2 in tmp) {
                        if (r[tmp[k2]]) {
                            if (!r2)
                                r2 = this.viewModel._.cloneDeep(r[tmp[k2]]);
                            else {
                                if (!r2.t)
                                    r2.t = [];

                                for (k3 in r[tmp[k2]].t)
                                    r2.t.push(r[tmp[k2]].t[k3]);
                            }
                        }
                    }

                    r = r2;
                } else if (/\|/.test(c[k])) {
                    tmp = c[k].split('|');
                    for (k2 in tmp) {
                        if (r[tmp[k2]]) {
                            r = this.viewModel._.cloneDeep(r[tmp[k2]]);

                            break;
                        }
                    }
                } else if (r) {
                    if (r[c[k]])
                        r = r[c[k]];
                    else if (d && r[s.default])
                        r = r[s.default];
                    else
                        return 0;
                } else
                    return 0;
            }

            if (r[s.default])
                r = r[s.default];

            if (f === 'self' && r.ui && !r.ui.f)
                r.ui.f = s.framework;

            return {c: r, ui: ui, f: f};
        },

        parseAlias: function (ui, v) {
            if (ui.mapperAlias) {
                for (let k in ui.mapperAlias)
                    if (this.regexp[ui.alias].mapper[k].test(v))
                        return v.replace(this.regexp[ui.alias].mapper[k], ui.mapperAlias[k] + '$1');

                return 0;
            }

            return v;
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
                        url = r;

                    if (ui.url)
                        url = ui.url + url;

                    break;
                }
            }

            return url;
        },

        quotes: function (d) {
            for (let k in d)
                d[k] = "'" + d[k] + "'";

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
