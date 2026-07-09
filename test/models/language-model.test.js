'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormLanguageModel: lm } = require('../../src/models/language-model/src/language-model.js');

test.afterEach(() => {
  lm.data = {};
  lm.language = undefined;
  lm.fallback = undefined;
});

test('get() falls back to the base language when the key is missing in the primary', () => {
  lm.data = {};
  lm.setLanguage('nl-NL');           // language='nl-NL', fallback='nl'
  lm.set('nl', 'greeting', 'Hallo'); // only the fallback language has the key
  assert.equal(lm.get('greeting'), 'Hallo');
});

test('get(key, locale) resolves explicit locales without changing the default language', () => {
  lm.data = {};
  lm.setLanguage('fr-FR');
  lm.set('en', 'greeting', 'Hello');
  lm.set('nl', 'greeting', 'Hallo');
  lm.set('fr', 'greeting', 'Bonjour');

  assert.equal(lm.get('greeting', 'en-US'), 'Hello');
  assert.equal(lm.get('greeting', 'nl-NL'), 'Hallo');
  assert.equal(lm.language, 'fr-FR');
  assert.equal(lm.fallback, 'fr');
  assert.equal(lm.get('greeting'), 'Bonjour');
});
