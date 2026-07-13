/*! (c) jTorm and other contributors | www.jtorm.com/license */
'use strict';

// Full-pipeline test harness — a LOCAL dependency-injection bootstrap that wires
// the framework's own working-tree src/** modules (NOT the published @jtorm/*
// packages) so tests can boil  HTML + TSS + data -> HTML  end-to-end.
//
// SOURCE OF TRUTH for the DI graph: ../../../nodejs-jtorm-ui-engine/bootstrap/jtorm.js
// Deliberate deltas (see docs/superpowers/specs/2026-06-24-jtorm-full-pipeline-harness-design.md):
//   - framework's own error-handler (not @jtorm/nodejs-error-handler)
//   - no axios edge (request-model is native fetch); no plugins / mq-polyfill (v1)
//   - we wire textMethod.languageModel, which the engine bootstrap OMITS even
//     though text-method.js:23 dereferences it (latent engine bug — flagged).

const util = require('node:util');
const fs = require('node:fs');
const _ = require('lodash');
const { JSDOM } = require('jsdom');
const { uisDiskPath } = require('./uis-disk-path.js');

// Parsers
const { jTormTSSParser } = require('../../src/parsers/tss-parser/src/tss-parser.js');
const { jTormDataParser } = require('../../src/parsers/data-parser/src/data-parser.js');
// Handlers
const { jTormHandler } = require('../../src/handlers/handler/src/handler.js');
const { jTormHandlerWrapper } = require('../../src/handlers/handler-wrapper/src/handler-wrapper.js');
const { jTormErrorHandler } = require('../../src/handlers/error-handler/src/error-handler.js');
// Models
const { jTormViewModel } = require('../../src/models/view-model/src/view-model.js');
const { jTormDocumentModel } = require('../../src/models/document-model/src/document-model.js');
const { jTormEventModel } = require('../../src/models/event-model/src/event-model.js');
const { jTormLanguageModel } = require('../../src/models/language-model/src/language-model.js');
const { jTormConfigModel } = require('../../src/models/config-model/src/config-model.js');
const { jTormUiResolverModel } = require('../../src/models/ui-resolver-model/src/ui-resolver-model.js');
const { jTormUiCompilerModel } = require('../../src/models/ui-compiler-model/src/ui-compiler-model.js');
// Fetch models + get verb (request transport seam — get boils via an injected transport)
const { jTormRequestModel } = require('../../src/models/request-model/src/request-model.js');
const { jTormDataModel } = require('../../src/models/data-model/src/data-model.js');
const { jTormHtmlModel } = require('../../src/models/html-model/src/html-model.js');
const { jTormTssModel } = require('../../src/models/tss-model/src/tss-model.js');
const { jTormGetMethod } = require('../../src/methods/get-method/src/get-method.js');
// Methods (v1 subset — text/attr/attrs/each/if/insert; see spec §2)
const { jTormTextMethod } = require('../../src/methods/text-method/src/text-method.js');
const { jTormAttrMethod } = require('../../src/methods/attr-method/src/attr-method.js');
const { jTormAttrsMethod } = require('../../src/methods/attrs-method/src/attrs-method.js');
const { jTormEachMethod } = require('../../src/methods/each-method/src/each-method.js');
const { jTormIfMethod } = require('../../src/methods/if-method/src/if-method.js');
const { jTormInsertMethod } = require('../../src/methods/insert-method/src/insert-method.js');
const { jTormMoveMethod } = require('../../src/methods/move-method/src/move-method.js');
const { jTormSwapMethod } = require('../../src/methods/swap-method/src/swap-method.js');
const { jTormWrapMethod } = require('../../src/methods/wrap-method/src/wrap-method.js');
const { jTormUnwrapMethod } = require('../../src/methods/unwrap-method/src/unwrap-method.js');
const { jTormRemoveMethod } = require('../../src/methods/remove-method/src/remove-method.js');
const { jTormFindMethod } = require('../../src/methods/find-method/src/find-method.js');
const { jTormTitleMethod } = require('../../src/methods/title-method/src/title-method.js');
const { jTormTimeMethod } = require('../../src/methods/time-method/src/time-method.js');
// Gate-B (schema.org → component) path: the `ui` verb + its mediatarget/mediaquery
// deps, the data/config/time methods components bind through, the uis ARRAY (resolves
// code-review #7), and the ui-cache model+plugin. (css/js stay deferred — see
// wiring.test.js.)
const { jTormUiMethod } = require('../../src/methods/ui-method/src/ui-method.js');
const { jTormDataMethod } = require('../../src/methods/data-method/src/data-method.js');
const { jTormConfigMethod } = require('../../src/methods/config-method/src/config-method.js');
const { jTormMediatargetMethod } = require('../../src/methods/mediatarget-method/src/mediatarget-method.js');
const { jTormMediaqueryMethod } = require('../../src/methods/mediaquery-method/src/mediaquery-method.js');
const { jTormUiCacheModel } = require('../../src/models/ui-cache-model/src/ui-cache-model.js');
const { jTormUiCachePlugin } = require('../../src/plugins/ui-cache-plugin/src/ui-cache-plugin.js');
// `layer` — deferred-fragment verb: layer-method stashes a child fragment via
// layer-model, the layer-plugin replays it at the matching event phase (after.view
// for site-navigation-element's active-link marking). Listed BEFORE ui-cache in
// eventModel.plugins so its deferred transforms land before ui-cache snapshots the body.
const { jTormLayerMethod } = require('../../src/methods/layer-method/src/layer-method.js');
const { jTormLayerModel } = require('../../src/models/layer-model/src/layer-model.js');
const { jTormLayerPlugin } = require('../../src/plugins/layer-plugin/src/layer-plugin.js');
// The uis array members — each a published @jtorm/*-ui package with a baked-in
// `mapper`; the .tss/.html/.json artifacts they reference (`@s/…`, `@h/@e/…`) are
// fetched at render time and served from src/uis/** by the transport below.
const { jTormSchemaUi } = require('../../src/uis/schema-ui/src/schema-ui.js');
const { jTormComponentsUI } = require('../../src/uis/components-ui/src/components-ui.js');
const { jTormHtmlUi } = require('../../src/uis/html-ui/src/html-ui.js');

