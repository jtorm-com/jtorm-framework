'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { createHash, webcrypto } = require('node:crypto');
const {
  jTormUiManifestModel: mm
} = require('../../src/models/ui-manifest-model/src/ui-manifest-model.js');

const nativeDigest = async (bytes) => new Uint8Array(
  createHash('sha256').update(bytes).digest()
);

function reset() {
  mm.c = new Map();
  mm.max = 32;
  mm.maxText = 1048576;
  mm.maxValues = 262144;
  mm.maxDepth = 128;
  mm.maxAssets = 8192;
  mm.maxMetadata = 65536;
  mm.digest = nativeDigest;
  mm.requestModel = null;
}

async function pack(assets) {
  const withHashes = [];
  for (const asset of assets)
    withHashes.push({ ...asset, valueHash: await mm.hash(asset.value) })
  ;

  const payload = {
    format: '@jtorm/ui-manifest',
    version: 1,
    id: 'product',
    config: {
      default: 'default',
      framework: 'schema',
      roots: [{ c: 'Product.default', f: 'self', t: 1, h: 1, m: 0 }],
      uis: [],
      namespaces: ['@c/', '@h/', '@s/'],
      methods: [
        { id: 'get', params: ['h', 't', 'd', 'a'] },
        { id: 'ui', params: ['c', 'f', 't', 'h', 'm'] }
      ],
      dynamicAllow: [],
      toolchain: { compiler: '1.0.0', manifestModel: '1.0.0' }
    },
    assets: withHashes,
    dynamic: [],
    mappers: [],
    sources: []
  };
  const hash = await mm.hash(payload);
  return {
    manifest: {
      format: payload.format,
      version: payload.version,
      id: payload.id,
      hash,
      config: payload.config,
      assets: payload.assets,
      dynamic: payload.dynamic,
      mappers: payload.mappers,
      sources: payload.sources
    },
    hash
  };
}

async function rehash(manifest) {
  const payload = { ...manifest };
  delete payload.hash;
  manifest.hash = await mm.hash(payload);
  return manifest.hash;
}

test('prepare rejects a cyclic render-context parent chain without hanging', () => {
  const model = require.resolve('../../src/models/ui-manifest-model/src/ui-manifest-model.js');
  const script = [
    "const { jTormUiManifestModel: m } = require(" + JSON.stringify(model) + ");",
    'const c = {}; c.p = c;',
    "m.prepare([], c).then(() => { process.exitCode = 1; }, e => { console.log(e.message); });"
  ].join('\n');
    const result = spawnSync(process.execPath, ['-e', script], {
      encoding: 'utf8',
      timeout: 2000
    });

  assert.equal(result.status, 0, result.error && result.error.message || result.stderr);
  assert.match(result.stdout, /Manifest context invalid/);
});

test('prepare rejects malformed digest output before requests or root ownership', async () => {
  reset();
  const calls = [];
  const root = {};
  mm.digest = async (bytes) => {
    calls.push(bytes);
    return new Uint8Array(31);
  };
  mm.requestModel = {
    cacheKey: () => '/pack',
    url: (url) => url,
    allow: async () => true,
    get: () => {
      throw new Error('request must not start');
    }
  };

  await assert.rejects(
    () => mm.prepare([
      { url: '/pack.json', hash: 'sha256-' + '0'.repeat(64), mode: 'required' }
    ], root),
    /Manifest digest invalid/
  );
  assert.equal(calls.length, 1);
  assert.ok(calls[0] instanceof Uint8Array);
  assert.equal(calls[0].length, 0);
  assert.equal(root.manifest, undefined);
});

test('prepare rejects descriptor prototypes and unknown fields before requests', async () => {
  reset();
  const calls = [];
  const valid = {
    url: '/pack.json',
    hash: 'sha256-' + '0'.repeat(64),
    mode: 'required'
  };
  const unknown = { ...valid, untrusted: true };
  const inherited = Object.assign(Object.create({ untrusted: true }), valid);
  mm.requestModel = {
    cacheKey: () => calls.push('cacheKey'),
    get: () => calls.push('get'),
    url: (url) => url,
    allow: async () => true
  };

  for (const descriptor of [unknown, inherited])
    await assert.rejects(
      () => mm.prepare([descriptor], {}),
      /Manifest descriptor invalid/
    )
  ;
  assert.deepEqual(calls, []);
});

