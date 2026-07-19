'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { jTormRequestModel: rm } = require('../../src/models/request-model/src/request-model.js');
const { jTormRenderContextModel: cm } = require('../../src/models/render-context-model/src/render-context-model.js');

function context(base) {
  return {request: {tenant: 'tenant-a', base: base || 'https://a.example/assets/'}};
}

function headers(values) {
  values = values || {};
  return {get: name => values[String(name).toLowerCase()]};
}

function response(status, values, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: headers(values),
    json: async () => body,
    text: async () => body
  };
}

function isolated(name, fn) {
  test(name, async t => {
    const saved = {
      allow: rm.allow,
      base: rm.base,
      renderContextModel: rm.renderContextModel,
      timeout: rm.timeout,
      transport: rm.transport,
      url: rm.url
    };

    rm.allow = saved.allow;
    rm.base = '';
    rm.renderContextModel = cm;
    rm.timeout = 0;
    rm.transport = saved.transport;
    rm.url = saved.url;

    try {
      await fn(t);
    } finally {
      Object.assign(rm, saved);
    }
  });
}

isolated('conditional text captures a safe ETag after a modified response without sending a cold header', async () => {
  const c = context(), key = rm.cacheKey('item.html', c);
  let seen;

  rm.transport = async (url, options) => {
    seen = {url, options};
    return response(200, {etag: '"v1"'}, '<p>new</p>');
  };

  const result = await rm.conditional('item.html', c, {key, validator: () => undefined}).text();

  assert.deepEqual(result, {
    status: 200,
    value: '<p>new</p>',
    validator: {name: 'etag', value: '"v1"'}
  });
  assert.equal(seen.url, 'https://a.example/assets/item.html');
  assert.equal(Object.prototype.hasOwnProperty.call(seen.options, 'headers'), false);
});

isolated('conditional JSON parses before returning its modified response envelope', async () => {
  const c = context(), key = rm.cacheKey('item.json', c), value = {id: 1};
  rm.transport = async () => response(200, {'last-modified': 'opaque revision'}, value);

  assert.deepEqual(await rm.conditional('item.json', c, {key, validator: () => undefined}).json(), {
    status: 200,
    value,
    validator: {name: 'last-modified', value: 'opaque revision'}
  });
});

isolated('a paired 304 sends one ETag condition, skips the body, and retains the exact sent validator', async () => {
  const c = context(), key = rm.cacheKey('item.html', c);
  const validator = {name: 'etag', value: 'W/"v1"'};
  let body = 0, seen;

  rm.transport = async (url, options) => {
    seen = {url, options};
    return {
      ok: false,
      status: 304,
      headers: headers({etag: '"rotated"'}),
      json: async () => { body++; throw new Error('body read'); },
      text: async () => { body++; throw new Error('body read'); }
    };
  };

  const result = await rm.conditional('item.html', c, {key, validator: () => validator}).text();

  assert.deepEqual(seen.options.headers, {'If-None-Match': 'W/"v1"'});
  assert.deepEqual(result, {status: 304, validator: {name: 'etag', value: 'W/"v1"'}});
  assert.equal(body, 0);
});

isolated('an invalid ETag falls back to opaque Last-Modified and emits only If-Modified-Since', async () => {
  const c = context(), key = rm.cacheKey('item.html', c);
  const modified = 'server revision 7';
  let options;

  rm.transport = async () => response(200, {etag: '*', 'last-modified': modified}, 'new');
  const first = await rm.conditional('item.html', c, {key, validator: () => undefined}).text();
  assert.deepEqual(first.validator, {name: 'last-modified', value: modified});

  rm.transport = async (url, value) => {
    options = value;
    return response(304, {'last-modified': 'server revision 8'});
  };
  const second = await rm.conditional('item.html', c, {key, validator: () => first.validator}).text();

  assert.deepEqual(options.headers, {'If-Modified-Since': modified});
  assert.deepEqual(second, {status: 304, validator: {name: 'last-modified', value: modified}});
});

