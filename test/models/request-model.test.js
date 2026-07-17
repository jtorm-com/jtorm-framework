'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { jTormRequestModel: rm } = require('../../src/models/request-model/src/request-model.js');
const { jTormRenderContextModel: cm } = require('../../src/models/render-context-model/src/render-context-model.js');

rm.renderContextModel = cm;

function stub(fn) { const o = global.fetch; global.fetch = fn; return () => { global.fetch = o; }; }

test('cyclic context lookup terminates instead of hanging the render worker', () => {
  const r = spawnSync(process.execPath, ['-e', `
    const { jTormRequestModel: rm } = require('./src/models/request-model/src/request-model.js');
    try {
      const { jTormRenderContextModel: cm } = require('./src/models/render-context-model/src/render-context-model.js');
      rm.renderContextModel = cm;
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') throw e;
    }
    const a = {}, b = {p: a};
    a.p = b;
    process.stdout.write(String(rm.context(a)));
  `], {encoding: 'utf8', timeout: 1000});

  assert.equal(r.status, 0, r.error ? r.error.message : r.stderr);
  assert.equal(r.stdout, 'null');
});

test('get(url).json() returns parsed JSON on ok', async () => {
  const r = stub(async () => ({ ok: true, json: async () => ({ a: 1 }) }));
  try { rm.base = ''; assert.deepEqual(await rm.get('/x').json(), { a: 1 }); } finally { r(); }
});

test('get(url).text() returns text on ok', async () => {
  const r = stub(async () => ({ ok: true, text: async () => 'hi' }));
  try { rm.base = ''; assert.equal(await rm.get('/x').text(), 'hi'); } finally { r(); }
});

test('throws on non-ok response', async () => {
  const r = stub(async () => ({ ok: false, status: 404 }));
  try { rm.base = ''; await assert.rejects(() => rm.get('/x').json(), /404/); } finally { r(); }
});

test('prepends base for relative URLs, leaves absolute URLs alone', async () => {
  try {
    rm.base = 'https://cdn/';
    assert.equal(rm.url('a/b'), 'https://cdn/a/b');
    assert.equal(rm.url('https://x/y'), 'https://x/y');
  } finally { rm.base = ''; }
});

test('uses the injected transport instead of the global fetch', async () => {
  let viaTransport = 0, viaGlobal = 0;
  const r = stub(async () => { viaGlobal++; return { ok: true, text: async () => 'GLOBAL' }; });
  const saved = rm.transport;
  rm.transport = async () => { viaTransport++; return { ok: true, text: async () => 'TRANSPORT' }; };
  try {
    rm.base = '';
    assert.equal(await rm.get('/x').text(), 'TRANSPORT');
    assert.equal(viaTransport, 1);
    assert.equal(viaGlobal, 0);
  } finally { rm.transport = saved; r(); }
});

test('blocks absolute HTTP URLs by default before transport', async () => {
  let calls = 0;
  const saved = rm.transport;
  rm.transport = async () => { calls++; return { ok: true, text: async () => 'x' }; };
  try {
    rm.base = '';
    await assert.rejects(() => rm.get('http://169.254.169.254/latest').text(), /URL blocked/);
    assert.equal(calls, 0);
  } finally { rm.transport = saved; rm.base = ''; }
});

test('blocks fetch-normalized absolute HTTP URLs before transport', async () => {
  let calls = 0;
  const saved = rm.transport;
  rm.transport = async () => { calls++; return { ok: true, text: async () => 'x' }; };
  try {
    rm.base = '';
    await assert.rejects(() => rm.get(' http://169.254.169.254/latest').text(), /URL blocked/);
    await assert.rejects(() => rm.get('h\nttp://169.254.169.254/latest').text(), /URL blocked/);
    assert.equal(calls, 0);
  } finally { rm.transport = saved; rm.base = ''; }
});

test('blocks browser-normalized scheme-relative backslash URLs', () => {
  rm.base = '';
  assert.equal(rm.allow('\\\\evil.example/x'), false);
  assert.equal(rm.allow('/\\evil.example/x'), false);
});

