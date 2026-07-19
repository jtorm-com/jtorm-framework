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
// get{t}+inner+attr only), the simplest ITERATION component (`Text`), and the
// representative inheritance/iteration shapes now that ancestor-scope composes with the
// each/insert path (get-method + handler-wrapper fixes; see each.test.js):
//   - Thing.link        — each → data → @e.a leaf with a nested Text span
//   - CreativeWork.default / .contents + Thing.contents — the section→contents card and
//     the Article.default → CreativeWork.default → Thing.contents inheritance chain
//   - ImageObject       — the figure→a→picture→img media chain (figure-default.tss)
//   - BreadcrumbList    — the nav → ol->each{ body->append->ui } nested-iteration shape
// Each golden is correctness-sanity-checked against schema.org/template intent below.
// Thing.default and Person.default are locked directly as coherent content components.
// The retained thing-update-1.0.1.tss artifact's page-level pieces (head.default/head.id,
// @f.inputEmail, the ul->each items path) remain locked independently at the foot of this
// file via the harness page mode (full <html> boil). layer/site-navigation-element still
// need the `layer` verb (deferred — see wiring.test.js).

// --- ui → single html-ui element injection (the foundational Gate-B boil) ---

test('ui resolves @e.div: html template + inner{html} + global id attr, nested into the target', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@e.div'; }",
        { html: 'X', id: 'd1' }
    );
    // @e.div → html-ui element.div: <div></div> (get{h}) injected into .a, then div.tss
    // → replacable (inner{h:html}='X') → global (id attr from the model), ancestor-scoped
    // to the injected <div>. The COMPONENT NESTS INTO the target: descendant-first scope
    // resolves div.tss's `div` to the injected child <div>, not the .a container — so .a
    // keeps its class and the component's id/content land on the child (consistent with
    // @t.h1/@e.section/etc., and with the no-data case below). `class`/`id`/… only emit
    // when the model has them.
    assert.equal(body, '<div class="a"><div id="d1">X</div></div>');
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

test('ui global `class` attr uses append-mode on the injected element (not the .a target)', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@e.div'; }",
        { html: 'X', class: 'c1' }
    );
    // global.tss declares `class` with m:'a' (append): 'c1' appends to the element's own
    // class. The component NESTS INTO .a (descendant-first scope), so 'c1' lands on the
    // injected <div> (which had no class → just "c1") and the OUTER .a keeps "a" — the
    // selectorless global rules are ancestor-scoped to the injected <div>, never the .a
    // target (proves get{t} ancestor-scope on the ui path).
    assert.equal(body, '<div class="a"><div class="c1">X</div></div>');
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
// (body default on its own channel v.c.b='body', v.c.s left null) and the each result is
// re-inserted via `append`. Two fixes made this compose with the get{t}/ui ancestor
// scope (PR #3): (1) handler-wrapper creates the fragment with {c:1} AT create time, so
// it no longer reuses+wipes the live document the each then appends into ("`.a` not
// found"); and (2) the body default is v.c.b, not v.c.s, so it never folds into the
// @e.span get's selectorless replacable `->inner` — which stays scope('span',false) →
// the span (instead of the old v.c.s='body' leak → "span body not found"), while
// explicit `body` rules still selectAll. This unblocks every iteration-boiling component
// (Text, Thing.*, Article.*, CreativeWork.*, ImageObject, BreadcrumbList). The focused
// unit forms are locked in each.test.js.
test('ui Text leaf renders the value as a <span> (ancestor-scope composes with iteration)', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Text'; }",
        { Text: 'hello' }
    );
    assert.equal(body, '<div class="a"><span>hello</span></div>');
});

// --- Thing.link: each → data → @e.a leaf wrapping a nested Text span ---
//
// thing-link.tss: `->each ->data(href: url, title: name) ->ui{ c:'@e.a';
// a->data(Text: alternateName)->ui{ c:'Text' } }`. The bare `->each` iterates the model
// (one object), `data` maps schema fields onto the @e.a link attrs (href←url, and name
// surfaces as the global `title` attr), then the inline child renders a Text component
// (a <span>) from alternateName and appends it as the anchor's visible text.
test('ui Thing.link → <a href title> wrapping a Text <span> from alternateName', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Thing.link'; }",
        { name: 'Widget', url: 'https://e.com/w', alternateName: 'W' }
    );
    assert.equal(body, '<div class="a"><a href="https://e.com/w" title="Widget"><span>W</span></a></div>');
});

