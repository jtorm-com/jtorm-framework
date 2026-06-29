/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/**
 * Shared JSDoc typedefs for the jTorm framework (pure JS — no .ts/.d.ts).
 *
 * Canonical "decoder ring" for the view object `v`: the single source of truth
 * for the one-letter fields threaded through the handler/method pipeline
 * (`v.t` node, `v.d` method data, `v.m` model, `v.h` DOM, `v.io` flags,
 * `v.c` context). Don't duplicate the field map elsewhere — link here.
 *
 * Pull a typedef into any .js file with an import() JSDoc reference, e.g.
 * `@typedef {import('@jtorm/types').ViewModel} ViewModel` — every method
 * (`handle`/`validate`/`data`) and handler does this so editors resolve `v.*`
 * on hover. Batch-validated by jsconfig.json (checkJs:true, strict:true) for the
 * files it `include`s; nothing is emitted.
 * @module types
 */

/**
 * A parsed TSS node produced by `tss-parser.handle()`.
 * @typedef {Object} TssNode
 * @property {string} s                  selector
 * @property {string|false} m            method name, or `false` when the rule has no `->method`
 * @property {Object<string,string>} p   declaration block (property → value)
 * @property {TssNode[]} c               nested child rules
 */

/**
 * Render-context flags on `v.c`.
 * @typedef {Object} ViewContext
 * @property {number} c   create-doc flag — truthy → fresh detached doc (SSR); falsy → live doc (client)
 * @property {?string} s  descendant selector — find appends it (`<rule> <s>`)
 * @property {?string} [a] ancestor selector — get{t}/ui prepend it (`<a> <rule>`) for component scoping
 * @property {?string} [b] body default — an iteration fragment's selectorless, unscoped rules target it (handler-wrapper)
 */

/**
 * Control flags on `v.io`.
 * @typedef {Object} ViewIO
 * @property {*} d        alt data
 * @property {number} c   handle children (1/0)
 * @property {number} r   repeat current iteration (1/0)
 * @property {number} v   validated (1/0)
 */

/**
 * The view object `v` threaded through the handler/method pipeline,
 * built by `view-model.create()` from `view-model.data`.
 * @typedef {Object} ViewModel
 * @property {?string} cid        cache id
 * @property {?string} cs         cache scope
 * @property {ViewContext} c      render context
 * @property {*} h                DOM wrapper (select/selectAll/set/body/html), or html string pre-create
 * @property {*} m                model / source data
 * @property {*} d                parsed method data
 * @property {?(TssNode[])} tss   full parsed TSS tree
 * @property {?TssNode} t         current method TSS node
 * @property {*} r                result from handleChildren
 * @property {ViewIO} io          control flags
 * @property {Object} [_]         injected lodash subset (DI; present after create)
 */

/**
 * A TSS method (verb) contract — `methods/*` export `{ jTorm<Name>: Method }`.
 * @typedef {Object} Method
 * @property {string} [alias]                                  alternate name
 * @property {string[]} [params]                               declared parameter names
 * @property {(v: ViewModel) => (boolean|number)} validate     gate run before handle
 * @property {(v: ViewModel) => (void|Promise<void>)} handle   apply the transform
 */

module.exports = {};