test('allows configured base-origin URLs by default', async () => {
  let seen;
  const saved = rm.transport;
  rm.transport = async (u) => { seen = u; return { ok: true, text: async () => 'x' }; };
  try {
    rm.base = 'https://cdn.example/assets/';
    await rm.get('a.tss').text();
    assert.equal(seen, 'https://cdn.example/assets/a.tss');
    await rm.get('https://cdn.example/other.tss').text();
    assert.equal(seen, 'https://cdn.example/other.tss');
    await assert.rejects(() => rm.get('https://other.example/x').text(), /URL blocked/);
  } finally { rm.transport = saved; rm.base = ''; }
});

test('uses injected URL guard with the resolved URL before transport', async () => {
  let seen, calls = 0;
  const savedT = rm.transport, savedA = rm.allow;
  rm.transport = async () => { calls++; return { ok: true, text: async () => 'x' }; };
  rm.allow = function (u) { seen = u; return false; };
  try {
    rm.base = 'https://cdn.example/';
    await assert.rejects(() => rm.get('a.tss').text(), /URL blocked/);
    assert.equal(seen, 'https://cdn.example/a.tss');
    assert.equal(calls, 0);
  } finally { rm.transport = savedT; rm.allow = savedA; rm.base = ''; }
});

test('injected URL guard can opt in an external absolute URL', async () => {
  let seen;
  const savedT = rm.transport, savedA = rm.allow;
  rm.transport = async (u) => { seen = u; return { ok: true, text: async () => 'x' }; };
  rm.allow = function (u) { return u === 'https://api.example/x'; };
  try {
    rm.base = '';
    assert.equal(await rm.get('https://api.example/x').text(), 'x');
    assert.equal(seen, 'https://api.example/x');
  } finally { rm.transport = savedT; rm.allow = savedA; rm.base = ''; }
});

test('per-call context keeps base/timeout stable across an interleaved singleton mutation', async () => {
  let seen, release;
  const savedT = rm.transport, savedA = rm.allow;
  rm.allow = async function (u, c) {
    await new Promise((resolve) => { release = resolve; });
    return savedA.call(this, u, c);
  };
  rm.transport = async (u, o) => {
    seen = { u, signal: !!(o && o.signal) };
    return { ok: true, status: 200, text: async () => 'ok' };
  };

  try {
    rm.base = 'https://a.example/assets/';
    rm.timeout = 0;

    const p = rm.get('item.html', { request: { base: 'https://a.example/assets/', timeout: 5 } }).text();
    await Promise.resolve();
    rm.base = 'https://b.example/assets/';
    release();

    assert.equal(await p, 'ok');
    assert.deepEqual(seen, { u: 'https://a.example/assets/item.html', signal: true });
  } finally {
    rm.transport = savedT;
    rm.allow = savedA;
    rm.base = '';
    rm.timeout = 0;
  }
});

test('shared-cache keys require a non-empty explicit request discriminator', () => {
  const saved = rm.base;

  try {
    rm.base = '';
    assert.equal(rm.policy(), '');
    assert.equal(rm.policy({ request: { tenant: '', origin: '', base: '' } }), '');
    assert.equal(rm.cacheKey('/same.json'), undefined);
    assert.equal(rm.cacheKey('/same.json', { request: { tenant: null, origin: null, base: '' } }), undefined);

    rm.base = 'https://configured.example/';
    assert.equal(rm.policy(), 'b:https://configured.example/');
    assert.equal(rm.cacheKey('same.json'), 'b:https://configured.example/\0https://configured.example/same.json');
    assert.equal(rm.policy({ request: { base: '' } }), '');
    assert.equal(rm.cacheKey('same.json', { request: { base: '' } }), undefined);
  } finally {
    rm.base = saved;
  }
});