test('prepare installs verified assets and reuses request-model identity and policy owners', async () => {
  reset();
  const valueA = [{ s: 'a', m: false, p: { color: 'red' }, c: [] }];
  const valueB = [{ s: 'b', m: false, p: { color: 'blue' }, c: [] }];
  const built = await pack([
    { type: 'tss', request: '@s/a.tss', value: valueA },
    { type: 'tss', request: '@s/b.tss', value: valueB },
    { type: 'html', request: '@h/a.html', value: '' }
  ]);
  const calls = [];
  const context = { request: { tenant: 'a' } };
  mm.requestModel = {
    cacheKey: (url, ctx) => {
      calls.push(['cacheKey', url, ctx]);
      return 'tenant-a\u0000' + url;
    },
    get: (url, ctx) => {
      calls.push(['get', url, ctx]);
      return { text: async () => JSON.stringify(built.manifest) };
    },
    url: (url, ctx) => {
      calls.push(['url', url, ctx]);
      return 'https://assets.example/' + url;
    },
    allow: async (url, ctx) => {
      calls.push(['allow', url, ctx]);
      return true;
    }
  };

  assert.equal(await mm.prepare([
    { url: '/product.json', hash: built.hash, mode: 'required' }
  ], context), undefined);

  const first = await mm.get('tss', ['@s/a.tss', '@s/b.tss'], context);
  const second = await mm.get('tss', ['@s/a.tss', '@s/b.tss'], context);
  assert.notStrictEqual(second, first);
  assert.strictEqual(second[0], first[0]);
  assert.strictEqual(second[1], first[1]);
  assert.equal(await mm.get('html', '@h/a.html', context), '');
  assert.ok(mm.c.has(JSON.stringify(['tenant-a\u0000/product.json', built.hash])));
  assert.deepEqual(calls.slice(0, 2), [
    ['cacheKey', '/product.json', context],
    ['get', '/product.json', context]
  ]);
  assert.deepEqual(
    calls.filter(call => call[0] === 'url').map(call => call[1]),
    ['@s/a.tss', '@s/b.tss', '@s/a.tss', '@s/b.tss', '@h/a.html']
  );
  assert.deepEqual(
    calls.filter(call => call[0] === 'allow').map(call => call[1]),
    [
      'https://assets.example/@s/a.tss',
      'https://assets.example/@s/b.tss',
      'https://assets.example/@s/a.tss',
      'https://assets.example/@s/b.tss',
      'https://assets.example/@h/a.html'
    ]
  );
});
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

test('optional acquisition failure falls through but optional received-invalid text stays loud', async () => {
  reset();
  mm.requestModel = {
    cacheKey: (url) => url,
    get: (url) => ({
      text: async () => {
        if (url === '/missing.json') throw new Error('HTTP 503');
        return '{';
      }
    }),
    url: (url) => url,
    allow: async () => true
  };

  const missing = {};
  assert.equal(await mm.prepare([
    { url: '/missing.json', hash: 'sha256-' + '1'.repeat(64), mode: 'optional' }
  ], missing), undefined);
  assert.equal(await mm.get('html', '@h/a.html', missing), undefined);

  await assert.rejects(
    () => mm.prepare([
      { url: '/bad.json', hash: 'sha256-' + '2'.repeat(64), mode: 'optional' }
    ], {}),
    /Manifest JSON invalid/
  );
});

