'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');

test('move relocates the matched element into the location via an insert mode', async () => {
  const { body } = await render(
    '<body><div>X</div><section id="dst"></section></body>',
    "div->move { l: '#dst'; m: 'append'; }",
    {}
  );
  assert.equal(body, '<section id="dst"><div>X</div></section>');
});

test('swap replaces the element with a new tag, copying innerHTML', async () => {
  const { body } = await render(
    '<body><div class="c">X</div></body>',
    "div->swap { s: 'section'; }",
    {}
  );
  assert.equal(body, '<section>X</section>');
});

test('swap with a: copies the original attributes onto the new tag', async () => {
  const { body } = await render(
    '<body><div class="c" id="i">X</div></body>',
    "div->swap { s: 'section'; a: '1'; }",
    {}
  );
  assert.equal(body, '<section id="i" class="c">X</section>');
});

test('remove deletes the matched elements', async () => {
  const { body } = await render(
    '<body><p class="x">X</p><p>Y</p></body>',
    ".x->remove { }",
    {}
  );
  assert.equal(body, '<p>Y</p>');
});

test('title sets the document <title> from data', async () => {
  const { html } = await render('<body><p>x</p></body>', "->title { t: name; }", { name: 'Hi' });
  assert.match(html, /<title>Hi<\/title>/);
});

// CHARACTERIZATION (semantics unverified): `find` sets v.c.s = the descendant
// selector, but the chained child transform still targets the find rule's own
// selector (here `div`), not the descendant. Locked as-is; see jtorm-code-review.md.
test('find: chained child currently targets the find rule selector (characterization)', async () => {
  const { body } = await render(
    '<body><div><b>X</b><i>Y</i></div></body>',
    "div->find { e: 'b'; ->attr { n: 'data-f'; v: '1'; } }",
    {}
  );
  assert.equal(body, '<div data-f="1"><b>X</b><i>Y</i></div>');
});
