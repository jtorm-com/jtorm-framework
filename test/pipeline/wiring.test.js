'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { WIRED_METHODS } = require('../helpers/engine.js');
const { jTormUiMethod } = require('../../src/methods/ui-method/src/ui-method.js');
const { jTormUiResolverModel } = require('../../src/models/ui-resolver-model/src/ui-resolver-model.js');
const { jTormUiCompilerModel } = require('../../src/models/ui-compiler-model/src/ui-compiler-model.js');
const { jTormDataParser } = require('../../src/parsers/data-parser/src/data-parser.js');
const { jTormIfMethod } = require('../../src/methods/if-method/src/if-method.js');
const { jTormRegexPolicyModel } = require('../../src/models/regex-policy-model/src/regex-policy-model.js');

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
  assert.ok(jTormUiCompilerModel.methods.ui);
  assert.ok(jTormUiCompilerModel.viewModel);
  assert.ok(Array.isArray(jTormUiResolverModel.uis));
});

test('if verb is wired to the bounded regex policy model', () => {
  assert.equal(jTormIfMethod.regexPolicyModel, jTormRegexPolicyModel);
});