test('required namespace misses await policy while optional misses delegate untouched', async () => {
  reset();
  const built = await pack([
    { type: 'tss', request: '@s/a.tss', value: [] }
  ]);
  const calls = [];
  mm.requestModel = {
    cacheKey: (url) => url,
    get: () => ({ text: async () => JSON.stringify(built.manifest) }),
    url: (url, ctx) => {
      calls.push(['url', url, ctx]);
      return 'resolved:' + url;
    },
    allow: async (url, ctx) => {
      calls.push(['allow', url, ctx]);
      return true;
    }
  };

  const required = {};
  await mm.prepare([
    { url: '/required.json', hash: built.hash, mode: 'required' }
  ], required);
  calls.length = 0;
  await assert.rejects(
    () => mm.get('tss', ['@s/a.tss', '@s/missing.tss'], required),
    /Manifest asset missing tss @s\/missing[.]tss/
  );
  assert.deepEqual(calls.map(call => call.slice(0, 2)), [
    ['url', '@s/a.tss'],
    ['allow', 'resolved:@s/a.tss'],
    ['url', '@s/missing.tss'],
    ['allow', 'resolved:@s/missing.tss']
  ]);

  const optional = {};
  await mm.prepare([
    { url: '/optional.json', hash: built.hash, mode: 'optional' }
  ], optional);
  calls.length = 0;
  assert.equal(
    await mm.get('tss', ['@s/a.tss', '@s/missing.tss'], optional),
    undefined
  );
  assert.deepEqual(calls, []);
});

test('schema rejects unauthenticated unknown top-level metadata', async () => {
  reset();
  const built = await pack([
    { type: 'html', request: '@h/a.html', value: '<a></a>' }
  ]);
  built.manifest.untrusted = true;
  mm.requestModel = {
    cacheKey: (url) => url,
    get: () => ({ text: async () => JSON.stringify(built.manifest) }),
    url: (url) => url,
    allow: async () => true
  };

  await assert.rejects(
    () => mm.prepare([
      { url: '/unknown.json', hash: built.hash, mode: 'required' }
    ], {}),
    /Manifest schema invalid/
  );
});

test('declared, expected, payload, and per-value hashes must all agree', async () => {
  reset();
  const built = await pack([
    { type: 'html', request: '@h/a.html', value: 'A' }
  ]);
  const stale = JSON.parse(JSON.stringify(built.manifest));
  const tampered = JSON.parse(JSON.stringify(built.manifest));
  const valueTampered = JSON.parse(JSON.stringify(built.manifest));
  tampered.assets[0].value = 'B';
  valueTampered.assets[0].value = 'B';
  const valueHash = await rehash(valueTampered);
  const documents = new Map([
    ['/stale.json', stale],
    ['/tampered.json', tampered],
    ['/value-tampered.json', valueTampered]
  ]);
  mm.requestModel = {
    cacheKey: url => url,
    get: url => ({ text: async () => JSON.stringify(documents.get(url)) }),
    url: url => url,
    allow: async () => true
  };

  await assert.rejects(
    () => mm.prepare([{
      url: '/stale.json', hash: 'sha256-' + 'f'.repeat(64), mode: 'required'
    }], {}),
    /Manifest hash mismatch/
  );
  await assert.rejects(
    () => mm.prepare([{
      url: '/tampered.json', hash: built.hash, mode: 'required'
    }], {}),
    /Manifest hash mismatch/
  );
  await assert.rejects(
    () => mm.prepare([{
      url: '/value-tampered.json', hash: valueHash, mode: 'required'
    }], {}),
    /Manifest value hash mismatch/
  );
});

test('schema rejects invalid authenticated nested metadata', async () => {
  reset();
  const cases = [
    manifest => { manifest.config.roots[0].t = {}; },
    manifest => { manifest.config.mediatargets = [1]; },
    manifest => {
      manifest.config.uis = [{
        id: 'schema',
        alias: '@s',
        framework: 'schema',
        mapperAlias: { p: 1 }
      }];
    },
    manifest => {
      manifest.config.dynamicAllow = [{
        from: '/a.tss',
        at: '/0',
        param: 'd',
        type: 'data',
        binding: [1],
        implicit: false
      }];
    },
    manifest => { manifest.config.toolchain.invalid = {}; },
    manifest => { manifest.config.limits = { assets: 'many' }; }
  ];
  const manifests = new Map();

  for (let i = 0; i < cases.length; i++) {
    const built = await pack([
      { type: 'html', request: '@h/a.html', value: 'A' }
    ]);
    cases[i](built.manifest);
    built.hash = await rehash(built.manifest);
    manifests.set('/invalid-' + i + '.json', built);
  }

  mm.requestModel = {
    cacheKey: (url) => url,
    get: (url) => ({
      text: async () => JSON.stringify(manifests.get(url).manifest)
    }),
    url: (url) => url,
    allow: async () => true
  };

  for (let i = 0; i < cases.length; i++)
    await assert.rejects(
      () => mm.prepare([{
        url: '/invalid-' + i + '.json',
        hash: manifests.get('/invalid-' + i + '.json').hash,
        mode: 'required'
      }], {}),
      /Manifest schema invalid/
    )
  ;
});

