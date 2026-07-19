'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { render } = require('../helpers/engine.js');
const { jTormUiCacheModel } = require('../../src/models/ui-cache-model/src/ui-cache-model.js');

const documentOf = body => new JSDOM(`<body>${body}</body>`).window.document;
const mount = async (component, data = {}, options = {}) => {
    const f = options.explicit === false ? '' : " f: 'bootstrap';";
    const renderOptions = {
        framework: options.framework || 'components',
        reuseSharedCaches: !!options.reuseSharedCaches
    };
    if (typeof options.clock === 'function') renderOptions.clock = options.clock;
    if (typeof options.persistenceClock === 'function') renderOptions.persistenceClock = options.persistenceClock;
    if (options.store) renderOptions.uiCacheStore = options.store;
    return render(
        options.html || '<body><div class="mount"></div></body>',
        `.mount->ui { c: '${component}';${f} }`,
        data,
        'http://localhost/',
        null,
        options.context || 0,
        null,
        0,
        renderOptions
    );
};
const classTokens = element => element.className.split(/\s+/).filter(Boolean);
const countToken = (element, token) => classTokens(element).filter(value => value === token).length;
const XSS = '<img src=x onerror=alert(1)>';

test('Bootstrap button variants and zero badge preserve canonical behavior with exact classes', async () => {
    const buttons = [
        ['default', 'btn-secondary'],
        ['primary', 'btn-primary'],
        ['secondary', 'btn-outline-secondary'],
        ['destructive', 'btn-danger']
    ];

    for (const [variant, intent] of buttons) {
        const { body, requests } = await mount(`button.${variant}`, {
            label: 'Continue',
            class: 'host-action'
        }, {explicit: false, framework: 'bootstrap'});
        const button = documentOf(body).querySelector('button');

        assert.equal(
            button.className,
            `jtorm-button host-action jtorm-button--${variant} btn ${intent}`,
            variant
        );
        assert.equal(button.type, 'button');
        assert.equal(button.textContent, 'Continue');
        assert.deepEqual(
            requests.slice(0, 2),
            [`@c/button/button-${variant}.tss`, '@b/button/button.tss'],
            variant + ' canonical-first fetch'
        );
    }

    const { body } = await mount(
        'badge.default',
        {count: 0},
        {explicit: false, framework: 'bootstrap'}
    );
    const badge = documentOf(body).querySelector('.jtorm-badge');
    assert.equal(badge.className, 'badge jtorm-badge text-bg-secondary');
    assert.equal(badge.textContent, '0');
    assert.equal(badge.getAttribute('role'), null);
});

test('Bootstrap alerts, card, and loading add presentation without changing semantics or copy', async () => {
    const alerts = [
        ['default', 'alert-secondary', 'region'],
        ['info', 'alert-info', 'region'],
        ['success', 'alert-success', 'status'],
        ['warning', 'alert-warning', 'region'],
        ['error', 'alert-danger', 'alert']
    ];

    for (const [variant, context, role] of alerts) {
        const { body } = await mount(`alert.${variant}`, {
            heading: 'Notice',
            message: 'Read this'
        }, {explicit: false, framework: 'bootstrap'});
        const alert = documentOf(body).querySelector('.jtorm-alert');
        assert.equal(alert.className, `jtorm-alert jtorm-alert--${variant} alert ${context}`);
        assert.equal(alert.getAttribute('role'), role);
        assert.equal(alert.getAttribute('aria-label'), 'Notice');
        assert.equal(alert.querySelector('.jtorm-alert__title').className, 'jtorm-alert__title alert-heading d-block');
        assert.equal(alert.querySelector('.jtorm-alert__message').className, 'jtorm-alert__message mb-0');
    }

    const cardResult = await mount('card.default', {
        heading: 'Plan',
        summary: 'A short summary',
        action: {href: '/plan', label: 'Read plan'}
    }, {explicit: false, framework: 'bootstrap'});
    const card = documentOf(cardResult.body).querySelector('.jtorm-card');
    assert.equal(card.className, 'jtorm-card card p-3');
    assert.equal(card.getAttribute('aria-label'), 'Plan');
    assert.equal(card.querySelector('.jtorm-card__title').className, 'jtorm-card__title card-title d-block');
    assert.equal(card.querySelector('.jtorm-card__summary').className, 'jtorm-card__summary card-text');
    assert.equal(card.querySelector('.jtorm-card__action').className, 'jtorm-card__action card-link');
    assert.equal(card.querySelector('.jtorm-card__action').getAttribute('href'), '/plan');

    const loadingResult = await mount(
        'loading.default',
        {label: 'Working'},
        {explicit: false, framework: 'bootstrap'}
    );
    const loading = documentOf(loadingResult.body).querySelector('.jtorm-loading');
    assert.equal(loading.className, 'jtorm-loading d-inline-flex align-items-center gap-2');
    assert.equal(loading.getAttribute('role'), 'status');
    assert.equal(
        loading.querySelector('.jtorm-loading__indicator').className,
        'jtorm-loading__indicator spinner-border spinner-border-sm'
    );
    assert.equal(loading.querySelector('.jtorm-loading__indicator').getAttribute('aria-hidden'), 'true');
    assert.equal(loading.querySelector('.jtorm-loading__label').textContent, 'Working');
});

