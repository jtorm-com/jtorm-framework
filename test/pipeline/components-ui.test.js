'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { render } = require('../helpers/engine.js');
const { jTormLanguageModel } = require('../../src/models/language-model/src/language-model.js');
const { jTormUiCacheModel } = require('../../src/models/ui-cache-model/src/ui-cache-model.js');

const mount = async (component, data = {}) => {
    const { body } = await render(
        '<body><div class="mount"></div></body>',
        `.mount->ui { c: '${component}'; }`,
        data
    );
    return body;
};

const documentOf = (body) => new JSDOM(`<body>${body}</body>`).window.document;
const XSS = '<img src=x onerror=alert(1)>';

test('canonical button variants render native neutral and explicit intent hooks', async () => {
    const cases = [
        ['default', 'jtorm-button--default'],
        ['primary', 'jtorm-button--primary'],
        ['secondary', 'jtorm-button--secondary'],
        ['destructive', 'jtorm-button--destructive']
    ];

    for (const [variant, intent] of cases)
        assert.equal(
            await mount(`button.${variant}`, { label: 'Continue' }),
            `<div class="mount"><button class="jtorm-button ${intent}" type="button">Continue</button></div>`,
            variant
        )
    ;
});

test('button and alert variants never restyle pre-existing matching descendants', async () => {
    const button = await render(
        '<body><div class="mount"><button class="jtorm-button">Existing</button></div></body>',
        ".mount->ui { c: 'button.primary'; }",
        { label: 'New' }
    );
    const buttonDocument = documentOf(button.body);
    const buttons = buttonDocument.querySelectorAll('.jtorm-button');
    assert.equal(buttons.length, 2);
    assert.equal(buttons[0].className, 'jtorm-button');
    assert.equal(buttons[0].getAttribute('type'), null);
    assert.equal(buttons[1].className, 'jtorm-button jtorm-button--primary');
    assert.equal(buttons[1].getAttribute('type'), 'button');

    const alert = await render(
        '<body><div class="mount"><section class="jtorm-alert">Existing</section></div></body>',
        ".mount->ui { c: 'alert.error'; }",
        { heading: 'New', message: 'Message' }
    );
    const alertDocument = documentOf(alert.body);
    const alerts = alertDocument.querySelectorAll('.jtorm-alert');
    assert.equal(alerts.length, 2);
    assert.equal(alerts[0].className, 'jtorm-alert');
    assert.equal(alerts[0].getAttribute('role'), null);
    assert.equal(alerts[1].className, 'jtorm-alert jtorm-alert--error');
    assert.equal(alerts[1].getAttribute('role'), 'alert');
});

test('canonical buttons fail closed on type and expose only approved native fields', async () => {
    assert.equal(
        await mount('button.primary', {
            label: 'Opslaan',
            type: 'submit',
            disabled: true,
            form: 'order',
            name: 'intent',
            value: 'save',
            id: 'submitter',
            class: 'extra',
            lang: 'nl',
            dir: 'rtl',
            title: 'leak',
            style: 'color:#000;',
            tabindex: '9',
            onclick: 'leak'
        }),
        '<div class="mount"><button class="jtorm-button extra jtorm-button--primary" type="submit" disabled="" form="order" name="intent" value="save" id="submitter" lang="nl" dir="rtl">Opslaan</button></div>'
    );

    for (const type of [undefined, '', 'submit-now', 'invalid', ['submit'], new String('submit')])
        assert.match(
            await mount('button.default', { label: 'Safe', type }),
            /type="button"/
        )
    ;

    assert.equal(
        await mount('button.secondary', {
            label: 'Reset',
            type: 'reset',
            disabled: false,
            dir: 'sideways'
        }),
        '<div class="mount"><button class="jtorm-button jtorm-button--secondary" type="reset">Reset</button></div>'
    );
});

test('canonical buttons omit empty labels and escape visible caller copy', async () => {
    assert.equal(await mount('button.default', {}), '<div class="mount"></div>');
    assert.equal(await mount('button.default', { label: '' }), '<div class="mount"></div>');

    const body = await mount('button.default', { label: XSS });
    const doc = documentOf(body);
    assert.equal(doc.querySelector('.jtorm-button').textContent, XSS);
    assert.equal(doc.querySelector('img'), null);
});