test('ui Thing.link with no alternateName/url emits a bare titled <a> (conditional span)', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Thing.link'; }",
        { name: 'Widget' }
    );
    // url absent → no href; alternateName absent → the nested Text yields no span. Only
    // the global `title` (from name) emits. Proves the leaf's conditional fields.
    assert.equal(body, '<div class="a"><a title="Widget"></a></div>');
});

// --- Thing.default: one schema.org-first content component, with no page/demo rules ---

const CONTENTS_NAME = '<div class="contents">'
    + '<header class="header"><h1><a>Hello</a></h1></header>'
    + '<section class="body"></section><footer class="footer"></footer></div>';
const THING_DEFAULT = `<section class="thing">${CONTENTS_NAME}</section>`;
const PERSON_DEFAULT = `<section class="thing schema-Person">${CONTENTS_NAME}</section>`;

test('ui Thing.default renders only its content component and leaves page targets untouched', async () => {
    const { head, body } = await render(
        '<html><head><meta name="keep" content="1"></head><body>'
            + '<div class="a"></div><ul><li>Keep</li></ul>'
            + '<footer><span class="version">stable</span></footer></body></html>',
        ".a->ui { c: 'Thing.default'; }",
        {
            name: 'Hello',
            inLanguage: 'en',
            identifier: 'thing-1',
            placeholder: 'Email',
            items: [{ name: 'Demo item' }]
        }
    );
    assert.equal(head, '<meta name="keep" content="1">');
    assert.equal(body, `<div class="a">${THING_DEFAULT}</div>`
        + '<ul><li>Keep</li></ul><footer><span class="version">stable</span></footer>');
});

test('ui Person.default composes the repaired Thing.default content component', async () => {
    const { body } = await render(
        '<body></body>',
        "body->ui { c: 'Person.default'; }",
        { name: 'Hello' }
    );
    assert.equal(body, PERSON_DEFAULT);
});

// --- The schema inheritance chain: Article.default → CreativeWork.default → Thing.contents ---
//
// CreativeWork.default (creative-work-default.tss) wraps a `<section class="creative-work">`
// and appends CreativeWork.contents; CreativeWork.contents (creative-work-contents.tss)
// is `ui{ c:'Thing.contents'; … }` whose extra `.body` rules (associatedMedia/hasPart)
// are all `->if(d:…)`-guarded, so with minimal `{name}` data it renders exactly
// Thing.contents — the contents card (header→h1→a, empty body, empty footer).
const CW_DEFAULT = '<section class="creative-work"><div class="contents">'
    + '<header class="header"><h1><a>Hello</a></h1></header>'
    + '<section class="body"></section><footer class="footer"></footer></div></section>';

test('ui CreativeWork.default wraps section.creative-work around the contents card', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'CreativeWork.default'; }",
        { name: 'Hello' }
    );
    assert.equal(body, `<div class="a">${CW_DEFAULT}</div>`);
});

test('ui Article.default delegates to CreativeWork.default (empty own transform)', async () => {
    // Article.default = { ui:{ c:'CreativeWork.default' }, t:[] } — a pure delegator with
    // no own TSS (article-specific transforms are not built yet). The empty `t:[]` must
    // contribute nothing; the output is identical to CreativeWork.default. (Regression
    // lock for the empty-artifact-array get fix in @jtorm/ui-method — see addLoop.)
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Article.default'; }",
        { name: 'Hello' }
    );
    assert.equal(body, `<div class="a">${CW_DEFAULT}</div>`);
});

test('ui CreativeWork.contents renders the Thing.contents card it extends', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'CreativeWork.contents'; }",
        { name: 'Hello' }
    );
    assert.equal(body, `<div class="a">${CONTENTS_NAME}</div>`);
});

test('ui ItemList renders ListItem wrappers and item entities through Thing.item', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'ItemList'; }",
        {
            itemListElement: [{
                '@type': 'ListItem',
                position: 1,
                item: {
                    '@type': 'CreativeWork',
                    name: 'Result one',
                    url: 'https://e.com/result-one'
                }
            }]
        }
    );
    assert.equal(body, '<div class="a"><ol><li value="1"><section class="thing">'
        + '<div class="contents"><header class="header"><h1>'
        + '<a href="https://e.com/result-one">Result one</a></h1></header>'
        + '<section class="body"></section><footer class="footer"></footer></div></section></li></ol></div>');
});