// insert aliases — each/insert dispatch insert modes through the methods map
// (mirrors the engine's jTormInsertAlias).
class InsertAlias {
    constructor(m) { this.m = m; this.params = ['h', 't', 'd', 'm', 'p', 's', 'cid', 'cs']; }
    validate(v) { v.d.m = this.m; return jTormInsertMethod.validate(v); }
    async handle(v) { v.d.m = this.m; return await jTormInsertMethod.handle(v); }
}

const methods = {
    text: jTormTextMethod,
    attr: jTormAttrMethod,
    attrs: jTormAttrsMethod,
    each: jTormEachMethod,
    if: jTormIfMethod,
    insert: jTormInsertMethod,
    move: jTormMoveMethod,
    swap: jTormSwapMethod,
    wrap: jTormWrapMethod,
    unwrap: jTormUnwrapMethod,
    remove: jTormRemoveMethod,
    find: jTormFindMethod,
    title: jTormTitleMethod,
    time: jTormTimeMethod,
    get: jTormGetMethod,
    ui: jTormUiMethod,
    data: jTormDataMethod,
    config: jTormConfigMethod,
    mediatarget: jTormMediatargetMethod,
    mediaquery: jTormMediaqueryMethod,
    layer: jTormLayerMethod,
    append: new InsertAlias('a'),
    prepend: new InsertAlias('p'),
    before: new InsertAlias('b'),
    after: new InsertAlias('af'),
    replace: new InsertAlias('r'),
    inner: new InsertAlias('i')
};