test('four published button and anchor recipes keep exact output', async () => {
    const cases = {
        'button.primaryButton': [
            { html: 'Go', type: 'submit' },
            '<button type="submit" class="primary-button">Go</button>'
        ],
        'button.secondaryButton': [
            { html: 'Go', type: 'submit' },
            '<button type="submit" class="secondary-button">Go</button>'
        ],
        'button.primaryAnchor': [{ html: 'Go', href: '/go' }, '<a href="/go" class="primary-button">Go</a>'],
        'button.secondaryAnchor': [{ html: 'Go', href: '/go' }, '<a href="/go" class="secondary-button">Go</a>']
    };

    for (const [component, [data, html]] of Object.entries(cases))
        assert.equal(
            await mount(component, data),
            `<div class="mount">${html}</div>`,
            component
        )
    ;
});

test('badge prefers label, preserves numeric zero, stays inert, and is not live', async () => {
    assert.equal(
        await mount('badge.default', { label: 'New', count: 4 }),
        '<div class="mount"><span class="badge jtorm-badge">New</span></div>'
    );
    assert.equal(
        await mount('badge.default', { count: 0 }),
        '<div class="mount"><span class="badge jtorm-badge">0</span></div>'
    );
    assert.equal(await mount('badge.default', {}), '<div class="mount"></div>');

    const body = await mount('badge.default', { label: XSS });
    const doc = documentOf(body);
    const badge = doc.querySelector('.jtorm-badge');
    assert.equal(badge.textContent, XSS);
    assert.equal(badge.getAttribute('role'), null);
    assert.equal(doc.querySelector('img'), null);
});

test('alert variants render named native regions with reviewed role mapping', async () => {
    const cases = [
        ['default', 'default', 'region'],
        ['info', 'info', 'region'],
        ['success', 'success', 'status'],
        ['warning', 'warning', 'region'],
        ['error', 'error', 'alert']
    ];

    for (const [variant, intent, role] of cases)
        assert.equal(
            await mount(`alert.${variant}`, {
                heading: 'Notice',
                message: 'Read this'
            }),
            '<div class="mount">'
                + `<section class="jtorm-alert jtorm-alert--${intent}" aria-label="Notice" role="${role}">`
                + '<strong class="jtorm-alert__title">Notice</strong>'
                + '<p class="jtorm-alert__message">Read this</p>'
                + '</section></div>',
            variant
        )
    ;
});

test('alerts require both fields, escape copy, and never duplicate live semantics', async () => {
    assert.equal(
        await mount('alert.info', { heading: 'Only' }),
        '<div class="mount"></div>'
    );
    assert.equal(
        await mount('alert.info', { message: 'Only' }),
        '<div class="mount"></div>'
    );
    assert.equal(
        await mount('alert.info', { heading: 1, message: 'Valid' }),
        '<div class="mount"></div>'
    );
    assert.equal(
        await mount('alert.info', { heading: 'Valid', message: 1 }),
        '<div class="mount"></div>'
    );

    const body = await mount('alert.error', { heading: XSS, message: XSS });
    const doc = documentOf(body);
    const alert = doc.querySelector('.jtorm-alert');
    assert.equal(alert.querySelector('.jtorm-alert__title').textContent, XSS);
    assert.equal(alert.querySelector('.jtorm-alert__message').textContent, XSS);
    assert.equal(alert.getAttribute('aria-live'), null);
    assert.equal(doc.querySelector('img'), null);
});

