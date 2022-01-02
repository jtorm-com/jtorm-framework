/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';
module.exports = {
    jTormUiMethod: {
        cache: {},
        default: 'default',
        framework: 'h',
        params: ['f', 'c', 't', 'h'],
        regexp: {},
        ui: {
            mapper: {}
        },
        uis: {},
        init: async function () {
            var s = this, ui, k, k2;
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
        validate: function (j, v) {
            v.d.t = v.d.t === undefined ? 1 : parseInt(v.d.t);
            v.d.h = v.d.h === undefined ? 1 : parseInt(v.d.h);

            if (v.d.f && !this.uis[v.d.f])
                return 0;

            v.d.c = this.parseComponent(v.d.c, v.d.f);

            return !!v.d.c;
        },
        handle: async function (j, v) {
            var s = this, r, f = v.d.f, tR, i, c = v.d.c;

            if (!f)
                f = 'self';

            if (s.cache[c] && s.cache[c][f])
                r = s.cache[c][f];
            else {
                r = await s.findUIComponent(j, f, c);

                if (!r) {
                    if (f === 'self')
                        r = await s.findUIComponent(j, s.framework, c);

                    if (!r) {
                        for (i in s.uis) {
                            if (s.uis[i]) {
                                r = await s.findUIComponent(j, i, c);
                                if (r)
                                    break;
                            }
                        }
                    }
                }

                if (!s.cache[c])
                    s.cache[c] = {};
                s.cache[c][f] = r;
            }

            if (r) {
                var nT = j.clone(v.t);

                nT.p = {};

                tR = j.clone(r.c);

                if (!v.d.t)
                    delete tR.t;
                if (!v.d.h)
                    delete tR.h;
                if (tR.h)
                    tR.h = [tR.h];

                f = {};
                await s.addLoop(j, tR, 'h', f, s, v);
                await s.addLoop(j, tR, 't', f, s, v);
                await s.addLoop(j, tR, 'd', f, s, v);

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
                        r = await s.add(j, tR.di.m, v);
                        if (!r) {
                            v.io = {c: 0, r: 0};
                            return;
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

                for (i of s.params)
                    delete v.d[i];

                // const util = require('util');
                // console.log('-----');
                // console.log(util.inspect(nT, false, null, true /* enable colors */));

                v.t = nT;

                v.io = {c: 1, r: 1};
            } else
                throw new Error('UI Component not found: ' + v.t.p.c);
        },
        add: async function (j, di, v) {
            var i, sV;
            if (di && di.m) {
                for (i in di.m) {
                    sV = j.context.models.view.copy(j, v);
                    sV.d = di.m[i];
                    await j.context.methods[i].handle(j, sV);
                    return sV.io.c;
                }
            }
            return true;
        },
        addLoop: async function (j, t, k, f, s, v) {
            if (!t[k])
                return f;
            let r, i;
            f[k] = [];
            for (i in t[k]) {
                if (typeof t[k][i] === 'object') {
                    if (t[k][i].di) {
                        r = await s.add(j, t[k][i].di, v);
                        if (r)
                            f[k].push(t[k][i].url);
                    } else
                        f[k].push(t[k][i].url);
                } else
                    f[k].push(t[k][i]);
            }
            f[k] = s.quotes(f[k]);
        },
        findUIComponent(jT, f, c) {
            var s = this, ui, k, k2, k3, tmp, r2, r;

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
                            if (!r2) {
                                r2 = jT.clone(r[tmp[k2]]);
                            } else {
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
                            r = jT.clone(r[tmp[k2]]);
                            break;
                        }
                    }
                } else {
                    if (r[c[k]])
                        r = r[c[k]];
                    else if (r[s.default])
                        r = r[s.default];
                    else {
                        return 0;
                    }
                }
            }

            if (r.default)
                r = r.default;

            if (f === 'self' && r.ui && !r.ui.f)
                r.ui.f = s.framework;

            return {c: r, ui: ui, f: f};
        },
        parseAlias: function (ui, v) {
            if (ui.mapperAlias) {
                var s = this, k;
                for (k in ui.mapperAlias) {
                    if (s.regexp[ui.alias].mapper[k].test(v))
                        return v.replace(s.regexp[ui.alias].mapper[k], ui.mapperAlias[k] + '$1');
                }
                return 0;
            }
            return v;
        },
        parseUrl: function (url) {
            var s = this, r, k, ui;
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
                var s = this, f, r;
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