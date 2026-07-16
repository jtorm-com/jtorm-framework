'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const { jTormEventModel } = require('../../src/models/event-model/src/event-model.js');
const { jTormUiCachePlugin } = require('../../src/plugins/ui-cache-plugin/src/ui-cache-plugin.js');
const {
  jTormJsonLdPlugin
} = require('../../src/plugins/json-ld-plugin/src/json-ld-plugin.js');

const freshTree = () => ({
  before: { iteration: [], method: [], view: [] },
  after: { iteration: [], method: [], view: [] }
});

const view = (html, model = { '@type': 'Thing' }) => {
  const dom = new JSDOM(html);
  return {
    dom,
    v: {
      m: model,
      h: { d: dom.window.document }
    }
  };
};

test.afterEach(() => {
  jTormJsonLdPlugin.jsonLdModel = null;
  jTormEventModel.event = freshTree();
  jTormEventModel.plugins = [];
});

test('json-ld plugin registers at after.view weight 50 before ui-cache', () => {
  const low = { event: { after: { view: { weight: 0 } } } };

  jTormEventModel.event = freshTree();
  jTormEventModel.plugins = [jTormUiCachePlugin, jTormJsonLdPlugin, low];
  jTormEventModel.init();

  const plugins = jTormEventModel.event.after.view;
  assert.equal(jTormJsonLdPlugin.event.after.view.weight, 50);
  assert.ok(plugins.indexOf(low) < plugins.indexOf(jTormJsonLdPlugin));
  assert.ok(plugins.indexOf(jTormJsonLdPlugin) < plugins.indexOf(jTormUiCachePlugin));
});

test('afterView inserts one owned data block in head and returns the same document wrapper', () => {
  const model = { '@type': 'Thing', name: 'Public' };
  const { v } = view('<!doctype html><html><head></head><body></body></html>', model);
  let received;
  jTormJsonLdPlugin.jsonLdModel = {
    serialize(value) {
      received = value;
      return '{"ok":true}';
    }
  };

  const result = jTormJsonLdPlugin.afterView(v);
  const script = v.h.d.head.querySelector('script[data-jtorm-json-ld]');

  assert.equal(result, v.h);
  assert.equal(received, model);
  assert.ok(script);
  assert.equal(script.type, 'application/ld+json');
  assert.equal(script.textContent, '{"ok":true}');
  assert.equal(v.h.d.querySelectorAll('script[data-jtorm-json-ld]').length, 1);
});

test('afterView moves, updates, and deduplicates only framework-owned blocks', () => {
  const a = view(
    '<!doctype html><html><head><script id="authored" type="application/ld+json">{"a":1}</script></head>'
      + '<body><script data-jtorm-json-ld type="text/plain">old</script></body></html>'
  );
  const moved = a.v.h.d.body.querySelector('script[data-jtorm-json-ld]');
  const authored = a.v.h.d.querySelector('#authored');
  const authoredHtml = authored.outerHTML;
  jTormJsonLdPlugin.jsonLdModel = { serialize: () => '{"next":1}' };

  jTormJsonLdPlugin.afterView(a.v);

  assert.equal(a.v.h.d.head.querySelector('script[data-jtorm-json-ld]'), moved);
  assert.equal(moved.type, 'application/ld+json');
  assert.equal(moved.textContent, '{"next":1}');
  assert.equal(authored.outerHTML, authoredHtml);

  const b = view(
    '<!doctype html><html><head>'
      + '<script data-jtorm-json-ld>first</script>'
      + '<script data-jtorm-json-ld>second</script>'
      + '</head><body><script data-jtorm-json-ld>third</script></body></html>'
  );
  const first = b.v.h.d.querySelector('script[data-jtorm-json-ld]');
  jTormJsonLdPlugin.afterView(b.v);

  assert.equal(b.v.h.d.querySelectorAll('script[data-jtorm-json-ld]').length, 1);
  assert.equal(b.v.h.d.head.querySelector('script[data-jtorm-json-ld]'), first);
  assert.equal(first.textContent, '{"next":1}');
});

test('afterView removes stale owned blocks for an ineligible model and preserves authored blocks', () => {
  const { v } = view(
    '<!doctype html><html><head>'
      + '<script id="authored" type="application/ld+json">{"a":1}</script>'
      + '<script data-jtorm-json-ld>{"old":1}</script>'
      + '</head><body><script data-jtorm-json-ld>{"old":2}</script></body></html>'
  );
  const authored = v.h.d.querySelector('#authored');
  const authoredHtml = authored.outerHTML;
  jTormJsonLdPlugin.jsonLdModel = { serialize: () => null };

  jTormJsonLdPlugin.afterView(v);

  assert.equal(v.h.d.querySelectorAll('script[data-jtorm-json-ld]').length, 0);
  assert.equal(authored.outerHTML, authoredHtml);
});

test('afterView validates DI and leaves the DOM unchanged when serialization fails', () => {
  const { v } = view(
    '<!doctype html><html><head><script data-jtorm-json-ld>old</script></head>'
      + '<body><p>Visible</p></body></html>'
  );
  const before = v.h.d.documentElement.outerHTML;

  assert.throws(
    () => jTormJsonLdPlugin.afterView(v),
    /JSON-LD model missing/
  );
  assert.equal(v.h.d.documentElement.outerHTML, before);

  jTormJsonLdPlugin.jsonLdModel = {
    serialize() {
      throw new Error('JSON-LD value invalid at $.bad');
    }
  };
  assert.throws(
    () => jTormJsonLdPlugin.afterView(v),
    /JSON-LD value invalid at \$\.bad/
  );
  assert.equal(v.h.d.documentElement.outerHTML, before);
});
