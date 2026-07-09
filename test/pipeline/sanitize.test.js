'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render, setSanitize } = require('../helpers/engine.js');

// Host sanitizer DI seam (backlog P0.1 item 2 — "Raw-composition sink policy + DI
// sanitizer"; the last uncovered piece of the XSS escaping boundary). The escaped
// t: path renders data INERT; the RAW path (insert's h: opt-in + composed child
// markup + author literals, and get{h}'s fetched body) stays raw by design. A host
// that must clean RICH untrusted HTML (an article body, a remote fragment) had no
// hook. This adds a dependency-INJECTED sanitize(html) -> html seam (DOMPurify-
// shaped) on the raw writers: when injected it runs before the innerHTML /
// insertAdjacentHTML write; when NOT injected the raw path PASSES THROUGH unchanged
// (greenfield default — zero behaviour change, no host wires it yet). The framework
// ships the SEAM, never a bundled sanitizer (stays dependency-free).
// See docs/superpowers/specs/2026-07-08-jtorm-xss-escaping-boundary-design.md and
// the t:/h: boundary locks in test/pipeline/escaping.test.js.

const XSS = '<img src=x onerror=alert(1)>';
const XSS_ESCAPED = '&lt;img src=x onerror=alert(1)&gt;';

// A fake HOST sanitizer (DOMPurify-shaped: html -> cleaned html) that RECORDS every
// call and strips <script>…</script> + on*= handlers while KEEPING structural /
// composition tags (<b>, <option>, <source>, <track>). Mirrors a realistic host
// allow-list policy — the host's sanitizer CONFIG owns what survives, not the
// framework. Used identity-ish here so composition goldens stay expressible.
function recordingSanitizer() {
  const calls = [];
  const fn = (html) => {
    const s = String(html);
    calls.push(s);
    return s
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  };
  fn.calls = calls;
  return fn;
}

// --- insert h: (innerHTML sink) runs through the injected sanitizer ---
test('inner{h: <data>} routes the raw markup through the injected host sanitizer', async () => {
  const s = recordingSanitizer();
  setSanitize(s);
  try {
    const { body } = await render(
      '<body><span>z</span></body>',
      'span->inner { h: html; }',
      { html: '<b>ok</b><script>alert(1)</script>' }
    );
    assert.equal(body, '<span><b>ok</b></span>'); // <script> stripped, <b> kept
    assert.ok(s.calls.some(c => c.includes('<script>')), 'sanitizer saw the raw markup');
  } finally {
    setSanitize(null);
  }
});

// --- Codex PR #28 P2: sanitize ONCE per operation, not once per matched element ---
// The h: content doesn't depend on the target element, but the write happens inside
// h.set's per-match callback. Sanitizing there would call an async/remote sanitizer
// once per node (multiplied traffic) and, on a late rejection, leave earlier nodes
// already written (partial write). Resolve + sanitize once, before the write loop.
test('inner{h: <data>} sanitizes ONCE for the whole operation, not per matched element', async () => {
  const s = recordingSanitizer();
  setSanitize(s);
  try {
    const { body } = await render(
      '<body><div><span>a</span><span>b</span><span>c</span></div></body>',
      'span->inner { h: html; }',
      { html: '<b>ok</b><script>x()</script>' }
    );
    assert.equal(body, '<div><span><b>ok</b></span><span><b>ok</b></span><span><b>ok</b></span></div>');
    assert.equal(s.calls.length, 1, 'sanitized once for the operation, not once per matched node');
  } finally {
    setSanitize(null);
  }
});

// --- Codex PR #28 P2 (round 2): the zero-match drift error must win over a
// sanitizer error. Sanitizing before h.set() resolves the target would mask a
// zero-match (a drifted selector) behind a sanitizer throw/reject, breaking the
// transform-verb drift-detector contract (AGENTS.md). Sanitize LAZILY on the first
// matched element, so a zero-match throws "<sel> not found" before the sanitizer runs.
test('zero-match insert{h:} surfaces the not-found drift error, not a sanitizer error', async () => {
  setSanitize(() => { throw new Error('sanitizer exploded'); });
  const log = console.log;
  console.log = () => {}; // silence the error-handler pre-throw v dump
  try {
    await assert.rejects(
      render('<body><div>x</div></body>', 'span->inner { h: html; }', { html: '<b>ok</b>' }),
      /not found/i
    );
  } finally {
    console.log = log;
    setSanitize(null);
  }
});

