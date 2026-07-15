'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormTextMethod: text } = require('../../src/methods/text-method/src/text-method.js');
const { jTormTimeMethod: time } = require('../../src/methods/time-method/src/time-method.js');
const { jTormLanguageModel: lm } = require('../../src/models/language-model/src/language-model.js');

const d = text.dataParser, tl = text.languageModel, il = time.languageModel, it = time.time;

test.afterEach(() => {
  text.dataParser = d;
  text.languageModel = tl;
  time.languageModel = il;
  time.time = it;
  lm.data = {};
  lm.language = undefined;
  lm.fallback = undefined;
});

function lang() {
  lm.data = {};
  lm.setLanguage('en-US');
  lm.set('en', 'greeting', 'Hello');
  lm.set('nl', 'greeting', 'Hallo');
  lm.set('en', 'Yesterday', 'Yesterday');
  lm.set('nl', 'Yesterday', 'Gisteren');
}

function dataParser() {
  return {
    bindings: t => t.p,
    evaluate: (m, k) => m[k]
  };
}

test('text uses v.c.locale when present', async () => {
  lang();
  text.dataParser = dataParser();
  text.languageModel = lm;

  const v = { t: { p: { label: 'key' } }, m: { key: 'greeting' }, c: { locale: 'nl-NL' } };
  await text.handle(v);

  assert.equal(v.m.label, 'Hallo');
  assert.equal(lm.language, 'en-US');
});

test('text falls back to the default language when v.c.locale is absent', async () => {
  lang();
  text.dataParser = dataParser();
  text.languageModel = lm;

  const v = { t: { p: { label: 'key' } }, m: { key: 'greeting' }, c: {} };
  await text.handle(v);

  assert.equal(v.m.label, 'Hello');
});

test('time uses v.c.locale when present', () => {
  lang();
  time.languageModel = lm;
  time.time = () => ['Yesterday'];

  const v = { d: { as: 'html', dT: '2020-01-01T00:00:00.000Z' }, c: { locale: 'nl-NL' } };
  time.handle(v);

  assert.equal(v.io.d.html, 'Gisteren');
  assert.equal(lm.language, 'en-US');
});

test('time falls back to the default language when v.c.locale is absent', () => {
  lang();
  time.languageModel = lm;
  time.time = () => ['Yesterday'];

  const v = { d: { as: 'html', dT: '2020-01-01T00:00:00.000Z' }, c: {} };
  time.handle(v);

  assert.equal(v.io.d.html, 'Yesterday');
});