isolated('response validators enforce one safe entity-tag envelope and wire-byte bounds', async t => {
  const c = context(), key = rm.cacheKey('item.html', c);
  const cases = [
    ['strong tag', '"opaque"', {name: 'etag', value: '"opaque"'}],
    ['weak tag', 'W/"opaque"', {name: 'etag', value: 'W/"opaque"'}],
    ['empty opaque tag', '""', {name: 'etag', value: '""'}],
    ['wildcard', '*', undefined],
    ['combined list', '"a", "b"', undefined],
    ['unquoted', 'opaque', undefined],
    ['trailing material', '"a" trailing', undefined],
    ['non-ASCII ETag', '"é"', undefined],
    ['control', '"a\rb"', undefined],
    ['1024 bytes', '"' + 'a'.repeat(1022) + '"', {name: 'etag', value: '"' + 'a'.repeat(1022) + '"'}],
    ['1025 bytes', '"' + 'a'.repeat(1023) + '"', undefined]
  ];

  for (const [name, value, expected] of cases) {
    await t.test(name, async () => {
      rm.transport = async () => response(200, {etag: value}, 'value');
      const result = await rm.conditional('item.html', c, {key, validator: () => undefined}).text();
      assert.deepEqual(result.validator, expected);
    });
  }

  for (const [name, value, expected] of [
    ['1024-byte Last-Modified', 'é'.repeat(512), {name: 'last-modified', value: 'é'.repeat(512)}],
    ['1026-byte Last-Modified', 'é'.repeat(513), undefined],
    ['empty Last-Modified', '', undefined],
    ['control Last-Modified', 'x\ny', undefined],
    ['DEL Last-Modified', 'x\u007fy', undefined],
    ['HTAB Last-Modified', 'x\ty', {name: 'last-modified', value: 'x\ty'}]
  ]) {
    await t.test(name, async () => {
      rm.transport = async () => response(200, {'last-modified': value}, 'value');
      const result = await rm.conditional('item.html', c, {key, validator: () => undefined}).text();
      assert.deepEqual(result.validator, expected);
    });
  }
});

isolated('missing, inaccessible, or throwing response headers do not reject a valid modified body', async t => {
  const c = context(), key = rm.cacheKey('item.html', c);
  const cases = [
    ['missing headers', {ok: true, status: 200, text: async () => 'a'}],
    ['missing get', {ok: true, status: 200, headers: {}, text: async () => 'b'}],
    ['throwing get', {
      ok: true,
      status: 200,
      headers: {get() { throw new Error('host header failure'); }},
      text: async () => 'c'
    }]
  ];

  for (const [name, value] of cases) {
    await t.test(name, async () => {
      rm.transport = async () => value;
      const result = await rm.conditional('item.html', c, {key, validator: () => undefined}).text();
      assert.equal(result.validator, undefined);
      assert.equal(typeof result.value, 'string');
    });
  }
});

isolated('blocked, unscoped, and mismatched conditional requests send neither header nor transport work', async t => {
  const c = context(), key = rm.cacheKey('item.html', c);
  let transport = 0, validator = 0;
  rm.transport = async () => { transport++; return response(200, {}, 'value'); };

  await t.test('blocked', async () => {
    rm.allow = async () => false;
    await assert.rejects(
      () => rm.conditional('item.html', c, {key, validator: () => { validator++; }}).text(),
      /URL blocked/
    );
  });

  await t.test('unscoped', async () => {
    rm.allow = async () => true;
    await assert.rejects(
      () => rm.conditional('item.html', c, {key: undefined, validator: () => { validator++; }}).text(),
      /cache scope/
    );
  });

  await t.test('mismatched', async () => {
    await assert.rejects(
      () => rm.conditional('item.html', c, {key: key + 'drift', validator: () => { validator++; }}).text(),
      /cache scope/
    );
  });

  assert.deepEqual({transport, validator}, {transport: 0, validator: 0});
});

isolated('tenant and base drift while allow awaits reject before reading or sending the validator', async () => {
  const c = context(), key = rm.cacheKey('item.html', c);
  let release, transport = 0, validator = 0;
  rm.allow = () => new Promise(resolve => { release = resolve; });
  rm.transport = async () => { transport++; return response(200, {}, 'value'); };

  const pending = rm.conditional('item.html', c, {
    key,
    validator: () => { validator++; return {name: 'etag', value: '"a"'}; }
  }).text();
  await Promise.resolve();
  c.request.tenant = 'tenant-b';
  c.request.base = 'https://b.example/assets/';
  release(true);

  await assert.rejects(() => pending, /cache scope/);
  assert.deepEqual({transport, validator}, {transport: 0, validator: 0});
});

