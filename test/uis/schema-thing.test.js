'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { jTormSchemaUi } = require('../../src/uis/schema-ui/src/schema-ui.js');
const { uisDiskPath } = require('../helpers/uis-disk-path.js');

const UPDATE = '@s/thing/thing-update-1.0.1.tss';

test('Thing mapper keeps the versioned update artifact out of its public component graph', () => {
    const thing = jTormSchemaUi.mapper.Thing;

    assert.deepEqual(thing, {
        default: { t: ['@s/thing/thing-default.tss'] },
        item: { t: ['@s/thing/thing-default.tss'] },
        contents: { t: ['@s/thing/thing-contents.tss'] },
        link: { t: ['@s/thing/thing-link.tss'] }
    });
    assert.equal(thing.default.t.includes(UPDATE), false);
    assert.ok(fs.existsSync(uisDiskPath(UPDATE)), 'update artifact remains shipped');
});
