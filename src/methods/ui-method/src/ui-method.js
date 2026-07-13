/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */

module.exports = {
    jTormUiMethod: {
        // DI
        // compilerModel
        // dataParser
        // errorHandler
        // mediatargetMethod
        // resolverModel

        params: [
            'f',// Framework
            'c',// Component
            't',// Use component tss
            'h',// Use component html
            'm' // Use mediatarget
        ],

        get cache() {
            return this.resolverModel.cache;
        },

        set cache(v) {
            this.resolverModel.cache = v;
        },

        get default() {
            return this.resolverModel.default;
        },

        set default(v) {
            this.resolverModel.default = v;
        },

        get framework() {
            return this.resolverModel.framework;
        },

        set framework(v) {
            this.resolverModel.framework = v;
        },

        get regexp() {
            return this.resolverModel.regexp;
        },

        set regexp(v) {
            this.resolverModel.regexp = v;
        },

        get ui() {
            return this.resolverModel.ui;
        },

        set ui(v) {
            this.resolverModel.ui = v;
        },

        get uis() {
            return this.resolverModel.uis;
        },

        set uis(v) {
            this.resolverModel.uis = v;
        },

        get methods() {
            return this.compilerModel.methods;
        },

        set methods(v) {
            this.compilerModel.methods = v;
        },

        get viewModel() {
            return this.compilerModel.viewModel;
        },

        set viewModel(v) {
            this.compilerModel.viewModel = v;
        },

        init: async function () {
            return this.resolverModel.init();
        },

        /** Parse and normalize UI verb input before validation and method events. @param {ViewModel} v */
        data: function (v) {
            this.dataParser.handle(v, this.params);

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

            v.d.c = this.resolverModel.parseComponent(v.d.c);
        },

        /** Gate UI handling on a parsed component without mutating the view. @param {ViewModel} v */
        validate: function (v) {
            return !!v.d.c;
        },

        /** Resolve and compile the UI component, including active mediatarget variants. @param {ViewModel} v */
        handle: async function (v) {
            const s = this;
            let f = v.d.f || 'self',
                c = v.d.c,
                r,
                i,
                t,
                n,
                k
            ;

            if (!s.resolverModel || !s.compilerModel)
                s.errorHandler.handle('UI Models not injected', v)
            ;

            r = await s.resolverModel.getComponent(c, f);
            if (!r)
                s.errorHandler.handle('Invalid UI Component', v)
            ;

            t = await s.compilerModel.processComponent(v, r);

            if (!t)
                v.io = {c: 0, r: 0}
            ; else {
                if (v.d.m) {
                    r = s.mediatargetMethod;

                    if (r) {
                        for (i in r.current) {
                            k = await s.resolverModel.getComponent(c + r.current[i], f);
                            if (k) {
                                n = await s.compilerModel.processComponent(v, k);
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

        getComponent: function (c, f, d) {
            return this.resolverModel.getComponent(c, f, d);
        },

        processComponent: function (v, r) {
            return this.compilerModel.processComponent(v, r);
        },

        add: function (di, v) {
            return this.compilerModel.add(di, v);
        },

        addLoop: function (t, k, f, s, v) {
            return this.compilerModel.addLoop(t, k, f, s, v);
        },

        findUIComponent: function (f, c, d) {
            return this.resolverModel.findUIComponent(f, c, d);
        },

        parseAlias: function (ui, v) {
            return this.resolverModel.parseAlias(ui, v);
        },

        parseUrl: function (url) {
            return this.resolverModel.parseUrl(url);
        },

        quotes: function (d) {
            return this.compilerModel.quotes(d);
        },

        parseComponent: function (c) {
            return this.resolverModel.parseComponent(c);
        }
    }
};
