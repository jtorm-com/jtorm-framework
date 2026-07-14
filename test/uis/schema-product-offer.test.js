'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { jTormSchemaUi } = require('../../src/uis/schema-ui/src/schema-ui.js');
const { uisDiskPath } = require('../helpers/uis-disk-path.js');
const { makeTssParser } = require('../helpers/parser.js');

function uiRefs(tree) {
    const refs = [];
    for (const node of tree) {
        if (node.m === 'ui' && node.p.c)
            refs.push(String(node.p.c).replace(/^['"]|['"]$/g, ''))
        ;
        refs.push(...uiRefs(node.c));
    }
    return refs;
}

test('schema mapper exposes required Product + Offer variants and resolvable artifacts', () => {
    const product = jTormSchemaUi.mapper.Product;
    const offer = jTormSchemaUi.mapper.Offer;

    assert.deepEqual(product.default, {
        ui: { c: 'Thing.item' },
        t: ['@s/product/product-default.tss']
    });
    assert.deepEqual(product.item, {
        ui: { c: 'Product.default' },
        t: ['@s/product/product-item.tss']
    });
    assert.deepEqual(offer.default, { t: ['@s/offer/offer-default.tss'] });

    const artifacts = [
        ...product.default.t,
        ...product.item.t,
        ...offer.default.t
    ];
    for (const artifact of artifacts)
        assert.ok(fs.existsSync(uisDiskPath(artifact)), path.basename(artifact));
});

test('Product artifact composes nested offers through the Offer UI component', () => {
    const artifact = jTormSchemaUi.mapper.Product.default.t[0];
    const tree = makeTssParser().handle(fs.readFileSync(uisDiskPath(artifact), 'utf8'));

    assert.ok(uiRefs(tree).some(ref => ref === 'Offer' || ref === 'Offer.default'));
});
