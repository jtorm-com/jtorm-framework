'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');

test('time method feeds @e.time with html/dateTime/title data', async () => {
    const iso = new Date(Date.now() - 3600_000).toISOString();
    const title = new Date(iso).toUTCString();
    const { body } = await render(
        '<body><div class="a"></div></body>',
        ".a->time(dT: datePublished.DateTime, as: 'html')->append->ui { c: '@e.time'; }",
        { datePublished: { DateTime: iso } }
    );
    assert.equal(body, `<div class="a"><time datetime="${iso}" title="${title}">1 hour ago</time></div>`);
});
