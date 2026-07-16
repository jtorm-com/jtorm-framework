'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { render } = require('../helpers/engine.js');

const PAGE = '<!doctype html><html><head></head><body><h1>Visible</h1></body></html>';
const TSS = "h1->attr { n: 'data-name'; v: name; }";

test('pipeline emits the same typed public root into one owned head data block', async () => {
  const child = Object.freeze({
    '@type': 'Thing',
    name: 'Child',
    '@meta': Object.freeze({ internal: 'private' })
  });
  const model = Object.freeze({
    '@type': 'Person',
    name: 'Ana',
    child,
    '@meta': Object.freeze({ internal: 'private' })
  });

  const { html, body } = await render(
    PAGE,
    TSS,
    model,
    'https://example.test/person',
    null,
    1
  );
  const document = new JSDOM(html).window.document;
  const scripts = document.querySelectorAll('head > script[data-jtorm-json-ld]');

  assert.equal(body, '<h1 data-name="Ana">Visible</h1>');
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].type, 'application/ld+json');
  assert.deepEqual(JSON.parse(scripts[0].textContent), {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Ana',
    child: {
      '@type': 'Thing',
      name: 'Child'
    }
  });
});

test('serialized SSR HTML reparses delimiter-shaped model text only as JSON data', async () => {
  const description = '</script><img id="json-ld-breakout" src=x><!--&\u2028\u2029';
  const { html } = await render(
    PAGE,
    TSS,
    {
      '@type': 'Thing',
      name: 'Safe',
      description
    },
    'https://example.test/thing',
    null,
    1
  );
  const document = new JSDOM(html).window.document;
  const script = document.querySelector('script[data-jtorm-json-ld]');

  assert.ok(script);
  assert.equal(document.querySelector('#json-ld-breakout'), null);
  assert.equal(document.querySelectorAll('script[data-jtorm-json-ld]').length, 1);
  assert.doesNotMatch(script.textContent, /[<>&\u2028\u2029]/u);
  assert.equal(JSON.parse(script.textContent).description, description);
});

test('per-model opt-out and an unregistered harness both preserve the no-inline path', async () => {
  const optedOut = await render(
    PAGE,
    TSS,
    {
      '@type': 'Thing',
      name: 'Opted out',
      '@meta': { jsonLd: false }
    }
  );
  assert.doesNotMatch(optedOut.head, /data-jtorm-json-ld/);

  const unregistered = await render(
    PAGE,
    TSS,
    { '@type': 'Thing', name: 'Unregistered' },
    'https://example.test/unregistered',
    null,
    0,
    null,
    0,
    { jsonLd: false }
  );
  assert.equal(unregistered.body, '<h1 data-name="Unregistered">Visible</h1>');
  assert.doesNotMatch(unregistered.head, /data-jtorm-json-ld/);
});

test('inline JSON-LD remains additive to the external .jsonld alternate link', async () => {
  const { html } = await render(
    '<!doctype html><html><head></head><body></body></html>',
    "head->ui { c: 'head.id'; }",
    {
      '@type': 'WebPage',
      url: 'https://example.test/page',
      disambiguatingDescription: 'Page'
    }
  );
  const document = new JSDOM(html).window.document;

  assert.ok(document.querySelector(
    'link[rel="alternate"][type="application/ld+json"][href="https://example.test/page.jsonld"]'
  ));
  assert.ok(document.querySelector('script[data-jtorm-json-ld]'));
});
