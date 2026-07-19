'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const {render} = require('../helpers/engine.js');
const {jTormUiCacheModel} = require('../../src/models/ui-cache-model/src/ui-cache-model.js');

const PAGE = '<!doctype html><html><head></head><body><div class="mount"></div></body></html>';
const item = (name, text, extra = {}) => ({
    '@type': 'Question',
    name,
    acceptedAnswer: {
        '@type': 'Answer',
        text,
        ...extra.answer
    },
    ...extra.question
});
const faq = mainEntity => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity
});
const mount = (data, options = {}) => {
    const framework = options.framework || 'components';
    const explicit = options.explicit ? " f: '" + options.explicit + "';" : '';
    const renderOptions = {
        framework,
        jsonLd: options.jsonLd !== false,
        reuseSharedCaches: !!options.reuseSharedCaches
    };
    if (typeof options.clock === 'function') renderOptions.clock = options.clock;
    if (typeof options.persistenceClock === 'function')
        renderOptions.persistenceClock = options.persistenceClock
    ;
    if (options.store) renderOptions.uiCacheStore = options.store;
    if (options.uiCacheInit) renderOptions.uiCacheInit = true;
    return render(
        PAGE,
        ".mount->ui { c: 'FAQPage.accordion';" + explicit + ' }',
        data,
        'https://example.test/faq',
        null,
        options.context || 1,
        options.manifests || null,
        0,
        renderOptions
    );
};
const documentOf = result => new JSDOM(result.html).window.document;

test('FAQPage.accordion renders ordered canonical disclosures from a frozen supported model', async () => {
    const firstAnswer = Object.freeze({'@type': 'Answer', text: 'First answer'});
    const secondAnswer = Object.freeze({'@type': 'Answer', text: 'Second answer'});
    const questions = Object.freeze([
        Object.freeze({'@type': 'Question', name: 'First question', acceptedAnswer: firstAnswer}),
        Object.freeze({'@type': 'Question', name: 'Second question', acceptedAnswer: secondAnswer})
    ]);
    const model = Object.freeze({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: questions
    });
    const before = JSON.stringify(model);
    const result = await mount(model);
    const doc = documentOf(result);
    const group = doc.querySelector('.jtorm-accordion');
    const details = [...group.querySelectorAll('details')];

    assert.equal(JSON.stringify(model), before);
    assert.equal(group.className, 'jtorm-accordion');
    assert.deepEqual(
        details.map(node => [
            node.querySelector('summary').textContent,
            node.querySelector('.jtorm-accordion__content').textContent
        ]),
        [
            ['First question', 'First answer'],
            ['Second question', 'Second answer']
        ]
    );
    assert.equal(details.every(node => !node.hasAttribute('open')), true);
});

test('FAQPage.accordion fails closed per root and per malformed entry', async () => {
    const roots = [
        null,
        true,
        1,
        'FAQPage',
        [],
        {},
        {'@type': 'faqpage', mainEntity: []},
        {'@type': 'FAQPageExtra', mainEntity: []},
        {'@type': 'https://schema.org/FAQPage', mainEntity: []},
        {'@type': ['FAQPage'], mainEntity: []},
        {'@type': 'FAQPage'},
        {'@type': 'FAQPage', mainEntity: null},
        {'@type': 'FAQPage', mainEntity: {}}
    ];

    for (const model of roots) {
        const result = await mount(model);
        assert.equal(
            documentOf(result).querySelector('.jtorm-accordion'),
            null,
            JSON.stringify(model)
        );
    }

    for (const mainEntity of [[], [
        null,
        true,
        {'@type': 'Question', name: '', acceptedAnswer: {'@type': 'Answer', text: 'No'}},
        {'@type': 'Question', name: 'No answer'},
        {'@type': 'Question', name: 'Array', acceptedAnswer: [
            {'@type': 'Answer', text: 'No'}
        ]},
        {'@type': 'Question', name: 'Wrong', acceptedAnswer: {
            '@type': 'ItemList',
            text: 'No'
        }},
        {'@type': ['Question'], name: 'Array type', acceptedAnswer: {
            '@type': 'Answer',
            text: 'No'
        }}
    ]]) {
        const result = await mount(faq(mainEntity));
        const group = documentOf(result).querySelector('.jtorm-accordion');
        assert.ok(group);
        assert.equal(group.children.length, 0);
    }

    const mixed = await mount(faq([
        item('One', 'First'),
        {'@type': 'Question', name: 'Missing text', acceptedAnswer: {'@type': 'Answer'}},
        item('Two', 'Second'),
        item('   ', '   ')
    ]));
    assert.deepEqual(
        [...documentOf(mixed).querySelectorAll('summary')].map(node => node.textContent),
        ['One', 'Two', '   ']
    );

    await assert.rejects(
        mount({'@type': 'F'.repeat(1025), mainEntity: []}),
        /Unsafe regex input/
    );
});