// --- greenfield default: NO sanitizer injected → raw path passes through ---
test('default (no host sanitizer) leaves the raw h: path untouched — passthrough', async () => {
  const { body } = await render(
    '<body><span>z</span></body>',
    "span->inner { h: '<b>ok</b>'; }",
    {}
  );
  assert.equal(body, '<span><b>ok</b></span>');
});

// --- insert h: (insertAdjacentHTML sink) also runs through the sanitizer ---
test('append{h: <data>} (insertAdjacentHTML) also routes through the sanitizer', async () => {
  const s = recordingSanitizer();
  setSanitize(s);
  try {
    const { body } = await render(
      '<body><span>hi </span></body>',
      'span->append { h: html; }',
      { html: '<b>ok</b><script>x()</script>' }
    );
    assert.equal(body, '<span>hi <b>ok</b></span>');
    assert.ok(s.calls.some(c => c.includes('<script>')), 'appended markup went through the sanitizer');
  } finally {
    setSanitize(null);
  }
});

// --- remaining raw verbs (post-PR #34 audit): wrap/swap/replace m:r also need
// the same host sanitizer seam before multi-tenant / untrusted-data SSR can enable.
test('wrap{h: <data>} routes the wrapper markup through the injected host sanitizer', async () => {
  const s = recordingSanitizer();
  setSanitize(s);
  try {
    const { body } = await render(
      '<body><span>old</span></body>',
      "span->wrap { s: '.w'; h: html; }",
      { html: '<div class="w" onclick=alert(1)><script>bad()</script></div>' }
    );
    assert.equal(body, '<span><div class="w">old</div></span>');
    assert.ok(s.calls.some(c => c.includes('onclick') && c.includes('<script>')), 'wrapper markup went through the sanitizer');
  } finally {
    setSanitize(null);
  }
});

test('swap{h: <data>} routes the replacement wrapper through the injected host sanitizer', async () => {
  const s = recordingSanitizer();
  setSanitize(s);
  try {
    const { body } = await render(
      '<body><section>old</section></body>',
      "section->swap { s: 'article'; h: html; }",
      { html: '<article class="w" onclick=alert(1)></article>' }
    );
    assert.equal(body, '<article>old</article>'); // existing swap{h} behavior creates by tag; h is still parsed raw and must be sanitized before parse
    assert.ok(s.calls.some(c => c.includes('onclick')), 'swap wrapper markup went through the sanitizer');
  } finally {
    setSanitize(null);
  }
});

test("replace{m:'r', h: <data>} routes the raw replacement through the injected host sanitizer", async () => {
  const s = recordingSanitizer();
  setSanitize(s);
  try {
    const { body } = await render(
      '<body><span>old</span></body>',
      "span->replace { h: html; s: '.w'; }",
      { html: '<strong class="w" onclick=alert(1)>ok<script>bad()</script></strong>' }
    );
    assert.equal(body, '.w'); // existing replace m:r selector/suffix coupling; this slice only routes the raw parse through sanitize
    assert.ok(s.calls.some(c => c.includes('onclick') && c.includes('<script>')), 'replace raw markup went through the sanitizer');
  } finally {
    setSanitize(null);
  }
});

test('zero-match remaining raw verbs surface not-found drift errors before sanitizing', async () => {
  const cases = [
    "span->wrap { s: '.w'; h: html; }",
    "span->swap { s: 'article'; h: html; }",
    "span->replace { h: html; s: '.w'; }"
  ];
  const log = console.log;
  console.log = () => {};
  try {
    for (const tss of cases) {
      let calls = 0;
      setSanitize(() => { calls++; throw new Error('sanitizer exploded'); });
      await assert.rejects(
        render('<body><div>x</div></body>', tss, { html: '<article class="w">ok</article>' }),
        /not found/i
      );
      assert.equal(calls, 0, tss + ' must not sanitize before target resolution');
    }
  } finally {
    console.log = log;
    setSanitize(null);
  }
});

