'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  jTormUiManifestCompiler: compiler
} = require('../../tooling/ui-manifest-compiler/src/ui-manifest-compiler.js');
const {
  jTormUiManifestModel: manifest
} = require('../../src/models/ui-manifest-model/src/ui-manifest-model.js');
const manifestPackage = require('../../src/models/ui-manifest-model/package.json');
const {
  jTormUiResolverModel: resolver
} = require('../../src/models/ui-resolver-model/src/ui-resolver-model.js');
const {
  jTormTSSParser: tssParser
} = require('../../src/parsers/tss-parser/src/tss-parser.js');
const {
  jTormDataParser: dataParser
} = require('../../src/parsers/data-parser/src/data-parser.js');

const digest = async (bytes) => new Uint8Array(
  createHash('sha256').update(bytes).digest()
);

const UI = {
  id: 'test/schema-ui',
  alias: '@s',
  framework: 'schema',
  mapperAlias: { r: 'Root' },
  mapper: {
    Root: {
      default: {
        h: '/root.html',
        t: ['/root.tss'],
        d: ['/root.json'],
        ui: { c: 'Base.default', t: 0, h: 1 }
      }
    },
    Base: {
      default: {
        h: '/base.html',
        t: ['/suppressed.tss']
      }
    },
    Child: {
      default: {
        h: '/child.html',
        t: ['/child.tss']
      },
      defaultDesktop: {
        h: '/desktop.html',
        t: ['/desktop.tss']
      }
    },
    Unused: {
      default: {
        t: ['/unused.tss']
      }
    }
  }
};

const TEXT = {
  '/root.html': '<main></main>',
  '/base.html': '<base>',
  '/child.html': '<child>',
  '/desktop.html': '<desktop>',
  '/root.json': '{"ok":true}',
  '/root.tss': "->ui { c: 'Child.default'; } ->get { t: '/literal.tss'; } ->get { d: @id; }",
  '/bindings.tss': "->ui { c: 'Child.' + 'default'; } ->ui { c: 'Child.' + kind; } ->get {}",
  '/child.tss': 'child { color: blue; }',
  '/desktop.tss': 'desktop { color: green; }',
  '/literal.tss': 'literal { color: red; }',
  '/suppressed.tss': 'suppressed { color: black; }',
  '/unused.tss': 'unused { color: black; }'
};

function deferred() {
  let resolve;
  const promise = new Promise(yes => { resolve = yes; });
  return { promise, resolve };
}

function config(rawSuffix = '') {
  return {
    id: 'root',
    roots: [{ c: '@r.default', f: 'self', t: 1, h: 1, m: 0 }],
    resolver,
    tssParser,
    dataParser,
    methods: {
      get: { params: ['h', 't', 'd', 'a'] },
      ui: { params: ['f', 'c', 't', 'h', 'm'] }
    },
    uis: [UI],
    source: {
      version: 'memory-v1',
      read: async ({ type, request }) => {
        assert.ok(['data', 'html', 'tss'].includes(type));
        if (!(request in TEXT)) throw new Error('missing ' + type + ' ' + request);
        return {
          id: request,
          raw: Buffer.from(TEXT[request] + rawSuffix),
          text: TEXT[request]
        };
      }
    },
    namespaces: ['/'],
    dynamicAllow: [{
      from: '/root.tss',
      at: '/2',
      param: 'd',
      type: 'data',
      binding: '@id',
      implicit: false
    }],
    toolchain: {
      resolver: '1.0.0',
      dataParser: '1.0.3',
      tssParser: '1.0.0'
    }
  };
}

function wire() {
  manifest.c = new Map();
  manifest.digest = digest;
  compiler.manifest = manifest;
  resolver.default = 'default';
  resolver.framework = 'schema';
  resolver.ui = { mapper: null };
  resolver.uis = [UI];
  tssParser.config({});
  dataParser.tssParser = tssParser;
  dataParser.init();
}