test('canonical components reject undocumented top-level non-object models', async () => {
    const cases = [
        ['button.primary', { label: 'Continue' }],
        ['badge.default', { label: 'New' }],
        ['alert.error', { heading: 'Error', message: 'Try again' }],
        ['card.default', { heading: 'Plan' }],
        ['accordion.default', { items: [{ summary: 'One', content: 'First' }] }],
        ['accordion.item', { summary: 'One', content: 'First' }],
        ['loading.default', { label: 'Working' }]
    ];

    for (const [component, data] of cases) {
        assert.equal(
            await mount(component, [data, data]),
            '<div class="mount"></div>',
            component
        );
        assert.equal(
            await mount(component, true),
            '<div class="mount"></div>',
            component + ' scalar'
        );
        const functionData = Object.assign(() => {}, data);
        assert.equal(
            await mount(component, functionData),
            '<div class="mount"></div>',
            component + ' function'
        );

        assert.equal(
            await mount(component, null),
            '<div class="mount"></div>',
            component + ' null'
        );
    }
});

test('card renders a named article with optional summary and explicit action', async () => {
    assert.equal(
        await mount('card.default', {
            heading: 'Plan',
            summary: 'A short summary',
            action: { href: '/plan', label: 'Read plan' }
        }),
        '<div class="mount"><article class="jtorm-card" aria-label="Plan">'
            + '<strong class="jtorm-card__title">Plan</strong>'
            + '<p class="jtorm-card__summary">A short summary</p>'
            + ' '
            + '<a class="jtorm-card__action" href="/plan">Read plan</a>'
            + '</article></div>'
    );

    assert.equal(
        await mount('card.default', {
            heading: 'Plan',
            action: { href: '/plan', label: 'Read plan' }
        }),
        '<div class="mount"><article class="jtorm-card" aria-label="Plan">'
            + '<strong class="jtorm-card__title">Plan</strong>'
            + ' '
            + '<a class="jtorm-card__action" href="/plan">Read plan</a>'
            + '</article></div>'
    );

    assert.equal(
        await mount('card.default', {
            heading: 'Plan',
            action: { href: '/plan' }
        }),
        '<div class="mount"><article class="jtorm-card" aria-label="Plan">'
            + '<strong class="jtorm-card__title">Plan</strong>'
            + '</article></div>'
    );
    assert.equal(await mount('card.default', {}), '<div class="mount"></div>');
});

test('card escapes all copy and routes action href through the unsafe-scheme guard', async () => {
    const body = await mount('card.default', {
        heading: XSS,
        summary: XSS,
        action: { href: '/safe', label: XSS }
    });
    const doc = documentOf(body);
    assert.equal(doc.querySelector('.jtorm-card__title').textContent, XSS);
    assert.equal(doc.querySelector('.jtorm-card__summary').textContent, XSS);
    assert.equal(doc.querySelector('.jtorm-card__action').textContent, XSS);
    assert.equal(doc.querySelector('img'), null);

    for (const href of [
        'javascript:alert(1)',
        ' data:text/html,boom',
        'vbscript:msgbox(1)',
        '\njava\tscript:alert(1)'
    ])
        await assert.rejects(
            mount('card.default', {
                heading: 'Unsafe',
                action: { href, label: 'Open' }
            }),
            /Unsafe attribute href/
        )
    ;
});

test('accordion.group exposes one reusable root without consuming caller item fields', async () => {
    const data = Object.freeze({
        id: 'faq-group',
        class: 'host-group',
        lang: 'en',
        dir: 'rtl',
        items: [{summary: 'Must not render', content: 'Must not render'}],
        summary: 'Must not render',
        content: 'Must not render',
        open: true
    });
    const body = await mount('accordion.group', data);
    const doc = documentOf(body);
    const group = doc.querySelector('.jtorm-accordion');

    assert.ok(group);
    assert.equal(group.id, 'faq-group');
    assert.equal(group.className, 'jtorm-accordion host-group');
    assert.equal(group.lang, 'en');
    assert.equal(group.dir, 'rtl');
    assert.equal(group.children.length, 0);
    assert.equal(group.textContent, '');
    assert.equal(group.hasAttribute('open'), false);

    for (const invalid of [null, true, 1, 'group', [], [{}]])
        assert.equal(await mount('accordion.group', invalid), '<div class="mount"></div>')
    ;

    const inherited = Object.create({id: 'inherited-id', class: 'inherited-class'});
    const inheritedDocument = documentOf(await mount('accordion.group', inherited));
    assert.equal(inheritedDocument.querySelector('.jtorm-accordion').id, 'inherited-id');
    assert.equal(
        inheritedDocument.querySelector('.jtorm-accordion').className,
        'jtorm-accordion inherited-class'
    );
});

