'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormLanguageModel: lm } = require('../../src/models/language-model/src/language-model.js');

test('get() falls back to the base language when the key is missing in the primary', () => {
  lm.data = {};
  lm.setLanguage('nl-NL');           // language='nl-NL', fallback='nl'
  lm.set('nl', 'greeting', 'Hallo'); // only the fallback language has the key
  assert.equal(lm.get('greeting'), 'Hallo');
});