test('ui ItemList renders direct entities and keeps empty ListItem wrappers empty', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'ItemList'; }",
        {
            itemListElement: [{
                '@type': 'CreativeWork',
                name: 'Direct result',
                url: 'https://e.com/direct'
            }, {
                '@type': 'ListItem',
                position: 2
            }, {
                position: 3,
                name: 'Untyped entry'
            }]
        }
    );
    assert.equal(body, '<div class="a"><ol><li><section class="thing">'
        + '<div class="contents"><header class="header"><h1>'
        + '<a href="https://e.com/direct">Direct result</a></h1></header>'
        + '<section class="body"></section><footer class="footer"></footer></div></section></li>'
        + '<li value="2"></li><li value="3"></li></ol></div>');
});

test('ui ItemList renders mapped types without item variants through Thing.item', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'ItemList'; }",
        {
            itemListElement: [{
                '@type': 'Event',
                name: 'Launch',
                url: 'https://e.com/event'
            }]
        }
    );
    assert.equal(body, '<div class="a"><ol><li><section class="thing">'
        + '<div class="contents"><header class="header"><h1>'
        + '<a href="https://e.com/event">Launch</a></h1></header>'
        + '<section class="body"></section><footer class="footer"></footer></div></section></li></ol></div>');
});

test('ui CreativeWork.listItem delegates to CreativeWork.item', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'CreativeWork.listItem'; }",
        { name: 'Compat result', url: 'https://e.com/compat' }
    );
    assert.equal(body, '<div class="a"><section class="thing"><div class="contents">'
        + '<header class="header"><h1><a href="https://e.com/compat">Compat result</a></h1></header>'
        + '<section class="body"></section><footer class="footer"></footer></div></section></div>');
});

test('ui Thing.contents renders the contents card (header→h1→a from name)', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Thing.contents'; }",
        { name: 'Hello' }
    );
    assert.equal(body, `<div class="a">${CONTENTS_NAME}</div>`);
});

test('ui Thing.contents with no data emits the empty card scaffold', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'Thing.contents'; }",
        {}
    );
    // name absent → no h1; image/description/footer fields absent → empty header/body/footer.
    assert.equal(body, '<div class="a"><div class="contents">'
        + '<header class="header"></header>'
        + '<section class="body"></section><footer class="footer"></footer></div></div>');
});

// --- ImageObject: the figure → a → picture → img media chain (figure-default.tss) ---
//
// image-object-default.tss coerces the model to an array, iterates, and — with no
// responsive `size.additionalProperty.value` — takes the `->else->get{figure-default.tss}`
// path. figure-default.tss builds figure > a(href: contentUrl) > picture > img(alt: name,
// src: contentUrl); caption→<figcaption>, representativeOfPage→class are conditional. The
// per-item `@id` is resolved through a get{d} fixture (JSON-LD IRI dereference).
test('ui ImageObject renders the figure→a→picture→img media chain', async () => {
    const img = { '@id': '/img1', contentUrl: 'https://e.com/i.jpg', name: 'A photo' };
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'ImageObject'; }",
        img,
        'http://localhost/',
        { '/img1': { json: img } }
    );
    assert.equal(body, '<div class="a"><figure><a href="https://e.com/i.jpg">'
        + '<picture><img alt="A photo" src="https://e.com/i.jpg"></picture></a></figure></div>');
});

test('ui ImageObject surfaces caption→figcaption and representativeOfPage→class', async () => {
    const img = {
        '@id': '/img2', contentUrl: 'https://e.com/p.jpg', name: 'Alt text',
        caption: 'A caption', representativeOfPage: true
    };
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'ImageObject'; }",
        img,
        'http://localhost/',
        { '/img2': { json: img } }
    );
    assert.equal(body, '<div class="a"><figure><a href="https://e.com/p.jpg">'
        + '<picture><img alt="Alt text" src="https://e.com/p.jpg" class="representativeOfPage"></picture></a>'
        + '<figcaption>A caption</figcaption></figure></div>');
});