// --- DI (mirrors bootstrap/jtorm.js `// DI` block, scoped to the v1 subset) ---
jTormErrorHandler.util = util;
jTormViewModel._ = _;
jTormViewModel.documentModel = jTormDocumentModel;
jTormUiMethod.resolverModel = jTormUiResolverModel;
jTormUiMethod.compilerModel = jTormUiCompilerModel;
jTormDocumentModel.errorHandler = jTormInsertMethod.errorHandler = jTormUiMethod.errorHandler = jTormErrorHandler;
// Host XSS sanitizer seam (DI): insert-method's h: content write (inner/append/
// prepend/before/after/replace), wrap/swap raw html, and get-method's get{h}
// body run raw markup through an injected sanitize(html) before it becomes live DOM.
// Default null → PASSTHROUGH (dep-free greenfield; no host wires it yet). Tests opt
// in via setSanitize(); reset() re-applies it each boil (default null → no leak).
jTormInsertMethod.sanitize = jTormGetMethod.sanitize = jTormWrapMethod.sanitize = jTormSwapMethod.sanitize = null;
jTormAttrsMethod.tssParser = jTormViewModel.tssParser = jTormDataParser.tssParser = jTormTSSParser;
jTormHandler.dataParser = jTormAttrsMethod.dataParser = jTormIfMethod.dataParser = jTormTextMethod.dataParser = jTormUiMethod.dataParser = jTormDataParser;
jTormTextMethod.languageModel = jTormLanguageModel; // engine bootstrap OMITS this; text-method.js:23 needs it
jTormTimeMethod.languageModel = jTormLanguageModel;
jTormLanguageModel.configModel = jTormConfigModel;
jTormAttrsMethod.attrMethod = jTormAttrMethod;
jTormEventModel.plugins = [jTormLayerPlugin, jTormUiCachePlugin];
jTormHandler.eventModel = jTormHandlerWrapper.eventModel = jTormEventModel;
jTormHandler.methods = jTormEachMethod.methods = jTormMoveMethod.methods = jTormUiCompilerModel.methods = methods;
jTormInsertMethod.viewModel = jTormHandler.viewModel = jTormHandlerWrapper.viewModel = jTormEachMethod.viewModel = jTormAttrsMethod.viewModel = jTormMoveMethod.viewModel = jTormUiCompilerModel.viewModel = jTormViewModel;
jTormHandlerWrapper.handler = jTormEachMethod.handler = jTormIfMethod.handler = jTormSwapMethod.handler = jTormHandler;
jTormInsertMethod.handlerWrapper = jTormEachMethod.handlerWrapper = jTormWrapMethod.handlerWrapper = jTormHandlerWrapper;
// fetch models + get verb DI (request transport seam) — get() resolves data/html/tss via the models
jTormDataModel.requestModel = jTormHtmlModel.requestModel = jTormTssModel.requestModel = jTormRequestModel;
jTormTssModel.tssParser = jTormTSSParser;
jTormGetMethod.models = { data: jTormDataModel, html: jTormHtmlModel, tss: jTormTssModel };
// Gate-B DI (mirrors nodejs-context/src/context.js `ui` wiring, NOT its axios transport).
jTormDataMethod.dataParser = jTormDataParser;
jTormConfigMethod.configModel = jTormConfigModel;
jTormMediatargetMethod.mediaqueryMethod = jTormMediaqueryMethod;
// matchMedia shim — dep-free stand-in for the engine's mq-polyfill. Deterministic:
// evaluates a query's min/max-width against a fixed 1366px desktop viewport (the
// engine's resizeTo default), so mediatarget.current is stable. Only affects the
// `m:'1'` responsive component variants (boxed/desktop/…); the v1 slice uses `t:'0'`
// (mediatarget off), so it never changes that output.
const matchMedia = (q) => {
    const W = 1366;
    let m = true, r;
    if ((r = /min-width:\s*(\d+)px/.exec(q))) m = m && W >= +r[1];
    if ((r = /max-width:\s*(\d+)px/.exec(q))) m = m && W <= +r[1];
    return { matches: m, media: q };
};
jTormMediaqueryMethod.windowModel = { matchMedia };
jTormUiMethod.uis = [jTormSchemaUi, jTormComponentsUI, jTormHtmlUi];
for (const u of jTormUiMethod.uis) u.url = ''; // transport resolves the `@s/@c/@h` alias directly (parseUrl is css/js-only, never on the get path), so .url is unused — neutralise the baked CDN host
jTormUiMethod.mediatargetMethod = jTormMediatargetMethod;
jTormUiMethod.ui = { mapper: null }; // host UI-mapper override slot (no custom mapper in the harness)
jTormUiMethod.framework = 'schema';
jTormUiCacheModel.saveModel = null;
jTormUiCachePlugin.uiCacheModel = jTormUiCacheModel;
// layer DI (mirrors context.js): method + plugin share the layer-model; the plugin
// replays stashed fragments through the handler against a copied view. saveModel=null
// → no persistence (parity with ui-cache-model).
jTormLayerMethod.layerModel = jTormLayerPlugin.layerModel = jTormLayerModel;
jTormLayerPlugin.viewModel = jTormViewModel;
jTormLayerPlugin.handler = jTormHandler;
jTormLayerModel.saveModel = null;
const DEFAULT_TRANSPORT = jTormRequestModel.transport; // restore after any per-render fixture override

// Host XSS sanitizer seam override (see the DI block). A test opts in with
// setSanitize(fn) before render(); reset() re-applies it to the raw-sink
// singletons each boil and clears to null when unset (no leak between boils).
let SANITIZE = null;
function setSanitize(fn) { SANITIZE = fn || null; }

// --- Init: tss-parser config FIRST (data-parser builds its regexes from the
// quote chars), then init() each wired unit that has one, then a default language.
jTormTSSParser.config({});
jTormDataParser.init();
jTormMediaqueryMethod.init();  // resolve matchMedia from windowModel
jTormMediatargetMethod.init(); // build `current` targets (consumes mediaquery.m)
jTormUiMethod.init();          // build the per-uis alias regexps from .uis
jTormUiCacheModel.init();      // saveModel === null → no-op (parity with the engine)
jTormEventModel.init();        // register uiCachePlugin into the event tree (plugins set above)
jTormLanguageModel.setLanguage('en');

const WIRED_METHODS = Object.keys(methods);

