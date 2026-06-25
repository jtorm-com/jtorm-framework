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

// --- full conditional matrix: if is a normal if/else, not a zero-match gate ---

test('if(d:) truthy applies, falsy no-ops', async () => {
  const t = "p->if(d: ok)->attr { n: 'data-a'; v: '1'; }";
  assert.equal((await render('<body><p>x</p></body>', t, { ok: 'y' })).body, '<p data-a="1">x</p>');
  assert.equal((await render('<body><p>x</p></body>', t, { ok: '' })).body, '<p>x</p>');
});

test('if(to: type) gates on the data type', async () => {
  const t = "p->if(d: list, to: 'array')->attr { n: 'data-a'; v: '1'; }";
  assert.equal((await render('<body><p>x</p></body>', t, { list: [1] })).body, '<p data-a="1">x</p>');
  assert.equal((await render('<body><p>x</p></body>', t, { list: 'no' })).body, '<p>x</p>');
});

test('if(el: X) gates on element existence — the optional-target idiom', async () => {
  const present = "a->if(el: a)->attr { n: 'data-a'; v: '1'; }";
  assert.equal((await render('<body><a>x</a></body>', present, {})).body, '<a data-a="1">x</a>');
  const absent = "a->if(el: '.none')->attr { n: 'data-a'; v: '1'; }";
  assert.equal((await render('<body><a>x</a></body>', absent, {})).body, '<a>x</a>'); // no throw — optional
});

test('->else renders the alternate branch when the condition is false', async () => {
  const t = "p->if(d: ok) { ->attr { n: 'data-a'; v: '1'; } ->else { ->attr { n: 'data-b'; v: '0'; } } }";
  assert.equal((await render('<body><p>x</p></body>', t, { ok: '1' })).body, '<p data-a="1">x</p>');
  assert.equal((await render('<body><p>x</p></body>', t, { ok: '' })).body, '<p data-b="0">x</p>');
});
