'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { jTormUiManifestModel: mm } = require('../../src/models/ui-manifest-model/src/ui-manifest-model.js');
const { jTormPromiseCacheModel: pm } = require('../../src/models/promise-cache-model/src/promise-cache-model.js');
const { jTormRenderContextModel: renderContextModel } = require('../../src/models/render-context-model/src/render-context-model.js');
const { jTormRequestModel: requestModel } = require('../../src/models/request-model/src/request-model.js');

const nativeClock = pm.clock;
const nativeRequest = {
  allow: requestModel.allow,
  base: requestModel.base,
  renderContextModel: requestModel.renderContextModel,
  timeout: requestModel.timeout,
  transport: requestModel.transport
};
const nativeDigest = async bytes => new Uint8Array(createHash('sha256').update(bytes).digest());

function reset() {
  mm.promiseCacheModel = pm;
  mm.renderContextModel = renderContextModel;
  mm.c = new Map();
  mm.max = 32;
  mm.ttl = 300000;
  mm.staleWindow = 0;
  mm.maxText = 1048576;
  mm.maxValues = 262144;
  mm.maxDepth = 128;
  mm.maxAssets = 8192;
  mm.maxMetadata = 65536;
  mm.digest = nativeDigest;
  mm.requestModel = null;
  requestModel.allow = nativeRequest.allow;
  requestModel.base = '';
  requestModel.renderContextModel = renderContextModel;
  requestModel.timeout = 0;
  requestModel.transport = nativeRequest.transport;
  pm.reset(mm);
}

test.afterEach(() => {
  pm.clock = nativeClock;
  reset();
  requestModel.allow = nativeRequest.allow;
  requestModel.base = nativeRequest.base;
  requestModel.renderContextModel = nativeRequest.renderContextModel;
  requestModel.timeout = nativeRequest.timeout;
  requestModel.transport = nativeRequest.transport;
});

test('manifest acquisition cache publishes the default zero stale window', () => {
  assert.equal(mm.staleWindow, 0);
});

function deferred() {
  let reject, resolve;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return {promise, reject, resolve};
}

async function build(value) {
  const asset = {
    type: 'html',
    request: '@h/a.html',
    value,
    valueHash: await mm.hash(value)
  };
  const payload = {
    format: '@jtorm/ui-manifest',
    version: 1,
    id: 'swr',
    config: {
      default: 'default',
      framework: 'schema',
      roots: [{c: 'Thing.default', f: 'self', t: 1, h: 1, m: 0}],
      uis: [],
      namespaces: ['@h/'],
      methods: [
        {id: 'get', params: ['h', 't', 'd', 'a']},
        {id: 'ui', params: ['c', 'f', 't', 'h', 'm']}
      ],
      dynamicAllow: [],
      toolchain: {compiler: '1.0.0', manifestModel: '1.0.0'}
    },
    assets: [asset],
    dynamic: [],
    mappers: [],
    sources: []
  };
  const hash = await mm.hash(payload);
  return {hash, manifest: {...payload, hash}};
}

function html(pack) {
  return pack.assets.get(JSON.stringify(['html', '@h/a.html'])).value;
}

test('manifest serves stale validated pack while one guarded refresh publishes changed content', async () => {
  reset();
  mm.digest = async () => new Uint8Array(32).fill(7);
  const first = await build('A'), second = await build('B');
  assert.equal(first.hash, second.hash);
  const descriptor = {url: 'pack.json', hash: first.hash, mode: 'required'};
  const context = {tenant: 'tenant-a'};
  const refresh = deferred();
  let allowCalls = 0, current = first.manifest, now = 0, reads = 0;
  requestModel.base = 'https://a.example/assets/';
  requestModel.allow = async () => { allowCalls++; return true; };
  requestModel.transport = async () => ({
    ok: true,
    status: 200,
    text: () => {
      reads++;
      if (reads === 1) return Promise.resolve(JSON.stringify(current));
      return refresh.promise;
    }
  });
  mm.requestModel = requestModel;
  mm.ttl = 10;
  mm.staleWindow = 10;
  pm.clock = () => now;

  const old = await mm.load(descriptor, context);
  assert.equal(html(old), 'A');
  current = second.manifest;
  now = 10;
  const stale = await mm.load(descriptor, context);
  assert.strictEqual(stale, old);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(reads, 2);
  assert.ok(allowCalls >= 3, 'cold request, stale guard, and refresh request all retain URL policy');
  refresh.resolve(JSON.stringify(current));
  await new Promise(resolve => setImmediate(resolve));

  const fresh = await mm.load(descriptor, context);
  assert.equal(html(fresh), 'B');
  assert.equal(reads, 2);
});