// --- BreadcrumbList: the nav → ol->each{ body->append->ui } nested-iteration shape ---
//
// breadcrumb-list-default.tss builds <nav id="breadcrumbs" aria-label="Breadcrumbs">
// containing a contents div: a "You are here: " <span>, then an <ol> whose
// `->each(d: itemListElement) ->get(d: @id) { body->append->ui{ @t.li; li->get(d: item.@id)
// ->ui{ Thing.link } } }` renders one <li> per ListItem, each dereferencing item.@id and
// rendering it as a Thing.link <a>. Exercises the explicit-`body` iteration fragment
// (each.test.js) end-to-end through the real component.
test('ui BreadcrumbList renders nav → ol→each → li → Thing.link per item', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'BreadcrumbList'; }",
        { itemListElement: [{ '@id': '/li1', item: { '@id': '/it1' } }] },
        'http://localhost/',
        {
            '/li1': { json: { '@id': '/li1', item: { '@id': '/it1' } } },
            '/it1': { json: { '@id': '/it1', name: 'Home', url: 'https://e.com/' } }
        }
    );
    assert.equal(body, '<div class="a"><nav id="breadcrumbs" aria-label="Breadcrumbs">'
        + '<div class="contents"><span>You are here: </span>'
        + '<ol><li><a href="https://e.com/" title="Home"></a></li></ol></div></nav></div>');
});

// --- @f.inputEmail: html-ui form input ---
//
// @f.inputEmail injects @h/@f/input.html (`<input>`), then input-email.tss
// (`input { ->attr{type:email} … ->get '@h/form/input.tss' }`) fixes type=email. With no
// data only the type emits. input-email.tss `->get`s input.tss, which RE-wraps `input
// { … }`: the nested get resolves the ancestor to the injected <input> ELEMENT, and
// document-model.scope is DESCENDANT-FIRST → ELSE SELF, so input.tss's same-tag `input`
// rule (no descendant input exists) matches the <input> itself, and the selectorless
// form-element/global rules land on it too. (A component re-naming its own root should
// use a SELECTORLESS rule — a tag rule like `input{}` works here only because there is no
// same-tag descendant; were one present, descendant-first would target the descendant.)
// The bare (type-only) case is self-contained; the data-bearing case follows.
test('ui @f.inputEmail with no data injects a bare type=email input', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@f.inputEmail'; }",
        {}
    );
    assert.equal(body, '<div class="a"><input type="email"></div>');
});

// FIXED — nested same-tag element-scope (fix/nested-element-scope). A DATA-bearing
// @f.inputEmail renders the input with its data attrs. `placeholder` reaches input.tss's
// `->attr{ n:'placeholder'; v:placeholder }`, which boils under the RESOLVED <input>
// ANCESTOR ELEMENT (not the bare tag `input` re-queried document-wide). document-model
// scopes descendant-first → else self: input.tss's own `input{}` matches the injected
// <input> itself (no descendant input exists), and the selectorless form-element/global
// rules land on it too. Was "input input not found" (the nested get clobbered v.c.a with
// the bare tag → scope('input','input') = an input INSIDE the input → ∅). Design:
// docs/superpowers/specs/2026-06-29-jtorm-nested-element-scope-fix-design.md.
test('ui @f.inputEmail with data renders the input with its data attrs (nested same-tag scope)', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@f.inputEmail'; }",
        { placeholder: 'Email' }
    );
    assert.equal(body, '<div class="a"><input type="email" placeholder="Email"></div>');
});

// --- Form family: @f.inputText/inputPassword/inputNumber + textarea + select/option ---
//
// Every form control injects its element html (input.html `<input>` / textarea.html /
// select.html) then boils its own `<tag> { … }` rule chain, ->get-ing the shared leaf:
//   input-* → (input.tss | input-range-attrs.tss) → form-element.tss → global.tss
//   textarea / select       → form-element.tss → global.tss
// Each artifact re-wraps the SAME tag (`input{}`/`textarea{}`/`select{}`), so its rules
// boil under the RESOLVED <tag> ANCESTOR (document-model.scope descendant-first → else
// self, PR #12) — the control's own injected element. The input-* variants are the
// keystone: `input-password.tss`/`input-number.tss` ->get `input.tss`, which ALSO wraps
// `input{}`, so the data attrs land through a DOUBLE same-tag get (two levels), and the
// variant's literal `type` survives input.tss's data-driven `->attr{ n:'type'; v:type }`
// (a no-op when the model carries no `type`). The data-bearing @f.inputEmail above first
// proved one hop; these add the second. Booleans serialize as `attr=""` (jsdom innerHTML).
// Each golden is correctness-checked against the component .tss.

