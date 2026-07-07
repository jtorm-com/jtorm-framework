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

test('attr rejects event-handler attribute names from data', async () => {
  await assert.rejects(
    render(
      '<body><img></body>',
      "img->attr { n: attr; v: value; }",
      { attr: 'onerror', value: 'alert(1)' }
    ),
    /Unsafe attribute/
  );
});

test('attr validates and writes the same coerced attribute name', async () => {
  let i = 0;
  const { body } = await render(
    '<body><img></body>',
    "img->attr { n: attr; v: value; }",
    { attr: { toString: () => ++i < 3 ? 'data-safe' : 'onerror' }, value: 'alert(1)' }
  );
  assert.equal(body, '<img data-safe="alert(1)">');
});

test('attr remove mode strips event-handler attributes from upstream html', async () => {
  const { body } = await render(
    '<body><img onerror="alert(1)"></body>',
    "img->attr { n: 'onerror'; m: 'r'; }",
    {}
  );
  assert.equal(body, '<img>');
});

test('attr remove mode treats metacharacter data as a literal token', async () => {
  const { body } = await render(
    '<body><p class="* keep">x</p></body>',
    "p->attr { n: 'class'; v: token; m: 'r'; }",
    { token: '*' }
  );
  assert.equal(body, '<p class="keep">x</p>');
});

test('attr remove mode does not let regex-shaped data consume neighboring tokens', async () => {
  const { body } = await render(
    '<body><p class="keep a.*z a---z done">x</p></body>',
    "p->attr { n: 'class'; v: token; m: 'r'; }",
    { token: 'a.*z' }
  );
  assert.equal(body, '<p class="keep a---z done">x</p>');
});

test('attr remove mode trims incidental whitespace around a literal token', async () => {
  const { body } = await render(
    '<body><p class="drop keep">x</p></body>',
    "p->attr { n: 'class'; v: 'drop '; m: 'r'; }",
    {}
  );
  assert.equal(body, '<p class="keep">x</p>');
});

test('attr rejects srcdoc values without a sandbox', async () => {
  await assert.rejects(
    render(
      '<body><iframe></iframe></body>',
      "iframe->attr { n: 'srcdoc'; v: html; }",
      { html: '<script>alert(1)</script>' }
    ),
    /Unsafe attribute/
  );
});

test('attr preserves srcdoc values with a scriptless sandbox', async () => {
  const { body } = await render(
    '<body><iframe sandbox></iframe></body>',
    "iframe->attr { n: 'srcdoc'; v: html; }",
    { html: '<p>safe</p>' }
  );
  assert.equal(body, '<iframe sandbox="" srcdoc="<p>safe</p>"></iframe>');
});

test('attr rejects srcdoc values with allow-scripts sandbox', async () => {
  await assert.rejects(
    render(
      '<body><iframe sandbox="allow-scripts"></iframe></body>',
      "iframe->attr { n: 'srcdoc'; v: html; }",
      { html: '<p>unsafe</p>' }
    ),
    /Unsafe attribute/
  );
});

test('attr rejects allow-scripts sandbox when srcdoc exists', async () => {
  await assert.rejects(
    render(
      '<body><iframe sandbox srcdoc="<p>unsafe</p>"></iframe></body>',
      "iframe->attr { n: 'sandbox'; v: sandbox; }",
      { sandbox: 'allow-scripts' }
    ),
    /Unsafe attribute/
  );
});

test('attr rejects sandbox removal when srcdoc exists', async () => {
  await assert.rejects(
    render(
      '<body><iframe sandbox srcdoc="<p>unsafe</p>"></iframe></body>',
      "iframe->attr { n: 'sandbox'; m: 'r'; }",
      {}
    ),
    /Unsafe attribute/
  );
});

test('attr rejects unsafe schemes for URL-bearing attributes from data', async () => {
  for (const [attr, value] of [
    ['cite', 'javascript:alert(1)'],
    ['href', 'javascript:alert(1)'],
    ['longdesc', 'vbscript:msgbox(1)'],
    ['src', 'data:text/html,<svg onload=alert(1)>'],
    ['srcset', 'javascript:alert(1) 1x'],
    ['srcset', '/safe.png 1x, data:image/svg+xml,<svg onload=alert(1)> 2x'],
    ['action', 'vbscript:msgbox(1)'],
    ['formaction', ' JAVASCRIPT:alert(1)'],
    ['poster', 'data:image/svg+xml,<svg onload=alert(1)>'],
    ['data', 'data:text/html,<script>alert(1)</script>'],
    ['xlink:href', 'java\nscript:alert(1)']
  ]) {
    await assert.rejects(
      render(
        '<body><a>x</a></body>',
        "a->attr { n: attr; v: value; }",
        { attr, value }
      ),
      /Unsafe attribute/
    );
  }
});

test('attr validates and writes the same coerced URL value', async () => {
  let i = 0;
  const { body } = await render(
    '<body><a>x</a></body>',
    "a->attr { n: 'href'; v: value; }",
    { value: { toString: () => ++i === 1 ? 'https://example.test/' : 'javascript:alert(1)' } }
  );
  assert.equal(body, '<a href="https://example.test/">x</a>');
});

test('attr preserves ordinary attrs and safe URL values', async () => {
  for (const [attr, value, expected] of [
    ['cite', '/source', '<a cite="/source">x</a>'],
    ['data-id', '42', '<a data-id="42">x</a>'],
    ['href', 'https://example.test/p', '<a href="https://example.test/p">x</a>'],
    ['longdesc', './details', '<a longdesc="./details">x</a>'],
    ['src', '/img.png', '<a src="/img.png">x</a>'],
    ['srcset', '/img.png 1x, https://example.test/img@2x.png 2x',
      '<a srcset="/img.png 1x, https://example.test/img@2x.png 2x">x</a>'],
    ['action', './submit', '<a action="./submit">x</a>'],
    ['data', '/object.html', '<a data="/object.html">x</a>']
  ]) {
    const { body } = await render(
      '<body><a>x</a></body>',
      "a->attr { n: attr; v: value; }",
      { attr, value }
    );
    assert.equal(body, expected);
  }
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