test('native accordion receives Bootstrap treatment once with global Bootstrap resolution', async () => {
    const { body } = await mount('accordion.default', {
        items: [
            {summary: 'One', content: 'First', open: true},
            {summary: 'Two', content: 'Second'}
        ]
    }, {explicit: false, framework: 'bootstrap'});
    const doc = documentOf(body);
    const accordion = doc.querySelector('.jtorm-accordion');
    const items = accordion.querySelectorAll('details');

    assert.equal(accordion.className, 'jtorm-accordion accordion');
    assert.equal(items.length, 2);
    for (const item of items) {
        assert.equal(item.className, 'jtorm-accordion__item accordion-item');
        assert.equal(item.querySelector('summary').className, 'jtorm-accordion__summary accordion-header p-3 fw-semibold');
        assert.equal(item.querySelector('div').className, 'jtorm-accordion__content accordion-body');
        for (const token of ['accordion-item', 'accordion-header', 'accordion-body'])
            assert.equal(countToken(token === 'accordion-item' ? item : item.querySelector(token === 'accordion-header' ? 'summary' : 'div'), token), 1);
        ;
    }
    assert.equal(items[0].hasAttribute('open'), true);
    assert.equal(items[1].hasAttribute('open'), false);
    assert.equal(accordion.querySelector('[data-bs-toggle]'), null);
    assert.equal(accordion.querySelector('.accordion-button,.accordion-collapse,.collapse'), null);
    assert.equal(accordion.querySelector('[aria-expanded]'), null);
});

test('accordion.group receives only the Bootstrap root presentation', async () => {
    const global = await mount(
        'accordion.group',
        {class: 'host-group', items: [{summary: 'Ignored', content: 'Ignored'}]},
        {explicit: false, framework: 'bootstrap'}
    );
    const globalDocument = documentOf(global.body);
    const globalGroup = globalDocument.querySelector('.jtorm-accordion');

    assert.equal(globalGroup.className, 'jtorm-accordion host-group accordion');
    assert.equal(globalGroup.children.length, 0);
    assert.equal(globalGroup.querySelector('.accordion-item'), null);
    assert.equal(globalGroup.querySelector('[data-bs-toggle]'), null);

    const explicit = await mount('accordion.group', {}, {framework: 'components'});
    assert.equal(
        documentOf(explicit.body).querySelector('.jtorm-accordion').className,
        'jtorm-accordion accordion'
    );
    assert.deepEqual(explicit.requests.slice(0, 2), [
        '@c/accordion/accordion-group.tss',
        '@b/accordion/accordion-group.tss'
    ]);
});

test('an explicit Bootstrap accordion styles neutral nested items idempotently', async () => {
    const result = await mount('accordion.default', {
        items: [{summary: 'Explicit', content: 'Nested'}]
    }, {framework: 'components'});
    const doc = documentOf(result.body);
    const accordion = doc.querySelector('.jtorm-accordion');
    const item = accordion.querySelector('details');

    assert.equal(accordion.className, 'jtorm-accordion accordion');
    assert.equal(item.className, 'jtorm-accordion__item accordion-item');
    assert.equal(item.querySelector('summary').className, 'jtorm-accordion__summary accordion-header p-3 fw-semibold');
    assert.equal(item.querySelector('div').className, 'jtorm-accordion__content accordion-body');
});

