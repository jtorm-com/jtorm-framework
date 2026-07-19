'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pkg = require('../../src/uis/components-ui/package.json');
const { jTormComponentsUI: ui } = require('../../src/uis/components-ui/src/components-ui.js');
const { makeTssParser } = require('../helpers/parser.js');

const descriptor = (name) => {
    const [component, variant] = name.split('.');
    return ui.mapper[component] && ui.mapper[component][variant];
};

const hasParam = (nodes, name) => nodes.some(node =>
    Object.prototype.hasOwnProperty.call(node.p || {}, name)
    || hasParam(node.c || [], name)
);

const paramValues = (nodes, name) => nodes.flatMap(node => [
    ...(name === undefined
        ? Object.values(node.p || {})
        : Object.prototype.hasOwnProperty.call(node.p || {}, name)
            ? [node.p[name]]
            : []),
    ...paramValues(node.c || [], name)
]);

const memberPath = value => {
    const v = String(value).replace(/\s/g, '');
    if (!/^[A-Za-z_$][\w$]*(?:(?:\.[A-Za-z_$][\w$]*)|(?:\[['"][A-Za-z_$][\w$]*['"]\]))*$/.test(v))
        return []
    ;
    return v.replace(/\[['"]([A-Za-z_$][\w$]*)['"]\]/g, '.$1').split('.');
};

const directSourceCopies = nodes => nodes.flatMap(node => [
    ...(node.m === 'data'
        ? Object.entries(node.p || {}).filter(([, value]) =>
            memberPath(value)[0] === 'source'
        )
        : []),
    ...directSourceCopies(node.c || [])
]);

const hasMethod = (nodes, names) => nodes.some(node =>
    names.has(node.m)
    || hasMethod(node.c || [], names)
);

const hasText = (nodes, pattern) => nodes.some(node =>
    [node.s, node.m, ...Object.values(node.p || {})]
        .some(value => pattern.test(String(value)))
    || hasText(node.c || [], pattern)
);

const componentArtifact = /['"](@c\/[^'"]+\.tss)['"]/g;
const componentRefs = nodes => {
    const refs = [];
    for (const node of nodes) {
        if (node.m === 'get')
            for (const value of Object.values(node.p || {}))
                for (const match of String(value).matchAll(componentArtifact))
                    refs.push(match[1])
                ;
        ;
        refs.push(...componentRefs(node.c || []));
    }
    return refs;
};

const canonical = {
    'button.default': ['@c/button/button-default.tss'],
    'button.primary': ['@c/button/button-primary.tss'],
    'button.secondary': ['@c/button/button-secondary.tss'],
    'button.destructive': ['@c/button/button-destructive.tss'],
    'badge.default': ['@c/badge/badge-default.tss'],
    'alert.default': ['@c/alert/alert-default.tss'],
    'alert.info': ['@c/alert/alert-info.tss'],
    'alert.success': ['@c/alert/alert-success.tss'],
    'alert.warning': ['@c/alert/alert-warning.tss'],
    'alert.error': ['@c/alert/alert-error.tss'],
    'card.default': ['@c/card/card-default.tss'],
    'accordion.group': ['@c/accordion/accordion-group.tss'],
    'accordion.default': ['@c/accordion/accordion-default.tss'],
    'accordion.item': ['@c/accordion/accordion-item.tss'],
    'loading.default': ['@c/loading/loading-default.tss']
};

const shellBindings = {
    '@c/button/button-base.tss': '@c/button/button-shell.tss',
    '@c/badge/badge-default.tss': '@c/badge/badge-shell.tss',
    '@c/alert/alert-base.tss': '@c/alert/alert-shell.tss',
    '@c/card/card-default.tss': '@c/card/card-shell.tss',
    '@c/accordion/accordion-group.tss': '@c/accordion/accordion-shell.tss',
    '@c/accordion/accordion-item.tss': '@c/accordion/accordion-item-shell.tss',
    '@c/loading/loading-default.tss': '@c/loading/loading-shell.tss'
};
const componentBindings = {
    '@c/accordion/accordion-default.tss': '@c/accordion/accordion-group.tss'
};
const shells = Object.values(shellBindings);
const support = [
    '@c/button/button-base.tss',
    '@c/alert/alert-base.tss',
    ...shells
];

const published = {
    'hero.default': ['@c/hero/hero-default.tss'],
    'contents.default': ['@c/contents/contents-default.tss'],
    'head.default': ['@c/head/head-default.tss'],
    'head.id': ['@c/head/head-id.tss'],
    'grid.init': ['@c/grid/init.tss'],
    'grid.container': ['@c/grid/container.tss'],
    'grid.wrapper': ['@c/grid/wrapper.tss'],
    'grid.grid': ['@c/grid/grid.tss'],
    'grid.row': ['@c/grid/row.tss'],
    'grid.cell': ['@c/grid/cell.tss'],
    'grid.oneColumn': ['@c/grid/1-column.tss'],
    'grid.twoColumns': ['@c/grid/2-columns.tss'],
    'grid.threeColumns': ['@c/grid/3-columns.tss'],
    'grid.fourColumns': ['@c/grid/4-columns.tss'],
    'grid.twentyEightyColumns': ['@c/grid/20-80-columns.tss'],
    'search.mini': ['@c/search/search-mini.tss'],
    'button.primaryButton': ['@c/button/primary-button.tss'],
    'button.secondaryButton': ['@c/button/secondary-button.tss'],
    'button.primaryAnchor': ['@c/button/primary-anchor.tss'],
    'button.secondaryAnchor': ['@c/button/secondary-anchor.tss'],
    'user.register': ['@c/user/user-register.tss'],
    'user.login': ['@c/user/user-login.tss']
};

test('components-ui package and mapper IDs advance together without dependencies', () => {
    assert.equal(pkg.version, '0.2.0');
    assert.equal(ui.id, `jtorm/components-ui-${pkg.version}/src`);
    assert.equal(ui.alias, '@c');
    assert.equal(ui.framework, 'components');
    assert.deepEqual(pkg.dependencies, {});
});

test('all canonical framework-neutral variants map to TSS-only artifacts', () => {
    assert.equal(Object.keys(canonical).length, 15);
    for (const [name, t] of Object.entries(canonical))
        assert.deepEqual(descriptor(name), { t }, name)
    ;
});

test('all previously published mapper keys and recipes remain unchanged', () => {
    for (const [name, t] of Object.entries(published))
        assert.deepEqual(descriptor(name), { t }, name)
    ;
});

test('foundation artifacts contain no runtime assets, DI, or raw-html binding', () => {
    const root = path.resolve(__dirname, '../../src/uis/components-ui/src');
    const files = [...new Set([
        ...Object.values(canonical).flat(),
        ...support
    ])].map(u => path.join(root, u.replace(/^@c\//, '')));

    const parser = makeTssParser();
    const canonicalArtifacts = new Set(Object.values(canonical).flat());
    const trees = files.map(f => [f, parser.handle(fs.readFileSync(f, 'utf8'))]);
    const referencedSupport = [...new Set(
        trees.flatMap(([, tree]) => componentRefs(tree))
            .filter(u => !canonicalArtifacts.has(u))
    )].sort();
    assert.deepEqual(referencedSupport, support.slice().sort());
    const staticMethods = new Set(['data', 'text', 'each', 'if']);

    for (const [binding, shell] of Object.entries(shellBindings)) {
        const tree = parser.handle(fs.readFileSync(
            path.join(root, binding.replace(/^@c\//, '')),
            'utf8'
        ));
        const id = shell.match(/([^/]+)\.tss$/)[1];

        assert.deepEqual(
            componentRefs(tree).filter(ref => shells.includes(ref)),
            [shell],
            binding + ' shell'
        );
        assert.deepEqual(
            paramValues(tree, 'cid'),
            [`'jtorm/components-ui-${pkg.version}/${id}'`],
            binding + ' versioned cid'
        );
        assert.deepEqual(paramValues(tree, 'cs'), ["'default'"], binding + ' cache variant');
    }

    for (const [binding, component] of Object.entries(componentBindings)) {
        const tree = parser.handle(fs.readFileSync(
            path.join(root, binding.replace(/^@c\//, '')),
            'utf8'
        ));

        assert.deepEqual(componentRefs(tree), [component], binding + ' component binding');
        assert.equal(hasParam(tree, 'cid'), false, binding + ' delegates cache identity');
        assert.equal(hasParam(tree, 'cs'), false, binding + ' delegates cache scope');
    }

    for (const shell of shells) {
        const tree = parser.handle(fs.readFileSync(
            path.join(root, shell.replace(/^@c\//, '')),
            'utf8'
        ));

        assert.equal(hasMethod(tree, staticMethods), false, shell + ' dynamic method');
        assert.equal(hasParam(tree, 'cid'), false, shell + ' nested cache');
        assert.equal(hasParam(tree, 'cs'), false, shell + ' cache scope');
        assert.deepEqual(
            paramValues(tree).filter(value => !/^'.*'$/.test(String(value))),
            [],
            shell + ' dynamic parameter'
        );
    }
    assert.equal(hasMethod(parser.handle('->data { label: value; }'), staticMethods), true);
    assert.deepEqual(
        directSourceCopies(parser.handle('->data(_button.label: source.label) {}')),
        [['_button.label', 'source.label']]
    );
    assert.deepEqual(
        directSourceCopies(parser.handle("->data(_button['label']: source['label']) {}")),
        [["_button['label']", "source['label']"]]
    );
    assert.deepEqual(
        directSourceCopies(parser.handle('->data(_button . label: source . label) {}')),
        [['_button . label', 'source . label']]
    );
    assert.deepEqual(
        directSourceCopies(parser.handle('->data(label: item.label) {}')),
        []
    );
    assert.deepEqual(
        directSourceCopies(parser.handle('->data(label: source.action.label) {}')),
        [['label', 'source.action.label']]
    );
    assert.deepEqual(
        directSourceCopies(parser.handle('->data(copy: source) {}')),
        [['copy', 'source']]
    );
    assert.deepEqual(
        directSourceCopies(parser.handle('->data(value: source.label || source.count) {}')),
        []
    );
    assert.deepEqual(
        directSourceCopies(parser.handle("->data(intent: 'primary') {}")),
        []
    );
    assert.equal(hasMethod(parser.handle("div { class: 'safe'; }"), staticMethods), false);
    assert.deepEqual(
        paramValues(parser.handle('div { class: value; }'))
            .filter(value => !/^'.*'$/.test(String(value))),
        ['value']
    );
    assert.deepEqual(
        paramValues(parser.handle("div { class: 'safe'; }"))
            .filter(value => !/^'.*'$/.test(String(value))),
        []
    );
    assert.deepEqual(
        componentRefs(parser.handle("->get { t: '@c/button/button-shell.tss'; }")),
        ['@c/button/button-shell.tss']
    );
    assert.deepEqual(
        componentRefs(parser.handle("->get { t: '@c/button/button-shell.css'; }")),
        []
    );
    const hasRawHtml = text => hasParam(parser.handle(text), 'h');
    const runtimeAssets = new Set(['css', 'js']);
    const frameworks = /bootstrap|material|tailwind/i;

    assert.equal(hasRawHtml('.a->inner(h: payload) {}'), true);
    assert.equal(hasRawHtml('->append(h: payload) {}'), true);
    assert.equal(hasRawHtml('->append(h/*comment*/: payload) {}'), true);
    assert.equal(hasRawHtml('->append { t: payload; }'), false);
    assert.equal(hasRawHtml('a { href: payload; }'), false);
    assert.equal(hasMethod(parser.handle('->/*comment*/js {}'), runtimeAssets), true);
    assert.equal(hasParam(parser.handle('->ui { d/*comment*/i: handler; }'), 'di'), true);
    assert.equal(hasMethod(parser.handle('->ui {}'), runtimeAssets), false);
    assert.equal(hasParam(parser.handle('->ui { id: value; }'), 'di'), false);
    for (const [f, tree] of trees) {
        assert.deepEqual(directSourceCopies(tree), [], f + ' direct source copy');
        assert.equal(hasParam(tree, 'h'), false, f + ' h');
        assert.equal(hasParam(tree, 'di'), false, f + ' di');
        assert.equal(hasMethod(tree, runtimeAssets), false, f + ' asset method');
        assert.equal(hasText(tree, frameworks), false, f + ' framework name');
    }
    assert.equal(hasText(parser.handle('a { v: boot/*comment*/strap; }'), frameworks), true);
    assert.equal(hasText(parser.handle('a { v: framework; }'), frameworks), false);
});
