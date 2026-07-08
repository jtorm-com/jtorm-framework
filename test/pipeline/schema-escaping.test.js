'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');

// Schema/component-layer XSS text-sink sweep — the HIGH-priority follow-up to PR #26's
// insert-level boundary (test/pipeline/escaping.test.js, backlog P0.1). PR #26 flipped
// the SHARED content slot html-ui/replacable.tss to the escaped `t:`; this sweep migrates
// the DIRECT `insert{h:<data>}` sinks that BYPASS replacable and bind untrusted schema.org
// Text properties (name / articleSection / label / count / title / …) — they rendered the
// value as LIVE markup (a stored/reflected XSS). The fix is the same author-intent seam:
// bind Text content through `t:` (escaped, inert) — `h:` stays the explicit raw opt-in.
//
// GENUINE markup composition stays raw `h:` (a host sanitize() seam is backlogged):
//   - @f.select composes its <option> children from a built `html` string;
//   - audio/video compose <source>/<track> (via rawcontent.tss);
//   - Article.articleBody is rich body HTML (flagged for the sanitize seam, not escaped).
// See docs/superpowers/specs/2026-07-08-jtorm-xss-escaping-boundary-design.md.

const XSS = '<img src=x onerror=alert(1)>';
const ESC = '&lt;img src=x onerror=alert(1)&gt;';

// --- Live sinks: untrusted schema.org Text bound as element content, now ESCAPED ---
// Each of these boils a REAL component that renders a live <img> today (verified) and is
// inert after the h:→t: migration. Together they prove the migration mechanism for every
// `insert{h:<Text>}` sink in the sweep (the unmappable page-level / unwired files —
// thing-update, article-*, datalist, comment, search-mini — reuse the identical sink and
// are additionally locked by the TSS snapshot).

test('EntryPoint.action escapes application.name (SoftwareApplication Text; was live <img>)', async () => {
  const { body } = await render(
    '<body><div class="a"></div></body>',
    ".a->ui { c: 'EntryPoint.action'; }",
    { urlTemplate: '/x', application: { name: XSS } }
  );
  assert.doesNotMatch(body, /<img/);
  assert.equal(body, `<div class="a"><a class="entry-point" href="/x">${ESC}</a></div>`);
});

test('badge.default escapes count (was live <img>)', async () => {
  const { body } = await render(
    '<body><div class="a"></div></body>',
    ".a->ui { c: 'badge.default'; }",
    { count: XSS }
  );
  assert.doesNotMatch(body, /<img/);
  assert.equal(body, `<div class="a"><span class="badge">${ESC}</span></div>`);
});

test('@e.a escapes its html content slot — the link label (was live <img>)', async () => {
  // a.tss `->inner{h:html}` is the <a> content slot. Shipped components fill link content
  // STRUCTURALLY (Thing.link appends a nested Text <span>; entry-point appends
  // application.name), so the `html` field is a text label — escaping it breaks nothing
  // (full suite green) and closes the raw sink.
  const { body } = await render(
    '<body><div class="a"></div></body>',
    ".a->ui { c: '@e.a'; }",
    { html: XSS }
  );
  assert.doesNotMatch(body, /<img/);
  assert.equal(body, `<div class="a"><a>${ESC}</a></div>`);
});

test('@f.button escapes its html content slot (was live <img>)', async () => {
  const { body } = await render(
    '<body><div class="a"></div></body>',
    ".a->ui { c: '@f.button'; }",
    { html: XSS }
  );
  assert.doesNotMatch(body, /<img/);
  assert.equal(body, `<div class="a"><button>${ESC}</button></div>`);
});

// --- The iteration sink pattern shared by the unmappable files (thing-update / article /
// datalist): `<tag>->inner{t:<Text>}` inside an each. Proves the migrated shape is inert
// (the files' own edits are locked by the TSS snapshot; boiling them as a unit is blocked
// by pre-existing page-level/scope limitations, docs/backlog.md). ---

test('inner{t: <Text>} inside ul->each escapes (thing-update items / article-* pattern)', async () => {
  const { body } = await render(
    '<body><ul><li></li></ul></body>',
    "ul->each { d: items; e: 'li'; li->inner { t: name; } }",
    { items: [{ name: XSS }] }
  );
  assert.doesNotMatch(body, /<img/);
  assert.equal(body, `<ul><li>${ESC}</li></ul>`);
});