test('deferred manifest guard rejects tenant, origin, context-base, and singleton-base key drift', async t => {
  const cases = [
    {
      name: 'tenant',
      context: () => ({tenant: 'tenant-a'}),
      mutate(c) { c.tenant = 'tenant-b'; }
    },
    {
      name: 'origin',
      context: () => ({origin: 'https://a.example'}),
      mutate(c) { c.origin = 'https://b.example'; }
    },
    {
      name: 'context base',
      context: () => ({base: 'https://a.example/assets/'}),
      mutate(c) { c.base = 'https://a.example/changed/'; }
    },
    {
      name: 'singleton base',
      context: () => ({tenant: 'tenant-a'}),
      mutate() { requestModel.base = 'https://a.example/changed/'; }
    }
  ];

  for (const c of cases) await t.test(c.name, async () => {
    reset();
    mm.digest = async () => new Uint8Array(32).fill(9);
    const built = await build('A');
    const descriptor = {url: 'pack.json', hash: built.hash, mode: 'required'};
    const context = c.context(), gate = deferred();
    let allowCalls = 0, now = 0, reads = 0;
    requestModel.base = 'https://a.example/assets/';
    requestModel.allow = () => {
      allowCalls++;
      return allowCalls === 2 ? gate.promise : true;
    };
    requestModel.transport = async () => ({
      ok: true,
      status: 200,
      text: async () => { reads++; return JSON.stringify(built.manifest); }
    });
    mm.requestModel = requestModel;
    mm.ttl = 10;
    mm.staleWindow = 10;
    pm.clock = () => now;

    await mm.load(descriptor, context);
    const cached = mm.c.values().next().value;
    now = 10;
    const guarded = mm.load(descriptor, context);
    assert.equal(allowCalls, 2);
    c.mutate(context);
    gate.resolve(true);

    await assert.rejects(guarded, /Manifest cache scope changed/);
    assert.equal(reads, 1);
    assert.strictEqual(mm.c.values().next().value, cached);
  });
});


test('stale manifest URL-policy rejection serves nothing and starts no refresh', async () => {
  reset();
  mm.digest = async () => new Uint8Array(32).fill(10);
  const built = await build('A');
  const descriptor = {url: 'pack.json', hash: built.hash, mode: 'required'};
  const context = {tenant: 'tenant-a'};
  let allowCalls = 0, now = 0, reads = 0;
  requestModel.base = 'https://a.example/assets/';
  requestModel.allow = () => ++allowCalls !== 2;
  requestModel.transport = async () => ({
    ok: true,
    status: 200,
    text: async () => { reads++; return JSON.stringify(built.manifest); }
  });
  mm.requestModel = requestModel;
  mm.ttl = 10;
  mm.staleWindow = 10;
  pm.clock = () => now;

  await mm.load(descriptor, context);
  const cached = mm.c.values().next().value;
  now = 10;
  await assert.rejects(() => mm.load(descriptor, context), /URL blocked/);
  assert.equal(reads, 1);
  assert.strictEqual(mm.c.values().next().value, cached);
});

test('purge during a deferred manifest guard starts one current-map cold acquisition and never returns detached stale', async () => {
  reset();
  mm.digest = async () => new Uint8Array(32).fill(11);
  const first = await build('A'), second = await build('B');
  const descriptor = {url: 'pack.json', hash: first.hash, mode: 'required'};
  const context = {tenant: 'tenant-a'}, gate = deferred();
  let allowCalls = 0, current = first.manifest, now = 0, reads = 0;
  requestModel.base = 'https://a.example/assets/';
  requestModel.allow = () => {
    allowCalls++;
    return allowCalls === 2 ? gate.promise : true;
  };
  requestModel.transport = async () => ({
    ok: true,
    status: 200,
    text: async () => { reads++; return JSON.stringify(current); }
  });
  mm.requestModel = requestModel;
  mm.ttl = 10;
  mm.staleWindow = 10;
  pm.clock = () => now;

  const old = await mm.load(descriptor, context);
  now = 10;
  const guarded = mm.load(descriptor, context);
  assert.equal(mm.purge(descriptor, context), 1);
  current = second.manifest;
  gate.resolve(true);

  const fresh = await guarded;
  assert.notStrictEqual(fresh, old);
  assert.equal(html(fresh), 'B');
  assert.equal(reads, 2);
  assert.equal(await mm.c.values().next().value, fresh);
});