function buildState(c) {
  return {
    c,
    assets: new Map(),
    assetStack: [],
    dynamic: [],
    mapper: new Map(),
    sources: new Map(),
    graph: new Map(),
    edges: 0
  };
}

test('compiler follows literal descriptor/TSS edges and records exact dynamic diagnostics', async () => {
  wire();
  const cache = { sentinel: 1 };
  const tree = [{ sentinel: 1 }];
  resolver.cache = cache;
  tssParser.tree = tree;

  const result = await compiler.compile(config());

  assert.deepEqual(
    result.manifest.assets.map(asset => [asset.type, asset.request]),
    [
      ['data', '/root.json'],
      ['html', '/base.html'],
      ['html', '/child.html'],
      ['html', '/root.html'],
      ['tss', '/child.tss'],
      ['tss', '/literal.tss'],
      ['tss', '/root.tss']
    ]
  );
  assert.equal(result.manifest.assets.some(asset => asset.request === '/suppressed.tss'), false);
  assert.deepEqual(result.manifest.dynamic, config().dynamicAllow);
  assert.strictEqual(resolver.cache, cache);
  assert.strictEqual(tssParser.tree, tree);
});

test('compiler output is deterministic and fingerprints raw reachable sources only', async () => {
  wire();
  const first = await compiler.compile(config());
  const second = await compiler.compile(config());
  const rawChanged = await compiler.compile(config('\n'));
  const unused = UI.mapper.Unused.default.t[0];

  UI.mapper.Unused.default.t[0] = '/unused-v2.tss';
  const unreachableChanged = await compiler.compile(config());
  UI.mapper.Unused.default.t[0] = unused;
  UI.url = 'https://unused.example/';
  const urlChanged = await compiler.compile(config());
  delete UI.url;
  UI.mapper.Root.default.marker = 'reachable-v2';
  const reachableChanged = await compiler.compile(config());
  delete UI.mapper.Root.default.marker;

  assert.equal(second.json, first.json);
  assert.equal(second.hash, first.hash);
  assert.equal(manifest.version, '1.0.0');
  assert.notEqual(manifestPackage.version, manifest.version);
  assert.equal(first.manifest.config.toolchain.manifestModel, manifest.version);
  assert.notEqual(rawChanged.hash, first.hash);
  assert.equal(unreachableChanged.hash, first.hash);
  assert.equal(urlChanged.hash, first.hash);
  assert.notEqual(reachableChanged.hash, first.hash);
  assert.equal(resultFilename(first), 'root.' + first.hash + '.json');
});

test('compiler fingerprints the injected manifest-format owner version', async () => {
  wire();
  const version = manifest.version;
  manifest.version = '9.9.9';

  try {
    const result = await compiler.compile(config());
    assert.equal(result.manifest.config.toolchain.manifestModel, '9.9.9');
  } finally {
    if (version === undefined) delete manifest.version;
    else manifest.version = version;
  }
});

test('component edge limits count repeated references to an already visited vertex', async () => {
  wire();
  const descriptor = UI.mapper.Root.default;
  UI.mapper.Root.default = { t: ['/repeated-edge.tss'] };
  TEXT['/repeated-edge.tss'] =
    "->ui { c: 'Child.default'; } ->ui { c: 'Child.default'; }";

  try {
    const cfg = config();
    cfg.dynamicAllow = [];
    cfg.limits = { edges: 2 };
    await assert.rejects(
      () => compiler.compile(cfg),
      /Manifest compiler edge limit/
    );
  } finally {
    UI.mapper.Root.default = descriptor;
    delete TEXT['/repeated-edge.tss'];
  }
});

