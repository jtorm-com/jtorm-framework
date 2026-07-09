'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormHandlerWrapper: hw } = require('../../src/handlers/handler-wrapper/src/handler-wrapper.js');

const e = hw.eventModel, h = hw.handler, v = hw.viewModel;

test.afterEach(() => {
  hw.eventModel = e;
  hw.handler = h;
  hw.viewModel = v;
});

test('handler-wrapper carries v.c.locale into detached fragment contexts', async () => {
  let c;

  hw.eventModel = { handle: async () => {} };
  hw.handler = { handle: async () => '<span>Hallo</span>' };
  hw.viewModel = {
    create: async (h, t, m, ctx) => {
      c = ctx;
      return { h: { body: () => '<span>Hallo</span>' } };
    }
  };

  await hw.handle('', { c: [{}] }, {}, { c: { locale: 'nl-NL' } });

  assert.equal(c.locale, 'nl-NL');
  assert.equal(c.c, 1);
  assert.equal(c.b, 'body');
});
