'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');
const { makeTssParser } = require('../helpers/parser.js');

test('child-bearing insert preserves its parsed child while composing exact output', async () => {
  const tree = makeTssParser().handle("div->append { ->append { h: '<b>hi</b>'; } }");
  const child = tree[0].c[0].c[0], p = child.p, c = child.c;
  assert.equal(child.s, 'div');

  const { body } = await render('<body><div>old</div></body>', tree, {});
  assert.equal(body, '<div>old<b>hi</b></div>');
  assert.strictEqual(tree[0].c[0].c[0], child);
  assert.equal(child.s, 'div');
  assert.equal(child.m, 'append');
  assert.strictEqual(child.p, p);
  assert.strictEqual(child.c, c);
});

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
  await assert.rejects(
    render('<body><p>x</p></body>', ".none->insert { h: '<b>y</b>'; m: 'i'; }", {}),
    /\.none not found/
  );
});