test('invalid models neither throw nor restyle pre-existing canonical hooks', async () => {
    const cases = [
        [
            'button.primary',
            {label: ''},
            '<button class="jtorm-button jtorm-button--primary">Old</button>',
            '.jtorm-button--primary',
            'jtorm-button jtorm-button--primary'
        ],
        ['badge.default', {}, '<span class="jtorm-badge">Old</span>', '.jtorm-badge', 'jtorm-badge'],
        [
            'alert.error',
            {heading: '', message: 'Present'},
            '<section class="jtorm-alert jtorm-alert--error">Old</section>',
            '.jtorm-alert--error',
            'jtorm-alert jtorm-alert--error'
        ],
        ['card.default', {heading: ''}, '<article class="jtorm-card">Old</article>', '.jtorm-card', 'jtorm-card'],
        [
            'accordion.group',
            [],
            '<div class="jtorm-accordion">Old</div>',
            '.jtorm-accordion',
            'jtorm-accordion'
        ],
        [
            'accordion.default',
            {items: 'invalid'},
            '<div class="jtorm-accordion">Old</div>',
            '.jtorm-accordion',
            'jtorm-accordion'
        ],
        [
            'accordion.item',
            {summary: '', content: 'Present'},
            '<details class="jtorm-accordion__item">Old</details>',
            '.jtorm-accordion__item',
            'jtorm-accordion__item'
        ],
        ['loading.default', true, '<div class="jtorm-loading">Old</div>', '.jtorm-loading', 'jtorm-loading']
    ];

    for (const [component, data, existing, selector, className] of cases) {
        const { body } = await mount(component, data, {
            framework: 'components',
            html: `<body><div class="mount">${existing}</div></body>`
        });
        const matches = documentOf(body).querySelectorAll(selector);
        assert.equal(matches.length, 1, component);
        assert.equal(matches[0].className, className, component + ' unchanged class');
        assert.equal(matches[0].textContent, 'Old', component + ' unchanged content');
    }
});

test('valid output is appended after existing matching hooks and only the fresh node is decorated', async () => {
    const { body } = await mount('button.primary', {label: 'New'}, {
        html: '<body><div class="mount">'
            + '<button class="jtorm-button jtorm-button--primary">Old</button>'
            + '<span class="tail">Tail</span>'
            + '</div></body>'
    });
    const doc = documentOf(body);
    const mountElement = doc.querySelector('.mount');
    const buttons = mountElement.querySelectorAll('.jtorm-button--primary');

    assert.equal(buttons.length, 2);
    assert.equal(buttons[0].className, 'jtorm-button jtorm-button--primary');
    assert.equal(buttons[0].textContent, 'Old');
    assert.equal(buttons[1].className, 'jtorm-button jtorm-button--primary btn btn-primary');
    assert.equal(buttons[1].textContent, 'New');
    assert.equal(mountElement.lastElementChild, buttons[1]);
});

test('canonical escaping, safe root attributes, and guarded card URLs remain authoritative', async () => {
    const { body } = await mount('card.default', {
        heading: XSS,
        summary: XSS,
        action: {href: '/safe', label: XSS},
        id: 'safe-card',
        class: 'host-card',
        'data-bs-toggle': 'collapse'
    });
    const doc = documentOf(body);
    const card = doc.querySelector('.jtorm-card');

    assert.equal(card.id, 'safe-card');
    assert.equal(card.className, 'jtorm-card host-card card p-3');
    assert.equal(card.querySelector('.jtorm-card__title').textContent, XSS);
    assert.equal(card.querySelector('.jtorm-card__summary').textContent, XSS);
    assert.equal(card.querySelector('.jtorm-card__action').textContent, XSS);
    assert.equal(card.getAttribute('data-bs-toggle'), null);
    assert.equal(doc.querySelector('img'), null);

    await assert.rejects(
        mount('card.default', {
            heading: 'Unsafe',
            action: {href: 'javascript:alert(1)', label: 'Open'}
        }),
        /Unsafe attribute href/
    );
});

