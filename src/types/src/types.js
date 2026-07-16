/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

/**
 * Shared JSDoc typedefs for the jTorm framework (pure JS — no .ts/.d.ts).
 *
 * Canonical "decoder ring" for the view object `v`: the single source of truth
 * for the one-letter fields threaded through the handler/method pipeline
 * (`v.t` node, `v.d` method data, `v.m` model, `v.h` DOM, `v.c` context).
 * Method control flow is returned as an effect rather than stored on `v`.
 * Don't duplicate the field map elsewhere — link here.
 *
 * Pull a typedef into any .js file with an import() JSDoc reference, e.g.
 * `@typedef {import('@jtorm/types').ViewModel} ViewModel` — every method
 * (`handle`/`validate`/`data`) and handler does this so editors resolve `v.*`
 * on hover. Batch-validated by jsconfig.json (checkJs:true, strict:true) for the
 * files it `include`s; nothing is emitted.
 * @module types
 */

/**
 * A model-free compiled binding descriptor stored on a TSS node.
 * @typedef {Object} BindingDescriptor
 * @property {'a'|'p'|'v'} t descriptor type: append, model path, or literal value
 * @property {Array<BindingDescriptor|null>|(string|number)[]|string|number|boolean} v descriptor data
 * @property {number} [n] numeric-literal/model-key flag
 */

/**
 * Grammar/raw-declaration-keyed compiled bindings for one TSS node.
 * @typedef {Object} BindingCache
 * @property {string} k effective data-parser grammar key
 * @property {Array<[string,string|string[]]>} r ordered shallow declaration snapshot
 * @property {?Object<string,BindingDescriptor|Array<BindingDescriptor|null>>} p compiled default declarations
 * @property {Object<string,*>} x method-owner and auto-binding segments
 */

/**
 * A parsed TSS node produced by `tss-parser.handle()`.
 * @typedef {Object} TssNode
 * @property {string} s                           selector
 * @property {string|false} m                     method name, or `false` when the rule has no `->method`
 * @property {Object<string,string|string[]>} p   declaration block (property → value)
 * @property {TssNode[]} c                        nested child rules
 * @property {BindingCache} [b]                   model-free compiled binding cache
 */

/**
 * Conditional mapper dispatch consumed by the UI compiler.
 * @typedef {Object} UiDependency
 * @property {Object<string,*>} m method name → method data
 */

/**
 * A UI artifact URL, optionally guarded by method data.
 * @typedef {Object} UiArtifact
 * @property {string} url
 * @property {UiDependency} [di]
 */

/**
 * Nested `ui` parameters emitted by a mapper descriptor.
 * @typedef {Object} UiCall
 * @property {string} [c]
 * @property {string} [f]
 * @property {number|string} [t]
 * @property {number|string} [h]
 * @property {number|string} [m]
 */

/**
 * A leaf descriptor stored in a UI package mapper.
 * @typedef {Object} UiDescriptor
 * @property {string|(string|UiArtifact)[]} [h]
 * @property {(string|UiArtifact)[]} [t]
 * @property {(string|UiArtifact)[]} [d]
 * @property {UiCall} [ui]
 * @property {Object} [pT]
 * @property {UiDependency} [di]
 */

/**
 * A host-injected UI registry package.
 * @typedef {Object} UiPackage
 * @property {string} id
 * @property {string} alias
 * @property {string} framework
 * @property {Object<string,string>} [mapperAlias]
 * @property {string} [url]
 * @property {Object<string,*>} mapper
 */

/**
 * A resolver result passed to the UI compiler.
 * @typedef {Object} UiResolution
 * @property {UiDescriptor} c
 * @property {UiPackage|Object} ui
 * @property {string} f
 */

/** @typedef {[unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown,unknown]} JsonDepth */

/**
 * JSON-safe manifest data bounded to the runtime's 128-level nesting limit.
 * The generic counter keeps TypeScript from eagerly rejecting recursive JSDoc.
 * @template [D=JsonDepth]
 * @typedef {D extends readonly [unknown, ...infer R] ? null|boolean|number|string|JsonValue<R>[]|{[key:string]: JsonValue<R>} : null|boolean|number|string} JsonValue
 */

/**
 * One host-selected runtime manifest.
 * @typedef {Object} UiManifestDescriptor
 * @property {string} url
 * @property {string} hash
 * @property {'required'|'optional'} mode
 */

/**
 * One static component root and its UI usage flags.
 * @typedef {Object} UiManifestRoot
 * @property {string} c
 * @property {string} f
 * @property {number|string} [t]
 * @property {number|string} [h]
 * @property {number|string} [m]
 */

/**
 * Compiler root input before default framework and usage flags are materialized.
 * @typedef {Object} UiManifestCompilerRoot
 * @property {string} c
 * @property {string} [f]
 * @property {number|string} [t]
 * @property {number|string} [h]
 * @property {number|string} [m]
 */