test('scoped request policy preserves tag order, request precedence, and primitive base behavior', () => {
  const saved = rm.base;

  try {
    rm.base = 'configured:';
    assert.equal(
      rm.policy({ request: { tenant: 'a', origin: 'https://a.example', base: '/a/' } }),
      't:a\0o:https://a.example\0b:/a/'
    );
    assert.equal(
      rm.cacheKey('x', { request: { tenant: 'a', origin: 'https://a.example', base: '/a/' } }),
      't:a\0o:https://a.example\0b:/a/\0/a/x'
    );
    assert.equal(rm.policy({ tenant: 'root', request: { origin: 'request' } }), 'o:request\0b:configured:');
    assert.equal(rm.policy({ tenant: 0, origin: false, base: 0 }), 't:0\0o:false');
    assert.equal(rm.policy({ request: { base: false } }), '');
    assert.equal(rm.policy({ request: { base: 0 } }), '');
    assert.equal(rm.policy({ request: { base: NaN } }), '');
    assert.equal(rm.policy({ request: { base: 0n } }), '');
    assert.equal(rm.policy({ request: { base: 1n } }), 'b:1');
  } finally {
    rm.base = saved;
  }
});

test('malformed, cyclic, and delimiter-bearing cache contexts fail closed without changing request behavior', () => {
  const saved = rm.base;
  const a = {};
  a.p = a;

  try {
    rm.base = 'https://configured.example/';
    assert.equal(rm.policy(a), '');
    assert.equal(rm.policy({ c: 'invalid' }), '');
    assert.equal(rm.policy(Object.create({ c: 'invalid' })), '');
    assert.equal(rm.policy({ request: [] }), '');
    assert.equal(rm.policy({ request: function () {} }), '');
    assert.equal(rm.policy({ request: { tenant: {} } }), '');
    assert.equal(rm.policy({ request: { tenant: 'a\0o:b' } }), '');
    assert.equal(rm.policy({ request: { tenant: 'a', origin: 'b' } }), 't:a\0o:b\0b:https://configured.example/');
    assert.equal(rm.cacheKey('x\0y', { request: { tenant: 'a', base: '' } }), undefined);
    assert.equal(rm.url('x', a), 'https://configured.example/x');
  } finally {
    rm.base = saved;
  }
});

test('cache policy preserves published context and option facade overrides', () => {
  const saved = {base: rm.base, context: rm.context, option: rm.option};
  const c = {request: [], custom: {tenant: 'a', origin: 'origin', base: '/shared/'}};

  try {
    rm.base = 'configured:';
    rm.context = value => value ? value.custom : {tenant: 'null-custom'};
    rm.option = (value, key, fallback) => key === 'base' ? '/custom/' : fallback;

    assert.equal(rm.policy(c), 't:a\0o:origin\0b:/custom/');
    assert.equal(rm.cacheKey('x', c), 't:a\0o:origin\0b:/custom/\0/custom/x');
    assert.equal(rm.discriminator(c), 'a');
    c.custom.tenant = c.custom.origin = '';
    assert.equal(rm.discriminator(c), '/custom/');
    assert.equal(rm.policy(null), 't:null-custom\0b:/custom/');
  } finally {
    rm.base = saved.base;
    rm.context = saved.context;
    rm.option = saved.option;
  }
});

test('an option facade can replace an inherited raw base with an explicit effective scope', () => {
  const saved = {base: rm.base, option: rm.option};
  const c = Object.assign(Object.create({base: '/prototype/'}), {c: 0, tenant: 'tenant-a'});

  try {
    rm.base = '/configured/';
    rm.option = (value, key, fallback) => key === 'base' ? '/custom/' : fallback;
    assert.equal(rm.policy(c), 't:tenant-a\0b:/custom/');
    assert.equal(rm.cacheKey('x', c), 't:tenant-a\0b:/custom/\0/custom/x');
  } finally {
    rm.base = saved.base;
    rm.option = saved.option;
  }
});

test('an unscoped cache decision does not resolve the URL early', () => {
  const savedBase = rm.base;
  const savedUrl = rm.url;

  try {
    rm.base = '';
    rm.url = function () { throw new Error('cache must not resolve'); };
    assert.equal(rm.cacheKey('/x'), undefined);
  } finally {
    rm.base = savedBase;
    rm.url = savedUrl;
  }
});

