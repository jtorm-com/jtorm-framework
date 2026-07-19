'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormPromiseCacheModel: pm } = require('../../src/models/promise-cache-model/src/promise-cache-model.js');
const { jTormRequestModel: rm } = require('../../src/models/request-model/src/request-model.js');
const { jTormRenderContextModel: cm } = require('../../src/models/render-context-model/src/render-context-model.js');
const { jTormDataModel: dm } = require('../../src/models/data-model/src/data-model.js');
const { jTormHtmlModel: hm } = require('../../src/models/html-model/src/html-model.js');
const { jTormTssModel: tm } = require('../../src/models/tss-model/src/tss-model.js');

const models = [
  {name: 'data', model: dm, method: 'json', path: 'item.json', first: {version: 1}, second: {version: 2}},
  {name: 'HTML', model: hm, method: 'text', path: 'item.html', first: '<b>one</b>', second: '<b>two</b>'},
  {name: 'TSS', model: tm, method: 'text', path: 'item.tss', first: 'a{x:1;}', second: 'a{x:2;}'}
];

function context(tenant) {
  return {request: {tenant: tenant || 'tenant-a', base: 'https://cdn.example/assets/'}};
}

function headers(values) {
  values = values || {};
  return {get: name => values[String(name).toLowerCase()]};
}

function response(status, values, body, counts) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: headers(values),
    json: async () => { if (counts) counts.body++; return body; },
    text: async () => { if (counts) counts.body++; return body; }
  };
}

function value(config, source) {
  return config.model === tm ? source[0].source : source;
}

function configure(config, time, staleWindow) {
  const model = config.model;
  model.c = new Map();
  model.max = 512;
  model.ttl = 10;
  model.staleWindow = staleWindow || 0;
  model.validators = true;
  model.promiseCacheModel = pm;
  model.requestModel = rm;
  if (model === tm) model.tssParser = {handle: source => [{source}]};
  pm.clock = () => time.value;
  pm.reset(model);
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
    const savedModels = models.map(({model}) => ({
      model,
      c: model.c,
      max: model.max,
      promiseCacheModel: model.promiseCacheModel,
      requestModel: model.requestModel,
      staleWindow: model.staleWindow,
      tssParser: model.tssParser,
      ttl: model.ttl,
      validators: model.validators
    }));

    pm.metadata = new WeakMap();
    pm.observed = new WeakMap();
    rm.allow = savedRm.allow;
    rm.base = '';
    rm.renderContextModel = cm;
    rm.timeout = 0;

    try {
      await fn(t);
    } finally {
      Object.assign(pm, savedPm);
      Object.assign(rm, savedRm);
      for (const saved of savedModels) {
        const model = saved.model;
        delete saved.model;
        Object.assign(model, saved);
      }
    }
  });
}

isolated('all safe fetch owners publish validators as an exact default-off boolean', () => {
  assert.equal(dm.validators, false);
  assert.equal(hm.validators, false);
  assert.equal(tm.validators, false);
});

isolated('data, HTML, and TSS hard revalidation send their paired ETag and reuse exact authorized content on 304', async t => {
  for (const config of models) {
    await t.test(config.name, async () => {
      const time = {value: 0}, c = context(), counts = {body: 0}, requests = [];
      let parses = 0;
      configure(config, time);
      if (config.model === tm) config.model.tssParser = {handle: source => { parses++; return [{source}]; }};
      rm.transport = async (url, options) => {
        requests.push({url, options});
        return requests.length === 1
          ? response(200, {etag: '"v1"'}, config.first, counts)
          : response(304, {etag: '"rotated"'}, undefined, counts);
      };

      const first = await config.model.get(config.path, c);
      time.value = 9;
      assert.strictEqual(await config.model.get(config.path, c), first);
      time.value = 10;
      const second = await config.model.get(config.path, c);

      assert.strictEqual(second, first);
      assert.equal(value(config, second), value(config, first));
      assert.equal(requests.length, 2);
      assert.deepEqual(requests[1].options.headers, {'If-None-Match': '"v1"'});
      assert.equal(counts.body, 1);
      if (config.model === tm) assert.equal(parses, 1);
    });
  }
});

