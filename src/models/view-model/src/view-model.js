/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/** @typedef {import('@jtorm/types').ViewModel} ViewModel */

module.exports = {
    jTormViewModel: {
        // DI
        // _
        // documentModel
        // tssParser

        copyAttrs: ['_', 't', 'params', 'io', 'c'],
        data: {
            cid: null,// cache id
            cs: null,// cache scope
            c: {
                c: 1,// create doc
                s: null,// parent/descendant selector (find: appended by getSelector)
                a: null,// ancestor selector (get{t}/ui: prepended by document-model.set)
            },
            h: null,// html
            m: null,// model
            d: null,// method data
            tss: null,
            t: null,// method tss
            r: null, // result from handlechildren
            io: {
                d: null, // alt data
                c: 1, // handle children
                r: 1, // repeat current iteration
                v: 0 // validated
            }
        },

        /**
         * Build the root view object `v` from `this.data`.
         * @this {{ _: any, documentModel: any, tssParser: any, data: any, copyAttrs: string[] }}
         * @param {*} h    html string, or an already-built DOM wrapper
         * @param {*} t    TSS string, or an already-parsed tree
         * @param {*} m    model / source data
         * @param {*} c    create-doc flag, or a full context object
         * @param {*} [b]  base passed to documentModel.create
         * @returns {Promise<ViewModel>}
         */
        create: async function(h, t, m, c, b) {
            let v = this._.create(this.data, {
                _: this._
            });

            if (this._.isObject(c))
                v.c = c
            ; else
                v.c.c = c
            ;

            v.m = m;

            if (this._.isString(t))
                t = await this.tssParser.handle(t)
            ;

            v.tss = t;

            if (this._.isString(h))
                h = this.documentModel.create(h, v, b)
            ;

            v.h = h;

            return v;
        },

        /**
         * Shallow-copy `v` into a child scope, deep-cloning anything not in `a`.
         * @this {{ _: any, copyAttrs: string[] }}
         * @param {*} v           parent view object
         * @param {*} [h]         override html wrapper
         * @param {*} [t]         override tss
         * @param {*} [d]         override model data
         * @param {string[]} [a]  attrs copied by reference (defaults to copyAttrs)
         * @returns {Object<string,*>}
         */
        copy: function(v, h, t, d, a) {
            let sv = /** @type {Object<string,*>} */ ({}), k;

            if (!a)
                a = this.copyAttrs
            ;

            for (k in v) {
                if (k === 'h')
                    sv[k] = h ? h : v[k]
                ; else if (k === 'tss')
                    sv[k] = t ? t : v[k]
                ; else if (k === 'm')
                    sv[k] = d ? d : v[k]
                ; else if (a.indexOf(k) !== -1)
                    sv[k] = v[k]
                ; else
                    sv[k] = this._.cloneDeep(v[k]);
            }

            return sv;
        }
    }
};
