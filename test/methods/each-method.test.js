'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormEachMethod: each } = require('../../src/methods/each-method/src/each-method.js');

const h = each.handler, v = each.viewModel;

test.afterEach(() => {
  each.handler = h;
  each.viewModel = v;
});

test('each(e:) carries v.c.locale into cloned element boils', async () => {
  let c;
  const pc = { locale: 'nl-NL' };
  const el = { outerHTML: '<li></li>', parentNode: { replaceChild: () => {} } };

  each.handler = {
    handle: async (h, t, m, ctx) => {
      c = ctx;
      return { select: () => ({}), body: () => '<li>Hallo</li>' };
    },
    dispatch: async () => ({ children: true, repeat: false, data: undefined })
  };
  each.viewModel = { copy: () => ({}) };

  await each.handle({
    d: { d: ['greeting'], e: 'li' },
    h: { selectAll: () => [el] },
    c: pc,
    t: { s: 'ul', p: { e: 'li' }, c: [{}] },
    m: {}
  });

  assert.equal(c.c, 1);
  assert.equal(c.s, null);
  assert.equal(c.a, null);
  assert.equal(c.locale, 'nl-NL');
  assert.equal(c.p, pc);
});