test('metadata limits include authenticated config collections', async () => {
  reset();
  mm.maxMetadata = 3;
  const built = await pack([]);
  built.manifest.config.namespaces.push('@x/');
  built.hash = await rehash(built.manifest);
  mm.requestModel = {
    cacheKey: (url) => url,
    get: () => ({ text: async () => JSON.stringify(built.manifest) }),
    url: (url) => url,
    allow: async () => true
  };

  await assert.rejects(
    () => mm.prepare([{
      url: '/metadata.json',
      hash: built.hash,
      mode: 'required'
    }], {}),
    /Manifest metadata limit/
  );
});

test('runtime defaults admit exact descriptor, text, structure, and LRU boundaries', async () => {
  reset();
  const hash = 'sha256-' + '0'.repeat(64);
  const descriptor = i => ({
    url: '/pack-' + i + '.json',
    hash,
    mode: 'required'
  });

  assert.equal(mm.descriptors(Array.from({ length: 32 }, (_, i) => descriptor(i))).length, 32);
  assert.throws(
    () => mm.descriptors(Array.from({ length: 33 }, (_, i) => descriptor(i))),
    /Manifest descriptors invalid/
  );

  mm.requestModel = {
    cacheKey: url => url,
    get: url => ({
      text: async () => ' '.repeat(mm.maxText + (url === '/plus.json' ? 1 : 0))
    })
  };
  await assert.rejects(() => mm.load(descriptor('exact'), {}), /Manifest JSON invalid/);
  await assert.rejects(
    () => mm.load({ ...descriptor('plus'), url: '/plus.json' }, {}),
    /Manifest text invalid/
  );

  assert.equal(
    mm.walk(new Array(mm.maxValues - 1).fill(null), 0, { v: 0 }),
    mm.maxValues
  );
  assert.throws(
    () => mm.walk(new Array(mm.maxValues).fill(null), 0, { v: 0 }),
    /Manifest structure limit/
  );
  let nested = null;
  for (let i = 0; i < mm.maxDepth; i++) nested = [nested];
  assert.equal(mm.walk(nested, 0, { v: 0 }), mm.maxDepth + 1);
  assert.throws(() => mm.walk([nested], 0, { v: 0 }), /Manifest structure limit/);

  mm.c = new Map();
  mm.requestModel = {
    cacheKey: url => url,
    get: () => ({ text: () => new Promise(() => {}) })
  };
  for (let i = 0; i <= mm.max; i++) mm.load(descriptor(i), {});
  assert.equal(mm.c.size, mm.max);
  assert.equal(mm.c.has(mm.cacheKey(descriptor(0), {})), false);
  assert.equal(mm.c.has(mm.cacheKey(descriptor(mm.max), {})), true);
});