test('FAQ projection follows inherited data paths but only own canonical array indices', async () => {
    const inheritedAnswer = Object.create({'@type': 'Answer', text: 'Inherited answer'});
    const inheritedQuestion = Object.create({
        '@type': 'Question',
        name: 'Inherited question',
        acceptedAnswer: inheritedAnswer,
        open: true,
        class: 'leak'
    });
    const entries = [];
    entries[0] = item('Own zero', 'Zero');
    entries[2] = inheritedQuestion;
    entries.named = item('Named', 'Named');
    const prototype = Object.create(Array.prototype);
    prototype[1] = item('Inherited index', 'Inherited index');
    Object.setPrototypeOf(entries, prototype);
    const model = Object.create({'@type': 'FAQPage'});
    model.mainEntity = entries;

    const result = await mount(model, {jsonLd: false});
    const doc = documentOf(result);
    const details = [...doc.querySelectorAll('details')];

    assert.deepEqual(
        details.map(node => node.querySelector('summary').textContent),
        ['Own zero', 'Inherited question']
    );
    assert.deepEqual(
        details.map(node => node.querySelector('.jtorm-accordion__content').textContent),
        ['Zero', 'Inherited answer']
    );
    assert.equal(details[1].hasAttribute('open'), false);
    assert.equal(details[1].className, 'jtorm-accordion__item');
});

test('FAQ projection escapes copy and drops every unrelated caller field', async () => {
    const xss = '</summary><img id="faq-xss" src=x onerror=alert(1)>';
    const model = {
        '@type': 'FAQPage',
        id: 'root-leak',
        class: 'root-leak',
        items: [{summary: 'root leak', content: 'root leak'}],
        mainEntity: [item(xss, xss, {
            question: {
                open: true,
                id: 'question-leak',
                class: 'question-leak',
                summary: 'question leak',
                content: 'question leak'
            },
            answer: {
                id: 'answer-leak',
                class: 'answer-leak',
                html: '<b>answer leak</b>'
            }
        })]
    };
    const result = await mount(model);
    const doc = documentOf(result);
    const group = doc.querySelector('.jtorm-accordion');
    const details = group.querySelector('details');

    assert.equal(group.id, '');
    assert.equal(group.className, 'jtorm-accordion');
    assert.equal(details.id, '');
    assert.equal(details.className, 'jtorm-accordion__item');
    assert.equal(details.hasAttribute('open'), false);
    assert.equal(details.querySelector('summary').textContent, xss);
    assert.equal(details.querySelector('.jtorm-accordion__content').textContent, xss);
    assert.equal(doc.querySelector('#faq-xss'), null);
    assert.doesNotMatch(result.body, /root-leak|question-leak|answer-leak/);
});

test('FAQ presentation follows configured framework without propagating an outer fallback', async () => {
    const model = faq([item('Question', 'Answer')]);
    const cases = [
        [{framework: 'components'}, false],
        [{framework: 'bootstrap'}, true],
        [{framework: 'bootstrap', explicit: 'schema'}, true],
        [{framework: 'components', explicit: 'bootstrap'}, false]
    ];

    for (const [options, styled] of cases) {
        const result = await mount(model, options);
        const doc = documentOf(result);
        const group = doc.querySelector('.jtorm-accordion');
        const details = group.querySelector('details');

        assert.equal(group.classList.contains('accordion'), styled, JSON.stringify(options));
        assert.equal(details.classList.contains('accordion-item'), styled, JSON.stringify(options));
        assert.equal(
            details.querySelector('summary').classList.contains('accordion-header'),
            styled,
            JSON.stringify(options)
        );
        assert.equal(details.querySelector('[data-bs-toggle]'), null);
        assert.equal(details.querySelector('[aria-expanded]'), null);
    }
});

test('valid FAQ visible pairs exactly match the unchanged JSON-LD root', async () => {
    const model = faq([
        item('First <question>', 'First </script> answer'),
        item('Second', 'Second')
    ]);
    const result = await mount(model);
    const doc = documentOf(result);
    const visible = [...doc.querySelectorAll('.jtorm-accordion__item')].map(node => [
        node.querySelector('summary').textContent,
        node.querySelector('.jtorm-accordion__content').textContent
    ]);
    const script = doc.querySelector('script[data-jtorm-json-ld]');
    const structured = JSON.parse(script.textContent);
    const pairs = structured.mainEntity.map(question => [
        question.name,
        question.acceptedAnswer.text
    ]);

    assert.deepEqual(visible, pairs);
    assert.deepEqual(structured, model);
    assert.equal(doc.querySelectorAll('script[data-jtorm-json-ld]').length, 1);
});

