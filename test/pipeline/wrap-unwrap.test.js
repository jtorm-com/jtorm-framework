'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');

// unwrap: replace the rule selector's content with the inner selector's content.
test('unwrap puts the inner selector content into the rule element', async () => {
  const { body } = await render(
    '<body><div><p class="in">X</p></div></body>',
    "div->unwrap { s: '.in'; }",
    {}
  );
  assert.equal(body, '<div>X</div>');
});

// wrap: wrap the rule selector's content in the given html, placing the original
// content at the inner selector (s) inside that html.
test('wrap nests the original content inside the wrapper html at s', async () => {
  const { body } = await render(
    '<body><span>X</span></body>',
    "span->wrap { s: '.w'; h: '<div class=\"w\"></div>'; }",
    {}
  );
  assert.equal(body, '<span><div class="w">X</div></span>');
});