test('compiler default graph limits admit exact roots, vertices, edges, and depth', async () => {
  wire();
  const root = { c: 'Child.default', f: 'schema', t: 0, h: 0, m: 0 };
  const exact = config();
  exact.roots = new Array(compiler.defaults.roots).fill(root);
  exact.dynamicAllow = [];
  assert.equal(compiler.config(exact).roots.length, compiler.defaults.roots);
  const plus = { ...exact, roots: exact.roots.concat(root) };
  assert.throws(() => compiler.config(plus), /Manifest compiler root limit/);

  const c = compiler.config({ ...config(), roots: [root], dynamicAllow: [] });
  await c.resolver.init();
  const vertices = buildState(c);
  for (let i = 0; i < c.limits.vertices - 1; i++) vertices.graph.set('v' + i, 2);
  await compiler.component(root, vertices, []);
  assert.equal(vertices.graph.size, c.limits.vertices);
  const vertexPlus = buildState(c);
  for (let i = 0; i < c.limits.vertices; i++) vertexPlus.graph.set('v' + i, 2);
  await assert.rejects(
    () => compiler.component(root, vertexPlus, []),
    /Manifest compiler vertex limit/
  );

  const key = JSON.stringify(['Child.default', 'schema', 0, 0, 0]);
  const edges = buildState(c);
  edges.graph.set(key, 2);
  edges.edges = c.limits.edges - 1;
  await compiler.component(root, edges, []);
  assert.equal(edges.edges, c.limits.edges);
  await assert.rejects(
    () => compiler.component(root, edges, []),
    /Manifest compiler edge limit/
  );

  const depth = buildState(c);
  depth.graph.set(key, 2);
  await compiler.component(root, depth, new Array(c.limits.graphDepth - 1).fill('ancestor'));
  await assert.rejects(
    () => compiler.component(root, depth, new Array(c.limits.graphDepth).fill('ancestor')),
    /Manifest compiler graph depth/
  );
});

test('compiler default asset, dynamic, source, and value limits admit exact boundaries', async () => {
  wire();
  const c = compiler.config({ ...config(), roots: [], dynamicAllow: [] });

  const assets = buildState({
    ...c,
    source: {
      version: 'limit-v1',
      read: async () => ({ id: '/exact.html', raw: Buffer.from('x'), text: 'x' })
    }
  });
  for (let i = 0; i < c.limits.assets - 1; i++) assets.assets.set('a' + i, null);
  await compiler.asset('html', '/exact.html', assets, []);
  assert.equal(assets.assets.size, c.limits.assets);
  let reads = 0;
  const assetPlus = buildState({
    ...c,
    source: {
      version: 'limit-v1',
      read: async () => {
        reads++;
        return { id: '/plus.html', raw: Buffer.from('x'), text: 'x' };
      }
    }
  });
  for (let i = 0; i < c.limits.assets; i++) assetPlus.assets.set('a' + i, null);
  await assert.rejects(
    () => compiler.asset('html', '/plus.html', assetPlus, []),
    /Manifest compiler asset limit/
  );
  assert.equal(reads, 0);

  const dynamic = buildState(c);
  dynamic.dynamic = new Array(c.limits.dynamic - 1).fill(null);
  compiler.addDynamic('/a.tss', '/0', 'd', 'data', '@id', false, dynamic);
  assert.equal(dynamic.dynamic.length, c.limits.dynamic);
  assert.throws(
    () => compiler.addDynamic('/a.tss', '/1', 'd', 'data', '@id', false, dynamic),
    /Manifest compiler dynamic limit/
  );
  const allowed = config();
  allowed.roots = [];
  allowed.dynamicAllow = new Array(c.limits.dynamic).fill({
    from: '/a.tss',
    at: '/0',
    param: 'd',
    type: 'data',
    binding: '@id',
    implicit: false
  });
  assert.equal(compiler.config(allowed).dynamicAllow.length, c.limits.dynamic);
  assert.throws(
    () => compiler.config({
      ...allowed,
      dynamicAllow: allowed.dynamicAllow.concat(allowed.dynamicAllow[0])
    }),
    /Manifest compiler dynamic limit/
  );

  const source = async (raw, text, request) => {
    const x = buildState({
      ...c,
      source: { version: 'limit-v1', read: async () => ({ id: request, raw, text }) }
    });
    return compiler.asset('html', request, x, []);
  };
  await source(Buffer.alloc(c.limits.rawBytes), '', '/raw-exact.html');
  await assert.rejects(
    () => source(Buffer.alloc(c.limits.rawBytes + 1), '', '/raw-plus.html'),
    /Manifest source limit/
  );
  await source(Buffer.alloc(0), 'x'.repeat(c.limits.text), '/text-exact.html');
  await assert.rejects(
    () => source(Buffer.alloc(0), 'x'.repeat(c.limits.text + 1), '/text-plus.html'),
    /Manifest source limit/
  );

  assert.equal(
    compiler.measure(new Array(c.limits.values - 1).fill(null), c.limits, 0, { v: 0 }),
    undefined
  );
  assert.throws(
    () => compiler.measure(new Array(c.limits.values).fill(null), c.limits, 0, { v: 0 }),
    /Manifest compiler value limit/
  );
  let nested = null;
  for (let i = 0; i < c.limits.valueDepth; i++) nested = [nested];
  compiler.measure(nested, c.limits, 0, { v: 0 });
  assert.throws(
    () => compiler.measure([nested], c.limits, 0, { v: 0 }),
    /Manifest compiler value limit/
  );
});