test('refresh publication during a deferred manifest guard is adopted without a duplicate request', async () => {
  reset();
  mm.digest = async () => new Uint8Array(32).fill(12);
  const first = await build('A'), second = await build('B');
  const descriptor = {url: 'pack.json', hash: first.hash, mode: 'required'};
  const context = {tenant: 'tenant-a'}, gate = deferred(), refresh = deferred();
  let allowCalls = 0, now = 0, reads = 0;
  requestModel.base = 'https://a.example/assets/';
  requestModel.allow = () => {
    allowCalls++;
    return allowCalls === 4 ? gate.promise : true;
  };
  requestModel.transport = async () => ({
    ok: true,
    status: 200,
    text: () => {
      reads++;
      return reads === 1
        ? Promise.resolve(JSON.stringify(first.manifest))
        : refresh.promise;
    }
  });
  mm.requestModel = requestModel;
  mm.ttl = 10;
  mm.staleWindow = 10;
  pm.clock = () => now;

  const old = await mm.load(descriptor, context);
  now = 10;
  assert.strictEqual(await mm.load(descriptor, context), old);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(reads, 2);

  const guarded = mm.load(descriptor, context);
  assert.equal(allowCalls, 4);
  refresh.resolve(JSON.stringify(second.manifest));
  await new Promise(resolve => setImmediate(resolve));
  gate.resolve(true);

  const fresh = await guarded;
  assert.equal(html(fresh), 'B');
  assert.equal(reads, 2);
});

test('invalid manifest refresh never publishes and a later eligible request retries', async () => {
  reset();
  mm.digest = async () => new Uint8Array(32).fill(13);
  const first = await build('A'), second = await build('B');
  const descriptor = {url: 'pack.json', hash: first.hash, mode: 'required'};
  const context = {tenant: 'tenant-a'};
  const texts = [JSON.stringify(first.manifest), '{', JSON.stringify(second.manifest)];
  let now = 0, reads = 0;
  requestModel.base = 'https://a.example/assets/';
  requestModel.allow = async () => true;
  requestModel.transport = async () => ({
    ok: true,
    status: 200,
    text: async () => texts[reads++]
  });
  mm.requestModel = requestModel;
  mm.ttl = 10;
  mm.staleWindow = 10;
  pm.clock = () => now;

  const old = await mm.load(descriptor, context);
  now = 10;
  assert.strictEqual(await mm.load(descriptor, context), old);
  await new Promise(resolve => setImmediate(resolve));
  assert.strictEqual(mm.c.values().next().value.then ? await mm.c.values().next().value : null, old);
  assert.equal(reads, 2);

  now = 11;
  assert.strictEqual(await mm.load(descriptor, context), old);
  await new Promise(resolve => setImmediate(resolve));
  const fresh = await mm.load(descriptor, context);
  assert.equal(html(fresh), 'B');
  assert.equal(reads, 3);
});

test('hard manifest reuse rechecks key drift before joining an already authorized refresh', async () => {
  reset();
  mm.digest = async () => new Uint8Array(32).fill(14);
  const built = await build('A');
  const descriptor = {url: 'pack.json', hash: built.hash, mode: 'required'};
  const context = {tenant: 'tenant-a'}, gate = deferred(), refresh = deferred();
  let allowCalls = 0, now = 0, reads = 0;
  requestModel.base = 'https://a.example/assets/';
  requestModel.allow = () => {
    allowCalls++;
    return allowCalls === 4 ? gate.promise : true;
  };
  requestModel.transport = async () => ({
    ok: true,
    status: 200,
    text: () => {
      reads++;
      return reads === 1
        ? Promise.resolve(JSON.stringify(built.manifest))
        : refresh.promise;
    }
  });
  mm.requestModel = requestModel;
  mm.ttl = 10;
  mm.staleWindow = 10;
  pm.clock = () => now;

  const old = await mm.load(descriptor, context);
  now = 10;
  assert.strictEqual(await mm.load(descriptor, context), old);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(reads, 2);

  now = 20;
  const hard = mm.load(descriptor, context);
  assert.equal(allowCalls, 4);
  context.tenant = 'tenant-b';
  gate.resolve(true);

  await assert.rejects(hard, /Manifest cache scope changed/);
  assert.equal(reads, 2);
  refresh.resolve(JSON.stringify(built.manifest));
  await refresh.promise;
  await new Promise(resolve => setImmediate(resolve));
});
