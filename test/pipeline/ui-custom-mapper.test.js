'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');
const { jTormUiMethod } = require('../../src/methods/ui-method/src/ui-method.js');

test('implicit ui resolution uses the host custom mapper before registered frameworks', async () => {
    const ui = jTormUiMethod.ui;

    try {
        jTormUiMethod.ui = {
            mapper: {
                LocalCard: {
                    default: { h: '/local-card.html', t: [] }
                }
            }
        };

        const { body } = await render(
            '<body><div class="a"></div></body>',
            ".a->ui { c: 'LocalCard'; }",
            {},
            undefined,
            { '/local-card.html': { text: '<strong>Custom</strong>' } }
        );

        assert.equal(body, '<div class="a"><strong>Custom</strong></div>');
    } finally {
        jTormUiMethod.ui = ui;
        jTormUiMethod.cache = {};
    }
});

test('an explicit framework bypasses a matching host custom mapper', async () => {
    const ui = jTormUiMethod.ui;

    try {
        jTormUiMethod.ui = {
            mapper: {
                Text: {
                    default: { h: '/custom-text.html', t: [] }
                }
            }
        };

        const { body } = await render(
            '<body><div class="a"></div></body>',
            ".a->ui { c: 'Text.default'; f: 'schema'; t: '0'; }",
            {},
            undefined,
            { '/custom-text.html': { text: '<strong>Wrong</strong>' } }
        );

        assert.equal(body, '<div class="a"></div>');
    } finally {
        jTormUiMethod.ui = ui;
        jTormUiMethod.cache = {};
    }
});