test('compiler default output limit admits exact text and rejects one extra code unit', async () => {
  wire();
  const owner = compiler.manifest;
  const hash = 'sha256-' + '0'.repeat(64);
  let size = compiler.defaults.output;

  try {
    compiler.manifest = {
      version: '1.0.0',
      serialize: () => 'x'.repeat(size),
      hash: async () => hash,
      hashBytes: async () => hash,
      pack: async () => ({ assets: new Map(), namespaces: [] })
    };
    const c = compiler.config({ ...config(), roots: [], dynamicAllow: [] });
    assert.equal((await compiler.build(c)).json.length, c.limits.output);
    size++;
    await assert.rejects(() => compiler.build(c), /Manifest compiler output limit/);
  } finally {
    compiler.manifest = owner;
  }
});

test('compiler output is accepted by the paired runtime metadata boundary', async () => {
  wire();
  const base = compiler.config({
    ...config(),
    roots: [],
    namespaces: [],
    dynamicAllow: []
  });
  const minimal = await compiler.build(base);
  const fixed = manifest.metadata(minimal.manifest);
  const namespaces = Array.from(
    { length: manifest.maxMetadata - fixed },
    (_, i) => '/n' + i + '/'
  );
  const exact = await compiler.build({ ...base, namespaces });
  assert.equal(manifest.metadata(exact.manifest), manifest.maxMetadata);
  await assert.rejects(
    () => compiler.build({ ...base, namespaces: namespaces.concat('/plus/') }),
    /Manifest metadata limit/
  );
});

function resultFilename(result) {
  return result.filename;
}
test('compiler classifies mixed bindings recursively and fingerprints implicit leaf params', async () => {
  wire();
  const descriptor = UI.mapper.Root.default;
  UI.mapper.Root.default = { t: ['/bindings.tss'] };
  const expected = [
    {
      from: '/bindings.tss',
      at: '/1',
      param: 'c',
      type: 'component',
      binding: "'Child.' + kind",
      implicit: false
    },
    {
      from: '/bindings.tss',
      at: '/2',
      param: 'h',
      type: 'html',
      binding: 'h',
      implicit: true
    },
    {
      from: '/bindings.tss',
      at: '/2',
      param: 't',
      type: 'tss',
      binding: 't',
      implicit: true
    },
    {
      from: '/bindings.tss',
      at: '/2',
      param: 'd',
      type: 'data',
      binding: 'd',
      implicit: true
    }
  ].sort((a, b) => manifest.serialize(a).localeCompare(manifest.serialize(b)));

  try {
    const cfg = config();
    cfg.dynamicAllow = expected;
    const result = await compiler.compile(cfg);

    assert.deepEqual(result.manifest.dynamic, expected);
    assert.ok(result.manifest.assets.some(asset => asset.request === '/child.tss'));
    assert.ok(result.manifest.assets.some(asset => asset.request === '/child.html'));
  } finally {
    UI.mapper.Root.default = descriptor;
  }
});

