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

test('attr rejects CSS outside its allowlisted inline style grammar', async () => {
  for (const value of [
    'background:url(https://evil.example/x)',
    '@IMPORT url(https://evil.example/x)',
    'BaCkGrOuNd : uRl( https://evil.example/x )',
    'background:u/**/rl(https://evil.example/x)',
    'back\\67 round:url(https://evil.example/x)',
    '--leak:url(https://evil.example/x);color:var(--leak)',
    'color:expression(alert(1))',
    'display:block'
  ]) {
    await assert.rejects(
      render(
        '<body><p>x</p></body>',
        "p->attr { n: 'style'; v: value; }",
        { value }
      ),
      /Unsafe attribute style/
    );
  }
});

test('attr preserves explicitly allowlisted inline color styles', async () => {
  for (const [value, expected] of [
    ['color:#abc;', '<p style="color:#abc;">x</p>'],
    ['color: #abcd; background-color: #11223344;',
      '<p style="color: #abcd; background-color: #11223344;">x</p>'],
    ['COLOR:currentColor;background-color:transparent',
      '<p style="COLOR:currentColor;background-color:transparent">x</p>']
  ]) {
    const { body } = await render(
      '<body><p>x</p></body>',
      "p->attr { n: 'style'; v: value; }",
      { value }
    );
    assert.equal(body, expected);
  }
});

test('attr rejects ping URLs outside the document HTTP origin', async () => {
  for (const value of [
    'https://evil.example/collect',
    '/audit https://evil.example/collect',
    '//evil.example/collect',
    '/\\evil.example/collect',
    'javascript:alert(1)',
    'data:text/plain,ping',
    'https://[invalid'
  ]) {
    await assert.rejects(
      render(
        '<body><a>x</a></body>',
        "a->attr { n: 'ping'; v: value; }",
        { value },
        'https://app.example/page'
      ),
      /Unsafe attribute ping/
    );
  }
});

test('attr rejects a relative ping resolved cross-origin by document base', async () => {
  await assert.rejects(
    render(
      '<html><head><base href="https://evil.example/"></head><body><a>x</a></body></html>',
      "a->attr { n: 'ping'; v: value; }",
      { value: 'collect' },
      'https://app.example/page'
    ),
    /Unsafe attribute ping/
  );
});

test('attr rejects ping when the document origin is opaque', async () => {
  await assert.rejects(
    render(
      '<body><a>x</a></body>',
      "a->attr { n: 'ping'; v: value; }",
      { value: '/audit' },
      'about:blank'
    ),
    /Unsafe attribute ping/
  );
});

test('attr canonicalizes relative and absolute same-origin ping lists', async () => {
  for (const [value, expected] of [
    ['/audit', 'https://app.example/audit'],
    ['./audit https://app.example/metrics',
      'https://app.example/audit https://app.example/metrics'],
    ['https://app.example:443/audit /metrics',
      'https://app.example/audit https://app.example/metrics']
  ]) {
    const { body } = await render(
      '<body><a>x</a></body>',
      "a->attr { n: 'ping'; v: value; }",
      { value },
      'https://app.example/page'
    );
    assert.equal(body, '<a ping="' + expected + '">x</a>');
  }
});

test('attr pins a ping destination before a later document base change', async () => {
  const { body, head } = await render(
    '<html><head><base></head><body><a>x</a></body></html>',
    "a->attr { n: 'ping'; v: '/audit'; } base->attr { n: 'href'; v: 'https://evil.example/'; }",
    {},
    'https://app.example/page'
  );
  assert.equal(body, '<a ping="https://app.example/audit">x</a>');
  assert.equal(head, '<base href="https://evil.example/">');
});

test('attr preserves a same-origin ping inside a detached each fragment', async () => {
  const { body } = await render(
    '<body><div class="a"></div></body>',
    ".a->each { d: items; body->append { h: '<a>x</a>'; a->attr { n: 'ping'; v: '/audit'; } } }",
    { items: [1] },
    'https://app.example/page'
  );
  assert.equal(body, '<div class="a"><a ping="https://app.example/audit">x</a></div>');
});

