'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');

test('attr sets an attribute from a data path', async () => {
  const { body } = await render(
    '<body><a>x</a></body>',
    "a->attr { n: 'href'; v: url; }",
    { url: '/p' }
  );
  assert.equal(body, '<a href="/p">x</a>');
});

test('attrs sets multiple attributes from comma-separated name/value lists', async () => {
  const { body } = await render(
    '<body><a>x</a></body>',
    "a->attrs { n: 'data-x,data-y'; v: foo,bar; }",
    { foo: '1', bar: '2' }
  );
  assert.equal(body, '<a data-x="1" data-y="2">x</a>');
});

test('attr on a zero-match selector throws via the error-handler (characterizes #14)', async () => {
  const log = console.log;
  console.log = () => {}; // silence the error-handler's pre-throw v dump
  try {
    await assert.rejects(
      render('<body><p>x</p></body>', ".none->attr { n: 'x'; v: '1'; }", {}),
      /\.none not found/
    );
  } finally {
    console.log = log;
  }
});