test('dynamic policy rejects missing, unused, and duplicate declarations exactly', async () => {
  wire();
  const missing = config();
  missing.dynamicAllow = [];
  await assert.rejects(() => compiler.compile(missing), /Manifest dynamic policy missing/);

  const unused = config();
  unused.dynamicAllow = unused.dynamicAllow.concat({
    from: '/unused.tss',
    at: '/0',
    param: 'd',
    type: 'data',
    binding: '@id',
    implicit: false
  });
  await assert.rejects(() => compiler.compile(unused), /Manifest dynamic policy unused/);

  const duplicate = config();
  duplicate.dynamicAllow = duplicate.dynamicAllow.concat(duplicate.dynamicAllow[0]);
  await assert.rejects(() => compiler.compile(duplicate), /Manifest dynamic policy duplicate/);
});

test('compiler expands configured mediatarget variants without re-expanding them', async () => {
  wire();
  const cfg = config();
  cfg.roots = [{ c: 'Child.default', f: 'self', t: 1, h: 1, m: 1 }];
  cfg.mediatargets = ['Desktop'];
  cfg.dynamicAllow = [];

  const result = await compiler.compile(cfg);
  assert.deepEqual(
    result.manifest.assets.map(asset => asset.request),
    ['/child.html', '/desktop.html', '/child.tss', '/desktop.tss']
  );
});

test('compiler rejects overlap through a shared mutable collaborator and restores afterward', async () => {
  wire();
  const cfg = config();
  const read = cfg.source.read;
  const started = deferred();
  const release = deferred();
  let first = true;

  cfg.source.read = async (request) => {
    if (first) {
      first = false;
      started.resolve();
      await release.promise;
    }
    return read(request);
  };

  const compiling = compiler.compile(cfg);
  await started.promise;
  await assert.rejects(() => compiler.compile(config()), /collaborators busy/);
  release.resolve();
  await compiling;
  await compiler.compile(config());
});

test('compiler unlocks collaborators when restoration itself fails', async () => {
  wire();
  const cfg = config();
  const read = cfg.source.read;
  const key = Object.keys(tssParser.regexes)[0];
  const regex = tssParser.regexes[key];

  cfg.source.read = async (request) => {
    delete tssParser.regexes[key];
    return read(request);
  };

  try {
    await assert.rejects(() => compiler.compile(cfg));
    tssParser.regexes[key] = regex;
    await compiler.compile(config());
  } finally {
    tssParser.regexes[key] = regex;
    compiler.active.clear();
  }
});

test('compiler preserves parser error identity, positions, and singleton restoration', async () => {
  wire();
  const original = TEXT['/child.tss'];
  const parser = Object.create(tssParser);
  const tree = [{ sentinel: 1 }], pairs = [{ sentinel: 2 }], source = 'sentinel';
  let observed;
  parser.tree = tree;
  parser.pairs = pairs;
  parser.tss = source;
  parser.handle = function (value) {
    try {
      return tssParser.handle.call(this, value);
    } catch (error) {
      observed = error;
      throw error;
    }
  };
  const cfg = config();
  cfg.tssParser = parser;
  TEXT['/child.tss'] = 'child{';

  try {
    await assert.rejects(
      () => compiler.compile(cfg),
      error => {
        assert.strictEqual(error, observed);
        assert.deepEqual([error.line, error.column, error.offset], [1, 6, 5]);
        return true;
      }
    );
    assert.strictEqual(parser.tree, tree);
    assert.strictEqual(parser.pairs, pairs);
    assert.equal(parser.tss, source);
  } finally {
    TEXT['/child.tss'] = original;
    compiler.active.clear();
  }
});