test('runtime defaults admit exact asset and metadata counts before rejecting limit plus one', async () => {
  reset();
  const assets = await pack([]);
  assets.manifest.assets = new Array(mm.maxAssets).fill(null);
  assets.hash = await rehash(assets.manifest);
  await assert.rejects(
    () => mm.pack(assets.manifest, assets.hash),
    /Manifest asset invalid/
  );
  assets.manifest.assets.push(null);
  assets.hash = await rehash(assets.manifest);
  await assert.rejects(
    () => mm.pack(assets.manifest, assets.hash),
    /Manifest metadata limit/
  );

  const metadata = await pack([]);
  const fixed = mm.metadata(metadata.manifest)
    - metadata.manifest.config.namespaces.length;
  metadata.manifest.config.namespaces = new Array(mm.maxMetadata - fixed).fill(null);
  metadata.hash = await rehash(metadata.manifest);
  await assert.rejects(
    () => mm.pack(metadata.manifest, metadata.hash),
    /Manifest namespace invalid/
  );
  metadata.manifest.config.namespaces.push(null);
  metadata.hash = await rehash(metadata.manifest);
  await assert.rejects(
    () => mm.pack(metadata.manifest, metadata.hash),
    /Manifest metadata limit/
  );
});

test('an invalid later prepare cannot supersede valid in-flight work', async () => {
  reset();
  const built = await pack([
    { type: 'html', request: '@h/a.html', value: 'A' }
  ]);
  const wait = deferred();
  const root = {};
  mm.requestModel = {
    cacheKey: (url) => url,
    get: () => ({ text: async () => wait.promise }),
    url: (url) => url,
    allow: async () => true
  };

  const first = mm.prepare([
    { url: '/a.json', hash: built.hash, mode: 'required' }
  ], root);
  await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(
    () => mm.prepare([{ url: '', hash: built.hash, mode: 'required' }], root),
    /Manifest descriptor invalid/
  );
  wait.resolve(JSON.stringify(built.manifest));
  await first;
  assert.equal(await mm.get('html', '@h/a.html', root), 'A');
});

test('a valid later prepare supersedes older work regardless of settlement order', async () => {
  reset();
  const a = await pack([
    { type: 'html', request: '@h/a.html', value: 'A' }
  ]);
  const b = await pack([
    { type: 'html', request: '@h/b.html', value: 'B' }
  ]);
  const waits = { '/a.json': deferred(), '/b.json': deferred() };
  const root = {};
  mm.requestModel = {
    cacheKey: (url) => url,
    get: (url) => ({ text: async () => waits[url].promise }),
    url: (url) => url,
    allow: async () => true
  };

  const first = mm.prepare([
    { url: '/a.json', hash: a.hash, mode: 'required' }
  ], root);
  await new Promise(resolve => setImmediate(resolve));
  const second = mm.prepare([
    { url: '/b.json', hash: b.hash, mode: 'required' }
  ], root);
  await new Promise(resolve => setImmediate(resolve));

  waits['/b.json'].resolve(JSON.stringify(b.manifest));
  await second;
  waits['/a.json'].resolve(JSON.stringify(a.manifest));
  await assert.rejects(first, /Manifest prepare superseded/);
  assert.equal(await mm.get('html', '@h/b.html', root), 'B');
  await assert.rejects(
    () => mm.get('html', '@h/a.html', root),
    /Manifest asset missing html @h\/a[.]html/
  );
});

test('serializer hashes exact UTF-8 without Unicode normalization across native adapters', async () => {
  reset();
  const vectors = [
    'ASCII',
    '\u00e9',
    'e\u0301',
    '\ud83d\ude00\u0000\u2028\u2029',
    '\ud800'
  ];
  const hashes = [];

  for (const value of vectors) {
    const payload = { z: value, a: 'kept-after-z' };
    const expected = new TextEncoder().encode(mm.serialize(payload));
    let seen;
    mm.digest = async bytes => {
      seen = bytes.slice();
      return nativeDigest(bytes);
    };
    const nodeHash = await mm.hash(payload);
    hashes.push(nodeHash);
    assert.deepEqual(seen, expected);

    mm.digest = async bytes => new Uint8Array(
      await webcrypto.subtle.digest('SHA-256', bytes)
    );
    assert.equal(await mm.hash(payload), nodeHash);
  }

  assert.notEqual(hashes[1], hashes[2]);
});