test('attr rejects a cross-origin ping inside a detached each fragment', async () => {
  await assert.rejects(
    render(
      '<body><div class="a"></div></body>',
      ".a->each { d: items; body->append { h: '<a>x</a>'; a->attr { n: 'ping'; v: 'https://evil.example/collect'; } } }",
      { items: [1] },
      'https://app.example/page'
    ),
    /Unsafe attribute ping/
  );
});

test('attr rejects a detached ping resolved by an external live document base', async () => {
  await assert.rejects(
    render(
      '<html><head><base href="https://evil.example/"></head><body><div class="a"></div></body></html>',
      ".a->each { d: items; body->append { h: '<a>x</a>'; a->attr { n: 'ping'; v: 'collect'; } } }",
      { items: [1] },
      'https://app.example/page'
    ),
    /Unsafe attribute ping/
  );
});

test('attr rejects unsafe final style and ping compositions', async () => {
  for (const [html, tss, data] of [
    [
      '<body><p style="background:url(https://evil.example/x)">x</p></body>',
      "p->attr { n: 'style'; v: safe; m: 'a'; }",
      { safe: 'color:#fff;' }
    ],
    [
      '<body><p style="background:url(https://evil.example/x)">x</p></body>',
      "p->attr { n: 'style'; v: safe; m: 'p'; }",
      { safe: 'color:#fff;' }
    ],
    [
      '<body><a ping="https://evil.example/collect">x</a></body>',
      "a->attr { n: 'ping'; v: safe; m: 'a'; }",
      { safe: '/audit' }
    ],
    [
      '<body><a>x</a></body>',
      "a->attr { n: 'ping'; v: safe; p: unsafe; }",
      { safe: '/audit', unsafe: 'https://evil.example/collect ' }
    ],
    [
      '<body><p>x</p></body>',
      "p->attr { n: 'style'; v: safe; a: unsafe; }",
      { safe: 'color:#fff;', unsafe: 'background:url(https://evil.example/x)' }
    ]
  ]) {
    await assert.rejects(
      render(html, tss, data, 'https://app.example/page'),
      /Unsafe attribute (style|ping)/
    );
  }
});

test('attr preserves safe final style and ping append/prepend compositions', async () => {
  const style = await render(
    '<body><p style="color:#000;">x</p></body>',
    "p->attr { n: 'style'; v: value; m: 'a'; }",
    { value: 'background-color:#fff;' }
  );
  assert.equal(style.body, '<p style="color:#000; background-color:#fff;">x</p>');

  const ping = await render(
    '<body><a ping="/second">x</a></body>',
    "a->attr { n: 'ping'; v: value; m: 'p'; }",
    { value: '/first' },
    'https://app.example/page'
  );
  assert.equal(ping.body,
    '<a ping="https://app.example/first https://app.example/second">x</a>');
});

test('attrs delegates style and ping safety to attr', async () => {
  for (const [attr, value] of [
    ['style', 'background:url(https://evil.example/x)'],
    ['ping', 'https://evil.example/collect']
  ]) {
    await assert.rejects(
      render(
        '<body><a>x</a></body>',
        "a->attrs { n: '" + attr + "'; v: value; }",
        { value },
        'https://app.example/page'
      ),
      /Unsafe attribute (style|ping)/
    );
  }

  const { body } = await render(
    '<body><a>x</a></body>',
    "a->attrs { n: 'style,ping'; v: style,ping; }",
    { style: 'color:#123;', ping: '/audit' },
    'https://app.example/page'
  );
  assert.equal(body, '<a style="color:#123;" ping="https://app.example/audit">x</a>');
});

test('attr on a zero-match selector throws via the error-handler (characterizes #14)', async () => {
  await assert.rejects(
    render('<body><p>x</p></body>', ".none->attr { n: 'x'; v: '1'; }", {}),
    /\.none not found/
  );
});