/**
 * Model-free UI package identity serialized into a manifest.
 * @typedef {Object} UiManifestUi
 * @property {string} id
 * @property {string} alias
 * @property {string} framework
 * @property {string} [url]
 * @property {Object<string,string>} [mapperAlias]
 */

/**
 * Ordered method metadata used for implicit leaf bindings.
 * @typedef {Object} UiManifestMethod
 * @property {string} id
 * @property {string[]} params
 */

/**
 * A model-bound get/ui edge that static discovery cannot follow.
 * @typedef {Object} UiManifestDynamic
 * @property {string} from
 * @property {string} at
 * @property {string} param
 * @property {string} type
 * @property {string|string[]} binding
 * @property {boolean} implicit
 */

/**
 * One model-free packed fetch value.
 * @template [D=JsonDepth]
 * @typedef {Object} UiManifestAsset
 * @property {'data'|'html'|'tss'} type
 * @property {string} request
 * @property {string} valueHash
 * @property {JsonValue<D>} value
 */

/**
 * Hash-bound manifest build configuration.
 * @typedef {Object} UiManifestConfig
 * @property {string} default
 * @property {string} framework
 * @property {UiManifestCompilerRoot[]} roots
 * @property {UiManifestUi[]} uis
 * @property {string[]} namespaces
 * @property {UiManifestMethod[]} methods
 * @property {string[]} [mediatargets]
 * @property {UiManifestDynamic[]} dynamicAllow
 * @property {Object<string,string|number|boolean>} toolchain
 * @property {Object<string,number>} [limits]
 */

/**
 * UI closure manifest wire document.
 * @typedef {Object} UiManifestDocument
 * @property {'@jtorm/ui-manifest'} format
 * @property {1} version
 * @property {string} id
 * @property {string} hash
 * @property {UiManifestConfig} config
 * @property {UiManifestAsset[]} assets
 * @property {UiManifestDynamic[]} dynamic
 * @property {{id:string,hash:string}[]} mappers
 * @property {{id:string,hash:string,bytes:number}[]} sources
 */

/**
 * Immutable conflict token plus cached parsed value.
 * @template [D=JsonDepth]
 * @typedef {Object} UiManifestPreparedAsset
 * @property {JsonValue<D>} value
 * @property {string} valueHash
 */

/**
 * Atomically installed render-root lookup state.
 * @typedef {Object} UiManifestPreparedIndex
 * @property {Map<string,UiManifestPreparedAsset>} assets
 * @property {string[][]} required
 */

/**
 * Root-local prepare generation and installed index.
 * @typedef {Object} ViewUiManifestContext
 * @property {number} generation
 * @property {UiManifestPreparedIndex} [index]
 * @property {?string} [key]
 * @property {?Promise<void>} [promise]
 */

/**
 * Type-tagged source request from the build compiler.
 * @typedef {Object} UiManifestSourceRequest
 * @property {'data'|'html'|'tss'} type
 * @property {string} request
 */

/**
 * Trusted source adapter result: raw bytes are fingerprinted; text is parsed.
 * @typedef {Object} UiManifestSourceResult
 * @property {string} id
 * @property {Uint8Array} raw
 * @property {string} text
 */

/**
 * Trusted build-time source adapter.
 * @typedef {Object} UiManifestSourceAdapter
 * @property {string} version
 * @property {(request:UiManifestSourceRequest)=>Promise<UiManifestSourceResult>} read
 */

/**
 * Native SHA-256 adapter; the model owns UTF-8 and lowercase string formatting.
 * @callback UiManifestDigest
 * @param {Uint8Array} bytes
 * @returns {Promise<Uint8Array>}
 */

/**
 * Trusted static compiler input.
 * @typedef {Object} UiManifestCompilerConfig
 * @property {string} id
 * @property {UiManifestCompilerRoot[]} roots
 * @property {Object} resolver
 * @property {Object} tssParser
 * @property {Object} dataParser
 * @property {Object<string,Method>} methods
 * @property {UiPackage[]} uis
 * @property {UiManifestSourceAdapter} source
 * @property {string[]} namespaces
 * @property {UiManifestDynamic[]} dynamicAllow
 * @property {UiManifestCompilerRoot[]} [extraRoots]
 * @property {string[]} [mediatargets]
 * @property {Object<string,string|number|boolean>} toolchain
 * @property {Object<string,number>} [limits]
 */

/**
 * Deterministic build output.
 * @typedef {Object} UiManifestCompileResult
 * @property {UiManifestDocument} manifest
 * @property {string} json
 * @property {string} hash
 * @property {string} filename
 */

/**
 * Render-context flags on `v.c`.
 * @typedef {Object} ViewLayerContext
 * @property {?string} cid                         current implicit layer id for layer rules without `i:`
 * @property {string[]} currentCid                 implicit layer id stack for nested iterations
 * @property {{before:{iteration:string[]},after:{iteration:string[],view:string[]}}} event registered layer ids per phase
 * @property {Object<string,{z:number,t:TssNode}[]>} layers deferred layer fragments by id
 * @property {number} updated                      dirty flag for optional layer persistence
 */