test('identical concurrent prepares deduplicate and snapshot caller descriptors', async () => {
  reset();
  const built = await pack([
    { type: 'html', request: '@h/a.html', value: 'A' }
  ]);
  const wait = deferred();
  const root = {};
  const context = { p: root };
  const descriptors = [{
    url: '/a.json',
    hash: built.hash,
    mode: 'required'
  }];
  let calls = 0;
  mm.requestModel = {
    cacheKey: (url) => url,
    get: () => {
      calls++;
      return { text: async () => wait.promise };
    },
    url: (url) => url,
    allow: async () => true
  };

  const first = mm.prepare(descriptors, context);
  descriptors[0].url = '/mutated.json';
  descriptors.push({
    url: '/extra.json',
    hash: built.hash,
    mode: 'required'
  });
  const second = mm.prepare([{
    url: '/a.json',
    hash: built.hash,
    mode: 'required'
  }], context);
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(calls, 1);
  assert.equal(context.manifest, undefined);
  assert.ok(root.manifest);
  wait.resolve(JSON.stringify(built.manifest));
  await Promise.all([first, second]);
  assert.equal(await mm.get('html', '@h/a.html', context), 'A');
});

test('failed conflicting multi-pack prepare retains the prior index and rejects duplicates', async () => {
  reset();
  const prior = await pack([
    { type: 'html', request: '@h/a.html', value: 'A' }
  ]);
  const left = await pack([
    { type: 'html', request: '@h/b.html', value: 'B' }
  ]);
  const right = await pack([
    { type: 'html', request: '@h/b.html', value: 'C' }
  ]);
  const documents = new Map([
    ['/prior.json', prior],
    ['/left.json', left],
    ['/right.json', right]
  ]);
  const root = {};
  mm.requestModel = {
    cacheKey: (url) => url,
    get: (url) => ({
      text: async () => JSON.stringify(documents.get(url).manifest)
    }),
    url: (url) => url,
    allow: async () => true
  };

  await mm.prepare([
    { url: '/prior.json', hash: prior.hash, mode: 'required' }
  ], root);
  await assert.rejects(
    () => mm.prepare([
      { url: '/left.json', hash: left.hash, mode: 'required' },
      { url: '/right.json', hash: right.hash, mode: 'required' }
    ], root),
    /Manifest asset conflict/
  );
  assert.equal(await mm.get('html', '@h/a.html', root), 'A');
  await assert.rejects(
    () => mm.get('html', '@h/b.html', root),
    /Manifest asset missing html @h\/b[.]html/
  );

  const duplicate = await pack([
    { type: 'html', request: '@h/d.html', value: 'D' }
  ]);
  duplicate.manifest.assets.push({ ...duplicate.manifest.assets[0] });
  duplicate.hash = await rehash(duplicate.manifest);
  documents.set('/duplicate.json', duplicate);
  const empty = {};
  await assert.rejects(
    () => mm.prepare([
      { url: '/duplicate.json', hash: duplicate.hash, mode: 'required' }
    ], empty),
    /Manifest asset duplicate html @h\/d[.]html/
  );
  assert.equal(empty.manifest.index, undefined);
});

test('packed falsy and prototype-like identities remain Map hits behind URL policy', async () => {
  reset();
  const built = await pack([
    { type: 'data', request: '__proto__', value: null },
    { type: 'data', request: 'constructor', value: false },
    { type: 'html', request: 'toString', value: '' },
    { type: 'html', request: '/a.html,/b.html', value: 'AB' },
    { type: 'tss', request: '@s/empty.tss', value: [] },
    { type: 'html', request: '@h/blocked.html', value: 'blocked' }
  ]);
  const calls = [];
  mm.requestModel = {
    cacheKey: (url) => url,
    get: () => ({ text: async () => JSON.stringify(built.manifest) }),
    url: (url) => {
      calls.push(['url', url]);
      return 'resolved:' + url;
    },
    allow: async (url) => {
      calls.push(['allow', url]);
      return url !== 'resolved:@h/blocked.html';
    }
  };
  const root = {};
  await mm.prepare([
    { url: '/prototype.json', hash: built.hash, mode: 'required' }
  ], root);

  assert.equal(await mm.get('data', '__proto__', root), null);
  assert.equal(await mm.get('data', 'constructor', root), false);
  assert.equal(await mm.get('html', 'toString', root), '');
  assert.equal(await mm.get('html', ['/a.html', '/b.html'], root), 'AB');
  const scalar = await mm.get('tss', '@s/empty.tss', root);
  assert.strictEqual(await mm.get('tss', '@s/empty.tss', root), scalar);
  assert.deepEqual(scalar, []);
  await assert.rejects(
    () => mm.get('html', '@h/blocked.html', root),
    /URL blocked resolved:@h\/blocked[.]html/
  );
  assert.equal(Object.prototype.polluted, undefined);
  assert.deepEqual(calls.slice(-2), [
    ['url', '@h/blocked.html'],
    ['allow', 'resolved:@h/blocked.html']
  ]);
});