test('FAQ acquisition and data-free cache stay constant for one and 32 items', async t => {
    t.after(async () => {
        await render('<body></body>', '', {}, 'http://localhost/');
    });
    const expected = [
        '@s/faq-page/faq-page-accordion.tss',
        '@c/accordion/accordion-group.tss',
        '@c/accordion/accordion-shell.tss',
        '@h/@e/div.html',
        '@c/accordion/accordion-item.tss',
        '@c/accordion/accordion-item-shell.tss',
        '@h/@e/details.html',
        '@h/@e/summary.html'
    ];
    const context = {c: 1, s: null, a: null, request: {tenant: 'faq-tenant'}};
    let cacheBytes;

    for (const [length, marker, reuseSharedCaches] of [
        [1, 'FIRST', false],
        [32, 'SECOND', true]
    ]) {
        const model = faq(Array.from({length}, (_, i) =>
            item(marker + ' question ' + i, marker + ' answer ' + i)
        ));
        const result = await mount(model, {
            context,
            jsonLd: false,
            reuseSharedCaches
        });

        if (!reuseSharedCaches)
            assert.deepEqual(result.requests, expected)
        ;
        assert.equal(documentOf(result).querySelectorAll('details').length, length);
        assert.equal(result.body.includes(marker), true);
        assert.equal(result.body.includes(marker === 'FIRST' ? 'SECOND' : 'FIRST'), false);

        const bytes = JSON.stringify(jTormUiCacheModel.cache);
        assert.doesNotMatch(bytes, /FIRST|SECOND/);
        if (cacheBytes === undefined)
            cacheBytes = bytes
        ; else
            assert.equal(bytes, cacheBytes)
        ;
    }

    assert.deepEqual(
        Object.keys(jTormUiCacheModel.cache.null || {}).sort(),
        [
            'jtorm/components-ui-0.2.0/accordion-item-shell',
            'jtorm/components-ui-0.2.0/accordion-shell'
        ]
    );
});

test('FAQ shells restore after restart without stale text or old-generation reuse', async t => {
    t.after(async () => {
        await render('<body></body>', '', {}, 'http://localhost/');
    });
    let now = 100;
    const clock = () => now;
    const context = {c: 1, s: null, a: null, request: {tenant: 'faq-restart'}};
    const store = {
        uiCacheScoped: true,
        value: null,
        get() { return this.value; },
        set(value) { this.value = value; }
    };
    const options = {
        context,
        jsonLd: false,
        clock,
        persistenceClock: clock,
        store,
        uiCacheInit: true
    };
    const first = await mount(
        faq([item('FIRST restart question', 'FIRST restart answer')]),
        options
    );

    assert.match(first.body, /FIRST restart question/);
    assert.doesNotMatch(JSON.stringify(store.value), /FIRST restart/);
    assert.deepEqual(
        store.value.fragments.map(fragment => fragment.settledAt),
        [100, 100]
    );

    const current = structuredClone(store.value);
    const old = current.fragments.map(fragment => ({
        ...fragment,
        cid: fragment.cid.replace('0.2.0', '0.1.0'),
        html: '<div>OLD-GENERATION</div>',
        settledAt: 99
    }));
    store.value = {
        version: current.version,
        fragments: [...old, ...current.fragments]
    };
    now = 101;

    const restored = await mount(
        faq([item('SECOND restart question', 'SECOND restart answer')]),
        options
    );
    const bytes = JSON.stringify(store.value);

    assert.match(restored.body, /SECOND restart question/);
    assert.doesNotMatch(restored.body, /FIRST restart|OLD-GENERATION/);
    assert.deepEqual(
        store.value.fragments.map(fragment => [
            fragment.cid,
            fragment.settledAt
        ]),
        [
            ['jtorm/components-ui-0.1.0/accordion-shell', 99],
            ['jtorm/components-ui-0.1.0/accordion-item-shell', 99],
            ['jtorm/components-ui-0.2.0/accordion-shell', 100],
            ['jtorm/components-ui-0.2.0/accordion-item-shell', 100]
        ]
    );
    assert.doesNotMatch(bytes, /FIRST restart|SECOND restart/);
});
