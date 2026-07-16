'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { reset, WIRED_METHODS, WIRED_PLUGINS } = require('../helpers/engine.js');
const { jTormUiMethod } = require('../../src/methods/ui-method/src/ui-method.js');
const { jTormUiResolverModel } = require('../../src/models/ui-resolver-model/src/ui-resolver-model.js');
const { jTormUiCompilerModel } = require('../../src/models/ui-compiler-model/src/ui-compiler-model.js');
const { jTormHandler } = require('../../src/handlers/handler/src/handler.js');
const { jTormAttrsMethod } = require('../../src/methods/attrs-method/src/attrs-method.js');
const { jTormEachMethod } = require('../../src/methods/each-method/src/each-method.js');
const { jTormMoveMethod } = require('../../src/methods/move-method/src/move-method.js');
const { jTormDataParser } = require('../../src/parsers/data-parser/src/data-parser.js');
const { jTormIfMethod } = require('../../src/methods/if-method/src/if-method.js');
const { jTormRegexPolicyModel } = require('../../src/models/regex-policy-model/src/regex-policy-model.js');
const { jTormEventModel } = require('../../src/models/event-model/src/event-model.js');
const { jTormJsonLdModel } = require('../../src/models/json-ld-model/src/json-ld-model.js');
const { jTormJsonLdPlugin } = require('../../src/plugins/json-ld-plugin/src/json-ld-plugin.js');
const { jTormUiCachePlugin } = require('../../src/plugins/ui-cache-plugin/src/ui-cache-plugin.js');
const { jTormRenderContextModel } = require('../../src/models/render-context-model/src/render-context-model.js');
const { jTormPromiseCacheModel } = require('../../src/models/promise-cache-model/src/promise-cache-model.js');
const { jTormAssetPluginModel } = require('../../src/models/asset-plugin-model/src/asset-plugin-model.js');
const { jTormRequestModel } = require('../../src/models/request-model/src/request-model.js');
const { jTormDataModel } = require('../../src/models/data-model/src/data-model.js');
const { jTormHtmlModel } = require('../../src/models/html-model/src/html-model.js');
const { jTormTssModel } = require('../../src/models/tss-model/src/tss-model.js');
const { jTormUiManifestModel } = require('../../src/models/ui-manifest-model/src/ui-manifest-model.js');
const { jTormLayerModel } = require('../../src/models/layer-model/src/layer-model.js');
const { jTormUiCacheModel } = require('../../src/models/ui-cache-model/src/ui-cache-model.js');
const { jTormCssPlugin } = require('../../src/plugins/css-plugin/src/css-plugin.js');
const { jTormJsPlugin } = require('../../src/plugins/js-plugin/src/js-plugin.js');
const { jTormCssMethod } = require('../../src/methods/css-method/src/css-method.js');
const { jTormJsMethod } = require('../../src/methods/js-method/src/js-method.js');

// DI-drift guard: every src/methods/*-method must be either wired by the harness
// or explicitly deferred. A newly-added method fails here until it is accounted
// for — turning silent harness drift into a loud test failure (spec §2/§10).
const DEFERRED = new Set([
  // Not needed by the Gate-B schema.org slice (test/pipeline/ui.test.js): css/js are
  // asset-injection plugins (absent from every active uis .tss). ui/data/config/time/
  // mediatarget/mediaquery are WIRED via the uis array and direct pipeline goldens;
  // layer is now WIRED too (its method + layer-model + layer-plugin in eventModel.plugins).
  'css', 'js'
]);

test('every src/methods/*-method is wired or explicitly deferred (DI-drift guard)', () => {
  const wired = new Set(WIRED_METHODS);
  const dir = path.join(__dirname, '..', '..', 'src', 'methods');
  const found = fs.readdirSync(dir)
    .filter(d => d.endsWith('-method'))
    .map(d => d.replace(/-method$/, ''));

  const unaccounted = found.filter(m => !wired.has(m) && !DEFERRED.has(m));
  assert.deepEqual(
    unaccounted, [],
    `Unaccounted methods — wire them in engine.js or add to DEFERRED: ${unaccounted.join(', ')}`
  );
});