test('writer atomically no-clobbers identical and conflicting concurrent output', async () => {
  wire();
  const result = await compiler.compile(config());
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'jtorm-manifest-'));

  try {
    const same = await Promise.all([
      compiler.write(result, dir),
      compiler.write(result, dir)
    ]);
    assert.deepEqual(same.map(value => value.created).sort(), [false, true]);
    assert.equal(await fs.readFile(path.join(dir, result.filename), 'utf8'), result.json);
    assert.deepEqual(
      (await fs.readdir(dir)).filter(name => name.endsWith('.tmp')),
      []
    );

    await fs.unlink(path.join(dir, result.filename));
    const conflicting = { ...result, json: result.json + ' ' };
    const race = await Promise.allSettled([
      compiler.write(result, dir),
      compiler.write(conflicting, dir)
    ]);
    assert.equal(race.filter(value => value.status === 'fulfilled').length, 1);
    assert.equal(race.filter(value => value.status === 'rejected').length, 1);
    assert.match(
      race.find(value => value.status === 'rejected').reason.message,
      /Manifest output conflict/
    );
    assert.ok(
      [result.json, conflicting.json].includes(
        await fs.readFile(path.join(dir, result.filename), 'utf8')
      )
    );
    assert.deepEqual(
      (await fs.readdir(dir)).filter(name => name.endsWith('.tmp')),
      []
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('compiler and writer reject path-bearing ids before output', async () => {
  wire();
  const cfg = config();
  cfg.id = '../escape';
  await assert.rejects(() => compiler.compile(cfg), /Manifest compiler config invalid/);

  const result = await compiler.compile(config());
  await assert.rejects(
    () => compiler.write({
      ...result,
      filename: '../escape.' + result.hash + '.json',
      manifest: { ...result.manifest, id: '../escape' }
    }, path.join(os.tmpdir(), 'jtorm-manifest-path-test')),
    /Manifest output invalid/
  );
});

test('compiler reports a component cycle reached through fetched TSS', async () => {
  wire();
  const descriptor = UI.mapper.Root.default;
  UI.mapper.Root.default = { t: ['/cycle.tss'] };
  TEXT['/cycle.tss'] = "->ui { c: 'Root.default'; }";

  try {
    const cfg = config();
    cfg.dynamicAllow = [];
    await assert.rejects(
      () => compiler.compile(cfg),
      error => {
        assert.match(error.message, /Manifest component cycle/);
        assert.match(error.message, /Root[.]default/);
        return true;
      }
    );
  } finally {
    UI.mapper.Root.default = descriptor;
    delete TEXT['/cycle.tss'];
  }
});

test('dynamic framework discovery includes package aliases sharing a framework', async () => {
  wire();
  const descriptor = UI.mapper.Root.default;
  const alt = {
    id: 'test/alt-ui',
    alias: '@alt',
    framework: 'schema',
    mapper: {
      AliasOnly: {
        default: { h: '/alias.html' }
      }
    }
  };
  UI.mapper.Root.default = { t: ['/dynamic-f.tss'] };
  TEXT['/dynamic-f.tss'] = "->ui { c: 'AliasOnly.default'; f: framework; }";
  TEXT['/alias.html'] = '<alias>';

  try {
    resolver.uis = [UI, alt];
    const cfg = config();
    cfg.uis = [UI, alt];
    cfg.dynamicAllow = [{
      from: '/dynamic-f.tss',
      at: '/0',
      param: 'f',
      type: 'component',
      binding: 'framework',
      implicit: false
    }];

    const result = await compiler.compile(cfg);
    assert.deepEqual(
      result.manifest.assets.map(asset => asset.request),
      ['/alias.html', '/dynamic-f.tss']
    );
  } finally {
    resolver.uis = [UI];
    UI.mapper.Root.default = descriptor;
    delete TEXT['/dynamic-f.tss'];
    delete TEXT['/alias.html'];
  }
});

test('compiler rejects config metadata that the runtime schema cannot consume', async () => {
  wire();
  const invalid = [
    cfg => { cfg.extraRoots = {}; },
    cfg => { cfg.mediatargets = [1]; },
    cfg => { cfg.uis = [{ ...UI, alias: 1 }]; },
    cfg => { cfg.namespaces = [1]; },
    cfg => { cfg.methods.get.params = ['h', 1]; },
    cfg => { cfg.toolchain.invalid = {}; },
    cfg => { cfg.toolchain.compiler = 'spoofed'; },
    cfg => { cfg.limits = { unknown: 1 }; }
  ];

  for (const mutate of invalid) {
    const cfg = config();
    mutate(cfg);
    await assert.rejects(
      () => compiler.compile(cfg),
      /Manifest compiler config invalid/
    );
  }
});

test('compiler omits scalar falsy get and empty component edges like runtime validation', async () => {
  wire();
  const descriptor = UI.mapper.Root.default;
  UI.mapper.Root.default = { t: ['/falsy.tss'] };
  TEXT['/falsy.tss'] =
    "->get { h: ''; } ->get { d: false; } ->ui { c: ''; t: true; }";

  try {
    const cfg = config();
    cfg.dynamicAllow = [];
    const result = await compiler.compile(cfg);
    assert.deepEqual(
      result.manifest.assets.map(asset => asset.request),
      ['/falsy.tss']
    );
  } finally {
    UI.mapper.Root.default = descriptor;
    delete TEXT['/falsy.tss'];
  }
});

test('compiler normalizes a parent target without children like runtime compilation', async () => {
  wire();
  const descriptor = UI.mapper.Root.default;
  const pT = { s: '.parent', m: 'get', p: { h: "'/parent.html'" } };
  UI.mapper.Root.default = { pT };
  TEXT['/parent.html'] = '<parent>';

  try {
    const cfg = config();
    cfg.dynamicAllow = [];
    const result = await compiler.compile(cfg);
    assert.deepEqual(
      result.manifest.assets.map(asset => asset.request),
      ['/parent.html']
    );
    assert.equal(Object.hasOwn(pT, 'c'), false);
  } finally {
    UI.mapper.Root.default = descriptor;
    delete TEXT['/parent.html'];
  }
});

test('compiler treats unquoted numeric UI flags as static literals', async () => {
  wire();
  const descriptor = UI.mapper.Root.default;
  UI.mapper.Root.default = { t: ['/numeric-flags.tss'] };
  TEXT['/numeric-flags.tss'] =
    "->ui { c: 'Child.default'; t: 0; h: 1; m: 0; }";

  try {
    const cfg = config();
    cfg.dynamicAllow = [];
    const result = await compiler.compile(cfg);
    assert.deepEqual(
      result.manifest.assets.map(asset => asset.request),
      ['/child.html', '/numeric-flags.tss']
    );
    assert.deepEqual(result.manifest.dynamic, []);
  } finally {
    UI.mapper.Root.default = descriptor;
    delete TEXT['/numeric-flags.tss'];
  }
});

test('descriptor arrays preserve TSS parts and runtime HTML/data request identities', async () => {
  wire();
  const descriptor = UI.mapper.Root.default;
  UI.mapper.Root.default = {
    h: [
      '/a.html',
      { url: '/b.html', di: { m: { if: { p: 'x' } } } }
    ],
    d: ['/a.json', '/b.json'],
    t: ['/a.tss', '/b.tss']
  };
  Object.assign(TEXT, {
    '/a.html': '<a>',
    '/b.html': '<b>',
    '/a.html,/b.html': '<a-b>',
    '/a.json': '{"a":true}',
    '/b.json': '{"b":true}',
    '/a.json,/b.json': '{"a":true,"b":true}',
    '/a.tss': 'a { color: red; }',
    '/b.tss': 'b { color: blue; }'
  });

  try {
    const cfg = config();
    cfg.dynamicAllow = [];
    const result = await compiler.compile(cfg);
    assert.deepEqual(
      result.manifest.assets.map(asset => [asset.type, asset.request]),
      [
        ['data', '/a.json,/b.json'],
        ['html', '/a.html'],
        ['html', '/a.html,/b.html'],
        ['tss', '/a.tss'],
        ['tss', '/b.tss']
      ]
    );
  } finally {
    UI.mapper.Root.default = descriptor;
    for (const request of [
      '/a.html', '/b.html', '/a.html,/b.html',
      '/a.json', '/b.json', '/a.json,/b.json',
      '/a.tss', '/b.tss'
    ])
      delete TEXT[request]
    ;
  }
});

test('behavior-bearing mapper alias insertion order invalidates the manifest', async () => {
  wire();
  const aliases = UI.mapperAlias;

  try {
    UI.mapperAlias = { r: 'Root', a: 'A', b: 'B' };
    resolver.uis = [UI];
    const first = await compiler.compile(config());

    UI.mapperAlias = { r: 'Root', b: 'B', a: 'A' };
    resolver.uis = [UI];
    const second = await compiler.compile(config());

    assert.notEqual(second.hash, first.hash);
  } finally {
    UI.mapperAlias = aliases;
    resolver.uis = [UI];
  }
});

test('CLI compiles exported config arrays sequentially and rejects invalid arguments', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'jtorm-manifest-cli-'));
  const modules = path.join(dir, 'node_modules');
  const scope = path.join(modules, '@jtorm');
  const out = path.join(dir, 'out');
  const configPath = path.resolve(
    __dirname, '../fixtures/ui-manifest-cli-config.js'
  );
  const bin = path.resolve(
    __dirname, '../../tooling/ui-manifest-compiler/bin/jtorm-ui-manifest.js'
  );
  const model = path.resolve(
    __dirname, '../../src/models/ui-manifest-model'
  );
  const env = { ...process.env, NODE_PATH: modules };

  try {
    await fs.mkdir(scope, { recursive: true });
    await fs.symlink(model, path.join(scope, 'ui-manifest-model'), 'dir');
    const stdout = execFileSync(process.execPath, [
      bin,
      '--config', configPath,
      '--out-dir', out
    ], { encoding: 'utf8', env });
    const names = stdout.trim().split('\n');

    assert.equal(names.length, 2);
    assert.match(names[0], /^cli-one[.]sha256-[0-9a-f]{64}[.]json$/);
    assert.match(names[1], /^cli-two[.]sha256-[0-9a-f]{64}[.]json$/);
    assert.deepEqual((await fs.readdir(out)).sort(), names.slice().sort());
    assert.deepEqual(
      await Promise.all(names.map(async name =>
        JSON.parse(await fs.readFile(path.join(out, name), 'utf8')).id
      )),
      ['cli-one', 'cli-two']
    );
    assert.throws(
      () => execFileSync(process.execPath, [
        bin,
        '--config', configPath
      ], { encoding: 'utf8', env, stdio: 'pipe' }),
      /Usage: jtorm-ui-manifest/
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('reachable mapper descriptors obey canonical value depth limits', async () => {
  wire();
  const descriptor = UI.mapper.Root.default;
  UI.mapper.Root.default = { h: '/root.html' };

  try {
    const within = config();
    within.dynamicAllow = [];
    within.limits = { valueDepth: 5 };
    await compiler.compile(within);

    UI.mapper.Root.default.marker = { a: { b: { c: {} } } };
    const beyond = config();
    const read = beyond.source.read;
    let reads = 0;
    beyond.source.read = async (request) => {
      reads++;
      return read(request);
    };
    beyond.dynamicAllow = [];
    beyond.limits = { valueDepth: 5 };
    await assert.rejects(
      () => compiler.compile(beyond),
      /Manifest compiler value limit/
    );
    assert.equal(reads, 0, 'invalid mapper data must fail before source I/O');
  } finally {
    UI.mapper.Root.default = descriptor;
  }
});