test('accordion.group composes directly with accordion.item', async () => {
    const result = await render(
        '<body><div class="mount"></div></body>',
        ".mount->ui { c: 'accordion.group'; }"
            + ".jtorm-accordion:last-child->append->ui { c: 'accordion.item'; }",
        {summary: 'Question', content: 'Answer'}
    );

    assert.equal(
        result.body,
        '<div class="mount"><div class="jtorm-accordion">'
            + '<details class="jtorm-accordion__item">'
            + '<summary class="jtorm-accordion__summary">Question</summary>'
            + '<div class="jtorm-accordion__content">Answer</div></details>'
            + '</div></div>'
    );
});

test('accordion.default renders ordered native disclosures and skips invalid items', async () => {
    assert.equal(
        await mount('accordion.default', {
            items: [
                { summary: 'One', content: 'First', open: true },
                { summary: '', content: 'Invalid' },
                { summary: 'Two', content: 'Second', open: true }
            ]
        }),
        '<div class="mount"><div class="jtorm-accordion">'
            + '<details class="jtorm-accordion__item" open="">'
            + '<summary class="jtorm-accordion__summary">One</summary>'
            + '<div class="jtorm-accordion__content">First</div></details>'
            + '<details class="jtorm-accordion__item" open="">'
            + '<summary class="jtorm-accordion__summary">Two</summary>'
            + '<div class="jtorm-accordion__content">Second</div></details>'
            + '</div></div>'
    );
    assert.equal(
        await mount('accordion.default', { items: 'not-an-array' }),
        '<div class="mount"></div>'
    );
});

test('accordion.item supports direct composition, escaped text, and boolean open only', async () => {
    const closed = await mount('accordion.item', {
        summary: XSS,
        content: XSS,
        open: 'true'
    });
    const doc = documentOf(closed);
    const details = doc.querySelector('details');
    assert.equal(details.hasAttribute('open'), false);
    assert.equal(details.querySelector('summary').textContent, XSS);
    assert.equal(details.querySelector('.jtorm-accordion__content').textContent, XSS);
    assert.equal(doc.querySelector('img'), null);

    assert.match(
        await mount('accordion.item', {
            summary: 'Open',
            content: 'Content',
            open: true
        }),
        /<details class="jtorm-accordion__item" open="">/
    );
    assert.equal(
        await mount('accordion.item', { summary: 'Missing content' }),
        '<div class="mount"></div>'
    );

    const preserved = await render(
        '<body><div class="mount"><p>Existing</p></div></body>',
        ".mount->ui { c: 'accordion.item'; }",
        { summary: 'New', content: 'Content' }
    );
    assert.equal(
        preserved.body,
        '<div class="mount"><p>Existing</p>'
            + '<details class="jtorm-accordion__item">'
            + '<summary class="jtorm-accordion__summary">New</summary>'
            + '<div class="jtorm-accordion__content">Content</div></details>'
            + '</div>'
    );
});

test('accordion iteration leaves deeply frozen caller arrays and items unchanged', async () => {
    const items = [
        Object.freeze({ summary: 'One', content: 'First' }),
        Object.freeze({ summary: 'Two', content: 'Second', open: true })
    ];
    Object.freeze(items);
    const data = Object.freeze({ items });
    const before = JSON.stringify(data);

    const body = await mount('accordion.default', data);

    assert.equal(JSON.stringify(data), before);
    assert.equal((body.match(/<details/g) || []).length, 2);
});

test('accordion output stays one-to-one for a representative larger collection', async () => {
    const items = Array.from({ length: 32 }, (_, i) => ({
        summary: `Item ${i}`,
        content: `Content ${i}`
    }));

    const body = await mount('accordion.default', { items });
    const doc = documentOf(body);

    assert.equal(doc.querySelectorAll('details').length, items.length);
    assert.equal(doc.querySelectorAll('summary').length, items.length);
    assert.equal(doc.querySelectorAll('.jtorm-accordion__content').length, items.length);
});

