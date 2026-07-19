'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {jTormUiManifestModel: mm} = require('../../src/models/ui-manifest-model/src/ui-manifest-model.js');
const {jTormPromiseCacheModel: pm} = require('../../src/models/promise-cache-model/src/promise-cache-model.js');
const {jTormRenderContextModel: cm} = require('../../src/models/render-context-model/src/render-context-model.js');
const {jTormRequestModel: rm} = require('../../src/models/request-model/src/request-model.js');

const digest = async bytes => new Uint8Array(createHash('sha256').update(bytes).digest());

function headers(values) {
  values = values || {};
  return {get: name => values[String(name).toLowerCase()]};
}

function response(status, values, text, counts) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: headers(values),
    text: async () => { if (counts) counts.body++; return text; }
  };
}

function context(tenant) {
  return {tenant: tenant || 'tenant-a'};
}

async function build(value, id) {
  const asset = {
    type: 'html',
    request: '@h/a.html',
    value,
    valueHash: await mm.hash(value)
  };
  const payload = {
    format: '@jtorm/ui-manifest',
    version: 1,
    id: id || 'validators',
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

function configure(time, fixed) {
  mm.promiseCacheModel = pm;
  mm.renderContextModel = cm;
  mm.c = new Map();
  mm.max = 32;
  mm.ttl = 10;
  mm.staleWindow = 0;
  mm.validators = true;
  mm.maxText = 1048576;
  mm.maxValues = 262144;
  mm.maxDepth = 128;
  mm.maxAssets = 8192;
  mm.maxMetadata = 65536;
  mm.digest = fixed ? async () => new Uint8Array(32).fill(fixed) : digest;
  mm.requestModel = rm;
  rm.base = 'https://cdn.example/assets/';
  rm.renderContextModel = cm;
  rm.timeout = 0;
  pm.clock = () => time.value;
  pm.reset(mm);
}

function isolated(name, fn) {
  test(name, async t => {
    const savedPm = {clock: pm.clock, metadata: pm.metadata, observed: pm.observed};
    const savedRm = {
      allow: rm.allow,
      base: rm.base,
      renderContextModel: rm.renderContextModel,
      timeout: rm.timeout,
      transport: rm.transport
    };
    const savedMm = {
      cacheKey: mm.cacheKey,
      c: mm.c,
      digest: mm.digest,
      max: mm.max,
      maxAssets: mm.maxAssets,
      maxDepth: mm.maxDepth,
      maxMetadata: mm.maxMetadata,
      maxText: mm.maxText,
      maxValues: mm.maxValues,
      promiseCacheModel: mm.promiseCacheModel,
      renderContextModel: mm.renderContextModel,
      requestModel: mm.requestModel,
      staleWindow: mm.staleWindow,
      ttl: mm.ttl,
      validators: mm.validators
    };

    pm.metadata = new WeakMap();
    pm.observed = new WeakMap();

    try {
      await fn(t);
    } finally {
      Object.assign(pm, savedPm);
      Object.assign(rm, savedRm);
      Object.assign(mm, savedMm);
    }
  });
}

isolated('UI-manifest acquisition publishes validators as an exact default-off boolean', () => {
  assert.equal(mm.validators, false);
});

isolated('manifest validator loading retains the published composite cacheKey seam', async () => {
  const time = {value: 0}, c = context(), sent = [];
  configure(time, 6);
  const built = await build('A');
  const descriptor = {url: 'pack.json', hash: built.hash, mode: 'required'};
  mm.cacheKey = () => 'custom-pack-key';
  rm.transport = async (url, options) => {
    sent.push(options.headers);
    return sent.length === 1
      ? response(200, {etag: '"pack-a"'}, JSON.stringify(built.manifest))
      : response(304);
  };

  const first = await mm.load(descriptor, c);
  assert.equal(mm.c.has('custom-pack-key'), true);
  time.value = 10;
  assert.equal(await mm.load(descriptor, c), first);
  assert.deepEqual(sent, [undefined, {'If-None-Match': '"pack-a"'}]);
});

isolated('manifest raw and composite cache identities use one admission snapshot', async () => {
  const time = {value: 0};
  configure(time, 4);
  assert.equal(mm.cacheKey.length, 2);
  const built = await build('A');
  const descriptor = {url: 'pack.json', hash: built.hash, mode: 'required'};
  let keys = 0;
  mm.requestModel = {
    cacheKey: () => 'raw-' + ++keys,
    conditional: () => ({text: async () => ({
      status: 200,
      value: JSON.stringify(built.manifest),
      validator: {name: 'etag', value: '"pack-a"'}
    })}),
    get: () => ({text: async () => JSON.stringify(built.manifest)}),
    url: value => value,
    allow: async () => true
  };

  await mm.load(descriptor, context());
  assert.equal(keys, 1);
  assert.equal(mm.c.has(JSON.stringify(['raw-1', built.hash])), true);
});

isolated('manifest hard guard re-reads one current request collaborator before acquisition', async () => {
  const time = {value: 0}, c = context();
  configure(time, 5);
  const built = await build('A');
  const descriptor = {url: 'pack.json', hash: built.hash, mode: 'required'};
  const pair = {name: 'etag', value: '"pack-a"'};
  let release, started, current = 0, old = 0;
  const first = {
    cacheKey: () => 'raw-key',
    conditional: () => ({text: async () => ({status: 200, value: JSON.stringify(built.manifest), validator: pair})}),
    get: () => ({text: async () => JSON.stringify(built.manifest)}),
    url: value => value,
    allow: async () => true
  };
  mm.requestModel = first;
  const pack = await mm.load(descriptor, c);
  time.value = 10;
  first.allow = () => new Promise(resolve => {
    release = resolve;
    if (started) started();
  });
  first.conditional = () => { old++; throw new Error('old conditional used'); };
  const waiting = new Promise(resolve => { started = resolve; });
  const pending = mm.load(descriptor, c);
  await waiting;
  mm.requestModel = {
    cacheKey: () => 'raw-key',
    conditional: () => {
      current++;
      return {text: async () => ({status: 304, validator: pair})};
    },
    get: first.get,
    url: first.url,
    allow: async () => true
  };
  release(true);

  assert.equal(await pending, pack);
  assert.equal(old, 0);
  assert.equal(current, 1);
});

isolated('hard manifest 304 reuses the exact fully validated pack without reading a body', async () => {
  const time = {value: 0}, c = context(), counts = {body: 0}, requests = [];
  configure(time, 7);
  const built = await build('A');
  const descriptor = {url: 'pack.json', hash: built.hash, mode: 'required'};
  rm.transport = async (url, options) => {
    requests.push(options);
    return requests.length === 1
      ? response(200, {etag: '"pack-a"'}, JSON.stringify(built.manifest), counts)
      : response(304, {etag: '"rotated"'}, undefined, counts);
  };

  const old = await mm.load(descriptor, c);
  time.value = 10;
  const fresh = await mm.load(descriptor, c);

  assert.strictEqual(fresh, old);
  assert.equal(html(fresh), 'A');
  assert.deepEqual(requests[1].headers, {'If-None-Match': '"pack-a"'});
  assert.equal(counts.body, 1);
});

isolated('manifest 200 publishes replacement bytes and validator only after complete pack validation', async () => {
  const time = {value: 0}, c = context(), requests = [];
  configure(time, 8);
  const first = await build('A'), second = await build('B');
  assert.equal(first.hash, second.hash);
  const descriptor = {url: 'pack.json', hash: first.hash, mode: 'required'};
  rm.transport = async (url, options) => {
    requests.push(options);
    if (requests.length === 1) return response(200, {etag: '"pack-a"'}, JSON.stringify(first.manifest));
    if (requests.length === 2) return response(200, {etag: '"pack-b"'}, JSON.stringify(second.manifest));
    return response(304, {});
  };

  const old = await mm.load(descriptor, c);
  time.value = 10;
  const replaced = await mm.load(descriptor, c);
  assert.notStrictEqual(replaced, old);
  assert.equal(html(replaced), 'B');
  time.value = 20;
  assert.strictEqual(await mm.load(descriptor, c), replaced);

  assert.deepEqual(requests[1].headers, {'If-None-Match': '"pack-a"'});
  assert.deepEqual(requests[2].headers, {'If-None-Match': '"pack-b"'});
});

isolated('invalid manifest 200 stays loud and cannot publish its candidate validator', async () => {
  const time = {value: 0}, c = context(), requests = [];
  configure(time, 9);
  const first = await build('A'), recovered = await build('B');
  const descriptor = {url: 'pack.json', hash: first.hash, mode: 'required'};
  rm.transport = async (url, options) => {
    requests.push(options);
    if (requests.length === 1) return response(200, {etag: '"pack-a"'}, JSON.stringify(first.manifest));
    if (requests.length === 2) return response(200, {etag: '"candidate"'}, '{');
    return response(200, {etag: '"pack-b"'}, JSON.stringify(recovered.manifest));
  };

  await mm.load(descriptor, c);
  time.value = 10;
  await assert.rejects(() => mm.load(descriptor, c), /Manifest JSON invalid/);
  assert.equal(html(await mm.load(descriptor, c)), 'B');
  assert.equal(Object.prototype.hasOwnProperty.call(requests[2], 'headers'), false);
});

isolated('manifest SWR serves the old pack while one guarded conditional 304 publishes at fulfillment', async () => {
  const time = {value: 0}, c = context();
  let release, requests = 0, secondOptions, start;
  const started = new Promise(resolve => { start = resolve; });
  configure(time, 10);
  mm.staleWindow = 10;
  const built = await build('A');
  const descriptor = {url: 'pack.json', hash: built.hash, mode: 'required'};
  rm.transport = async (url, options) => {
    requests++;
    if (requests === 1) return response(200, {etag: '"pack-a"'}, JSON.stringify(built.manifest));
    secondOptions = options;
    return new Promise(resolve => {
      release = () => resolve(response(304, {}));
      start();
    });
  };

  const old = await mm.load(descriptor, c);
  time.value = 10;
  assert.strictEqual(await mm.load(descriptor, c), old);
  await started;
  assert.deepEqual(secondOptions.headers, {'If-None-Match': '"pack-a"'});
  assert.strictEqual(await mm.load(descriptor, c), old);
  time.value = 20;
  const hard = mm.load(descriptor, c);
  release();
  assert.strictEqual(await hard, old);
  assert.equal(requests, 2);
});

isolated('paired hard manifest guard rejects scope drift before a header and removes only the expired generation', async () => {
  const time = {value: 0}, c = context(), gate = {};
  let requests = 0;
  configure(time, 11);
  const built = await build('A');
  const descriptor = {url: 'pack.json', hash: built.hash, mode: 'required'};
  rm.transport = async () => { requests++; return response(200, {etag: '"pack-a"'}, JSON.stringify(built.manifest)); };
  await mm.load(descriptor, c);

  rm.allow = () => new Promise(resolve => { gate.resolve = resolve; });
  time.value = 10;
  const pending = mm.load(descriptor, c);
  await Promise.resolve();
  c.tenant = 'tenant-b';
  gate.resolve(true);

  await assert.rejects(
    () => pending,
    error => error.acquisition === 1 && /Manifest cache scope changed/.test(error.message)
  );
  assert.equal(requests, 1);
  assert.equal(mm.c.size, 0);
});

isolated('same manifest URL keeps validators isolated by expected hash', async () => {
  const time = {value: 0}, c = context(), requests = [];
  configure(time);
  const a = await build('A', 'a'), b = await build('B', 'b');
  const da = {url: 'pack.json', hash: a.hash, mode: 'required'};
  const db = {url: 'pack.json', hash: b.hash, mode: 'required'};
  rm.transport = async (url, options) => {
    requests.push(options);
    if (requests.length === 1) return response(200, {etag: '"a"'}, JSON.stringify(a.manifest));
    if (requests.length === 2) return response(200, {etag: '"b"'}, JSON.stringify(b.manifest));
    return response(304, {});
  };

  const av = await mm.load(da, c), bv = await mm.load(db, c);
  time.value = 10;
  assert.strictEqual(await mm.load(da, c), av);
  assert.strictEqual(await mm.load(db, c), bv);

  assert.deepEqual(requests[2].headers, {'If-None-Match': '"a"'});
  assert.deepEqual(requests[3].headers, {'If-None-Match': '"b"'});
  assert.equal(mm.c.size, 2);
});

isolated('detached optional manifest 304 is acquisition fallthrough while required mode rejects', async t => {
  for (const mode of ['optional', 'required']) {
    await t.test(mode, async () => {
      const time = {value: 0}, c = context();
      let release, requests = 0, start;
      const started = new Promise(resolve => { start = resolve; });
      configure(time, 12);
      const built = await build('A');
      const descriptor = {url: 'pack.json', hash: built.hash, mode};
      rm.transport = async () => {
        requests++;
        if (requests === 1) return response(200, {etag: '"pack-a"'}, JSON.stringify(built.manifest));
        return new Promise(resolve => {
          release = () => resolve(response(304, {}));
          start();
        });
      };
      await mm.load(descriptor, c);

      time.value = 10;
      const prepared = mm.prepare([descriptor], c);
      await started;
      assert.equal(mm.purge(descriptor, c), 1);
      release();

      if (mode === 'required') {
        await assert.rejects(() => prepared, /Cache validator detached/);
      } else {
        assert.equal(await prepared, undefined);
        assert.equal(c.manifest.index.assets.size, 0);
      }
    });
  }
});

isolated('disabled, unscoped, missing, inaccessible, and old cache manifest collaborators stay on the original path', async () => {
  const time = {value: 0};
  configure(time, 13);
  const built = await build('A');
  const descriptor = {url: 'pack.json', hash: built.hash, mode: 'required'};
  let conditional = 0, unconditional = 0;
  const adapter = {
    cacheKey: () => 'key',
    conditional: () => { conditional++; throw new Error('conditional used'); },
    get: () => ({text: async () => { unconditional++; return JSON.stringify(built.manifest); }}),
    url: value => value,
    allow: async () => true
  };

  for (const setting of [false, 1, 'true']) {
    mm.c = new Map();
    pm.reset(mm);
    mm.validators = setting;
    mm.requestModel = adapter;
    await mm.load(descriptor, context());
  }

  mm.c = new Map();
  pm.reset(mm);
  mm.validators = true;
  mm.requestModel = Object.assign({}, adapter);
  delete mm.requestModel.conditional;
  await mm.load(descriptor, context());

  mm.c = new Map();
  pm.reset(mm);
  mm.requestModel = Object.assign({}, adapter, {cacheKey: () => undefined});
  await mm.load(descriptor, context());

  mm.c = new Map();
  mm.requestModel = adapter;
  mm.promiseCacheModel = {get: (owner, key, options) => options.load()};
  await mm.load(descriptor, context());

  const inaccessible = {cacheKey: () => 'key', get: adapter.get, url: adapter.url, allow: adapter.allow};
  Object.defineProperty(inaccessible, 'conditional', {get() { throw new Error('capability getter'); }});
  mm.c = new Map();
  mm.promiseCacheModel = pm;
  mm.requestModel = inaccessible;
  pm.reset(mm);
  await mm.load(descriptor, context());

  assert.equal(conditional, 0);
  assert.equal(unconditional, 7);
});
