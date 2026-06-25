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
const _ = require('lodash');
const { JSDOM } = require('jsdom');

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

// insert aliases — each/insert dispatch insert modes through the methods map
// (mirrors the engine's jTormInsertAlias).
class InsertAlias {
    constructor(m) { this.m = m; this.params = ['h', 'd', 'm', 'p', 's', 'cid', 'cs']; }
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
jTormDocumentModel.errorHandler = jTormInsertMethod.errorHandler = jTormErrorHandler;
jTormAttrsMethod.tssParser = jTormViewModel.tssParser = jTormDataParser.tssParser = jTormTSSParser;
jTormHandler.dataParser = jTormAttrsMethod.dataParser = jTormIfMethod.dataParser = jTormTextMethod.dataParser = jTormDataParser;
jTormTextMethod.languageModel = jTormLanguageModel; // engine bootstrap OMITS this; text-method.js:23 needs it
jTormLanguageModel.configModel = jTormConfigModel;
jTormAttrsMethod.attrMethod = jTormAttrMethod;
jTormEventModel.plugins = [];
jTormHandler.eventModel = jTormHandlerWrapper.eventModel = jTormEventModel;
jTormHandler.methods = jTormEachMethod.methods = jTormMoveMethod.methods = methods;
jTormInsertMethod.viewModel = jTormHandler.viewModel = jTormHandlerWrapper.viewModel = jTormEachMethod.viewModel = jTormAttrsMethod.viewModel = jTormMoveMethod.viewModel = jTormViewModel;
jTormHandlerWrapper.handler = jTormEachMethod.handler = jTormIfMethod.handler = jTormSwapMethod.handler = jTormHandler;
jTormInsertMethod.handlerWrapper = jTormEachMethod.handlerWrapper = jTormWrapMethod.handlerWrapper = jTormHandlerWrapper;

// --- Init: tss-parser config FIRST (data-parser builds its regexes from the
// quote chars), then init() each wired unit that has one, then a default language.
jTormTSSParser.config({});
jTormDataParser.init();
jTormEventModel.init();
jTormLanguageModel.setLanguage('en');

const WIRED_METHODS = Object.keys(methods);

/** Reset the mutable state of the WIRED singletons between boils. */
function reset() {
    jTormTSSParser.tree = [];
    jTormTSSParser.pairs = [];
    jTormTSSParser.tss = '';
    jTormViewModel.data.c.c = 1; // restore the shared (prototype) context defaults
    jTormViewModel.data.c.s = null; // handler-wrapper writes v.c.s (= shared data.c.s)
    jTormLanguageModel.data = {};
}

/**
 * Boil one  html + tss + data  through the real pipeline. Async.
 * @returns {Promise<{html:string, body:string}>} full-doc HTML and <body> innerHTML.
 */
async function render(html, tss, data, url = 'http://localhost/') {
    const { window } = new JSDOM('', { url });
    jTormDocumentModel.windowModel = window;
    reset();

    const v = await jTormViewModel.create(html, tss, data);
    await jTormEventModel.handle(v, 'before', 'view');
    const doc = await jTormHandler.handle(null, null, null, 1, v);
    const v2 = await jTormViewModel.create(doc, null, data, 0);
    await jTormEventModel.handle(v2, 'after', 'view');

    return { html: v2.h.html(), body: v2.h.body() };
}

module.exports = { render, reset, WIRED_METHODS };
