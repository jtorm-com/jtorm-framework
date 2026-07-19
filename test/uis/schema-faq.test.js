'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pkg = require('../../src/uis/schema-ui/package.json');
const { jTormSchemaUi } = require('../../src/uis/schema-ui/src/schema-ui.js');
const { uisDiskPath } = require('../helpers/uis-disk-path.js');
const { makeTssParser } = require('../helpers/parser.js');

const nodes = tree => tree.flatMap(node => [node, ...nodes(node.c || [])]);

test('schema FAQ mapper is additive, versioned, and keeps the legacy asset namespace', () => {
    assert.equal(pkg.name, '@jtorm/schema-ui');
    assert.equal(pkg.version, '0.2.0');
    assert.equal(pkg.main, 'src/schema-ui.js');
    assert.deepEqual(pkg.dependencies, {'@jtorm/components-ui': '^0.2.0'});
    assert.equal(jTormSchemaUi.id, 'jtorm/schema-ui-0.0.4/src');
    assert.equal(jTormSchemaUi.alias, '@s');
    assert.equal(jTormSchemaUi.framework, 'schema');

    assert.deepEqual(jTormSchemaUi.mapper.FAQPage, {
        link: {ui: {c: 'WebPage.link'}},
        default: {t: ['@s/faq-page/faq-page-default.tss']},
        accordion: {t: ['@s/faq-page/faq-page-accordion.tss']}
    });
    assert.equal(jTormSchemaUi.mapper.Question, undefined);
    assert.equal(jTormSchemaUi.mapper.Answer, undefined);
});

test('FAQ accordion projection passes only derived models to canonical group and item', () => {
    const artifact = jTormSchemaUi.mapper.FAQPage.accordion.t[0];
    const file = uisDiskPath(artifact);

    assert.ok(fs.existsSync(file), path.basename(file));
    const tree = nodes(makeTssParser().handle(fs.readFileSync(file, 'utf8')));
    const ui = tree.filter(node => node.m === 'ui');
    const appendData = tree
        .filter(node => node.m === 'append' && node.p.d !== undefined)
        .map(node => node.p.d);
    const typePatterns = tree
        .filter(node => node.m === 'if' && node.p.r === 'true')
        .map(node => node.p.v)
        .sort();
    const unsafeMethods = new Set(['css', 'js']);

    assert.deepEqual(ui.map(node => node.p.c), [
        "'accordion.group'",
        "'accordion.item'"
    ]);
    assert.deepEqual(appendData, ['_faqGroup', '_faqItem']);
    assert.deepEqual(typePatterns, ["'^Answer$'", "'^FAQPage$'", "'^Question$'"]);
    assert.equal(tree.some(node => unsafeMethods.has(node.m)), false);
    assert.equal(tree.some(node => Object.prototype.hasOwnProperty.call(node.p, 'h')), false);
    assert.equal(tree.some(node => Object.prototype.hasOwnProperty.call(node.p, 'di')), false);

    const copied = tree
        .filter(node => node.m === 'data')
        .flatMap(node => Object.keys(node.p));
    assert.equal(copied.includes('_faqItem.summary'), true);
    assert.equal(copied.includes('_faqItem.content'), true);
    for (const key of ['open', 'id', 'class', 'lang', 'dir', 'items', 'html'])
        assert.equal(copied.includes('_faqItem.' + key), false, key)
    ;
});