test('tenant, origin, and base identities retain exact keys and remain mutually isolated', () => {
  const saved = rm.base;

  try {
    rm.base = '';
    const keys = [
      rm.cacheKey('/x', {tenant: 'a'}),
      rm.cacheKey('/x', {tenant: 'b'}),
      rm.cacheKey('/x', {origin: 'a'}),
      rm.cacheKey('/x', {origin: 'b'}),
      rm.cacheKey('/x', {base: '/a/'}),
      rm.cacheKey('/x', {base: '/b/'})
    ];
    assert.deepEqual(keys, [
      't:a\0/x', 't:b\0/x', 'o:a\0/x', 'o:b\0/x', 'b:/a/\0/a//x', 'b:/b/\0/b//x'
    ]);
    assert.equal(new Set(keys).size, keys.length);
    assert.equal(rm.cacheKey('/x', {request: {tenant: 'a'}}), keys[0]);
  } finally {
    rm.base = saved;
  }
});

test('own class-root discriminators remain scoped while prototype values cannot authorize sharing', () => {
  const saved = rm.base;
  const tenant = Object.getOwnPropertyDescriptor(Object.prototype, 'tenant');
  const base = Object.getOwnPropertyDescriptor(Object.prototype, 'base');
  class Context {
    constructor() { this.c = 0; this.tenant = 'tenant-a'; }
  }

  try {
    rm.base = '';
    const c = new Context();
    assert.equal(rm.policy(c), 't:tenant-a');
    assert.equal(rm.discriminator(c), 'tenant-a');

    Object.defineProperty(Object.prototype, 'tenant', {configurable: true, value: 'prototype-tenant', writable: true});
    Object.defineProperty(Object.prototype, 'base', {configurable: true, value: '/prototype/', writable: true});
    assert.equal(rm.policy({c: 0}), '');
    assert.equal(rm.discriminator({c: 0}), '');

    const inherited = Object.assign(Object.create({tenant: 'inherited'}), {c: 0});
    assert.equal(rm.policy(inherited), '');
    assert.equal(rm.discriminator(inherited), '');

    rm.base = '/configured/';
    const inheritedNull = Object.assign(Object.create({base: null}), {c: 0, tenant: 'tenant-a'});
    const inheritedUndefined = Object.assign(Object.create({base: undefined}), {c: 0, tenant: 'tenant-a'});
    assert.equal(rm.policy(inheritedNull), 't:tenant-a\0b:/configured/');
    assert.equal(rm.policy(inheritedUndefined), 't:tenant-a\0b:/configured/');

    const inheritedBase = Object.assign(Object.create({base: '/tenant/'}), {c: 0, tenant: 'tenant-a'});
    assert.equal(rm.policy(inheritedBase), '');
    assert.equal(rm.cacheKey('/x', inheritedBase), undefined);

    const inheritedEmpty = Object.assign(Object.create({base: ''}), {c: 0, tenant: 'tenant-a'});
    assert.equal(rm.policy(inheritedEmpty), '');
    assert.equal(rm.cacheKey('/x', inheritedEmpty), undefined);
  } finally {
    rm.base = saved;
    if (tenant) Object.defineProperty(Object.prototype, 'tenant', tenant);
    else delete Object.prototype.tenant;
    if (base) Object.defineProperty(Object.prototype, 'base', base);
    else delete Object.prototype.base;
  }
});

test('inherited render-context handoff and parent links cannot authorize cache sharing', () => {
  const saved = rm.base;
  const root = Object.assign(Object.create(null), {tenant: 'prototype-root'});
  const parent = Object.create({p: root});
  const view = Object.create({c: root});

  try {
    rm.base = '/configured/';
    assert.equal(rm.policy(parent), '');
    assert.equal(rm.discriminator(parent), '');
    assert.equal(rm.cacheKey('/x', parent), undefined);
    assert.equal(rm.policy(view), '');
    assert.equal(rm.discriminator(view), '');
    assert.equal(rm.cacheKey('/x', view), undefined);
  } finally {
    rm.base = saved;
  }
});