isolated('a validated modified 200 replaces both content and validator for every safe fetch owner', async t => {
  for (const config of models) {
    await t.test(config.name, async () => {
      const time = {value: 0}, c = context(), requests = [];
      let parses = 0;
      configure(config, time);
      if (config.model === tm) config.model.tssParser = {handle: source => { parses++; return [{source}]; }};
      rm.transport = async (url, options) => {
        requests.push(options);
        if (requests.length === 1) return response(200, {etag: '"v1"'}, config.first);
        if (requests.length === 2) return response(200, {etag: '"v2"'}, config.second);
        return response(304, {etag: '"ignored"'});
      };

      const first = await config.model.get(config.path, c);
      time.value = 10;
      const second = await config.model.get(config.path, c);
      assert.notStrictEqual(second, first);
      assert.equal(value(config, second), value(config, config.model === tm ? [{source: config.second}] : config.second));
      time.value = 20;
      assert.strictEqual(await config.model.get(config.path, c), second);

      assert.deepEqual(requests[1].headers, {'If-None-Match': '"v1"'});
      assert.deepEqual(requests[2].headers, {'If-None-Match': '"v2"'});
      if (config.model === tm) assert.equal(parses, 2);
    });
  }
});

isolated('body or TSS validation failure publishes neither replacement bytes nor candidate metadata', async t => {
  for (const config of models) {
    await t.test(config.name, async () => {
      const time = {value: 0}, c = context(), requests = [];
      configure(config, time);
      if (config.model === tm) {
        config.model.tssParser = {handle: source => {
          if (source === 'invalid') throw new Error('TSS invalid');
          return [{source}];
        }};
      }
      rm.transport = async (url, options) => {
        requests.push(options);
        if (requests.length === 1) return response(200, {etag: '"v1"'}, config.first);
        if (requests.length === 2) {
          if (config.model === tm) return response(200, {etag: '"candidate"'}, 'invalid');
          return {
            ok: true,
            status: 200,
            headers: headers({etag: '"candidate"'}),
            [config.method]: async () => { throw new Error('body invalid'); }
          };
        }
        return response(200, {etag: '"v3"'}, config.second);
      };

      await config.model.get(config.path, c);
      time.value = 10;
      await assert.rejects(() => config.model.get(config.path, c), /invalid/);
      const recovered = await config.model.get(config.path, c);

      assert.equal(value(config, recovered), value(config, config.model === tm ? [{source: config.second}] : config.second));
      assert.equal(Object.prototype.hasOwnProperty.call(requests[2], 'headers'), false);
    });
  }
});

isolated('request-triggered SWR runs one conditional 304 while stale callers keep the old owner value', async t => {
  for (const config of models) {
    await t.test(config.name, async () => {
      const time = {value: 0}, c = context();
      let release, requests = 0, parses = 0;
      configure(config, time, 10);
      if (config.model === tm) config.model.tssParser = {handle: source => { parses++; return [{source}]; }};
      rm.transport = async (url, options) => {
        requests++;
        if (requests === 1) return response(200, {etag: '"v1"'}, config.first);
        assert.deepEqual(options.headers, {'If-None-Match': '"v1"'});
        return new Promise(resolve => { release = () => resolve(response(304, {})); });
      };

      const old = await config.model.get(config.path, c);
      time.value = 10;
      const a = config.model.get(config.path, c), b = config.model.get(config.path, c);
      assert.strictEqual(await a, old);
      assert.strictEqual(await b, old);
      assert.equal(requests, 2);

      time.value = 20;
      const hard = config.model.get(config.path, c);
      release();
      assert.strictEqual(await hard, old);
      assert.equal(requests, 2);
      if (config.model === tm) assert.equal(parses, 1);
    });
  }
});