test('ui @f.inputText with no data injects a bare type=text input', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@f.inputText'; }",
        {}
    );
    assert.equal(body, '<div class="a"><input type="text"></div>');
});

test('ui @f.inputText threads autocomplete/placeholder + name/value (form-element) + id (global)', async () => {
    // input-text.tss: type=text, autocomplete (on/off-gated), …, placeholder; then ->get
    // form-element.tss (name/value) → global.tss (id). Attr order = rule order.
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@f.inputText'; }",
        { placeholder: 'Name', value: 'Bob', name: 'fn', required: true, autocomplete: 'on', id: 'x1' }
    );
    assert.equal(body, '<div class="a">'
        + '<input type="text" autocomplete="on" required="" placeholder="Name" name="fn" value="Bob" id="x1">'
        + '</div>');
});

test('ui @f.inputText carries NUMERIC minlength/maxlength values (not boolean empties)', async () => {
    // input.tss/input-text.tss gate minlength/maxlength on ^[0-9]+$ then must emit the
    // numeric VALUE (v: minlength/maxlength), not v: true → `minlength=""` (Codex PR #13 P2).
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@f.inputText'; }",
        { minlength: '2', maxlength: '5', name: 'fn' }
    );
    assert.equal(body, '<div class="a"><input type="text" minlength="2" maxlength="5" name="fn"></div>');
});

test('ui @f.inputPassword with no data → type=password + autocomplete=off', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@f.inputPassword'; }",
        {}
    );
    assert.equal(body, '<div class="a"><input type="password" autocomplete="off"></div>');
});

test('ui @f.inputPassword with data: pattern + placeholder/name survive the input.tss double-get (type stays password)', async () => {
    // input-password.tss sets the literal type=password, then ->get input.tss. input.tss
    // RE-wraps `input{}` (second same-tag scope) and its `->attr{type: type}` is a no-op
    // (no model `type`) so password holds; placeholder/name come from input.tss + form-element.
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@f.inputPassword'; }",
        { placeholder: 'PW', name: 'pw', pattern: '.{8,}' }
    );
    assert.equal(body, '<div class="a">'
        + '<input type="password" autocomplete="off" pattern=".{8,}" placeholder="PW" name="pw">'
        + '</div>');
});

test('ui @f.inputNumber with no data injects a bare type=number input', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@f.inputNumber'; }",
        {}
    );
    assert.equal(body, '<div class="a"><input type="number"></div>');
});

test('ui @f.inputNumber with data: max/min/step (input-range-attrs) + name/value, type stays number', async () => {
    // input-number.tss: type=number → ->get input-range-attrs.tss (autocomplete/list/max/
    // min/step → ->get input.tss → form-element). Two get hops, same-tag throughout.
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@f.inputNumber'; }",
        { min: '0', max: '10', step: '2', value: '5', name: 'qty' }
    );
    assert.equal(body, '<div class="a">'
        + '<input type="number" max="10" min="0" step="2" name="qty" value="5">'
        + '</div>');
});

test('ui @f.inputEmail with data threads autocomplete/required + name (richer than the bare/placeholder locks above)', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@f.inputEmail'; }",
        { placeholder: 'Email', name: 'em', required: true, autocomplete: 'off' }
    );
    assert.equal(body, '<div class="a">'
        + '<input type="email" autocomplete="off" required="" placeholder="Email" name="em">'
        + '</div>');
});

// textarea — LOCKS the @h/tags/form-element.tss → @h/form/form-element.tss path fix
// (@jtorm/html-ui). The `tags/` dir does not exist (form-element.tss lives in form/, where
// every other control ->get's it), so @f.textarea threw `HTTP 404 for @h/tags/form-element.tss`
// the moment it boiled with OR without data — RED. After the repoint it boils
// textarea.tss → form-element.tss → global.tss like the rest.
test('ui @f.textarea with no data injects an empty <textarea>', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@f.textarea'; }",
        {}
    );
    assert.equal(body, '<div class="a"><textarea></textarea></div>');
});