// --- RCDATA elements (title / textarea): innerHTML already serializes their content
// escaped (they are RCDATA, not raw-text), so h: was not a live <img> sink; the h:→t:
// migration makes the "this is text" contract explicit and greppable (output identity).
// t: is safe here (textContent escapes RCDATA) and does NOT fail closed — only true
// raw-text elements (script/style/iframe/…) do. ---

test('@d.title renders the title text inert (explicit text contract)', async () => {
  const { body } = await render(
    '<body><div class="a"></div></body>',
    ".a->ui { c: '@d.title'; }",
    { text: XSS }
  );
  assert.doesNotMatch(body, /<img/);
  assert.equal(body, `<div class="a"><title>${ESC}</title></div>`);
});

test('@f.textarea renders its content inert (text by nature)', async () => {
  const { body } = await render(
    '<body><div class="a"></div></body>',
    ".a->ui { c: '@f.textarea'; }",
    { html: XSS }
  );
  assert.doesNotMatch(body, /<img/);
  assert.equal(body, `<div class="a"><textarea>${ESC}</textarea></div>`);
});

// --- Comment BODY / any schema Text via the `Text` component: already inert via PR #26.
// The comment body flows description → ui{c:'Text'} → @e.span → replacable.tss (t: html).
// This LOCKS that path so the shared slot can't regress to raw h: and re-open the
// stored-XSS the sweep item called out. ---

test('Text component renders an untrusted value INERT (comment-body path — PR #26 lock)', async () => {
  const { body } = await render(
    '<body><div class="a"></div></body>',
    ".a->ui { c: 'Text'; }",
    { Text: XSS }
  );
  assert.doesNotMatch(body, /<img/);
  assert.equal(body, `<div class="a"><span>${ESC}</span></div>`);
});

// --- comment-default.tss:55 — an AFFIXED sink `sup->inner{ p:' ('; h: commentCount.Integer;
// s:')' }`. `.Integer` is a plain dot-path walk, NOT a numeric coercion (data-parser.js), so an
// untrusted value renders LIVE; and the insert p:/s: affixes ARE expressible under t: via the
// data-parser `+` concat (this file's breadcrumb sink already uses it). Migrated to
// `t: ' (' + commentCount.Integer + ')'` — escaped, with the "( )" wrap preserved.
// (Adversarial-review finding. Comment.default can't boil as a unit — deep composition — so the
// affix PATTERN is locked behaviorally here; the file edit is locked by the TSS snapshot.) ---

test('affixed inner{ p/s + h: <data> } renders an untrusted value LIVE (the raw affix sink)', async () => {
  const { body } = await render(
    '<body><sup>z</sup></body>',
    "sup->inner { p: ' ('; h: commentCount.Integer; s: ')'; }",
    { commentCount: { Integer: XSS } }
  );
  assert.match(body, /<img/); // insert's h: path applies the p:/s: affixes and stays raw
});

test('affix migrated to t: concat escapes the value AND keeps the ( ) wrap (comment commentCount)', async () => {
  const { body } = await render(
    '<body><sup>z</sup></body>',
    "sup->inner { t: ' (' + commentCount.Integer + ')'; }",
    { commentCount: { Integer: XSS } }
  );
  assert.doesNotMatch(body, /<img/);
  assert.equal(body, `<sup> (${ESC})</sup>`);
});

test('affix t: concat renders a numeric count unchanged (identity — no regression)', async () => {
  const { body } = await render(
    '<body><sup>z</sup></body>',
    "sup->inner { t: ' (' + commentCount.Integer + ')'; }",
    { commentCount: { Integer: 5 } }
  );
  assert.equal(body, '<sup> (5)</sup>');
});

// --- Carve-out: GENUINE markup composition STAYS raw (h:). @f.select composes its
// <option> children from the `html` field (a variable holding built markup) — the design's
// canonical composition sink. It must NOT be escaped (that would break the options); a host
// sanitize() seam for this raw path is backlogged. Locks the boundary of the sweep. ---

test('@f.select KEEPS raw html composition — option children render live (not escaped)', async () => {
  const { body } = await render(
    '<body><div class="a"></div></body>',
    ".a->ui { c: '@f.select'; }",
    { html: '<option>A</option>' }
  );
  assert.equal(body, '<div class="a"><select><option>A</option></select></div>');
});