/** Reset the mutable state of the WIRED singletons between boils. */
function reset() {
    jTormTSSParser.tree = [];
    jTormTSSParser.pairs = [];
    jTormTSSParser.tss = '';
    jTormLanguageModel.data = {};
    jTormDataModel.c = new Map(); // fetch-model caches (bounded-LRU singletons)
    jTormHtmlModel.c = new Map();
    jTormTssModel.c = new Map();
    jTormUiMethod.cache = {};          // resolved-component cache (singleton)
    jTormUiCacheModel.cache = {};      // per-cid rendered-fragment cache (nested store)
    jTormUiCacheModel.order = new Map(); // LRU recency tracker parallel to cache
    jTormUiCacheModel.updated = 0;
    jTormLayerModel.layers = {};       // stashed deferred fragments (per layer id)
    jTormLayerModel.event = { before: { iteration: [] }, after: { iteration: [], view: [] } }; // registered ids per phase
    jTormLayerModel.cid = null;
    jTormLayerModel.updated = 0;
    jTormLayerPlugin.currentCid = [];
    jTormRequestModel.base = '';
    jTormRequestModel.timeout = 0;
    jTormRequestModel.transport = DEFAULT_TRANSPORT; // drop any per-render fixture override
    jTormInsertMethod.sanitize = jTormGetMethod.sanitize = jTormWrapMethod.sanitize = jTormSwapMethod.sanitize = SANITIZE; // host sanitizer seam (default null → passthrough)
}

/** Resolve one artifact part (quote-stripped) to its served text: explicit fixture
 *  first, else the real src/uis/** disk file, else null (a miss). */
function artifactText(fixtures, part) {
    const f = fixtures && fixtures[part];
    if (f) return f.text;
    const p = uisDiskPath(part);
    return p && fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

/**
 * Build a deterministic fetch-shaped transport. A component with MULTIPLE `t`
 * artifacts (e.g. Thing.default = thing-default + thing-update-1.0.1) reaches the
 * transport COMMA-JOINED — request-model coerces the URL array (`['@s/a','@s/b']` →
 * `@s/a,@s/b`). Split it, serve each part (explicit { url: {json?, text?} } fixture
 * first — test-supplied get{d} data or a synthetic artifact — else the real src/uis/**
 * file), and concatenate (the get fetches one TSS blob); a single artifact is the
 * 1-part case. Any missing part → 404 (a miss → get throws → loud). get{d} (json) is
 * always single-artifact, so json resolves from the first part.
 */
function fixtureTransport(fixtures) {
    return async function (u) {
        const parts = String(u).split(',').map(s => s.replace(/^['"]|['"]$/g, ''));
        const texts = parts.map(p => artifactText(fixtures, p));
        if (texts.some(t => t === null)) return { ok: false, status: 404 };
        const f0 = fixtures && fixtures[parts[0]];
        return {
            ok: true,
            status: 200,
            text: async () => texts.join('\n'),
            json: async () => (f0 ? f0.json : JSON.parse(texts[0]))
        };
    };
}

/**
 * Boil one  html + tss + data  through the real pipeline. Async.
 *
 * PAGE-LEVEL boils: pass a full `<html><head>…</head><body>…</body></html>` string —
 * documentModel.create's `/<html/` branch parses it (head + body present, root attrs
 * copied) so page-level components (`head { … }`, `body { … }`, `ul { … }`) reach
 * their document-global targets. `head` is returned alongside `body` for asserting on
 * injected <head> content (components-ui head.default/head.id → doc.meta/doc.link).
 *
 * @param {string} [url] document URL (jsdom origin); some flows need an absolute base.
 * @param {object|null} [fixtures] { url: {json?, text?} } map → injected fetch transport for `get`.
 * @returns {Promise<{html:string, head:string, body:string}>} full-doc HTML, <head> and <body> innerHTML.
 */
async function render(html, tss, data, url = 'http://localhost/', fixtures = null) {
    const { window } = new JSDOM('', { url });
    jTormDocumentModel.windowModel = window;
    reset();
    // Always install the combined transport: component artifacts are disk-served from
    // src/uis/** even when a boil supplies no data fixtures (a bare `->ui` still fetches).
    jTormRequestModel.transport = fixtureTransport(fixtures || {});

    const v = await jTormViewModel.create(html, tss, data);
    await jTormEventModel.handle(v, 'before', 'view');
    const doc = await jTormHandler.handle(null, null, null, 1, v);
    const v2 = await jTormViewModel.create(doc, null, data, v.c);
    await jTormEventModel.handle(v2, 'after', 'view');

    return { html: v2.h.html(), head: v2.h.head(), body: v2.h.body() };
}

module.exports = { render, reset, setSanitize, WIRED_METHODS, uisDiskPath };