test('ui verb is wired to resolver/compiler models before facade configuration', () => {
  assert.equal(jTormUiMethod.resolverModel, jTormUiResolverModel);
  assert.equal(jTormUiMethod.compilerModel, jTormUiCompilerModel);
  assert.equal(jTormUiMethod.dataParser, jTormDataParser);
  assert.equal(jTormUiCompilerModel.handler, jTormHandler);
  assert.ok(jTormUiCompilerModel.methods.ui);
  assert.ok(jTormUiCompilerModel.viewModel);
  assert.ok(Array.isArray(jTormUiResolverModel.uis));
});

test('synthesized attrs/each/move verbs share the handler dispatch owner', () => {
  assert.equal(jTormAttrsMethod.handler, jTormHandler);
  assert.equal(jTormEachMethod.handler, jTormHandler);
  assert.equal(jTormMoveMethod.handler, jTormHandler);
});

test('if verb is wired to the bounded regex policy model', () => {
  assert.equal(jTormIfMethod.regexPolicyModel, jTormRegexPolicyModel);
});

test('shared render, promise-cache, and asset policies are host-injected once', () => {
  for (const model of [jTormRequestModel, jTormUiManifestModel, jTormLayerModel, jTormUiCacheModel])
    assert.equal(model.renderContextModel, jTormRenderContextModel)
  ;
  for (const model of [jTormDataModel, jTormHtmlModel, jTormTssModel, jTormUiManifestModel])
    assert.equal(model.promiseCacheModel, jTormPromiseCacheModel)
  ;
  assert.equal(jTormAssetPluginModel.renderContextModel, jTormRenderContextModel);
  assert.equal(jTormCssPlugin.assetPluginModel, jTormAssetPluginModel);
  assert.equal(jTormJsPlugin.assetPluginModel, jTormAssetPluginModel);
});

test('harness reset restores the complete asset-policy injection graph', () => {
  const bad = {};
  jTormAssetPluginModel.renderContextModel = bad;
  jTormCssPlugin.assetPluginModel = jTormJsPlugin.assetPluginModel = bad;
  jTormCssPlugin.cssMethod = jTormJsPlugin.jsMethod = bad;
  jTormCssPlugin.requestModel = jTormJsPlugin.requestModel = bad;
  jTormCssPlugin.uiResolverModel = jTormJsPlugin.uiResolverModel = bad;
  jTormCssMethod.cssPlugin = jTormJsMethod.jsPlugin = bad;

  reset();

  assert.equal(jTormAssetPluginModel.renderContextModel, jTormRenderContextModel);
  assert.equal(jTormCssPlugin.assetPluginModel, jTormAssetPluginModel);
  assert.equal(jTormJsPlugin.assetPluginModel, jTormAssetPluginModel);
  assert.equal(jTormCssPlugin.cssMethod, jTormCssMethod);
  assert.equal(jTormJsPlugin.jsMethod, jTormJsMethod);
  assert.equal(jTormCssPlugin.requestModel, jTormRequestModel);
  assert.equal(jTormJsPlugin.requestModel, jTormRequestModel);
  assert.equal(jTormCssPlugin.uiResolverModel, jTormUiResolverModel);
  assert.equal(jTormJsPlugin.uiResolverModel, jTormUiResolverModel);
  assert.equal(jTormCssMethod.cssPlugin, jTormCssPlugin);
  assert.equal(jTormJsMethod.jsPlugin, jTormJsPlugin);
});

test('inline JSON-LD is DI-wired between render effects and ui-cache', () => {
  assert.ok(WIRED_PLUGINS.includes(jTormJsonLdPlugin));
  assert.equal(jTormJsonLdPlugin.jsonLdModel, jTormJsonLdModel);

  const plugins = jTormEventModel.event.after.view;
  assert.ok(plugins.includes(jTormJsonLdPlugin));
  assert.ok(plugins.indexOf(jTormJsonLdPlugin) < plugins.indexOf(jTormUiCachePlugin));
  assert.equal(jTormJsonLdPlugin.event.after.view.weight, 50);
});
