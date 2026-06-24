'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');

test('insert m:i sets innerHTML from inline h', async () => {
  const { body } = await render(
    '<body><div>old</div></body>',
    "div->insert { h: '<b>hi</b>'; m: 'i'; }",
    {}
  );
  assert.equal(body, '<div><b>hi</b></div>');
});

test('append alias inserts inline h at beforeend', async () => {
  const { body } = await render(
    '<body><div>old</div></body>',
    "div->append { h: '<b>hi</b>'; }",
    {}
  );
  assert.equal(body, '<div>old<b>hi</b></div>');
});

test('insert on a zero-match selector throws via the error-handler (characterizes #14)', async () => {
  const log = console.log;
  console.log = () => {}; // silence the error-handler's pre-throw v dump
  try {
    await assert.rejects(
      render('<body><p>x</p></body>', ".none->insert { h: '<b>y</b>'; m: 'i'; }", {}),
      /\.none not found/
    );
  } finally {
    console.log = log;
  }
});
