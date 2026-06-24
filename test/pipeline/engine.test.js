'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');

// Wiring smoke test: the full-pipeline harness loads and boils plain HTML
// (no TSS) round-tripping the body through the real src/** modules.
test('render() boils plain HTML with no TSS (wiring smoke test)', async () => {
  const { body, html } = await render('<body><p>x</p></body>', '', {});
  assert.match(body, /<p>x<\/p>/);
  assert.match(html, /^<!DOCTYPE html>/);
});