isolated('conditional acquisition snapshots its supplied key before awaited policy', async () => {
  const c = context();
  let keys = 0, release, transport = 0, validator = 0;
  const x = {validator: () => { validator++; return {name: 'etag', value: '"a"'}; }};
  Object.defineProperty(x, 'key', {
    get() { keys++; return rm.cacheKey('item.html', c); }
  });
  rm.allow = () => new Promise(resolve => { release = resolve; });
  rm.transport = async () => { transport++; return response(200, {}, 'value'); };

  const pending = rm.conditional('item.html', c, x).text();
  await Promise.resolve();
  c.request.tenant = 'tenant-b';
  release(true);

  await assert.rejects(() => pending, /cache scope/);
  assert.deepEqual({keys, transport, validator}, {keys: 1, transport: 0, validator: 0});
});

isolated('conditional acquisition reads the validator capability exactly once before transport', async () => {
  const c = context(), key = rm.cacheKey('item.html', c), x = {key};
  let reads = 0;
  Object.defineProperty(x, 'validator', {
    get() {
      reads++;
      return () => ({name: 'etag', value: '"a"'});
    }
  });
  rm.transport = async (url, options) => {
    assert.deepEqual(options.headers, {'If-None-Match': '"a"'});
    return response(304);
  };

  await rm.conditional('item.html', c, x).text();
  assert.equal(reads, 1);
});

isolated('resolved-URL comparison closes relative-base A-to-B-to-A authorization ABA', async () => {
  const c = context('https://a.example/assets/');
  const key = rm.cacheKey('item.html', c);
  let release, transport = 0;

  c.request.base = 'https://b.example/assets/';
  rm.allow = () => new Promise(resolve => { release = resolve; });
  rm.transport = async () => { transport++; return response(200, {}, 'value'); };

  const pending = rm.conditional('item.html', c, {
    key,
    validator: () => ({name: 'etag', value: '"a"'})
  }).text();
  await Promise.resolve();
  c.request.base = 'https://a.example/assets/';
  release(true);

  await assert.rejects(() => pending, /cache scope/);
  assert.equal(transport, 0);
});

isolated('missing, malformed, or oversized prior metadata cannot authorize 304 reuse', async t => {
  const c = context(), key = rm.cacheKey('item.json', c);
  const cases = [
    ['missing', undefined],
    ['malformed', {name: 'etag', value: '*'}],
    ['oversized', {name: 'etag', value: '"' + 'a'.repeat(1023) + '"'}]
  ];

  for (const [name, validator] of cases) {
    await t.test(name, async () => {
      let options;
      rm.transport = async (url, value) => {
        options = value;
        return response(304, {etag: '"server"'});
      };
      await assert.rejects(
        () => rm.conditional('item.json', c, {key, validator: () => validator}).json(),
        /HTTP 304/
      );
      assert.equal(Object.prototype.hasOwnProperty.call(options, 'headers'), false);
    });
  }
});

isolated('unsolicited 304, ordinary HTTP failure, and parser failure reject without exposing validators', async t => {
  const c = context(), key = rm.cacheKey('item.json', c);

  await t.test('unsolicited 304', async () => {
    rm.transport = async () => response(304, {etag: '"server"'});
    await assert.rejects(
      () => rm.conditional('item.json', c, {key, validator: () => undefined}).json(),
      /HTTP 304/
    );
  });

  await t.test('HTTP failure', async () => {
    rm.transport = async () => response(412, {etag: '"secret"'});
    await assert.rejects(
      () => rm.conditional('item.json', c, {key, validator: () => ({name: 'etag', value: '"client"'})}).json(),
      error => error.message.includes('HTTP 412') && !error.message.includes('secret') && !error.message.includes('client')
    );
  });

  await t.test('JSON parser failure', async () => {
    rm.transport = async () => ({
      ok: true,
      status: 200,
      headers: headers({etag: '"candidate"'}),
      json: async () => { throw new SyntaxError('invalid JSON'); }
    });
    await assert.rejects(
      () => rm.conditional('item.json', c, {key, validator: () => undefined}).json(),
      /invalid JSON/
    );
  });
});

isolated('conditional acquisition preserves per-context timeout signal behavior', async () => {
  const c = context(), key = rm.cacheKey('item.html', c);
  c.request.timeout = 5;
  let signal;
  rm.transport = async (url, options) => {
    signal = options.signal;
    return response(200, {}, 'value');
  };

  assert.equal((await rm.conditional('item.html', c, {key, validator: () => undefined}).text()).value, 'value');
  assert.equal(signal instanceof AbortSignal, true);
});