test('accordion.default adds one constant group artifact without per-item acquisition', async () => {
    const expected = [
        '@c/accordion/accordion-default.tss',
        '@c/accordion/accordion-group.tss',
        '@c/accordion/accordion-shell.tss',
        '@h/@e/div.html',
        '@c/accordion/accordion-item.tss',
        '@c/accordion/accordion-item-shell.tss',
        '@h/@e/details.html',
        '@h/@e/summary.html'
    ];

    for (const length of [1, 32]) {
        const items = Array.from({length}, (_, i) => ({
            summary: 'Question ' + i,
            content: 'Answer ' + i
        }));
        const result = await render(
            '<body><div class="mount"></div></body>',
            ".mount->ui { c: 'accordion.default'; f: 'components'; }",
            {items},
            'http://localhost/',
            null,
            0,
            null,
            0,
            {jsonLd: false, framework: 'components'}
        );

        assert.deepEqual(result.requests, expected);
        assert.equal(documentOf(result.body).querySelectorAll('details').length, length);
    }
});

test('loading renders a localized named status with safe fallback and no implicit busy state', async t => {
    const get = jTormLanguageModel.get;
    const translated = [];
    jTormLanguageModel.get = function (value, locale) {
        translated.push(value);
        if (value === 'Loading') return 'Laden';
        return get.call(this, value, locale);
    };
    t.after(() => { jTormLanguageModel.get = get; });

    assert.equal(
        await mount('loading.default'),
        '<div class="mount"><div class="jtorm-loading" role="status" data-nosnippet="1">'
            + '<span class="jtorm-loading__indicator" aria-hidden="true"></span>'
            + '<small class="jtorm-loading__label">Laden</small>'
            + '</div></div>'
    );

    for (const label of [true, {}, []]) {
        const invalidBody = await mount('loading.default', { label });
        const invalidDocument = documentOf(invalidBody);
        assert.equal(
            invalidDocument.querySelector('.jtorm-loading__label').textContent,
            'Laden'
        );
    }

    const body = await mount('loading.default', { label: XSS });
    const doc = documentOf(body);
    const loading = doc.querySelector('.jtorm-loading');
    assert.equal(loading.querySelector('.jtorm-loading__label').textContent, XSS);
    assert.equal(loading.getAttribute('id'), null);
    assert.equal(loading.getAttribute('aria-live'), null);
    assert.equal(loading.getAttribute('aria-busy'), null);
    assert.equal(doc.querySelector('img'), null);
    assert.equal(translated.includes(XSS), false);
});

test('shared attributes stay on roots and unknown caller fields never leak', async () => {
    const body = await mount('card.default', {
        heading: 'Root only',
        id: 'component-id',
        class: 'caller-class',
        lang: 'ar',
        dir: 'rtl',
        title: 'secret-title',
        style: 'color:#000;',
        tabindex: '7',
        hidden: 'hidden',
        'data-secret': 'secret',
        'aria-hidden': 'true'
    });
    const doc = documentOf(body);
    const card = doc.querySelector('.jtorm-card');

    assert.equal(card.id, 'component-id');
    assert.equal(card.className, 'jtorm-card caller-class');
    assert.equal(card.lang, 'ar');
    assert.equal(card.dir, 'rtl');
    for (const name of ['title', 'style', 'tabindex', 'hidden', 'data-secret', 'aria-hidden'])
        assert.equal(card.getAttribute(name), null, name)
    ;
    assert.equal(doc.querySelectorAll('#component-id').length, 1);
    assert.equal(doc.querySelectorAll('.caller-class').length, 1);
    for (const child of card.querySelectorAll('*')) {
        assert.equal(child.id, '');
        assert.equal(child.classList.contains('caller-class'), false);
    }
});