test('resolver keeps Bootstrap and neutral descriptors separate and falls back for unmapped components', async () => {
    const mixed = await render(
        '<body><div class="bootstrap"></div><div class="neutral"></div></body>',
        ".bootstrap->ui { c: 'button.primary'; f: 'bootstrap'; }"
            + ".neutral->ui { c: 'button.primary'; f: 'components'; }",
        {label: 'Same'},
        'http://localhost/', null, 0, null, 0,
        {framework: 'components'}
    );
    const mixedDoc = documentOf(mixed.body);
    assert.equal(mixedDoc.querySelector('.bootstrap button').classList.contains('btn-primary'), true);
    assert.equal(mixedDoc.querySelector('.neutral button').className, 'jtorm-button jtorm-button--primary');

    const bootstrapFallback = await render(
        '<body><div class="mount"></div></body>',
        ".mount->ui { c: 'grid.container'; f: 'bootstrap'; }",
        {}
    );
    const component = await render(
        '<body><div class="mount"></div></body>',
        ".mount->ui { c: 'grid.container'; f: 'components'; }",
        {}
    );
    assert.equal(bootstrapFallback.body, component.body);
    assert.equal(bootstrapFallback.requests.includes('@c/grid/container.tss'), true);
    assert.equal(bootstrapFallback.requests.some(request => request.startsWith('@b/')), false);
});

test('all seven canonical caches stay static while mixed frameworks bind and decorate fresh data', async t => {
    t.after(async () => {
        await render('<body></body>', '', {}, 'http://localhost/');
    });
    const context = {c: 0, s: null, a: null, request: {tenant: 'tenant-a'}};
    const store = {
        uiCacheScoped: true,
        value: null,
        get() { return this.value; },
        set(value) { this.value = value; }
    };
    const clock = () => 0;
    const catalog = [
        ['button.primary', marker => ({label: marker + '-button'}), '.btn-primary'],
        ['badge.default', marker => ({label: marker + '-badge'}), '.text-bg-secondary'],
        ['alert.success', marker => ({heading: marker + '-alert', message: 'Message'}), '.alert-success'],
        ['card.default', marker => ({heading: marker + '-card', summary: 'Summary'}), '.card'],
        ['accordion.default', marker => ({
            items: [{summary: marker + '-accordion', content: 'Content'}]
        }), '.accordion'],
        ['loading.default', marker => ({label: marker + '-loading'}), '.spinner-border']
    ];
    const run = async (marker, bootstrap, cold = false) => {
        const results = [];
        for (let i = 0; i < catalog.length; i++) {
            const [component, data, selector] = catalog[i];
            const result = await mount(component, data(marker), {
                explicit: bootstrap,
                framework: 'components',
                context,
                clock,
                persistenceClock: clock,
                store,
                reuseSharedCaches: !cold || i > 0
            });
            results.push([result.body, selector]);
        }
        return results;
    };
    const first = await run('FIRST', true, true);
    const cacheBytes = JSON.stringify(jTormUiCacheModel.cache);
    const persistedBytes = JSON.stringify(store.value);

    for (const [body, selector] of first) {
        assert.match(body, /FIRST-/);
        assert.notEqual(documentOf(body).querySelector(selector), null);
    }
    for (const bytes of [cacheBytes, persistedBytes]) {
        assert.doesNotMatch(bytes, /FIRST-/);
        for (const value of [
            'btn btn-primary',
            'text-bg-secondary',
            'alert alert-success',
            'card p-3',
            'jtorm-accordion accordion',
            'spinner-border'
        ])
            assert.equal(bytes.includes(value), false, value)
        ;
    }
    assert.deepEqual(
        Object.keys(jTormUiCacheModel.cache.null || {}).sort(),
        [
            'jtorm/components-ui-0.2.0/accordion-item-shell',
            'jtorm/components-ui-0.2.0/accordion-shell',
            'jtorm/components-ui-0.2.0/alert-shell',
            'jtorm/components-ui-0.2.0/badge-shell',
            'jtorm/components-ui-0.2.0/button-shell',
            'jtorm/components-ui-0.2.0/card-shell',
            'jtorm/components-ui-0.2.0/loading-shell'
        ]
    );

    const neutral = await run('SECOND', false);
    for (const [body, selector] of neutral) {
        assert.match(body, /SECOND-/);
        assert.equal(documentOf(body).querySelector(selector), null);
    }

    const warm = await run('THIRD', true);
    for (const [body, selector] of warm) {
        assert.match(body, /THIRD-/);
        assert.doesNotMatch(body, /FIRST-|SECOND-/);
        assert.notEqual(documentOf(body).querySelector(selector), null);
    }
    assert.equal(JSON.stringify(jTormUiCacheModel.cache), cacheBytes);
});
