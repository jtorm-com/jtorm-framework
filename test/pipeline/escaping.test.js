'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');

// XSS escaping boundary (code-review #10 / backlog P0). The content sink is
// `->inner { h: <datapath> }` (insert mode 'i' → e.innerHTML). `h:` (html) is the
// EXPLICIT RAW path (author literals + composed child markup); the new `t:` (text)
// param is the SAFE path — data bound as element content is rendered INERT via the
// DOM's native text APIs (textContent / insertAdjacentText). See
// docs/superpowers/specs/2026-07-08-jtorm-xss-escaping-boundary-design.md.

const XSS = '<img src=x onerror=alert(1)>';
const XSS_ESCAPED = '&lt;img src=x onerror=alert(1)&gt;';

// --- The vulnerability: h: routes untrusted model data in as LIVE markup ---
// Characterizes the raw sink. h: STAYS raw by design (explicit opt-in) — this
// documents WHY t: exists: the default idiom must not be this.
test('VULN: inner{h: <data>} injects untrusted model data as a LIVE node', async () => {
  const { body } = await render(
    '<body><span>z</span></body>',
    'span->inner { h: name; }',
    { name: XSS }
  );
  assert.match(body, /<img/); // a real <img> element — the handler would fire
});

// --- The fix: t: escapes data-bound content inert ---
test('inner{t: <data>} renders untrusted model data as INERT text (escaped)', async () => {
  const { body } = await render(
    '<body><span>z</span></body>',
    'span->inner { t: name; }',
    { name: XSS }
  );
  assert.doesNotMatch(body, /<img/);
  assert.equal(body, `<span>${XSS_ESCAPED}</span>`);
});

test('inner{t: <data>} on a plain-text value is identity (no gratuitous change)', async () => {
  const { body } = await render(
    '<body><span>z</span></body>',
    'span->inner { t: name; }',
    { name: 'Hello & welcome' }
  );
  assert.equal(body, '<span>Hello &amp; welcome</span>');
});

// Codex PR #26 P2: a legitimately FALSY text value (0, '') is real content, not
// "missing" — the guard must key on presence (!= null), not truthiness, or
// `t: count` with count 0 leaves stale template content instead of rendering '0'.
test('inner{t: <data>} renders a falsy value like 0 (present, not treated as missing)', async () => {
  const { body } = await render(
    '<body><span>z</span></body>',
    'span->inner { t: count; }',
    { count: 0 }
  );
  assert.equal(body, '<span>0</span>');
});

test('inner{t: <data>} with an empty string clears the content', async () => {
  const { body } = await render(
    '<body><span>z</span></body>',
    'span->inner { t: empty; }',
    { empty: '' }
  );
  assert.equal(body, '<span></span>');
});

// --- The explicit raw opt-in stays available and greppable (h:) ---
test('inner{h: literal} — author string literal renders as markup (raw opt-in)', async () => {
  const { body } = await render(
    '<body><span>z</span></body>',
    "span->inner { h: '<b>ok</b>'; }",
    {}
  );
  assert.equal(body, '<span><b>ok</b></span>');
});

test('inner{h: <data>} — a variable stays RAW (the composition path: <option>/<source>)', async () => {
  const { body } = await render(
    '<body><select></select></body>',
    'select->inner { h: html; }',
    { html: '<option>A</option>' }
  );
  assert.equal(body, '<select><option>A</option></select>');
});

// --- t: across the insert modes (append/prepend/before/after/replace) ---
test('append{t: <data>} escapes appended text (insertAdjacentText)', async () => {
  const { body } = await render(
    '<body><span>hi </span></body>',
    'span->append { t: name; }',
    { name: XSS }
  );
  assert.equal(body, `<span>hi ${XSS_ESCAPED}</span>`);
});

test('prepend{t: <data>} escapes prepended text', async () => {
  const { body } = await render(
    '<body><span> hi</span></body>',
    'span->prepend { t: name; }',
    { name: XSS }
  );
  assert.equal(body, `<span>${XSS_ESCAPED} hi</span>`);
});

test('replace{t: <data>} replaces the element with an escaped text node', async () => {
  const { body } = await render(
    '<body><div><span>z</span></div></body>',
    'span->replace { t: name; }',
    { name: XSS }
  );
  assert.equal(body, `<div>${XSS_ESCAPED}</div>`);
});

// --- safe-by-default: the central replacable content slot escapes (html-ui flip) ---
// Every generic element funnels its content through html-ui/replacable.tss
// (->inner{h:html} → ->inner{t:html}); an untrusted `html` field is now inert.
test('ui @e.div content (replacable slot) escapes an untrusted html field by default', async () => {
  const { body } = await render(
    '<body><div class="a"></div></body>',
    ".a->ui { c: '@e.div'; }",
    { html: XSS }
  );
  assert.doesNotMatch(body, /<img/);
  assert.match(body, /&lt;img/);
});

// --- raw-text elements are a KNOWN raw sink, carved out to rawcontent.tss ---
// style/script/iframe/template/noscript serialize their content VERBATIM (textContent
// cannot escape them on SSR — a `</style><script>` breaks out either way), so they carry
// raw h: content (author-trusted; a host sanitize() seam is backlogged), NOT the safe t:
// slot. The safe-by-default flip (replacable→t:) deliberately does NOT cover them — this
// documents that scope (their .tss→rawcontent is locked by test/fixtures/tss-snapshot.json).
test('raw-text element (iframe) carries RAW content via the rawcontent slot (known raw sink)', async () => {
  const { body } = await render(
    '<body><div class="a"></div></body>',
    ".a->ui { c: '@e.iframe'; }",
    { html: '<b>fallback</b>' }
  );
  assert.equal(body, '<div class="a"><iframe><b>fallback</b></iframe></div>');
});