test('enum attributes reject string-coercible non-string values', async () => {
    const cases = [
        ['button.default', { label: 'Safe', dir: ['rtl'] }, '.jtorm-button'],
        ['badge.default', { label: 'Safe', dir: ['rtl'] }, '.jtorm-badge'],
        ['alert.info', { heading: 'Safe', message: 'Message', dir: ['rtl'] }, '.jtorm-alert'],
        ['card.default', { heading: 'Safe', dir: ['rtl'] }, '.jtorm-card'],
        ['accordion.group', { dir: ['rtl'] }, '.jtorm-accordion'],
        ['accordion.default', { items: [], dir: ['rtl'] }, '.jtorm-accordion'],
        ['accordion.item', { summary: 'Safe', content: 'Content', dir: ['rtl'] }, '.jtorm-accordion__item'],
        ['loading.default', { label: 'Safe', dir: ['rtl'] }, '.jtorm-loading']
    ];

    for (const [component, data, selector] of cases) {
        const body = await mount(component, data);
        const doc = documentOf(body);
        assert.equal(
            doc.querySelector(selector).getAttribute('dir'),
            null,
            component
        );
    }
});

test('canonical cached shells contain no caller data and warm renders bind fresh data', async t => {
    t.after(async () => {
        await render('<body></body>', '', {}, 'http://localhost/');
    });
    const context = {c: 0, s: null, a: null, request: {tenant: 'tenant-a'}};
    const cases = [
        ['button.primary', marker => ({
            label: marker + '-button',
            id: marker + '-button-id'
        })],
        ['badge.default', marker => ({
            label: marker + '-badge',
            id: marker + '-badge-id'
        })],
        ['alert.error', marker => ({
            heading: marker + '-alert-heading',
            message: marker + '-alert-message',
            id: marker + '-alert-id'
        })],
        ['card.default', marker => ({
            heading: marker + '-card-heading',
            summary: marker + '-card-summary',
            action: {href: '/' + marker + '-card', label: marker + '-card-action'},
            id: marker + '-card-id'
        })],
        ['accordion.default', marker => ({
            id: marker + '-accordion-id',
            items: [{
                summary: marker + '-accordion-summary',
                content: marker + '-accordion-content',
                id: marker + '-accordion-item-id'
            }]
        })],
        ['loading.default', marker => ({
            label: marker + '-loading',
            id: marker + '-loading-id'
        })]
    ];
    const renderComponent = (component, data, reuseSharedCaches) => render(
        '<body><div class="mount"></div></body>',
        `.mount->ui { c: '${component}'; }`,
        data,
        'http://localhost/',
        null,
        context,
        null,
        0,
        {reuseSharedCaches}
    );

    for (let i = 0; i < cases.length; i++) {
        const [component, data] = cases[i];
        const first = await renderComponent(component, data('FIRST'), i > 0);
        assert.equal(first.body.includes('FIRST'), true, component + ' cold binding');
    }

    const coldBytes = JSON.stringify(jTormUiCacheModel.cache);
    const expectedIds = [
        'jtorm/components-ui-0.2.0/accordion-item-shell',
        'jtorm/components-ui-0.2.0/accordion-shell',
        'jtorm/components-ui-0.2.0/alert-shell',
        'jtorm/components-ui-0.2.0/badge-shell',
        'jtorm/components-ui-0.2.0/button-shell',
        'jtorm/components-ui-0.2.0/card-shell',
        'jtorm/components-ui-0.2.0/loading-shell'
    ];
    const fragments = Object.values(jTormUiCacheModel.cache)
        .flatMap(language => Object.values(language)
            .flatMap(component => Object.values(component)));

    assert.deepEqual(Object.keys(jTormUiCacheModel.cache.null || {}).sort(), expectedIds);
    assert.equal(fragments.length, expectedIds.length);
    assert.equal(fragments.some(html => /FIRST|SECOND/.test(html)), false);

    for (const [component, data] of cases) {
        const warm = await renderComponent(component, data('SECOND'), true);
        assert.equal(warm.body.includes('SECOND'), true, component + ' warm binding');
        assert.equal(warm.body.includes('FIRST'), false, component + ' stale binding');
    }

    assert.equal(JSON.stringify(jTormUiCacheModel.cache), coldBytes);
});
