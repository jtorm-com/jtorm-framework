/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

module.exports = {
    jTormUiMethod: {
        // DI
        mediatargetMethod: null,
        methods: null,
        viewModel: null,

        cache: {},
        default: 'default',
        framework: 'h',
        params: ['f', 'c', 't', 'h', 'm'],
        regexp: {},
        ui: {
            mapper: {}
        },
        uis: {},

        init: async function () {
            let s = this, ui, k, k2;

            for (k in s.uis) {
                ui = s.uis[k];
                s.regexp[ui.alias] = {
                    alias: new RegExp("^" + ui.alias + "\/", ''),
                    mapper: {}
                };

                if (ui.mapperAlias)
                    for (k2 in ui.mapperAlias)
                        s.regexp[ui.alias].mapper[k2] = new RegExp("@" + k2 + '([\.\/])', '');
            }
        },

        validate: function (v) {
            let t = v.d.t === undefined ? 1 : parseInt(v.d.t);
            if (Number.isNaN(t)) {
                // var 0 exists and should be t: '0';
                throw new Error('NaN');
            }

            v.d.t = t;
            v.d.h = v.d.h === undefined ? 1 : parseInt(v.d.h);

            if (v.d.f && !this.uis[v.d.f])
                return 0;

            v.d.c = this.parseComponent(v.d.c, v.d.f);

            return !!v.d.c;
        },

        handle: async function (v) {
            let s = this, r, f = v.d.f, i, c = v.d.c, nT, k;

            if (!f)
                f = 'self';

            r = await s.getComponent(c, f, !v.d.m);
            if (!r) {
                console.log(v);
                throw new Error('UI Component not found: ' + v.t.p.c);
            }

            nT = await s.processComponent(v, r);
            if (!nT) {
                v.io = {c: 0, r: 0};
                return;
            }

            if (v.d.m) {
                r = this.mediatargetMethod;

                if (r) {
                    for (i in r.current) {
                        k = await s.getComponent(c + r.current[i], f);
                        if (k) {
                            let nT2 = await s.processComponent(v, k);

                            nT.c.push(nT2);
                        }
                    }
                }
            }

            for (i of s.params)
                delete v.d[i];

            v.t = nT;
            v.io = {c: 1, r: 1};
        },

        getComponent: async function (c, f, d) {
            let s = this, r, i;

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
            let s = this, f, tR, nT;

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
                if (tR.ui.d !== undefined)
                    nT.p.d = "'" + tR.ui.d + "'";

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
            let i, sV;

            if (di && di.m) {
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
            let s = this, ui, k, k2, k3, tmp, r2, r;

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
                                for (k3 in r[tmp[k2]].t) {
                                    r2.t.push(r[tmp[k2]].t[k3]);
                                }
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
                } else {
                    if (r[c[k]]) {
                        r = r[c[k]];
                    } else if (d && r[s.default]) {
                        r = r[s.default];
                    } else {
                        return 0;
                    }
                }
            }

            if (r[s.default])
                r = r[s.default];

            if (f === 'self' && r.ui && !r.ui.f)
                r.ui.f = s.framework;

            return {c: r, ui: ui, f: f};
        },

        parseAlias: function (ui, v) {
            if (ui.mapperAlias) {
                let s = this, k;
                for (k in ui.mapperAlias) {
                    if (s.regexp[ui.alias].mapper[k].test(v))
                        return v.replace(s.regexp[ui.alias].mapper[k], ui.mapperAlias[k] + '$1');
                }
                return 0;
            }
            return v;
        },

        parseUrl: function (url) {
            let s = this, r, k, ui;

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
                let s = this, f, r;

                for (f in s.uis) {
                    r = s.parseAlias(s.uis[f], c);

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
