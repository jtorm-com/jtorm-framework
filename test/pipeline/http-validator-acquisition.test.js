'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('../helpers/engine.js');
const { jTormUiCacheModel } = require('../../src/models/ui-cache-model/src/ui-cache-model.js');

const scoped = tenant => ({c: 0, s: null, a: null, request: {tenant}});

test('pipeline 304 reuses validated acquisition bytes while rendered-fragment caching stays unconditional', async () => {
  let now = 0;
  const clock = () => now;
  const html = '<body><div></div></body>';
  const tss = "div->append { cid: 'frag'; body->get { d: '/same.json'; ->inner { h: value; } } }";
  const options = {reuseSharedCaches: true, clock, ttl: 10, validators: true};

  const first = await render(
    html, tss, {}, 'http://localhost/',
    {'/same.json': {json: {value: 'A'}, headers: {etag: '"data-a"'}}},
    scoped('tenant-a'), null, 0, {clock, ttl: 10, validators: true}
  );
  now = 10;
  const validated = await render(
    html, tss, {}, 'http://localhost/',
    {'/same.json': {status: 304}}, scoped('tenant-a'), null, 0, options
  );

  assert.equal(first.body, '<div>A</div>');
  assert.equal(validated.body, first.body);
  assert.deepEqual(validated.requests, ['/same.json']);
  assert.deepEqual(validated.requestHeaders, [{'If-None-Match': '"data-a"'}]);
  assert.equal(validated.bytes, 0);
  assert.equal(Object.getOwnPropertyDescriptor(jTormUiCacheModel, 'validators'), undefined);
});