test('ui @f.textarea with data: inner html body + rows/placeholder/required + name (path-fix proof)', async () => {
    // textarea.tss: ->inner{h:html} (the body), …, required, placeholder, rows (num-gated);
    // then ->get form-element.tss (name). Was unreachable until the form/ path fix.
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@f.textarea'; }",
        { html: 'Hello', name: 'msg', rows: '4', placeholder: 'Type here', required: true }
    );
    assert.equal(body, '<div class="a">'
        + '<textarea required="" placeholder="Type here" rows="4" name="msg">Hello</textarea>'
        + '</div>');
});

test('ui @f.textarea carries a NUMERIC maxlength value (not a boolean empty)', async () => {
    // textarea.tss has the same minlength/maxlength v:true bug for maxlength (Codex PR #13 P2).
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@f.textarea'; }",
        { html: 'Hi', maxlength: '140', name: 'msg' }
    );
    assert.equal(body, '<div class="a"><textarea maxlength="140" name="msg">Hi</textarea></div>');
});

test('ui @f.select with no data injects an empty <select>', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@f.select'; }",
        {}
    );
    assert.equal(body, '<div class="a"><select></select></div>');
});

test('ui @f.select with data: inner option html + required + name', async () => {
    // select.tss: ->inner{h:html} (the options markup), multiple/required/size (gated),
    // then ->get form-element.tss (name). The `html` field carries the option children.
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@f.select'; }",
        { html: '<option>A</option>', name: 'sel', required: true }
    );
    assert.equal(body, '<div class="a"><select required="" name="sel"><option>A</option></select></div>');
});

test('ui @f.option with data: selected/value + inner html (replacable leaf)', async () => {
    // option.tss: disabled/selected (gated), label, value; then ->get replacable.tss
    // (->inner{h:html} + global.tss). The building block @f.select composes via `html`.
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@f.option'; }",
        { html: 'Apple', value: 'a', selected: true }
    );
    assert.equal(body, '<div class="a"><option selected="" value="a">Apple</option></div>');
});

// --- html-ui artifact path drift: repointable ->get typos ---
//
// These lock the remaining PR #14 html-ui artifact-path drift sweep. Each component
// already shipped its target artifact, but the `.tss` pointed at a non-served path
// (`tags/globals`, root-level form-submit/playable, typo/citable). The assertions
// exercise the intended fragment too, not merely "does not 404".

test('ui @f.legend gets the shared global attrs from @h/global.tss', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@f.legend'; }",
        { class: 'primary', id: 'lg1', title: 'Legend' }
    );
    assert.equal(body, '<div class="a"><legend class="primary" id="lg1" title="Legend"></legend></div>');
});

test('ui @f.inputSubmit gets submit attrs, form attrs, and global attrs', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@f.inputSubmit'; }",
        {
            formaction: '/send', formmethod: 'post', formnovalidate: true,
            name: 'send', value: 'Send', id: 'submit1'
        }
    );
    assert.equal(body, '<div class="a">'
        + '<input type="submit" formaction="/send" formmethod="post" formnovalidate=""'
        + ' name="send" value="Send" id="submit1"></div>');
});

test('ui @m.audio gets playable attrs, inner html, and global attrs', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@m.audio'; }",
        { controls: true, preload: 'metadata', src: '/sound.mp3', html: '<source src="/sound.ogg">', id: 'aud1' }
    );
    assert.equal(body, '<div class="a">'
        + '<audio controls="" preload="metadata" src="/sound.mp3" id="aud1"><source src="/sound.ogg"></audio>'
        + '</div>');
});

test('ui @m.video gets video attrs plus playable attrs and inner html', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@m.video'; }",
        {
            height: '720', poster: '/poster.jpg', width: '1280',
            controls: true, src: '/movie.mp4', html: '<source src="/movie.webm">', id: 'vid1'
        }
    );
    assert.equal(body, '<div class="a">'
        + '<video height="720" poster="/poster.jpg" width="1280" controls="" src="/movie.mp4" id="vid1">'
        + '<source src="/movie.webm"></video></div>');
});

test('ui @t.blockquote gets citable attrs, inner html, and global attrs', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@t.blockquote'; }",
        { cite: 'https://e.com/source', html: 'Quoted', id: 'quote1' }
    );
    assert.equal(body, '<div class="a">'
        + '<blockquote cite="https://e.com/source" id="quote1">Quoted</blockquote></div>');
});

