# @jtorm/ui-manifest-compiler

Trusted build-time compiler for deterministic, content-addressed jTorm UI closure manifests.

It follows configured roots through the existing UI resolver and TSS/data parsers, includes every
guarded descriptor artifact without executing `di`, records model-bound edges as exact
`dynamicAllow` diagnostics, fingerprints raw sources and reachable mapper branches, and restores
all injected mutable collaborators after success or failure.

```sh
jtorm-ui-manifest --config ./ui-manifest.config.cjs --out-dir ./public/ui
```

The CommonJS config exports one compiler config or an array. It injects initialized
`resolver`, `tssParser`, `dataParser`, get/ui method metadata, UI packages, and a source
adapter whose `read({type, request})` returns `{id, raw, text}`.

```js
module.exports = {
  id: 'product',
  roots: [{c: 'Product.default', f: 'self', t: 1, h: 1, m: 0}],
  extraRoots: [],
  resolver,
  tssParser,
  dataParser,
  methods: {get: getMethod, ui: uiMethod},
  uis: resolver.uis,
  source: {
    version: 'application-ui-v1',
    read: async ({type, request}) => ({
      id: request,
      raw: await readBytes(type, request),
      text: await readText(type, request)
    })
  },
  namespaces: ['@s/', '@c/', '@h/'],
  dynamicAllow: [],
  toolchain: {resolver: '1.0.0', tssParser: '1.0.0', dataParser: '1.0.3'}
};
```

The resolver and parsers must already be initialized exactly as they are for runtime composition.
`roots` are behavior-bearing and stay ordered. `extraRoots` declares the finite component universe
for expected dynamic component bindings. Every model-bound `get`/`ui` declaration must match one
exact `dynamicAllow` diagnostic; missing, unused, or duplicate entries fail the build.

Programmatic callers also inject the format owner:

```js
compiler.manifest = manifestModel;
const {manifest, json, hash, filename} = await compiler.compile(config);
await compiler.write({manifest, json, hash, filename}, outDir);
```

The CLI supplies Node's native SHA-256 adapter. Config files and source adapters are trusted,
executable build inputs; never load PII, credentials, secrets, or request-, tenant-, model-, DOM-,
or user-derived state into them or the sources they return.
Generated manifests are JSON-only and are validated through the same runtime format owner before
output. A source adapter that performs external I/O must enforce its own timeout and byte limit;
local filesystem adapters should use asynchronous reads in production build pipelines.

Default limits are 256 roots, 16,384 graph vertices, 65,536 traversed edges, graph depth 128,
8,192 assets, 8,192 dynamic diagnostics, 4 MiB raw source bytes, 1 MiB source text, 262,144
values, value depth 128, and 1 MiB output. Config may only replace these named limits with positive
integers.

Output publication uses an exclusive same-directory temporary file, flush/close, and an atomic
no-replace hard link. Concurrent identical output is a no-op; conflicting bytes at one
content-addressed path fail loud.

Deploy generated filenames as compressed immutable static assets. The consuming host must pin the
matching hash in trusted release metadata rather than deriving it from the response.

Publish `@jtorm/types@1.1.0` and `@jtorm/ui-manifest-model@1.0.0` before this package. A host rolls
back adoption by omitting manifest preparation and serving the unchanged legacy assets; published
packages and exports remain available.
