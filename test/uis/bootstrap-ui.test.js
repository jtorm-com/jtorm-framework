'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeTssParser } = require('../helpers/parser.js');

const ROOT = path.resolve(__dirname, '../../src/uis/bootstrap-ui');
const load = () => ({
    pkg: require(path.join(ROOT, 'package.json')),
    ui: require(path.join(ROOT, 'src/bootstrap-ui.js')).jTormBootstrapUI
});

const descriptors = {
    'button.default': ['@c/button/button-default.tss', '@b/button/button.tss'],
    'button.primary': ['@c/button/button-primary.tss', '@b/button/button.tss'],
    'button.secondary': ['@c/button/button-secondary.tss', '@b/button/button.tss'],
    'button.destructive': ['@c/button/button-destructive.tss', '@b/button/button.tss'],
    'badge.default': ['@c/badge/badge-default.tss', '@b/badge/badge.tss'],
    'alert.default': ['@c/alert/alert-default.tss', '@b/alert/alert.tss'],
    'alert.info': ['@c/alert/alert-info.tss', '@b/alert/alert.tss'],
    'alert.success': ['@c/alert/alert-success.tss', '@b/alert/alert.tss'],
    'alert.warning': ['@c/alert/alert-warning.tss', '@b/alert/alert.tss'],
    'alert.error': ['@c/alert/alert-error.tss', '@b/alert/alert.tss'],
    'card.default': ['@c/card/card-default.tss', '@b/card/card.tss'],
    'accordion.default': ['@c/accordion/accordion-default.tss', '@b/accordion/accordion.tss'],
    'accordion.item': ['@c/accordion/accordion-item.tss', '@b/accordion/accordion-item.tss'],
    'loading.default': ['@c/loading/loading-default.tss', '@b/loading/loading.tss']
};

const classes = {
    '@b/button/button.tss': [
        'btn btn-danger',
        'btn btn-outline-secondary',
        'btn btn-primary',
        'btn btn-secondary'
    ],
    '@b/badge/badge.tss': ['text-bg-secondary'],
    '@b/alert/alert.tss': [
        'alert',
        'alert-danger',
        'alert-heading d-block',
        'alert-info',
        'alert-secondary',
        'alert-success',
        'alert-warning',
        'mb-0'
    ],
    '@b/card/card.tss': ['card p-3', 'card-link', 'card-text', 'card-title d-block'],
    '@b/accordion/accordion.tss': [
        'accordion',
        'accordion-body',
        'accordion-header p-3 fw-semibold',
        'accordion-item'
    ],
    '@b/accordion/accordion-item.tss': [
        'accordion-body',
        'accordion-header p-3 fw-semibold',
        'accordion-item'
    ],
    '@b/loading/loading.tss': [
        'd-inline-flex align-items-center gap-2',
        'spinner-border spinner-border-sm'
    ]
};

const gateReads = {
    '@b/button/button.tss': ['label'],
    '@b/badge/badge.tss': ['count', 'label'],
    '@b/alert/alert.tss': ['heading', 'message'],
    '@b/card/card.tss': ['heading'],
    '@b/accordion/accordion.tss': ['items'],
    '@b/accordion/accordion-item.tss': ['content', 'summary'],
    '@b/loading/loading.tss': []
};

const selectors = {
    '@b/button/button.tss': [
        '.jtorm-button--default:last-child',
        '.jtorm-button--destructive:last-child',
        '.jtorm-button--primary:last-child',
        '.jtorm-button--secondary:last-child'
    ],
    '@b/badge/badge.tss': ['.jtorm-badge:last-child'],
    '@b/alert/alert.tss': [
        '.jtorm-alert--default:last-child',
        '.jtorm-alert--error:last-child',
        '.jtorm-alert--info:last-child',
        '.jtorm-alert--success:last-child',
        '.jtorm-alert--warning:last-child',
        '.jtorm-alert:last-child',
        '.jtorm-alert__message',
        '.jtorm-alert__title'
    ],
    '@b/card/card.tss': [
        '.jtorm-card:last-child',
        '.jtorm-card__action',
        '.jtorm-card__summary',
        '.jtorm-card__title'
    ],
    '@b/accordion/accordion.tss': [
        '.jtorm-accordion:last-child',
        '.jtorm-accordion:last-child:not(.accordion)',
        '.jtorm-accordion__content:not(.accordion-body)',
        '.jtorm-accordion__item:not(.accordion-item)',
        '.jtorm-accordion__summary:not(.accordion-header)'
    ],
    '@b/accordion/accordion-item.tss': [
        '.jtorm-accordion__content:not(.accordion-body)',
        '.jtorm-accordion__item:last-child',
        '.jtorm-accordion__item:last-child:not(.accordion-item)',
        '.jtorm-accordion__summary:not(.accordion-header)'
    ],
    '@b/loading/loading.tss': [
        '.jtorm-loading:last-child',
        '.jtorm-loading__indicator'
    ]
};