/**
 * UI-cache render-local flags on `v.c`.
 * @typedef {Object} ViewUiCacheContext
 * @property {number} updated dirty flag for this render; the persisted cache/order stores stay shared
 */

/**
 * Request-model per-render options on `v.c`.
 * @typedef {Object} ViewRequestContext
 * @property {?string} [base] request base URL prefix for relative fetches
 * @property {number} [timeout] request timeout in ms; 0 = no timeout
 * @property {?string} [origin] request origin discriminator for rendered-output caches
 * @property {?string} [tenant] tenant discriminator for rendered-output caches
 */

/**
 * CSS-plugin render-local asset state on `v.c`.
 * @typedef {Object} ViewCssContext
 * @property {Object<string,number|boolean>} cache href de-dupe state for this render
 * @property {Object<string,*>[]} collection queued stylesheet descriptors for this render
 */

/**
 * JS-plugin render-local asset state on `v.c`.
 * @typedef {Object} ViewJsContext
 * @property {Object<string,number|boolean>} cache src de-dupe state for this render
 * @property {Object<string,*>[]} collection queued script descriptors for this render
 */

/**
 * Render-context flags on `v.c`.
 * @typedef {Object} ViewContext
 * @property {number} c   create-doc flag — truthy → fresh detached doc (SSR); falsy → live doc (client)
 * @property {?string} s  descendant selector — find appends it (`<rule> <s>`)
 * @property {?(Element[])} [a] ancestor element(s) — get{t}/ui resolve these; document-model.scope matches a rule WITHIN them (descendant-first, else self; selectorless → the element). An element-ref array (not a selector string), shared by-ref via copy → REPLACE, never mutate in place
 * @property {?string} [b] body default — an iteration fragment's selectorless, unscoped rules target it (handler-wrapper)
 * @property {?string} [locale] request locale for render-path language lookup
 * @property {?string} [tenant] tenant discriminator for rendered-output caches
 * @property {ViewRequestContext} [request] request-model base/timeout for render-path fetches
 * @property {ViewContext} [p] parent/root render context for detached fragment state
 * @property {ViewLayerContext} [layer] per-render deferred layer state
 * @property {ViewUiCacheContext} [uiCache] per-render ui-cache dirty state
 * @property {ViewUiManifestContext} [manifest] root-local prepared UI closure state
 * @property {ViewCssContext} [css] per-render stylesheet collection/de-dupe state
 * @property {ViewJsContext} [js] per-render script collection/de-dupe state
 */

/**
 * A method's partial returned control-flow intent.
 * @typedef {Object} MethodEffect
 * @property {boolean} [children] recurse into the TSS node's children
 * @property {boolean} [repeat] repeat the full method lifecycle
 * @property {*} [data] model data for child recursion
 */

/**
 * The complete handler-normalized method effect.
 * @typedef {Object} ViewEffect
 * @property {boolean} children recurse into the TSS node's children
 * @property {boolean} repeat repeat the full method lifecycle
 * @property {*} data model data for child recursion, or undefined for `v.m`
 */

/** Retained published decoder-ring name for the returned effect shape. @typedef {ViewEffect} ViewIO */

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
 * @property {Object} [_]         injected lodash subset (DI; present after create)
 */

/**
 * A TSS method (verb) contract — `methods/*` export `{ jTorm<Name>: Method }`.
 * The handler runs `data` (optional hook, replacing the default data-parser pass)
 * → `validate` → `handle`, then normalizes the returned MethodEffect. `handle`
 * is **optional**: it runs only when it is a
 * function, so a data-only verb (e.g. `data-method`: `validate` + `data`, no
 * `handle`) is valid. On a `validate` MISS the handler decides child handling: a
 * `gate` verb fails CLOSED (children skipped), any other verb is a pass-through
 * (children still render). Missing/malformed controls never repeat and a gate
 * defaults closed; only own boolean `children`/`repeat` fields are honored.
 * @typedef {Object} Method
 * @property {string} [alias]                                                       alternate name
 * @property {number} [gate]                                                        gate flag — a validate MISS fails CLOSED (skip children); else a miss is a pass-through
 * @property {string[]} [params]                                                    declared parameter names
 * @property {(v: ViewModel) => (boolean|number|Promise<boolean|number>)} validate  gate run before handle
 * @property {(v: ViewModel, preparedData?: *) => (void|MethodEffect|Promise<void|MethodEffect>)} [data] optional data hook (replaces the default data-parser pass)
 * @property {(v: ViewModel) => (MethodEffect|Promise<MethodEffect>)} [handle]       apply the transform (runs only when a function)
 */

module.exports = {};
