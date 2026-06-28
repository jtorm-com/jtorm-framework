'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');

// Gate-B (schema.org → component → html) full-pipeline goldens. These boil the real
// `ui` verb through the wired uis ARRAY [schema-ui, components-ui, html-ui]
// (engine.js), with component .tss/.html artifacts disk-served from src/uis/**.
//
// `->ui { c: <Type|@alias> }` resolves a component (schema framework first, then the
// cross-framework fallback into html-ui), then injects its html template (get{h}) and
// transform (get{t}) ancestor-scoped UNDER the ui target (v.c.a + document-model.scope,
// PR #3). The html-ui leaf chain is: element .tss → `->get{t:'@h/replacable.tss'}`
// (`->inner{h:html}` + `->get{t:'@h/global.tss'}`, the 14 selectorless global attrs).
//
// SCOPE: this slice locks the NON-iteration ui path (a component whose transform is
// get{t}+inner+attr only) plus the simplest ITERATION component (`Text`, at the foot of
// this file) now that ancestor-scope composes with the each/insert path (get-method +
// handler-wrapper fixes; see each.test.js). The richer iteration components (Thing.*,
// Article.*, ImageObject, BreadcrumbList) are deferred to the all-33-types golden pass.
// (layer/site-navigation-element also need the `layer` verb, deferred — see
// test/pipeline/wiring.test.js.)

// --- ui → single html-ui element injection (the foundational Gate-B boil) ---

test('ui resolves @e.div: html template + inner{html} + global id attr, scoped to the target', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@e.div'; }",
        { html: 'X', id: 'd1' }
    );
    // @e.div → html-ui element.div: <div></div> (get{h}) injected into .a, then div.tss
    // → replacable (inner{h:html}='X') → global (id attr from the model), ancestor-scoped
    // to the injected <div>. `class`/`id`/… global attrs only emit when the model has them.
    assert.equal(body, '<div class="a" id="d1">X</div>');
});

test('ui resolves @t.h1 via the cross-framework fallback (schema → html typography)', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@t.h1'; }",
        { html: 'Title' }
    );
    // framework='schema' has no @t.h1; getComponent falls through to the html-ui
    // framework (`uis` array order) and resolves typography.h1.
    assert.equal(body, '<div class="a"><h1>Title</h1></div>');
});

test('ui resolves @e.section', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@e.section'; }",
        { html: 'S' }
    );
    assert.equal(body, '<div class="a"><section>S</section></div>');
});

test('ui with no model data injects the bare element template (no global attrs emit)', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@e.div'; }",
        {}
    );
    assert.equal(body, '<div class="a"><div></div></div>');
});

test('ui global `class` attr uses append-mode, merging into the injected element', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@e.div'; }",
        { html: 'X', class: 'c1' }
    );
    // global.tss declares `class` with m:'a' (append): 'c1' appends to the element's
    // own class. The injected <div> has none, so the result is just "c1" — but note the
    // OUTER div keeps "a": the selectorless global rules are ancestor-scoped to the
    // injected <div>, not the .a target (proves get{t} ancestor-scope on the ui path).
    assert.equal(body, '<div class="a c1">X</div>');
});

test('multi-artifact component t (comma-joined URL array) is served as the concatenation', async () => {
    // A component with >1 `t` file (e.g. Thing.default = thing-default + thing-update)
    // reaches the transport comma-joined via request-model's array coercion. The harness
    // splits it, serves each part, and concatenates so the get boils both rule sets.
    // Reproduced here with a comma inside a single hand-authored `t` value — the same
    // coerced shape. (Codex review #5 P2.)
    const { body } = await render(
        '<body><div class="a"><span>x</span></div></body>',
        ".a->get { t: '/a.tss,/b.tss'; }",
        {},
        'http://localhost/',
        {
            '/a.tss': { text: "span->attr { n: 'data-a'; v: '1'; }" },
            '/b.tss': { text: "span->attr { n: 'data-b'; v: '2'; }" }
        }
    );
    assert.equal(body, '<div class="a"><span data-a="1" data-b="2">x</span></div>');
});

// --- data-parser: @meta convention + || fallback + concat (the "one @meta/concat" item) ---

test('data-parser resolves @meta.<field> when present', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->data(v: @meta.title||'Fallback')->attr { n: 'data-x'; v: v; }",
        { '@meta': { title: 'T' } }
    );
    assert.equal(body, '<div class="a" data-x="T"></div>');
});

test('data-parser || falls back to the literal when @meta.<field> is absent', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->data(v: @meta.title||'Fallback')->attr { n: 'data-x'; v: v; }",
        {}
    );
    assert.equal(body, '<div class="a" data-x="Fallback"></div>');
});

test('data-parser + concatenates a literal with a bound field', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->data(v: 'pre-'+name)->attr { n: 'data-x'; v: v; }",
        { name: 'Bob' }
    );
    assert.equal(body, '<div class="a" data-x="pre-Bob"></div>');
});

// --- ancestor-scope composes with the each/insert iteration path (FIXED) ---
//
// The simplest schema leaf, `Text` (text-default.tss: `->each(d:Text,a:'html')
// ->if(d:html,to:'string') ->ui{c:'@e.span'}`), renders a value as a <span>. It boils
// through an each iteration: handler-wrapper builds a DETACHED <body> fragment per item
// (scoped via v.c.s='body') and the each result is re-inserted via `append`. Two fixes
// made this compose with the get{t}/ui ancestor scope (PR #3): (1) handler-wrapper
// creates the fragment with {c:1} AT create time, so it no longer reuses+wipes the live
// document the each then appends into ("`.a` not found"); and (2) under an ancestor,
// document-model.set scopes by the rule's own selector and ignores the enclosing v.c.s
// — so the @e.span get's selectorless replacable `->inner` resolves to the span
// (scope('span',false)) instead of leaking the fragment's v.c.s='body' ("span body not
// found"), while explicit `body` rules elsewhere in the fragment still selectAll. This
// unblocks every iteration-boiling component (Text, Thing.*, Article.*, CreativeWork.*,
// ImageObject, BreadcrumbList). The focused unit forms are locked in each.test.js.
test('ui Text leaf renders the value as a <span> (ancestor-scope composes with iteration)', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Text'; }",
        { Text: 'hello' }
    );
    assert.equal(body, '<div class="a"><span>hello</span></div>');
});