const ifParams = {
    '@b/button/button.tss': [
        {to: "'array'"},
        {to: "'object'"},
        {d: 'label', to: "'string'"},
        {el: "'.jtorm-button--default:last-child'"},
        {el: "'.jtorm-button--primary:last-child'"},
        {el: "'.jtorm-button--secondary:last-child'"},
        {el: "'.jtorm-button--destructive:last-child'"}
    ],
    '@b/badge/badge.tss': [
        {to: "'array'"},
        {to: "'object'"}
    ],
    '@b/alert/alert.tss': [
        {to: "'array'"},
        {to: "'object'"},
        {d: 'heading', to: "'string'"},
        {d: 'message', to: "'string'"},
        {el: "'.jtorm-alert--default:last-child'"},
        {el: "'.jtorm-alert--info:last-child'"},
        {el: "'.jtorm-alert--success:last-child'"},
        {el: "'.jtorm-alert--warning:last-child'"},
        {el: "'.jtorm-alert--error:last-child'"}
    ],
    '@b/card/card.tss': [
        {to: "'array'"},
        {to: "'object'"},
        {d: 'heading', to: "'string'"},
        {el: "'.jtorm-card__summary'"},
        {el: "'.jtorm-card__action'"}
    ],
    '@b/accordion/accordion.tss': [
        {to: "'array'"},
        {to: "'object'"},
        {d: 'items', to: "'array'"},
        {el: "'.jtorm-accordion:last-child:not(.accordion)'"},
        {el: "'.jtorm-accordion__item:not(.accordion-item)'"},
        {el: "'.jtorm-accordion__summary:not(.accordion-header)'"},
        {el: "'.jtorm-accordion__content:not(.accordion-body)'"}
    ],
    '@b/accordion/accordion-item.tss': [
        {to: "'array'"},
        {to: "'object'"},
        {d: 'summary', to: "'string'"},
        {d: 'content', to: "'string'"},
        {el: "'.jtorm-accordion__item:last-child:not(.accordion-item)'"},
        {el: "'.jtorm-accordion__summary:not(.accordion-header)'"},
        {el: "'.jtorm-accordion__content:not(.accordion-body)'"}
    ],
    '@b/loading/loading.tss': [
        {to: "'array'"},
        {to: "'object'"}
    ]
};

