'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');

test('text(label: path)->inner { h: label } renders the resolved value as innerHTML', async () => {
  const { body } = await render(
    '<body><span>z</span></body>',
    "span->text(label: title)->inner { h: label; }",
    { title: 'Hello' }
  );
  assert.equal(body, '<span>Hello</span>');
});

test('text alone only preps the model — it does NOT write to the DOM (characterization)', async () => {
  const { body } = await render(
    '<body><span>z</span></body>',
    "span->text { label: title; }",
    { title: 'Hello' }
  );
  assert.equal(body, '<span>z</span>');
});