test('ui @t.del keeps datetime and gets citable attrs plus inner html', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@t.del'; }",
        { datetime: '2026-06-29', cite: 'https://e.com/change', html: 'Old', id: 'del1' }
    );
    assert.equal(body, '<div class="a">'
        + '<del datetime="2026-06-29" cite="https://e.com/change" id="del1">Old</del></div>');
});

test('ui @t.ins keeps datetime and gets citable attrs plus inner html', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@t.ins'; }",
        { datetime: '2026-06-29', cite: 'https://e.com/change', html: 'New', id: 'ins1' }
    );
    assert.equal(body, '<div class="a">'
        + '<ins datetime="2026-06-29" cite="https://e.com/change" id="ins1">New</ins></div>');
});

test('ui @t.q gets citable attrs, inner html, and global attrs', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: '@t.q'; }",
        { cite: 'https://e.com/source', html: 'Inline quote', id: 'q1' }
    );
    assert.equal(body, '<div class="a">'
        + '<q cite="https://e.com/source" id="q1">Inline quote</q></div>');
});

// --- Page-level pieces: components-ui head + the ul->each items path ---
//
// These boil a FULL `<html><head></head><body>…</body></html>` document (the harness
// page mode — documentModel.create's `/<html/` branch builds head+body; render()
// returns `head`). They lock the standalone page components and the iteration behavior
// still present in the intentionally retained thing-update-1.0.1.tss artifact. That
// versioned artifact is not part of Thing.default's content-scoped mapper composition.

// head.default (components-ui) — invoked with `head` as the ui target (ancestor=head)
// so its selectorless `->data→append→ui{doc.meta}` rules land in <head>. With no
// @config/@meta the appleTouchIcon/favicon/facebook/twitter/google/og branches are all
// gated off; only the viewport meta (literal fallback) emits.
test('ui head.default injects the viewport meta into <head> (page mode)', async () => {
    const { head } = await render(
        '<html><head></head><body></body></html>',
        "head->ui { c: 'head.default'; }",
        {}
    );
    assert.equal(head, '<meta name="viewport" content="width=device-width, initial-scale=1">');
});

// head.id (components-ui) — the per-identity SEO head. Bare: only the robots/referrer
// metas (literal fallbacks); disambiguatingDescription/url/workTranslation gated off.
test('ui head.id with no data emits only the robots + referrer metas', async () => {
    const { head } = await render(
        '<html><head></head><body></body></html>',
        "head->ui { c: 'head.id'; }",
        {}
    );
    assert.equal(head, '<meta name="robots" content="index, follow">'
        + '<meta name="referrer" content="origin">');
});

test('ui head.id with url + description emits description meta, canonical + jsonld links', async () => {
    // disambiguatingDescription → description meta; url → canonical link; the `->data(h:
    // url)→ui{doc.link…}` adds the JSON-LD alternate link (href = url + the `.jsonld`
    // attr suffix). robots/referrer always trail. Sanity-checked vs head-id.tss intent.
    const { head } = await render(
        '<html><head></head><body></body></html>',
        "head->ui { c: 'head.id'; }",
        { url: 'https://e.com/p', disambiguatingDescription: 'D' }
    );
    assert.equal(head, '<meta name="description" content="D">'
        + '<link rel="canonical" href="https://e.com/p">'
        + '<link rel="alternate" type="application/ld+json" href="https://e.com/p.jsonld">'
        + '<meta name="robots" content="index, follow">'
        + '<meta name="referrer" content="origin">');
});

test('ui WebPage.default m:1 appends the active desktop mediatarget artifacts', async () => {
    const { html } = await render(
        '<html><head></head><body></body></html>',
        "html->ui { c: 'WebPage.default'; m: '1'; h: '0'; }",
        { name: 'Home', inLanguage: 'en' }
    );
    assert.match(html, /<body class="desktop desktop-m">/);
    assert.doesNotMatch(html, /\btablet\b|\bmobile\b|\bdesktop-s\b|\bdesktop-l\b/);
});