isolated('scoped validator pairs remain isolated by tenant for the same resolved URL', async () => {
  const time = {value: 0}, a = context('tenant-a'), b = context('tenant-b'), requests = [];
  configure({model: dm}, time);
  rm.transport = async (url, options) => {
    requests.push(options);
    if (requests.length === 1) return response(200, {etag: '"a"'}, {tenant: 'a'});
    if (requests.length === 2) return response(200, {etag: '"b"'}, {tenant: 'b'});
    return response(304, {});
  };

  const av = await dm.get('same.json', a), bv = await dm.get('same.json', b);
  time.value = 10;
  assert.strictEqual(await dm.get('same.json', a), av);
  assert.strictEqual(await dm.get('same.json', b), bv);

  assert.deepEqual(requests[2].headers, {'If-None-Match': '"a"'});
  assert.deepEqual(requests[3].headers, {'If-None-Match': '"b"'});
  assert.equal(dm.c.size, 2);
});

isolated('authorization drift during owner revalidation rejects before transport and detaches the old generation', async () => {
  const time = {value: 0}, c = context();
  let release, requests = 0;
  configure({model: dm}, time);
  rm.transport = async () => { requests++; return response(200, {etag: '"a"'}, {version: requests}); };
  await dm.get('same.json', c);

  time.value = 10;
  rm.allow = () => new Promise(resolve => { release = resolve; });
  const pending = dm.get('same.json', c);
  await Promise.resolve();
  c.request.tenant = 'tenant-b';
  release(true);

  await assert.rejects(() => pending, /cache scope/);
  assert.equal(requests, 1);
  assert.equal(dm.c.has('t:tenant-a\0b:https://cdn.example/assets/\0https://cdn.example/assets/same.json'), false);
});

isolated('purge during a paired owner request makes 304 fail closed and cannot reinsert content', async () => {
  const time = {value: 0}, c = context();
  let release, requests = 0, start;
  const started = new Promise(resolve => { start = resolve; });
  configure({model: dm}, time);
  rm.transport = async (url, options) => {
    requests++;
    if (requests === 1) return response(200, {etag: '"a"'}, {version: 1});
    return new Promise(resolve => {
      release = () => resolve(response(304, {}));
      start();
    });
  };
  await dm.get('same.json', c);

  time.value = 10;
  const pending = dm.get('same.json', c);
  await started;
  assert.equal(dm.purge('same.json', c), 1);
  release();

  await assert.rejects(() => pending, /Cache validator detached/);
  assert.equal(dm.c.size, 0);
});

isolated('disabled, unscoped, missing, inaccessible, and old cache collaborators use the original request path', async t => {
  for (const config of models) {
    await t.test(config.name, async () => {
      const model = config.model;
      let conditional = 0, unconditional = 0;
      model.c = new Map();
      model.max = 512;
      model.ttl = Infinity;
      model.staleWindow = 0;
      model.promiseCacheModel = pm;
      if (model === tm) model.tssParser = {handle: source => [source]};
      const body = config.first;
      const adapter = {
        cacheKey: () => 'key',
        conditional: () => { conditional++; throw new Error('conditional used'); },
        get: () => ({[config.method]: async () => { unconditional++; return body; }})
      };

      for (const setting of [false, 1, 'true']) {
        model.c = new Map();
        pm.reset(model);
        model.validators = setting;
        model.requestModel = adapter;
        await model.get(config.path, context());
      }

      model.c = new Map();
      pm.reset(model);
      model.validators = true;
      model.requestModel = Object.assign({}, adapter);
      delete model.requestModel.conditional;
      await model.get(config.path, context());

      model.c = new Map();
      pm.reset(model);
      model.requestModel = Object.assign({}, adapter, {cacheKey: () => undefined});
      await model.get(config.path, context());

      model.c = new Map();
      model.requestModel = adapter;
      model.promiseCacheModel = {get: (owner, key, options) => options.load()};
      await model.get(config.path, context());

      const inaccessible = {cacheKey: () => 'key', get: adapter.get};
      Object.defineProperty(inaccessible, 'conditional', {get() { throw new Error('capability getter'); }});
      model.c = new Map();
      model.requestModel = inaccessible;
      model.promiseCacheModel = pm;
      pm.reset(model);
      await model.get(config.path, context());

      assert.equal(conditional, 0);
      assert.equal(unconditional, 7);
    });
  }
});