const nodes = tree => tree.flatMap(node => [node, ...nodes(node.c || [])]);
const params = value => JSON.stringify(Object.fromEntries(Object.entries(value).sort()));
const artifactPath = artifact => path.join(ROOT, 'src', artifact.replace(/^@b\//, ''));
const descriptor = (ui, name) => {
    const [component, variant] = name.split('.');
    return ui.mapper[component] && ui.mapper[component][variant];
};
const assertOverlay = (artifact, source) => {
    const parsed = makeTssParser().handle(source);
    const tree = nodes(parsed);
    const methods = tree.filter(node => node.m).map(node => node.m);
    const attrs = tree.filter(node => node.m === 'attr');
    const data = tree.filter(node => node.m === 'data');
    const conditions = tree.filter(node => node.m === 'if');
    const otherwise = tree.filter(node => node.m === 'else');
    const reads = [...new Set(
        tree.filter(node => node.m === 'if' && node.p.d !== undefined)
            .flatMap(node => String(node.p.d).split('||').map(value => value.trim()))
            .concat(data.flatMap(node => Object.values(node.p)
                .flatMap(value => String(value).split('||').map(part => part.trim()))))
    )].sort();

    assert.equal(parsed.length, 1, artifact + ' one fail-closed root');
    assert.deepEqual(parsed[0].p, {to: "'array'"}, artifact + ' array rejection gate');
    assert.equal(parsed[0].c.length, 1, artifact + ' one array alternate');
    assert.equal(parsed[0].c[0].m, 'else', artifact + ' non-array alternate');
    assert.deepEqual(parsed[0].c[0].p, {}, artifact + ' plain alternate');
    assert.equal(parsed[0].c[0].c.length, 1, artifact + ' one object gate');
    assert.equal(parsed[0].c[0].c[0].m, 'if', artifact + ' object gate method');
    assert.deepEqual(parsed[0].c[0].c[0].p, {to: "'object'"}, artifact + ' object gate');
    assert.equal(otherwise.length, 1, artifact + ' no extra control alternate');
    assert.deepEqual(
        conditions.map(node => params(node.p)).sort(),
        ifParams[artifact].map(params).sort(),
        artifact + ' conditional allow-list'
    );
    for (const node of conditions.filter(node => node.p.el !== undefined)) {
        const selector = node.p.el.slice(1, -1);
        assert.equal(node.s, selector, artifact + ' optional target stays on its selector');
        assert.equal(node.c.length, 1, artifact + ' optional target has one transform');
        assert.equal(node.c[0].m, 'attr', artifact + ' optional target chains to attr');
        assert.equal(node.c[0].s, selector, artifact + ' optional attr stays on its selector');
    }
    assert.deepEqual(
        [...new Set(tree.filter(node => node.s).map(node => node.s))].sort(),
        selectors[artifact],
        artifact + ' canonical-hook selector allow-list'
    );
    assert.deepEqual(reads, gateReads[artifact], artifact + ' validity reads only');
    assert.equal(methods.every(method => ['if', 'else', 'attr', 'data'].includes(method)), true, artifact);
    assert.equal(attrs.length > 0, true, artifact + ' class transforms');
    assert.deepEqual(
        attrs.map(node => String(node.p.v).replace(/^'|'$/g, '')).sort(),
        classes[artifact].slice().sort(),
        artifact + ' fixed class allow-list'
    );
    for (const node of attrs) {
        assert.deepEqual(Object.keys(node.p).sort(), ['m', 'n', 'v'], artifact + ' attr params');
        assert.equal(node.p.n, "'class'", artifact + ' attr name');
        assert.equal(node.p.m, "'a'", artifact + ' append mode');
        assert.match(node.p.v, /^'[^']+'$/, artifact + ' literal class');
        assert.deepEqual(node.c, [], artifact + ' terminal class append');
    }
    for (const node of tree.filter(node => !node.m)) {
        assert.equal(typeof node.s, 'string', artifact + ' selector-only node');
        assert.deepEqual(node.p, {}, artifact + ' selector has no declarations');
    }

    if (artifact === '@b/badge/badge.tss') {
        assert.equal(data.length, 1);
        assert.deepEqual(data[0].p, {value: 'label || count'});
    } else
        assert.deepEqual(data, [], artifact + ' no data mapping');
    ;
};

test('bootstrap-ui package identity, dependencies, and registry ID advance together', () => {
    const { pkg, ui } = load();

    assert.equal(pkg.name, '@jtorm/bootstrap-ui');
    assert.equal(pkg.version, '0.1.0');
    assert.equal(pkg.main, 'src/bootstrap-ui.js');
    assert.equal(ui.id, `jtorm/bootstrap-ui-${pkg.version}/src`);
    assert.equal(ui.alias, '@b');
    assert.equal(ui.framework, 'bootstrap');
    assert.deepEqual(pkg.dependencies, {'@jtorm/components-ui': '^0.1.0'});
    assert.deepEqual(pkg.peerDependencies, {bootstrap: '^5.3.8'});
    assert.deepEqual(pkg.peerDependenciesMeta, {bootstrap: {optional: true}});

    const source = fs.readFileSync(path.join(ROOT, 'src/bootstrap-ui.js'), 'utf8');
    assert.doesNotMatch(source, /\brequire\s*\(|\bimport\s*\(/);
});

test('all 14 canonical variants bind through components-ui before one Bootstrap overlay', () => {
    const { ui } = load();

    assert.equal(Object.keys(descriptors).length, 14);
    for (const [name, t] of Object.entries(descriptors)) {
        assert.deepEqual(descriptor(ui, name), {t}, name);
        assert.match(t[0], /^@c\//, name + ' canonical first');
        assert.match(t[1], /^@b\//, name + ' overlay second');
    }
});

test('overlays are literal class-only presentation with no model translation, behavior, assets, or cache identity', () => {
    const overlays = [...new Set(Object.values(descriptors).map(t => t[1]))].sort();

    assert.deepEqual(overlays, Object.keys(classes).sort());
    for (const artifact of overlays) {
        const file = artifactPath(artifact);
        const source = fs.readFileSync(file, 'utf8');
        assertOverlay(artifact, source);
    }
});

test('overlay source contract rejects unreviewed input, target, behavior, and cache families', () => {
    const artifact = '@b/button/button.tss';
    const source = fs.readFileSync(artifactPath(artifact), 'utf8');
    const bypasses = [
        source.replace(
            "    ->if(\n        d: label,",
            "    ->if(v: label)\n    ->if(\n        d: label,"
        ),
        source.replace(
            "    ->if(\n        d: label,",
            "    ->data(source: label)\n    ->if(\n        d: label,"
        ),
        source.replaceAll('.jtorm-button--primary:last-child', 'body'),
        source.replace("n: 'class';", "n: 'data-bs-toggle';"),
        source.replace("v: 'btn btn-primary';", "v: 'accordion-button collapse';"),
        source.replace(
            "        ->if(el: '.jtorm-button--primary:last-child')",
            "        ->get {\n            t: 'https://example.test/behavior.tss';\n            cid: 'unsafe';\n        }\n        ->if(el: '.jtorm-button--primary:last-child')"
        )
    ];

    for (const bypass of bypasses) {
        assert.notEqual(bypass, source);
        assert.throws(() => assertOverlay(artifact, bypass));
    }
});

test('overlay source contract ignores inert comments and formatting', () => {
    const artifact = '@b/button/button.tss';
    const source = fs.readFileSync(artifactPath(artifact), 'utf8');
    const safe = source.replace(
        '->if(to:',
        '/* source data-bs-toggle ->get https://example.test collapse cid: */\n\n->if(to:'
    );

    assert.doesNotThrow(() => assertOverlay(artifact, safe));
});