test('ui WebPage.default binds fresh loading data outside its reusable shell', async t => {
    t.after(async () => {
        await render('<body></body>', '', {}, 'http://localhost/');
    });
    const context = {c: 0, s: null, a: null, request: {tenant: 'tenant-a'}};
    const page = (marker, reuseSharedCaches) => render(
        '<html><head></head><body></body></html>',
        "html->ui { c: 'WebPage.default'; m: '1'; h: '0'; }",
        {
            name: 'Home',
            inLanguage: 'en',
            label: marker + '-loading',
            id: marker + '-loading-id',
            class: marker + '-loading-class'
        },
        'http://localhost/',
        null,
        context,
        null,
        0,
        {jsonLd: false, reuseSharedCaches}
    );
    const first = await page('FIRST', false);
    const second = await page('SECOND', true);

    assert.match(first.body, /id="FIRST-loading-id"/);
    assert.match(first.body, />FIRST-loading<\/small>/);
    assert.match(second.body, /id="SECOND-loading-id"/);
    assert.match(second.body, />SECOND-loading<\/small>/);
    assert.doesNotMatch(second.body, /FIRST-loading/);
});

test('ui SearchAction preserves target arrays as EntryPoint groups', async () => {
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->ui { c: 'SearchAction'; }",
        {
            '@type': 'SearchAction',
            target: [{
                '@type': 'EntryPoint',
                urlTemplate: '/one?q={query}',
                application: { name: 'One' }
            }, {
                '@type': 'EntryPoint',
                urlTemplate: '/two?q={query}',
                application: { name: 'Two' }
            }]
        }
    );
    assert.equal(body, '<div class="a"><div class="entry-point-group search-action">'
        + '<a class="entry-point" href="/one?q={query}">One</a>'
        + '<a class="entry-point" href="/two?q={query}">Two</a></div></div>');
});

test('ui SearchResultsPage composes WebPage, SearchAction, and mainEntity ItemList', async () => {
    const { body } = await render(
        '<html><head></head><body></body></html>',
        "html->ui { c: 'SearchResultsPage'; }",
        {
            '@type': 'SearchResultsPage',
            name: 'Search results',
            potentialAction: [{
                '@type': 'SearchAction',
                target: {
                    '@type': 'EntryPoint',
                    urlTemplate: '/search?q={query}'
                },
                query: 'schema'
            }, {
                '@type': 'SearchAction',
                target: {
                    '@type': 'EntryPoint',
                    urlTemplate: '/works?q={query}'
                },
                query: 'creative'
            }],
            mainEntity: {
                '@id': '/results'
            }
        },
        'http://localhost/',
        {
            '/results': {
                json: {
                    '@type': 'ItemList',
                    itemListElement: [{
                        '@type': 'ListItem',
                        position: 1,
                        item: {
                            '@type': 'CreativeWork',
                            name: 'Schema result',
                            url: 'https://e.com/schema'
                        }
                    }]
                }
            }
        }
    );
    assert.equal(body, '<form action="/search?q={query}" method="get" class="search-action">'
        + '<input type="search" required="" placeholder="Search..." name="query" value="schema">'
        + '<button type="submit" class="primary-button">Search</button></form>'
        + '<form action="/works?q={query}" method="get" class="search-action">'
        + '<input type="search" required="" placeholder="Search..." name="query" value="creative">'
        + '<button type="submit" class="primary-button">Search</button></form>'
        + '<main id="body"><div id="contents"><ol><li value="1"><section class="thing">'
        + '<div class="contents"><header class="header"><h1><a href="https://e.com/schema">Schema result</a></h1></header>'
        + '<section class="body"></section><footer class="footer"></footer></div></section></li></ol></div></main>'
        + '<div class="jtorm-loading" role="status" data-nosnippet="1">'
        + '<span class="jtorm-loading__indicator" aria-hidden="true"></span>'
        + '<small class="jtorm-loading__label">Loading</small></div>');
});

// The items path (thing-update-1.0.1.tss `ul->each{ d:items; e:'li'; li->inner{h:name} }`).
// each `e:'li'` clones the existing `<li>` template per item (it `selectAll('li')`s the
// template), boils `li->inner{h:name}` against each, and appends the result into the ul.
test('ul->each with an <li> template renders one <li> per item from name', async () => {
    const { body } = await render(
        '<body><ul><li></li></ul></body>',
        "ul->each { d: items; e: 'li'; li->inner { h: name; } }",
        { items: [{ name: 'One' }, { name: 'Two' }] }
    );
    assert.equal(body, '<ul><li>One</li><li>Two</li></ul>');
});
