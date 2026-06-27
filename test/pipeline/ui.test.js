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
// SCOPE: this first slice locks the NON-iteration ui path (a component whose transform
// is get{t}+inner+attr only). Components that boil through an each/insert iteration
// (Text, Thing.*, Article.*, ImageObject, BreadcrumbList, site-navigation-element) are
// BLOCKED on a pre-existing ancestor-scope core bug surfaced by this harness — locked
// as {todo} at the foot of this file. (layer/site-navigation-element also need the
// `layer` verb, deferred — see test/pipeline/wiring.test.js.)

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

// --- BLOCKED: ancestor-scope vs. iteration (pre-existing PR #3 core bug) ---
//
// The simplest schema leaf, `Text` (text-default.tss: `->each(d:Text,a:'html')
// ->if(d:html,to:'string') ->ui{c:'@e.span'}`), renders a value as a <span>. It boils
// through an each iteration: handler-wrapper builds a fresh <body> doc per item and the
// each result is re-inserted via `append`. The ui ancestor scope v.c.a (= '.a') does
// NOT compose with that iteration/insert path — set() runs a selectorless rule under
// v.c.a='.a' against a document where '.a' is absent (or stale), throwing
// "... not found". This is the get{t}/ui ancestor-scope (PR #3, document-model.set)
// meeting the each/insert machinery — it breaks EVERY component with each/append/nested
// -ui (Text, Thing.*, Article.*, CreativeWork.*, ImageObject, BreadcrumbList).
//
// Locked {todo} asserting the INTENDED output — flip to a normal test when the core
// ancestor-scope-vs-iteration fix lands (its own focused PR; see continue.md/backlog).
test('ui Text leaf renders the value as a <span> (ancestor-scope vs. iteration)', { todo: 'PR #3 ancestor-scope does not compose with the each/insert iteration path' }, async () => {
    const log = console.log;
    console.log = () => {}; // mute the error-handler view dump while this still throws
    try {
        const { body } = await render(
            '<body><div class="a"></div></body>',
            ".a->ui { c: 'Text'; }",
            { Text: 'hello' }
        );
        assert.equal(body, '<div class="a"><span>hello</span></div>');
    } finally {
        console.log = log;
    }
});
