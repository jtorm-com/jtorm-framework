/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').UiPackage} UiPackage */
/** @typedef {import('@jtorm/types').UiResolution} UiResolution */

module.exports = {
    jTormUiResolverModel: {
        cache: {},
        default: 'default',
        framework: 'h',
        regexp: {},
        ui: {
            mapper: {}
        },
        /** @type {UiPackage[]} */
        uis: [],

        init: async function () {
            let ui, k, k2;

            this.cache = {};
            this.regexp = {};

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

        /** @returns {Promise<UiResolution|number>} */
        getComponent: async function (c, f, d) {
            const s = this;
            let i, r, x;

            f = f || 'self';

            if (s.cache[c] && s.cache[c][f] !== undefined)
                return s.cache[c][f]
            ;

            x = f;
            r = await s.findUIComponent(f, c, d);

            if (!r && f === 'self') {
                x = s.framework;
                r = await s.findUIComponent(x, c, d);
            }

            if (!r) {
                for (i in s.uis) {
                    if (s.uis[i] && s.uis[i].framework !== x) {
                        r = await s.findUIComponent(s.uis[i].framework, c, d);
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

        findUIComponent: function (f, c) {
            const s = this;
            let ui, uis, k, r, p;

            if (f === 'self')
                ui = s.ui
            ; else {
                uis = s.uis.filter(ui => ui.framework === f || ui.alias === f);

                if (!uis.length)
                    return 0
                ;

                ui = uis[0];
            }

            r = ui && ui.mapper;

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

            if (f === 'self' && r.ui && !r.ui.f)
                r = {...r, ui: {...r.ui, f: s.framework}}
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
