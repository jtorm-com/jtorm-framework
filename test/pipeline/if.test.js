'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');

const TSS = "p->if(d: show, v: '^yes$')->attr { n: 'data-ok'; v: show; }";

test('if gate passes → the chained method applies', async () => {
  const { body } = await render('<body><p>x</p></body>', TSS, { show: 'yes' });
  assert.equal(body, '<p data-ok="yes">x</p>');
});

test('if gate fails → the chained method is a silent no-op (characterizes #14)', async () => {
  const { body } = await render('<body><p>x</p></body>', TSS, { show: 'no' });
  assert.equal(body, '<p>x</p>');
});