// --- get{h} fetched body runs through the injected sanitizer ---
test('get{h} fetched body routes through the injected host sanitizer', async () => {
  const s = recordingSanitizer();
  setSanitize(s);
  try {
    const { body } = await render(
      '<body><div class="a">orig</div></body>',
      ".a->get { h: '/frag.html'; }",
      {},
      'http://localhost/',
      { '/frag.html': { text: '<b>ok</b><script>bad()</script>' } }
    );
    assert.equal(body, '<div class="a"><b>ok</b></div>');
    assert.ok(s.calls.some(c => c.includes('bad()')), 'sanitizer saw the fetched body');
  } finally {
    setSanitize(null);
  }
});

// --- Codex PR #28 P2 (round 3): get{h} must keep the zero-match drift error too ---
// Same contract as insert: sanitizing the fetched body before v.h.set resolves the
// get{h} target would mask a drifted (zero-match) selector behind a sanitizer error.
test('zero-match get{h} surfaces the not-found drift error, not a sanitizer error', async () => {
  setSanitize(() => { throw new Error('sanitizer exploded'); });
  const log = console.log;
  console.log = () => {};
  try {
    await assert.rejects(
      render(
        '<body><div>x</div></body>',
        ".missing->get { h: '/frag.html'; }",
        {},
        'http://localhost/',
        { '/frag.html': { text: '<b>ok</b>' } }
      ),
      /not found/i
    );
  } finally {
    console.log = log;
    setSanitize(null);
  }
});

// --- the ESCAPED t: path is NEVER routed through the sanitizer (boundary proof) ---
// t: escapes via the DOM's native text APIs — the value is already INERT text, not
// markup a sanitizer should touch. The seam must not reach it: output stays the
// plain escaped payload, and the sanitizer is never invoked on this render.
test('escaped t: path is NEVER routed through the sanitizer (stays inert escaped text)', async () => {
  const s = recordingSanitizer();
  setSanitize(s);
  try {
    const { body } = await render(
      '<body><span>z</span></body>',
      'span->inner { t: name; }',
      { name: XSS }
    );
    assert.equal(body, `<span>${XSS_ESCAPED}</span>`);
    assert.equal(s.calls.length, 0, 'sanitizer not called on the t: path');
  } finally {
    setSanitize(null);
  }
});

// --- FLAG (1): composition markup IS sanitized; the host allow-list owns survival ---
// select composes <option> via a *variable* h:; audio/video compose <source>/<track>.
// A strict host sanitizer could strip those — so the host's sanitizer CONFIG (not the
// framework) owns the composition allow-list. Here a realistic policy keeps <option>,
// proving legit composition survives while the markup still passes through the seam.
test('composition markup (select <option>) passes through the sanitizer and a sane policy keeps it', async () => {
  const s = recordingSanitizer();
  setSanitize(s);
  try {
    const { body } = await render(
      '<body><select></select></body>',
      'select->inner { h: html; }',
      { html: '<option>A</option>' }
    );
    assert.equal(body, '<select><option>A</option></select>');
    assert.ok(s.calls.some(c => c.includes('<option>')), 'composition markup went through the sanitizer');
  } finally {
    setSanitize(null);
  }
});

// --- FLAG (2): author string literals h: are sanitized too when a host opts in ---
// Injecting a sanitizer is the host opting the WHOLE raw path in; author literals
// ('<b>ok</b>') are part of that path. A sane policy keeps the literal's safe markup.
test('author string literal h: also passes through the sanitizer when a host opts in', async () => {
  const s = recordingSanitizer();
  setSanitize(s);
  try {
    const { body } = await render(
      '<body><span>z</span></body>',
      "span->inner { h: '<b>ok</b><script>x()</script>'; }",
      {}
    );
    assert.equal(body, '<span><b>ok</b></span>');
    assert.ok(s.calls.some(c => c.includes('<script>')), 'the literal went through the sanitizer');
  } finally {
    setSanitize(null);
  }
});

// --- an async host sanitizer (a remote/service cleaner) is awaited ---
// DOMPurify is sync, but the seam awaits so an async host cleaner works transparently.
test('an async sanitizer is awaited before the write', async () => {
  setSanitize(async (html) => String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''));
  try {
    const { body } = await render(
      '<body><span>z</span></body>',
      'span->inner { h: html; }',
      { html: '<b>ok</b><script>alert(1)</script>' }
    );
    assert.equal(body, '<span><b>ok</b></span>');
  } finally {
    setSanitize(null);
  }
});