test('lazy TSS mutation cannot create a false multi-pack conflict', async () => {
  reset();
  const node = { s: 'a', m: false, p: { color: 'red' }, c: [] };
  const left = await pack([
    { type: 'tss', request: '@s/a.tss', value: [node] }
  ]);
  const right = await pack([
    {
      type: 'tss',
      request: '@s/a.tss',
      value: [{ s: 'a', m: false, p: { color: 'red' }, c: [] }]
    }
  ]);
  const documents = new Map([
    ['/left.json', left],
    ['/right.json', right]
  ]);
  mm.requestModel = {
    cacheKey: (url) => url,
    get: (url) => ({
      text: async () => JSON.stringify(documents.get(url).manifest)
    }),
    url: (url) => url,
    allow: async () => true
  };
  const root = {};

  await mm.prepare([
    { url: '/left.json', hash: left.hash, mode: 'required' }
  ], root);
  const cached = await mm.get('tss', '@s/a.tss', root);
  cached[0].b = { k: 'lazy', r: [], p: null, x: {} };
  await mm.prepare([
    { url: '/left.json', hash: left.hash, mode: 'required' },
    { url: '/right.json', hash: right.hash, mode: 'required' }
  ], root);

  assert.strictEqual(await mm.get('tss', '@s/a.tss', root), cached);
  assert.equal(cached[0].b.k, 'lazy');
});

test('pack promise LRU evicts by recency and rejected acquisition retries', async () => {
  reset();
  mm.max = 2;
  const documents = new Map();
  const calls = new Map();

  for (const name of ['a', 'b', 'c']) {
    const built = await pack([
      { type: 'html', request: '@h/' + name + '.html', value: name }
    ]);
    documents.set('/' + name + '.json', built);
  }

  mm.requestModel = {
    cacheKey: (url) => url,
    get: (url) => ({
      text: async () => {
        calls.set(url, (calls.get(url) || 0) + 1);
        return JSON.stringify(documents.get(url).manifest);
      }
    }),
    url: (url) => url,
    allow: async () => true
  };
  const prepare = async name => mm.prepare([{
    url: '/' + name + '.json',
    hash: documents.get('/' + name + '.json').hash,
    mode: 'required'
  }], {});

  await prepare('a');
  await prepare('b');
  await prepare('a');
  await prepare('c');
  await prepare('b');
  assert.equal(calls.get('/a.json'), 1);
  assert.equal(calls.get('/b.json'), 2);
  assert.equal(calls.get('/c.json'), 1);
  assert.equal(mm.c.size, 2);

  reset();
  const retry = await pack([
    { type: 'html', request: '@h/retry.html', value: 'retry' }
  ]);
  let attempts = 0;
  mm.requestModel = {
    cacheKey: (url) => url,
    get: () => ({
      text: async () => {
        attempts++;
        if (attempts === 1) throw new Error('HTTP 503');
        return JSON.stringify(retry.manifest);
      }
    }),
    url: (url) => url,
    allow: async () => true
  };
  const descriptor = [{
    url: '/retry.json',
    hash: retry.hash,
    mode: 'required'
  }];
  await assert.rejects(() => mm.prepare(descriptor, {}), /HTTP 503/);
  assert.equal(mm.c.size, 0);
  const root = {};
  await mm.prepare(descriptor, root);
  assert.equal(attempts, 2);
  assert.equal(await mm.get('html', '@h/retry.html', root), 'retry');
});
