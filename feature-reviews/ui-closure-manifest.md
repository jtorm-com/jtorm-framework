# Feature Development: Precompile/manifest step for UI closures

**Status:** DELIVERY
**Claimed:** 2026-07-15T06:10:37Z
**Agent:** /root
**Current Mode:** Delivery — GitHub PR gate

---

## Resumption Context

**Last Completed Mode:** Implementation and scoped architecture/security review
**Current Mode:** Delivery — GitHub PR gate
**Next Action:** Commit the verified payload, open the ready PR into `dev`, and obtain green CI plus
a clean Codex review against the current head.
**Files Created:**
- `feature-reviews/ui-closure-manifest.md` - Feature-dev checkpoint and design record.
- `feature-reviews/stride-ui-closure-manifest.md` - Implementation-linked STRIDE/PASTA record.
- `src/models/ui-manifest-model/` - Runtime format, loader, validator, LRU, and root-index package.
- `tooling/ui-manifest-compiler/` - Trusted graph compiler, CLI, and atomic writer package.
- Focused compiler/model/pipeline helpers, fixtures, and tests under `test/`.

**Files Modified:**
- `@jtorm/types` and `@jtorm/get-method` package surfaces and minor versions.
- `test/helpers/engine.js` production-bootstrap mirror, manifest preparation, and metrics.
- Package/root READMEs and `AGENTS.md` host/build/ownership contracts.
- `feature-reviews/framework-architecture-review-2026-07-14.md` backlog status/evidence.

**Tests Written:** 49 focused feature tests: 20 runtime-model, 23 compiler/CLI, five Product
pipeline, and one get overlay, plus generated declaration checks. The missing package/overlay and
Product characterization were captured red before implementation; the later traversal-depth
assertion was also captured red before adding harness instrumentation. Final fresh review found a
cyclic render-context parent-chain hang; its subprocess timeout was captured red before bounded
cycle detection made it green.
**External blockers/constraints:**
- [x] PR #45 merged as `9dd480a`; the feature branch and local `dev` are synced, and the merged
  local/remote topic branches are cleaned up.
- [ ] The production host is in a private sibling repository. A read-only tree request was denied by the authorization boundary, so local host wiring is characterized from `test/helpers/engine.js`, which identifies itself as the production bootstrap mirror.

**Plan Decisions Made:**

- Build-time graph discovery is a new compiler package; runtime format/loading/indexing is a new
  manifest model; existing resolver/compiler/parser/fetch owners stay unchanged.
- `get-method` receives one optional overlay seam, with exact legacy result shapes and explicit
  required/optional fallback policy.
- Bundles carry parsed, model-free AST/data, are installed atomically per root context, and are
  verified with model-owned canonical UTF-8 plus injected native 32-byte SHA-256 crypto.

**Context for Next Session:**
The branch and local `dev` are based on merge commit `9dd480a` (PR #45). Implementation, 54-test
focused verification, 476-test full-suite verification, typecheck, package/security/ratchet gates,
host docs, 100/100 evaluation, and the PASTA red-team pass are complete. Only the commit and GitHub
delivery loop remain.

---

## Research Summary

- **Modules involved:** `ui-resolver-model` owns custom/registered mapper lookup, terminal default variants, ordered framework fallback, mapper aliases, asset URL expansion, and resolved-component hit/miss cache state. `ui-compiler-model` clones descriptors and emits runtime `get`, nested `ui`, `pT`, and `di` AST branches. `ui-method` owns lifecycle/mediatarget orchestration plus the published forwarding facade. `get-method` fetches and applies `d/h/t` under lexical ancestor scope. `tss-model`, `html-model`, and `data-model` own separate bounded promise LRUs over `request-model` policy keys. `handler`, `view-model`, and `document-model` own serial traversal and detached/live scope semantics. UI package mapper files plus their TSS/HTML/JSON artifacts form the source graph.
- **Existing patterns:** Mapper inheritance is a nested descriptor `ui` call, not object inheritance. TSS discovers further literal and data-bound `ui`/`get` nodes only after each parent TSS parse and serial handler visit. Descriptor artifact arrays preserve order; TSS arrays fetch each part separately and concatenate parsed nodes. Promise caches deduplicate concurrent reads, evict LRU entries beyond 512, isolate request base/origin/tenant policy, and delete only the current promise on rejection. Resolver cache misses are sticky until `init()`/cache reset. `ui-method.init()` rebuilds alias regexes and clears resolver cache. PR #44 stores JSON-safe, model-free compiled binding descriptors on AST nodes and invalidates them against grammar plus raw declaration snapshots.
- **Type interfaces:** `UiPackage`, `UiDescriptor`, `UiArtifact`, `UiDependency`, `UiCall`, `UiResolution`, `TssNode`, `BindingCache`, `ViewContext`, and `ViewRequestContext` live in the canonical `@jtorm/types` JSDoc decoder ring. There is no manifest/bundle type or runtime package today.
- **Constraints discovered:** Runtime `src/` has no `require()`; collaborators and transport are DI. Only tooling/tests may read files or use Node built-ins. The parser snapshot already proves parsed ASTs are deterministically JSON-serializable/hashable. Static closure edges coexist with model-bound `get(d: ...)`, `ui(c: @type)`, conditional `di`, mediatarget variants, aliases, custom mappers, and ordered fallback. Manifests may contain trusted source-derived plain data only, never model/request/DOM/tenant state. Existing cache identity, selector scoping, loud missing/zero-match behavior, and raw parser semantics are load-bearing.
- **Open questions:** Exact production-host bootstrap and asset serving could not be inspected across the private-repository authorization boundary. The local harness documents its DI graph as a production-bootstrap mirror and covers both `v.c.c=0` live SPA/PWA and `v.c.c=1` detached SSR modes.

## Product.default Verification Evidence

Measured through the full-pipeline production-bootstrap mirror:

- Static inline-image cold baseline: 27 ordered UI requests = 17 TSS + 10 HTML and 18,293
  response bytes.
- Dynamic `ImageObject.@id` baseline: the same 27 UI requests plus one JSON request and 18,401
  response bytes.
- Prepared static closure: one 32,068-byte bundle request cold, zero same-root warm requests, and
  byte-equivalent live/detached/legacy bodies.
- Prepared dynamic closure: one bundle plus the one 108-byte model-bound JSON request.
- Deterministic bundle: 37 assets, ten exact dynamic diagnostics,
  `sha256-99604a0217bc7d486071efce14b45bcaeaf04b87ffe0faaa335474463ce14f85`, and
  7,368 bytes at gzip level 9.
- Raw serial traversal: maximum handler recursion depth 34; deepest request at handler depth 32.
- UI/get-only discovery metric: deepest request is eight nested UI/get edges below the root (nine layers including the root). The architecture review records the same closure more coarsely as an approximately 12-deep dependency chain.
- Request order:
  `thing-default.tss`, `section.html`, `thing-contents.tss`, `contents-default.tss`,
  `div.html`, `header.html`, `h1.html`, `a.html`, `a.tss`, `linkable.tss`,
  `global.tss`, `image-object-default.tss`, `figure-default.tss`, `/product-image`,
  `figure.html`, `picture.html`, `img.html`, `img.tss`, `playable.tss`,
  `rawcontent.tss`, `div.tss`, `replacable.tss`, `footer.html`,
  `product-default.tss`, `span.html`, `span.tss`, `text-default.tss`,
  `offer-default.tss`.

## Feature Specification

**Date:** 2026-07-15
**Author:** /root
**Status:** Approved

### Problem Statement

jTorm application authors can render schema.org components correctly, but a cold browser or
fresh SSR worker discovers the component's UI assets only while serially boiling descriptor and
TSS children. A representative static `Product.default` render therefore pays 27 ordered UI
requests and 18,293 response bytes before the existing promise caches can help; model-bound data
adds its own request. The framework needs a
build-time, deterministic way to resolve the trusted static UI closure into one parsed-AST bundle,
then make that bundle available to the unchanged render semantics without moving resolver,
compiler, parser, scoping, or cache responsibilities.

### Scope

#### In Scope

- Add a build-time `@jtorm/ui-manifest-compiler` package outside runtime `src/`, with a
  programmatic API and CLI for trusted CommonJS build configuration.
- Resolve configured component/page-pack roots through the existing injected
  `ui-resolver-model`, preserving custom mapper precedence, aliases, terminal default variants,
  framework fallback order, and configured mediatarget roots.
- Discover descriptor `h/t/d`, nested `ui`, TSS literal `get`, and TSS literal `ui` edges;
  retain `pT` structure and include every statically possible `di` artifact branch without
  executing runtime conditions.
- Parse TSS at build time into the existing JSON-safe `TssNode` shape, preserve artifact order,
  remove duplicate fetch identities, and emit deterministic source/mapper/config fingerprints.
- Record model-bound `get`/`ui` edges as explicit dynamic diagnostics. Require build
  configuration to declare permitted runtime data edges and additional component roots for the
  expected dynamic component universe.
- Add a dependency-injected `@jtorm/ui-manifest-model` runtime package that fetches, validates,
  indexes, LRU-caches, and attaches bundles to the root render context.
- Add an optional `manifestModel` seam to `@jtorm/get-method`; a bundle hit returns the same
  data/HTML/AST shape as the current model, while a permitted miss uses the existing
  data/html/tss model unchanged.
- Support absent/optional packs as a compatibility waterfall, required packs as loud UI-asset
  coverage, stale/malformed packs as loud failures, and retry after rejected bundle requests.
- Characterize and regression-test request count/order/depth/bytes, aliases, fallback, variants,
  arrays, multiple artifacts, `h/t/d/ui/pT/di`, failure modes, cache identity, concurrency,
  policy isolation, PR #44 binding caches, and detached/live parity.
- Document host DI/build usage, bump affected published packages correctly, and complete the
  canonical backlog only after all verification gates pass.

#### Out of Scope

- Bundling runtime model data discovered through `get(d: model.path)`; manifests must never
  contain request-, tenant-, model-, or DOM-derived values.
- Changing mapper semantics, descriptor compilation, TSS grammar/parser arithmetic, handler
  traversal, selector scope, zero-match behavior, URL policy, sanitizer policy, or rendered HTML.
- Replacing the three existing fetch models, parallelizing handler siblings, normalizing
  `v.io`, emitting JSON-LD, or changing UI composition conventions.
- Shipping a default manifest for every UI component or publishing packages.
- Updating the private production host repository; this PR supplies the package APIs, local
  bootstrap mirror wiring, and adoption documentation only.

### Functional Requirements

1. The compiler accepts a trusted pack configuration containing `id`, ordered roots, already
   initialized resolver/TSS-parser/data-parser collaborators, ordered get/ui method parameter
   metadata, UI/source adapters, namespaces, dynamic-edge allowlists, toolchain/source versions,
   and optional mediatarget roots. `id` must match `^[a-z0-9][a-z0-9_-]{0,63}$`. Every source
   adapter exposes a stable version; `read({type, request})` returns `{id, raw, text}`, where `raw`
   is a `Uint8Array`/Buffer hashed byte-for-byte and `text` is the exact string passed to the
   HTML/JSON/TSS consumer. The adapter is trusted to define decoding. Logical manifest request
   keys are the raw identities that reach `get`; they never pass through resolver `parseUrl()`.
2. Every component edge is resolved by `ui-resolver-model`; the manifest compiler does not
   reimplement mapper descent, alias expansion, default variants, or fallback ordering. It calls
   `parseComponent()` before `getComponent()`, applies the UI verb defaults `f=self`, `t=1`, `h=1`,
   `m=0`, and carries literal/dynamic `t/h/m` semantics through traversal. Graph visitation keys
   contain `c/f/t/h/m`; literal `t/h` control artifact inclusion and `m` expands configured
   mediatarget variants. Compilation calls the configured resolver's `init()` for each pack so no
   prior hit/miss cache survives. It snapshots and restores all mutable parser/resolver state in a
   `finally` path. Calls sharing any mutable collaborator cannot overlap; the CLI compiles multiple
   packs sequentially and an overlapping programmatic call rejects explicitly.
3. Every descriptor is inspected as a static union. `di` methods are never executed at build
   time; all guarded artifact URLs are included. `ui-compiler-model` remains the only runtime
   descriptor-to-TSS compiler.
4. TSS closure discovery uses the injected data parser's binding compiler and recursively inspects
   each compiled descriptor. A parameter is static only when its complete descriptor tree contains
   no `t:'p'` model-path node; a mixed or nested append is one dynamic diagnostic preserving the
   complete raw expression. It follows literal `get(t/h/d)` and `ui(c/f/t/h/m)` edges and reports
   dynamic ones without evaluating a model. A childless naked verb uses the injected method's
   ordered `params` exactly as the runtime data parser does; only graph-affecting get/ui parameters
   become diagnostics. Every diagnostic must match exactly one literal
   `{from, at, param, type, binding, implicit}` entry in `dynamicAllow`; `at` is the stable JSON
   Pointer to the declaration node, `param` names its property, `binding` is the exact raw string
   or ordered expression array, and `implicit` records synthesized leaf parameters. Every
   allowance must be used; missing, unused, or duplicate policy aborts with the source/pointer and
   parameter. Dynamic `t/h/m` are conservatively unioned using configured possibilities. Additional
   possible dynamic components are declared as normal roots and compiled into the same closure.
5. Static component or TSS cycles abort generation with the complete dependency path. Missing,
   rejected source artifacts, adapter/type/limit failures, parser throws, or invalid parsed shapes
   abort without writing output. The CLI resolves the chosen output directory, derives the filename
   only from the validated pack id/hash, checks containment, exclusively creates and fully writes a
   same-directory temporary file, flushes/closes it, then atomically hard-links it to the final path
   without replacement. On `EEXIST` it compares exact final bytes: identical content is a no-op and
   different content is loud. Every path unlinks the temporary file; no check-then-rename clobber is
   permitted. Concurrent identical and conflicting writers are deterministic.
6. Duplicate asset requests are loaded once and emitted once. TSS arrays retain per-part order;
   HTML/data arrays remain one legacy `String(request)` identity. A TSS array is served from a
   pack only when every element hits and is concatenated in order; an optional partial miss
   delegates the whole array to `tss-model`, while a required partial miss throws.
7. Output is stable for identical inputs. Wire-metadata fields use fixed schema order and only
   explicitly unordered manifest collections are sorted. Behavior-bearing key/element order inside
   TSS/data asset values and reachable mapper descriptors is preserved exactly. SHA-256 is
   computed over that canonical payload before the `hash` field is added.
8. Any raw source byte, reachable mapper, root/config/fallback order, namespace, dynamic policy,
   method parameter metadata, parser grammar/configuration, usage flags, mediatarget configuration,
   or declared toolchain/source version change changes the hash. Output filenames are
   `<pack-id>.<sha256>.json`.
9. The runtime model accepts ordered descriptors shaped as
   `{url, hash, mode: 'required'|'optional'}`. It validates and snapshots the list, derives a
   collision-free descriptor-list key, and validates the digest collaborator before claiming root
   ownership or issuing any request. The manifest model owns canonical JSON to `TextEncoder` UTF-8
   bytes, performs no Unicode normalization, and formats `sha256-` plus lowercase hex. Its only
   crypto DI is `digest(Uint8Array) -> Promise<Uint8Array>` and every result must be exactly 32
   bytes; malformed output is rejected in preflight. It starts pack loads concurrently, awaits
   every settlement, applies decisions in descriptor order, then atomically installs an ordered
   context index; caller mutation or completion timing cannot select the result, and no partial pack
   becomes visible. Validation enforces the top-level envelope plus structural count/depth bounds,
   removes the declared `hash`, and canonicalizes the payload with the same model-owned serializer
   used by the build tool. It recomputes SHA-256 through the injected byte-digest adapter and
   requires computed, declared, and host-expected hashes to be identical before full schema/index
   preparation.
   The index is stored only on the topmost `ViewContext.p` root. The singleton retains bounded
   pack promises, never an active render context. Identical descriptor lists on one root share the
   active prepare promise. Only a later valid different list can claim a new generation and
   supersede the older call, whose promise rejects `Manifest prepare superseded` and cannot install;
   an invalid later call never steals ownership. Different roots remain isolated, and a latest
   failed prepare leaves the prior fully installed index unchanged.
10. The runtime model caches the in-flight load promise under the collision-free tuple serialization
    `JSON.stringify([requestModel.cacheKey(url, context), expectedHash])`; it never reimplements
    request identity. It bounds pack cache size, bumps LRU recency, and deletes only the current
    promise after rejection.
11. Packs are acquired through `requestModel.get(url, context).text()`, then parsed by the
    manifest model. Transport/allow/HTTP/text-acquisition failure is a request failure: optional
    mode omits that pack and leaves the legacy waterfall available, while required mode rejects.
    Once text is received, a non-string body, the default 1,048,576-code-unit `maxText` bound,
    JSON parsing, schema/version, digest, or conflict failure is a received-invalid pack and always
    rejects even when optional. Invalid descriptors or a missing/invalid digest adapter reject
    before requests begin and are never classified as optional network fallback.
12. In required mode, a miss inside a manifest-owned UI namespace throws
    `Manifest asset missing <type> <request>`; external/data-bound requests outside those
    namespaces retain existing fetch behavior. Before returning a full pack hit or throwing a
    required-miss error, the model calls `requestModel.url(request, context)`, then awaits
    `requestModel.allow(resolved, context)` exactly as the legacy fetch path would: TSS arrays are
    checked sequentially by element, while HTML/data
    retain their single coerced request. A denial preserves `URL blocked <resolved-url>`.
    An optional miss delegates without a precheck, so the legacy model invokes the guard once.
13. The compiler adds `valueHash` for each exact order-preserved asset value; the expected top
    pack hash authenticates each value/hash pair. Prepared indexes retain that immutable token
    separately from the mutable value. Multiple packs must have the same `valueHash` for one
    fetch identity or preparation fails loudly; pack order never selects a conflict, and later
    lazy `node.b` mutation cannot create a false conflict. A duplicate identity inside one pack
    is malformed even when hashes match. Indexes use `Map` over validated own properties;
    manifest keys are never spread/assigned into prototypes, and `Map.has` keeps
    empty HTML, empty TSS, and `null` JSON as hits.
14. Bundle scalar TSS values preserve object and node identity for the lifetime of the cached
    bundle. A TSS-array hit returns a fresh top-level concatenated array on every call, matching the
    legacy model, while its cached node identities remain shared. PR #44's model-free `node.b` cache
    may be populated lazily and reused, while raw `p` invalidation semantics remain unchanged.
15. A cold inline-data `Product.default` render in both live and detached modes performs exactly
    one bundle request and no individual UI-asset requests; its output equals the legacy render.
    A second closure lookup/prepare on the same root, or an explicit cache-preserving harness path,
    performs zero requests.
16. A `Product.default` case using model-bound `@id` data performs one UI bundle request plus
    only the unavoidable dynamic data request, never the former 27 static UI requests.

### Non-Functional Requirements

- **Performance:** One static UI bundle request for the selected Product pack; warm zero-fetch
  behavior; no handler waterfall; bounded 32-pack runtime LRU by default; deterministic raw and
  gzip byte measurements recorded. The initial object-AST estimate is 17,940 raw / 2,774 gzip
  bytes for the 27 static Product assets versus 18,293 raw source bytes.
- **Security:** Existing request-model URL allow/timeout/policy remains mandatory. Manifest data is
  trusted build output only, contains JSON-compatible syntax/assets, is bounded before JSON parse
  by `maxText` and afterward by structural count/depth limits, and never executes code or stores
  model, request, tenant, DOM, secret, or executable-regex state. Validation recomputes SHA-256 and
  compares it with both the declared and host-expected hashes before installation.
- **Reliability:** No partial context installation, bounded graph traversal, explicit cycles,
  identity-guarded rejection cleanup, deterministic conflict handling, and exact loud/fallback
  policies.
- **Compatibility:** No runtime `require()`, dependency, export removal, handwritten TypeScript
  or declaration, parser/scoping/render change, or mandatory host manifest adoption.
- **Accessibility:** N/A; rendered markup and interaction behavior must be byte-equivalent.

### Default Limits

All limits are validated positive integers and may be explicitly overridden; compiler-side values
are part of hashed config. Tests cover each default boundary and limit + 1.

| Owner | Limit | Default |
|---|---|---:|
| Compiler | roots | 256 |
| Compiler | graph vertices / edges / depth | 16,384 / 65,536 / 128 |
| Compiler | assets / dynamic diagnostics | 8,192 / 8,192 |
| Compiler | source raw bytes / text per artifact | 4,194,304 bytes / 1,048,576 code units |
| Compiler | canonical plain-data values / nesting depth | 262,144 / 128 |
| Compiler | final manifest text | 1,048,576 code units |
| Runtime | descriptors per `prepare` | 32 |
| Runtime | pack-promise LRU | 32 |
| Runtime | received manifest text | 1,048,576 code units |
| Runtime | parsed JSON values / nesting depth | 262,144 / 128 |
| Runtime | assets / metadata entries | 8,192 / 65,536 |

### Deterministic Manifest Format

```json
{
  "format": "@jtorm/ui-manifest",
  "version": 1,
  "id": "product",
  "hash": "sha256-<hex>",
  "config": {
    "default": "default",
    "framework": "schema",
    "roots": [{"c": "Product.default", "f": "self", "t": 1, "h": 1, "m": 0}],
    "uis": [{"id": "...", "alias": "@s", "framework": "schema"}],
    "namespaces": ["@c/", "@h/", "@s/"],
    "methods": [
      {"id": "get", "params": ["t", "h", "d"]},
      {"id": "ui", "params": ["c", "f", "t", "h", "m"]}
    ],
    "dynamicAllow": [
      {
        "from": "@s/image-object/figure-default.tss",
        "at": "/0",
        "param": "d",
        "type": "data",
        "binding": "@id",
        "implicit": false
      }
    ],
    "toolchain": {
      "compiler": "1.0.0",
      "manifestModel": "1.0.0",
      "resolver": "1.0.0",
      "dataParser": "1.0.3",
      "tssParser": "1.0.0",
      "sourceAdapter": "uis-disk-v1"
    }
  },
  "assets": [
    {
      "type": "html",
      "request": "@h/@e/section.html",
      "valueHash": "sha256-<hex>",
      "value": "<section></section>"
    },
    {
      "type": "tss",
      "request": "@s/product/product-default.tss",
      "valueHash": "sha256-<hex>",
      "value": []
    }
  ],
  "dynamic": [
    {
      "from": "@s/image-object/figure-default.tss",
      "at": "/0",
      "param": "d",
      "type": "data",
      "binding": "@id",
      "implicit": false
    }
  ],
  "mappers": [
    {"id": "custom", "hash": "sha256-<hex>"},
    {"id": "@jtorm/schema-ui", "hash": "sha256-<hex>"}
  ],
  "sources": [
    {"id": "@s/product/product-default.tss", "hash": "sha256-<hex>", "bytes": 123}
  ]
}
```

- Wire-metadata objects use `ui-manifest-model`'s fixed schema order. Its serializer recursively
  preserves insertion order inside opaque `assets[].value` and mapper-descriptor inputs, including
  TSS declaration objects and static JSON objects; it never alphabetizes behavior-bearing keys.
- `assets` entries sort by `type` then canonical request identity; their values retain object
  and array order.
- `mappers`, `sources`, `dynamic`, `methods`, `namespaces`, and `dynamicAllow` sort by
  stable identity; each method's `params` retains runtime order. `roots` and `uis` retain
  configured order because both affect behavior. Mapper hashes cover actual reachable descriptor
  branches, not package version labels alone.
- The Product example is abbreviated. Its golden manifest contains all ten data/component dynamic
  diagnostics found in `Thing/contents`, `image-object`, and `figure` sources.
- `hash` covers the canonical object without `hash`, including raw source digests and all
  behavior-affecting config.
- The digest input is UTF-8 bytes of whitespace-free canonical JSON; the digest result is
  `sha256-` plus 64 lowercase hexadecimal characters. Canonicalization rejects unsupported JSON
  values, preserves behavior-bearing order, and performs no Unicode normalization. NFC/NFD,
  astral/control characters, U+2028/U+2029, and lone-surrogate JSON escapes are hashed exactly as
  serialized; Node-crypto and Web-Crypto adapters must produce identical vectors.
- `ui-manifest-model` owns format validation and exposes the pure serializer to the build
  compiler, so build and runtime do not maintain parallel protocol logic. An independent
  canonical-string golden detects accidental drift in that shared owner.

### Public API Contract

No HTTP endpoint changes.

```js
manifestModel.digest = async bytes => nativeSha256Bytes(bytes); // Uint8Array -> 32-byte Uint8Array
compiler.manifest = manifestModel; // build-time format/canonicalization collaborator
config.methods = {get: jTormGetMethod, ui: jTormUiMethod};

config.source.version = 'uis-disk-v1';
config.source.read = async ({type, request}) => loadSource(type, request); // {id, raw, text}

const result = await compiler.compile(config);
// UiManifestCompileResult = {manifest, json, hash, filename}

await manifestModel.prepare([
    {url: '/ui/product.<hash>.json', hash: 'sha256-...', mode: 'required'}
], renderContext); // Promise<void>; resolves undefined only after atomic installation

const value = await manifestModel.get('tss', '@s/product/product-default.tss', renderContext);
// undefined means an allowed legacy-model fallback; a hit has the exact model result shape.
```

- Singleton exports are `module.exports = { jTormUiManifestModel: { ...singleton } }` and
  `module.exports = { jTormUiManifestCompiler: { ...singleton } }`.
- The compiler package declares `"bin": {"jtorm-ui-manifest": "bin/jtorm-ui-manifest.js"}`; CLI
  usage is `jtorm-ui-manifest --config <trusted-commonjs-config> --out-dir <directory>`.
- Compiler config and source adapters are build-time executable code and are never serialized.
- `jTormGetMethod.get(type, request, context)` preserves its signature and first asks the
  injected manifest model when present.
- `ViewContext` gains optional `manifest: ViewUiManifestContext`; descriptor, digest,
  format/asset, prepared-index, compiler-config/result, and runtime wrapper typedefs are added only
  to the canonical `@jtorm/types` JSDoc source.
- Existing hosts that do not inject/prepare a manifest observe identical behavior.

### Affected Components

| Component | Change Type | Risk |
|---|---|---|
| `tooling/ui-manifest-compiler` | New `@jtorm/ui-manifest-compiler` 1.0.0 package, CLI, graph compiler | High |
| `src/models/ui-manifest-model` | New `@jtorm/ui-manifest-model` 1.0.0 format/loader/index/LRU/context owner | High |
| `src/methods/get-method` | Optional manifest lookup before existing models; README; 1.0.7 → 1.1.0 | High |
| `src/types` | Manifest/config/context JSDoc types; 1.0.8 → 1.1.0 | Medium |
| `test/helpers/engine.js` | Manifest DI and prepare hook/metrics for full-pipeline tests | Medium |
| `test/tooling/ui-manifest-compiler.test.js` | Determinism, graph, invalidation, atomic path/output, overlap/failure tests | Low |
| `test/models/ui-manifest-model.test.js` | Loading, validation, LRU, policy, concurrency tests | Low |
| `test/pipeline/ui-manifest.test.js` | Product cold/warm, dynamic data, output/mode parity | Low |
| Package/root READMEs and `AGENTS.md` | Build/host contract and locked ownership | Low |
| Architecture backlog and feature evaluation | Completion evidence after verification | Low |

### Dependencies

- **Depends on:** PR #44 merged at `9fb97a6`; existing resolver, parser, data parser, request
  policy, and get model result contracts. PR #45 merged at `9dd480a`; this branch and local `dev`
  are synchronized to that integration head.
- **Package metadata:** `@jtorm/ui-manifest-compiler@1.0.0` declares
  `@jtorm/ui-manifest-model@^1.0.0`, `@jtorm/ui-resolver-model@^1.0.0`,
  `@jtorm/data-parser@^1.0.3`, `@jtorm/tss-parser@^1.0.0`, and `@jtorm/types@^1.1.0`;
  `@jtorm/ui-manifest-model@1.0.0` declares `@jtorm/request-model@^1.1.3` and
  `@jtorm/types@^1.1.0`; `@jtorm/get-method@1.1.0` adds the manifest model and raises its types
  range to `^1.1.0`. Injected wiring remains metadata only for runtime packages.
- **External:** No runtime third-party dependency. The build tool uses Node built-ins and declared
  jTorm build-time packages, including `ui-manifest-model` as the single format owner. Runtime
  hosts inject only a native SHA-256 byte adapter (Web Crypto or Node crypto); the manifest model
  owns UTF-8 encoding and digest string formatting. Production-host adoption is a separate
  private-repository change.
- **Blocks:** Future page-pack distribution and any reliable waterfall-free SPA startup.

### Security Assessment

**Threat model:** [STRIDE/PASTA UI closure manifest](stride-ui-closure-manifest.md);
this summary records the principal controls.

- **S — Spoofing:** No identity/authentication decision is introduced. Pack identity is the
  configured `id` plus expected content hash, not an untrusted model field.
- **T — Tampering:** Existing URL allow policy gates both bundle requests and packed identities.
  Runtime canonicalizes the received payload, recomputes SHA-256 through host-native crypto, and
  requires computed, declared, and expected hashes to match before validation can install it;
  CLI output uses an exclusive same-directory temp plus atomic no-replace hard linking and exact
  `EEXIST` comparison. No `eval`, dynamic import, or manifest-provided function is allowed.
- **R — Repudiation:** No user mutation exists. Pack hash, source digests, roots, UI order, and
  toolchain versions make a delivered artifact traceable to deterministic inputs.
- **I — Information Disclosure:** The compiler rejects non-JSON source state and records binding
  expressions only. Tests assert no model/request/tenant/DOM values enter the bundle or shared
  cache. Existing error-handler behavior is unchanged.
- **D — Denial of Service:** Compiler traversal has node/asset/depth limits and cycle detection;
  runtime caps received text before its own JSON parse, then enforces count/depth limits; pack
  cache is bounded; rejected promises are removed; no retry loop or runtime regex compilation is
  added.
- **E — Elevation of Privilege:** Manifests carry no code, authority, methods, DOM, or executable
  regex. The CLI validates pack-id filenames, verifies output-directory containment, and invokes
  no shell. Validated manifest keys enter `Map` indexes and are never merged into prototypes.
  Runtime `di`, sanitizer, URL allow, compiler, handler, and selector policies remain the only
  decision/sink owners.

### Risk Assessment

| Risk | Likelihood | Impact | Owner | Mitigation |
|---|---|---|---|---|
| Static discovery under-includes a nested or dynamic component | Medium | High | Manifest compiler | Use resolver/data-parser owners, explicit unresolved diagnostics/allowlists, required namespace misses, exhaustive descriptor/TSS fixtures, and Product closure counts. |
| Stale mapper/config/source serves old AST under a new deployment | Medium | High | Compiler + manifest model | Hash raw sources plus canonical reachable mapper/config/toolchain input, recompute and require declared/expected equality, use content-address filenames and atomic context replacement, and add stale/tamper tests. |
| Manifest overlay changes array/order/`di`/`pT`/scope behavior | Medium | High | Get integration | Return exact legacy model shapes, keep runtime compiler/handler unchanged, characterize every descriptor branch before implementation, and compare full rendered goldens in both modes. |
| Packed content bypasses URL policy or poisons an object index | Low | High | Manifest model | Await the injected request guard in legacy request/array order before hits or required misses, let optional misses fall through once, use `Map`/own-property validation, and add deny/prototype tests. |
| Bundle parsing/indexing trades network latency for excessive bytes/CPU | Low | Medium | Compiler + manifest model | Build parsed AST once, cap text before JSON parse, stable-dedupe assets, record raw/gzip/prepare metrics, bound assets/nodes/depth, and reject regressions beyond the measured object-AST envelope. |
| Concurrent prepare/rejection leaks partial or cross-origin state | Low | High | Manifest model | Promise cache uses request policy + expected hash, prepare joins before one atomic install, root-context storage, latest-call identity guard, LRU bounds, and race/retry tests. |
| Trusted CLI config/source adapter or output path is mistaken for runtime data | Low | High | Compiler CLI | Keep tooling outside `src/`, document executable trusted config, validate id/containment, serialize only JSON-compatible results, write atomically without a shell, and scan manifests for functions/models/requests/DOM. |
| Overlapping builds share mutable resolver state | Low | High | Manifest compiler | Call resolver `init()` per pack, keep graph state call-local, reject shared-resolver overlap, run CLI packs sequentially, and test cache-reset/failure recovery. |

### Trade-offs Considered

| Decision | Alternatives considered | Why this one |
|---|---|---|
| Add a real compiler package plus runtime manifest model | Put all work in resolver; add a forwarding facade; generate ad-hoc scripts only | Generation and runtime loading are cohesive new responsibilities. Resolver remains the resolution owner, compiler remains descriptor compilation owner, and neither new package is pass-through. |
| Overlay at `get-method` | Mutate three fetch-model caches; replace fetch models; inline bundle logic into `ui-method` | The get dispatcher already selects data/html/tss results. One optional seam preserves existing cache owners/fallbacks and avoids three new cache-mutation APIs or UI lifecycle coupling. |
| Bundle parsed object ASTs | Bundle raw TSS; compact tuple codec; generate executable JS | Parsed objects remove parser work and are already stable/JSON-safe. The measured payload is smaller than raw source before metadata and ~2.8 KB gzip. Tuple/executable formats add codec/security complexity. |
| Traverse raw descriptor unions without running `ui-compiler-model` | Execute compiler with a fake view/model; duplicate compiler output | Runtime `di` depends on current view/method data. Union traversal includes all static assets without inventing model state; the real compiler still chooses behavior at render time. |
| Use data-parser compilation to classify literals | Regex/quote parsing inside tooling; execute bindings with dummy data | Binding grammar remains in its owner and PR #44 descriptors stay compatible; model paths are never guessed or evaluated. |
| Explicit dynamic diagnostics and declared roots | Include every mapper component; silently fall back; serialize sample model data | Page packs stay bounded and deterministic, incompleteness is reviewable, and manifests remain model-free. Runtime external data remains a clearly measured separate request class. |
| Optional network fallback but loud received-invalid/stale data | Always fail; silently fall back on every error | Unconfigured/temporarily unavailable manifests preserve compatibility, while an artifact that arrived but violates the declared contract cannot hide deployment drift. |
| Required namespace coverage | Fail on every miss; allow every miss | UI-package assets must be complete and loud, while model-bound external data remains valid runtime I/O. |
| Inject native SHA-256 and recompute canonical payload | Trust URL/header; accept host hash without recomputation; hand-write JavaScript crypto | A tiny async DI seam keeps runtime code dependency-free while verifying delivered content against both manifest and host expectations. |

### Blast Radius

| Dimension | Answer |
|---|---|
| Direct dependencies | Trusted UI mappers/source adapters, resolver config/order, TSS/data-parser grammar, request-model policy/transport, root `ViewContext`, and exact get model result shapes. |
| Direct dependents | `get-method` consumers, full render pipeline, SSR/live hosts that opt into `prepare`, UI package build/release processes, and PR #44 AST binding cache. |
| Cascade on outage | Optional bundle request failure restores the current waterfall; required failure rejects only the current prepare/render before DOM mutation. Existing hosts without manifests are unaffected. |
| Cascade on slow | One bundle request delays prepare; no handler work begins until it settles. Concurrent callers share the in-flight promise per policy/hash; no sequential asset backlog is created. |
| Cascade on bad data | Validation rejects before context install. A valid bundle value reaches only the same existing get/compiler/handler paths as the original trusted artifact. |
| Compromised-session impact | None: bundle/cache keys use request policy but contain no session/model/tenant data or authority. A compromised same-origin artifact can affect trusted UI source equivalently to compromising current TSS/HTML assets. |
| Fault isolation boundary | Compiler aborts before file output; runtime prepare validates/join-installs atomically; handler scope cleanup and legacy model rejection behavior remain unchanged. |

### Rollback Plan

| Item | Answer |
|---|---|
| Code rollback | Before publication, revert the isolated feature commit/PR. After publication, retain every published package/export; hosts omit manifest DI/prepare or pin compatible versions, and corrective behavior ships through normal patch/minor releases. |
| Schema rollback | N/A; no database or persistent schema. Manifest format v1 is additive and ignored by hosts that do not opt in. |
| Data rollback | Delete generated content-addressed pack files and remove host references; no model or tenant data is migrated. In-memory bundle/context caches disappear on restart/reload. |
| Auto-rollback trigger | CI blocks delivery on any output mismatch, cold request count other than 1, warm request count above 0, hash nondeterminism, focused/full test failure, typecheck, package dry run, or review finding. |
| Manual rollback runbook | Before publication, `git revert <feature-commit>` is valid. After publication, never delete/revert published packages or exports: remove manifest prepare/config from the consuming host, redeploy its previous content-addressed asset reference, and ship a corrective compatible release. Publishing/production deploy is outside this task. |
| Last rollback drill | First implementation of this feature; local reversibility is verified by one isolated conventional commit and optional-host behavior tests before PR creation. |

### Implementation Plan

1. **Clear gates and design.** User approval and PR #45 merge/sync are complete. Incorporate the
   feature-dev personas, code-explorer, code-architect, and threat-model challenges; validate the
   corrected checkpoint against red flags before the first test edit.
2. **Lock red baselines first.** Add Product request-count/order/bytes/depth/live-detached
   characterization and new focused tests that fail because no compiler/manifest model/overlay
   exists. Keep all singleton resets explicit.
3. **Build the format/runtime owner.** Add canonical JSDoc types and
   `@jtorm/ui-manifest-model@1.0.0`; implement schema-aware order-preserving serialization,
   model-owned UTF-8/digest formatting over native byte-digest DI, text-first loading/limits,
   ordered all-settled validation, request-model-owned cache/policy identity, per-root prepare
   preflight/sharing/supersession, `Map` indexes, and required/optional lookup policy. Drive each
   behavior through focused red/green model tests.
4. **Build the graph compiler/CLI.** Add `@jtorm/ui-manifest-compiler@1.0.0`; normalize/resolve
   roots with the existing resolver, statically traverse flag-aware descriptor/TSS unions with
   existing parser owners, recursively classify binding descriptors, fingerprint reachable
   mappers/sources/config, restore mutable collaborators, report dynamic edges/cycles
   deterministically, and publish content-addressed output through atomic no-clobber linking. Cover
   graph, invalidation, order, limits, overlap, concurrent writers, and containment before continuing.
5. **Integrate without moving owners.** Add the optional awaited manifest lookup to
   `@jtorm/get-method@1.1.0`, update its metadata/types range, and wire the local host mirror after
   root-context creation but before events/handler execution, with manifest singleton reset in test
   bootstrap. Prove Product cold/same-root-warm/dynamic request targets plus byte-equivalent SSR/live
   output. Existing data/html/tss models, resolver, compiler, parser, handler, sanitizer, and scope
   remain unchanged.
6. **Verify and deliver.** Run focused tests, `npm test`, `npm run typecheck`, package dry runs,
   diff/ratchet checks, required review skills, production-readiness/finish-task gates, and the
   final 100/100 evaluation. Only then update package/docs/AGENTS/backlog evidence, make the
   conventional commit, push, open a ready PR into `dev`, and complete the clean current-head
   Codex-review loop.

### Open Questions

None for this repository implementation. The private production host must independently wire and
deploy the documented DI/build contract after this framework PR; that external change is explicitly
out of scope.

### Success Criteria

- [x] Baseline tests lock Product request count, order, bytes, raw/UI-get depth, same-root
  warm zero-fetch, and live/detached parity before runtime implementation.
- [x] Static graph tests cover nested UI, inheritance, `parseComponent()` alias normalization,
  ordered fallback, terminal default, variants, arrays/multiple artifacts, `h/t/d/ui/pT/di`,
  duplicates, `c/f/t/h/m` visitation keys, literal/dynamic flags, and mediatarget expansion.
- [x] Dynamic tests cover literal concatenation, mixed and nested append descriptors, naked leaf
  get/ui parameter synthesis, exact node-pointer plus `param`, missing/unused/duplicate policy,
  conservative dynamic flags, and the Product golden's ten data/component diagnostics.
- [x] Fingerprint/order tests prove a same-version reachable-mapper edit invalidates while an
  unreachable branch does not; TSS declaration keys, static JSON keys, `di` method keys, child
  arrays, and artifact arrays retain exact legacy order; per-asset `valueHash` is stable.
- [x] Source/Unicode tests prove a one-byte raw-source change invalidates independently of adapter
  text, adapter text is the parse input, no normalization occurs, and Node/Web Crypto byte adapters
  produce the same digest for ASCII, NFC/NFD, astral/control, U+2028/U+2029, and lone-surrogate
  vectors. Spies assert exact `TextEncoder` bytes; wrong adapter type/length rejects before requests.
- [x] Limit tests cover every configured default exactly and at limit + 1, including graph,
  source/canonical data, pack descriptors/cache, received text, parsed values/depth, and metadata.
- [x] Failure tests cover missing/rejected/cyclic sources and render contexts, adapter/type/limit failure, parser throw
  and invalid parsed shape, optional versus required transport/HTTP versus
  non-string/oversize/JSON failures, invalid descriptors/digest adapters, partial TSS arrays, strict
  namespace misses, conflicts, retry, deterministic descriptor-order errors, and no partial output
  or context.
- [x] Policy/index tests use custom `requestModel.cacheKey/url/allow` spies to prove owner reuse,
  packed-hit and required-miss async allow/deny ordering, optional fallthrough invoking the legacy
  guard once, TSS versus HTML/data array semantics, preserved URL errors, own-property validation,
  falsy hits, and prototype-like keys without pollution.
- [x] Cache tests cover scalar/shared AST identity, fresh TSS-array top levels with shared nodes,
  PR #44 compiled bindings, request base/origin/tenant separation, isolated roots, identical-prepare
  sharing, valid different-prepare supersession, invalid-later-call non-supersession, prior-index
  retention after failure, lazy `node.b` mutation, out-of-order settlements, concurrent pack
  dedup, LRU eviction, late rejection, and latest valid prepare ownership.
- [x] Compiler lifecycle tests prove resolver/TSS-parser/data-parser state restoration on success
  and every failure, rejection of overlapping calls sharing any mutable collaborator, and
  sequential multi-pack isolation.
- [x] Identical inputs produce byte-identical JSON/hash/filename; raw source, reachable mapper,
  behavior-bearing order, fallback order, roots, dynamic policy, method parameter metadata, parser
  configuration, usage flags, mediatargets, source-adapter version, and toolchain changes invalidate.
- [x] CLI tests cover invalid ids, output containment, exclusive same-directory temporary files,
  flush/close plus atomic no-replace linking, exact identical/conflicting `EEXIST` behavior,
  concurrent identical/conflicting writers, cleanup, and no check-then-rename clobber.
- [x] Inline-data `Product.default` uses one cold bundle request and zero same-root warm requests
  with exact legacy output in detached SSR and live SPA/PWA modes.
- [x] Dynamic-`@id` Product uses only the one bundle plus its dynamic data request.
- [x] Manifest JSON contains deterministic trusted model-free data only and stays within the
  recorded raw/gzip/prepare-time regression envelope.
- [x] Focused tests, `npm test`, `npm run typecheck`, package dry runs, diff checks, required
  review skills, 100/100 verification, and `finish-task` all pass.
- [x] Package versions/docs/AGENTS/backlog/evaluation are updated only after verification.
- [ ] A conventional commit, pushed feature branch, ready-for-review PR into `dev`, green CI, and
  clean current-head Codex review complete delivery.

### Approval

- [x] Requirements clear
- [x] Scope agreed
- [x] Risks have concrete mitigations

**Approved by:** User
**Date:** 2026-07-15

## Plan Quality Gate

**Scope tags:** None of DB, SECURITY, FRONTEND, ROUTING, INFRA, PAYMENTS.
**Gate status:** PASSED; user approved 2026-07-15.
**Conditional agents:** None required by the scope table.
**Required reviewer loaded:** `code-review-enforcer.md` plus all eight referenced checklists.
**STRIDE status:** Complete; all six categories assessed above for the new build/runtime asset
boundary.
**Issues found and fixed in plan:** 26 — preserved resolver/compiler/fetch-cache ownership; made
descriptor discovery a non-executing static union; separated dynamic data from static closure
coverage; required atomic multi-pack installation and conflict rejection; replaced cache priming
with one get overlay; replaced host-header trust with actual payload digest verification; assigned
canonical serialization to one owner; bounded text before parse plus structure after parse;
preserved legacy array identities with all-pack-or-whole-waterfall TSS behavior; fixed canonical
UTF-8/lowercase-hex digest encoding; isolated prepared indexes on the topmost root with latest-call
ownership; made CLI filenames/writes containment-safe and atomic; reset the resolver per pack while
rejecting shared-resolver overlap; preserved the async URL guard for packed hits/required misses;
replaced object indexing/merges with validated own properties and `Map`; distinguished optional
transport failure from always-loud received-invalid text; made concurrent pack errors deterministic
by descriptor order; defined identical sharing/different supersession/prior-index retention on one
root; preserved falsy values with `Map.has`; fingerprinted actual reachable mapper branches rather
than trusting version labels; replaced global nested-key sorting with fixed metadata order plus
exact behavior-bearing object/array order; made all compiler/runtime bounds concrete and
boundary-testable; separated immutable asset `valueHash` conflict tokens from lazily mutable AST
values; required source adapters to supply both hash-exact raw bytes and authoritative parse text;
made Unicode/no-normalization hashing identical across native Node/Web Crypto adapters; and locked
exact semver plus the completed PR #45 integration prerequisite and Design Mode corrections.

### Checklist Application

- `engineering/domain-architecture` (23/23 accounted): 8 PASS (cohesive compiler/model
  responsibilities, existing resolver/compiler/cache ownership, dependency inversion, deep
  additive APIs, minimal public surface, no environment reads in runtime); 15 N/A (no
  route/action/DB/AI/domain-entity/middleware changes). Evidence: scope, requirements, affected
  components, dependencies, and trade-offs.
- `engineering/code-quality-review` (19/19 accounted): 8 PASS (no placeholder, runtime
  dependency, console, TODO, duplicated resolution grammar, speculative fallback, or unrelated
  reformat; deterministic/validated pack identity and format); 11 N/A (no generated user IDs, CSS,
  HTML interpolation, logging, or application route code). Evidence: functional requirements,
  API, and success criteria.
- `engineering/type-safety` (19/19 accounted): 7 PASS (canonical JSDoc decoder ring, tagged
  required/optional modes, typed asset identities, unknown manifest validation before use,
  JSON-safe valid states, no handwritten TS/declarations/escape hatch); 12 N/A (no SQL, generated
  client, TypeScript cast, resource, or domain-enum work). Evidence: API, format, and compatibility.
- `engineering/complexity-maintainability` (20/20 accounted): 10 PASS (single graph compiler,
  single format owner, one overlay seam, bounded traversal/index/cache, small public API, no
  forwarding facade or three-cache mutation, explicit dynamic boundary); 10 N/A (no lint config,
  polymorphic domain hierarchy, or unrelated subsystem refactor). Evidence: decisions and blast
  radius.
- `engineering/error-taxonomy` (19/19 accounted): 9 PASS (request acquisition versus
  received-invalid is explicit, optional/required behavior differs only for acquisition,
  compiler/file/context installation is atomic, conflicts/cycles/supersession are named,
  descriptor-order and URL-blocked errors are preserved, rejection preserves retry/original
  failure); 10 N/A (no HTTP response/i18n/domain-error/cancellation UI). Evidence: requirements,
  reliability, and risks.
- `engineering/runtime-safety` (21/21 accounted): 16 PASS (policy-aware keys, concurrent promise
  dedup, identity-guarded rejection deletion, 32-pack LRU, max-text/structure bounds,
  deterministic all-settled processing, same-root sharing/supersession, cycle detection,
  all-or-whole arrays, per-root `Map.has` isolation, async request guard/native digest, exact AST
  identity/order, immutable conflict tokens, raw-byte versus parse-text fidelity, cross-runtime
  Unicode vectors, SSR/live parity); 5 N/A (no time/money/job/queue operations). Evidence:
  requirements, STRIDE, and success criteria.
- `security/injection` (14/14 accounted): 10 PASS (trusted CLI config isolated from runtime,
  validated pack-id/output containment, no shell invocation, request URL guard awaited on packed
  paths, own-property/`Map` indexing, JSON schema/native digest verification, no eval/dynamic
  import/manifest function/executable regex, existing DOM sinks unchanged); 4 N/A (no SQL,
  endpoint, template interpolation, or new selector sink). Evidence: security assessment.
- `security/secrets-handling` (12/12 accounted): 4 PASS (no model/request/tenant/DOM/secret data
  serialized or cached, errors expose asset identity only, hashes are non-secret, production
  credentials/config stay outside artifacts); 8 N/A (no secret retrieval, env mutation, token,
  logging, persistence, or response exposure). Evidence: non-functional requirements and STRIDE.

### Plan-Level Quality Score

| Dimension | Score | Evidence |
|---|---:|---|
| Architecture | 10/10 | Compiler owns static graph generation; manifest model owns wire format/loading/indexing; resolver/compiler/parser/fetch owners remain intact. |
| Consistency | 10/10 | Pure CommonJS/JSDoc, singleton DI, no runtime imports, additive package surfaces, exact minor/new-package versions, and existing test layout match the repository. |
| Type Safety | 10/10 | Canonical `@jtorm/types` gains tagged config/format/context types; untrusted parsed values are validated into JSON-safe valid states before indexing. |
| Validation | 10/10 | Digest/value hashes, raw bytes, Unicode vectors, schema, ids/paths, own keys/order, exact limits, conflicts, cycles, arrays, fingerprints, and diagnostics are gated. |
| Error Handling | 10/10 | Acquisition/invalid, required/optional, URL-blocked, strict-miss, superseded, deterministic-order, atomic install, retry, cleanup, and identity paths are explicit. |
| Security/Privacy | 10/10 | Digest plus awaited URL policy, `Map` indexes, and contained no-shell output protect trusted assets without model/tenant/request/DOM/secret/authority state. |
| Performance | 10/10 | Product targets one cold static request and zero warm requests with raw/gzip/prepare metrics, exact bounds, concurrent pack loads, and separate dynamic data. |
| Maintainability | 10/10 | Single owners and immutable conflict tokens avoid duplicated grammar/cache APIs and mutable-AST comparison coupling. |
| Testability | 10/10 | Red baselines plus order/raw-byte/Unicode/fingerprint/limit/CLI/graph/policy/prototype/loader/race/cache/tamper tests, pipeline parity, and full verification are specified. |
| Readability | 10/10 | Stable manifest schema, small APIs, explicit policy modes, named diagnostics, and documented ownership keep control flow reviewable. |
| **Total** | **100/100** | Plan quality gate passed before test or runtime implementation. |

## Agent Design Constraints

Project AGENTS.md overrides generic stack assumptions in the shared personas. The applicable
constraints below are additive; Bun/Elysia/TypeScript/DDD advice that conflicts with this
dependency-free CommonJS/JSDoc framework is explicitly N/A.

### architect

- [x] Read agents/engineering/architect.md.
- Required: keep resolver, compiler, parser, fetch-cache, handler, sanitizer, and scope ownership
  intact; give the new compiler and manifest model cohesive responsibilities; preserve DI-only
  runtime composition, additive exports, and independently testable checkpoints.
- Red flags excluded: service locator/runtime imports, pass-through facade, cache priming across
  three models, parser/resolver grammar duplication, God object, or a cross-package mutable cache.

### planner

- [x] Read agents/project-management/planner.md.
- Required: implement in dependency order, start with characterization/red tests, keep six
  independently verifiable phases, and treat the full test/review/documentation gate as Definition
  of Done.
- Finding incorporated: every material risk now has a named component owner. No delivery-time
  estimate is asserted; the canonical backlog already assigns relative effort L.

### backend-architect

- [x] Read agents/engineering/backend-architect.md.
- Required: treat asynchronous acquisition, rejection, retry, race, and partial-state paths as
  first-class design cases; keep policy, cache, and context identity explicit and bounded.
- N/A: no database, transaction, queue, HTTP route, payment, or domain-layer change exists.

### elysia-expert

- [x] Read agents/engineering/elysia-expert.md.
- N/A: this repository has no Elysia route surface and the feature adds no endpoint or request
  schema. Its relevant type-first, red-first, no-placeholder, and explicit-error gates remain
  mandatory.

### bun-expert

- [x] Read agents/engineering/bun-expert.md.
- Required: no new third-party dependency when Node built-ins suffice; the trusted build tool may
  use Node built-ins, while runtime source remains dependency-free and environment-agnostic.
- N/A: the repository runs Node node:test, not Bun, and no Bun API/runtime migration is allowed.

### typescript-pro

- [x] Read agents/engineering/typescript-pro.md.
- Required: define discriminated manifest/config/result/context contracts in the canonical
  @jtorm/types JSDoc decoder ring before implementation; narrow unknown JSON through validators;
  keep public inputs/outputs named and illegal states unrepresentable.
- Project override: never add handwritten TypeScript or declaration files. The only declaration is
  generated from pure JSDoc by the existing @jtorm/types prepack step.

### security-architect

- [x] Read agents/security/security-architect.md.
- Required: preserve URL-policy complete mediation, verify computed/declared/expected digest
  equality, minimize the trusted build boundary, reject executable/runtime state, bound resource
  use, isolate render roots, and document the build-pipeline residual risk.
- Red flags excluded: trusting a response header/payload hash, optional malformed-pack fail-open,
  prototype merges, unbounded parsing/cache/graph work, or a manifest-controlled function/sink.

### threat-modeling-enforcer

- [x] Read agents/security/threat-modeling-enforcer.md.
- Required artifact: [STRIDE/PASTA UI closure manifest](stride-ui-closure-manifest.md), created and
  linked before implementation. It includes four trust boundaries, asset/actor inventories, all
  six STRIDE categories, two attack trees, seven PASTA stages, residual risk, and control-to-test
  mappings.
- Re-evaluation is mandatory if executable content, untrusted build input, persistence, endpoints,
  shared-root state, or policy/digest ownership changes.

### platform-engineer

- [x] Read agents/infrastructure/platform-engineer.md.
- Required: content-addressed same-directory atomic output, cleanup on failure, bounded runtime
  state, explicit legacy fallback/required failure, and rollback by removing manifest preparation
  without changing legacy asset paths.
- N/A: no infrastructure resource, Worker, queue, database, secret, deployment pipeline, or
  production-host repository is changed here.

### database-architect

- [x] The feature-dev workflow path agents/infrastructure/database-architect.md was resolved through
  the Codex resource index but does not exist in the ai-config checkout.
- N/A with no substitute invented: this feature has no database, schema, persistence, query,
  transaction, RLS, or migration scope. Backend-architect already covers the applicable runtime
  failure and concurrency concerns.

### code-explorer

- [x] Completed repository-grounded exploration against the proposed seams.
- Findings incorporated: Product has ten dynamic data/component declarations, with
  `figure-default.tss` at node `/0`, parameter `d`; `parseComponent()` precedes component
  lookup; traversal keys include `c/f/t/h/m`; and literal/dynamic flags plus mediatargets propagate.
- Raw get-request identities never use resolver URL expansion. Source reads are type-tagged and
  return distinct raw bytes/text. Mutable collaborators are restored and overlap-guarded.
- Packed TSS arrays return fresh top arrays with shared cached nodes. Pipeline prepare occurs after
  root creation and before events/handler, with same-root warm verification and singleton reset.

### code-architect

- [x] Completed architecture challenge against ownership, concurrency, and publication invariants.
- Findings incorporated: the CLI uses exclusive temp creation plus atomic no-replace hard linking,
  exact `EEXIST` comparison, cleanup, and concurrent-writer tests—never check-then-rename.
- Dynamic classification is recursive and records node pointer, parameter, exact raw binding, and
  implicit-leaf provenance. The manifest model owns UTF-8/lowercase digest formatting; crypto DI
  accepts bytes and must return exactly 32 bytes.
- Prepare preflight precedes root ownership, so invalid calls cannot supersede valid work.
  `requestModel.cacheKey/url/allow` remain direct owners. Published packages/exports are retained
  after release; host opt-out and corrective compatible releases are the rollback path.

### Persona Checklist Disposition

- Existing plan gate: engineering/domain-architecture, type-safety,
  complexity-maintainability, error-taxonomy, runtime-safety, code-quality-review,
  security/injection, and security/secrets-handling remain fully accounted above.
- project-management/planning-rigor: 27/27 accounted — 19 PASS (need, objectives, stakeholder,
  prioritization, scope, Definition of Done, small phases/batches, architecture, front-loading,
  unknown-first progress, dependencies/critical path/contingency, owned risk register,
  assumptions, testing, and red flags); 8 N/A (no schedule or time-box was requested, so consensus
  estimate, reference-class schedule, uncertainty range, fat-tail buffer, appetite, and circuit
  breaker mechanics do not claim false precision).
- engineering/dod-types-first, dod-tests-written, dod-no-placeholders, dod-error-handling, and
  dod-self-review: loaded and adopted as blocking implementation/checkpoint gates; completion is
  intentionally not claimed before code and tests exist.
- security/threat-modeling: 15/15 PASS in the linked pre-code model. security/crypto: native
  SHA-256/no-custom-primitive requirement PASS; password/key/encryption/TLS items N/A.
  security/rate-limiting-and-abuse: text/structure/graph/cache bounds and no unbounded loop PASS;
  endpoint/account throttling items N/A. security/dependency-security: built-ins/no new
  third-party runtime and trusted build boundary PASS; package-update/SBOM items N/A.
- security/authentication, authorization, zero-trust-architecture, ssrf-and-external-requests,
  security-headers, api-asset-management, audit-trail-integrity, mobile-app-security,
  queue-message-security, ai-llm-security, security-anomaly-detection,
  supabase-row-level-security, and secrets-rotation: all items N/A because the feature adds no
  identity, authorization, user-controlled outbound URL, endpoint, log/audit store, mobile client,
  queue, AI, database, or secret lifecycle.
- infrastructure/ops-readiness: applicable timeout/fallback/fail-loud/bounds/rollback items PASS;
  service/deployment/Worker items N/A. infrastructure/cost-and-finops: 27-to-1 static request reduction
  and finite graph/cache/request work PASS; billable resource/tag/budget items N/A.
  infrastructure/observability, slo-and-error-budgets, db-migration-safety, deploy-safety,
  email-deliverability, postgres-performance, and cloudflare-workers-limits: all items N/A because
  this is a library/build-tool change with no deployed service or infrastructure mutation.

## Production Readiness Audit

All mapped production-readiness checklists were evaluated against the changed surface. Database,
queue, auth/authz, API/HTTP-header, mobile, WCAG, email, service-observability, Worker/Neon deploy,
and migration items are N/A: this change adds no endpoint, UI control, database, identity flow,
queue, secret, deployed service, Worker config, or infrastructure resource. Applicable
library/build-tool controls pass:

| Category | Status | Evidence |
|---|---|---|
| Data Scale | PASS | 27 static requests collapse to one; graph/assets/text/values/depth/metadata/descriptors and 32-entry LRU have exact/+1 tests; Product pack is 32,068 raw / 7,368 gzip. |
| Resilience | PASS | Request-model owns timeout/abort and policy; production timeout obligation is documented; optional acquisition degrades intentionally, received-invalid and required paths fail loud; no retries; prepare/output are atomic with retry-safe cleanup. |
| Security Surface | PASS | PASTA/STRIDE and red-team record links expected/declared/computed/value hashes, URL complete mediation, bounded JSON, own-field/`Map` indexes, trusted config, contained no-shell output, and zero new external dependencies. |
| User Experience | PASS | Existing hosts and optional misses preserve the legacy waterfall; required failures occur before handler/DOM mutation; live/detached bodies match legacy exactly; this change adds no visual or interactive UI. |
| Observability | PASS | Library/build errors propagate with pack/asset identity and never expose response bodies or runtime state; service metrics, alerts, and runbooks remain host/deployment ownership and are not falsely implemented in this package. |
| Production-Only Failure Modes | PASS | Unicode/non-normalization vectors, asynchronous digest adapters, root/context isolation, latest-valid races, SSR/live parity, bounded memory, and no synchronous runtime I/O are covered. Build-only local source adapters are explicitly separated. |
| Deploy Gates | PASS | Content-addressed output is compressed/immutable by documented host contract, publish order is explicit, atomic no-replace writes are tested, and adoption rolls back by omitting prepare without changing legacy assets. No DB/Worker deploy surface changed. |

Local Node `v25.5.0` percentile evidence (20 compiler samples; 100 runtime samples; production UI
sources with network transfer excluded): compiler p50/p95/p99 = 57.02/67.00/99.65 ms; cold
prepare/parse/validate/index p50/p95/p99 = 2.82/4.79/7.57 ms. The host still owns real-network
latency/RUM; this benchmark is a regression envelope for framework CPU work, not a field-CWV claim.


## Progress Log

### Research Mode
- [x] Mapped component resolution, aliases, framework fallback, and cache ownership
- [x] Mapped descriptor-to-TSS compilation
- [x] Mapped get/TSS/HTML/data fetch and cache paths
- [x] Mapped inheritance, nested UI, and get closure discovery
- [x] Mapped SSR/SPA host DI and asset loading available in this repository
- [x] Mapped current ownership and confirmed no manifest implementation exists

### Plan Mode
- [x] Explored codebase
- [x] Wrote feature spec

### Plan Quality Gate
- [x] Scope classified
- [x] Relevant plan reviewer/checklists consulted; no conditional scope personas required
- [x] All 10 dimensions pass at plan level
- [x] STRIDE pre-analysis complete
- [x] Plan refined and presented
- [x] Plan approved

### Design Mode
- [x] Loaded required personas
- [x] Completed code-explorer review
- [x] Completed code-architect review
- [x] Created threat model
- [x] Validated against red flags

### Implementation Mode — Checkpoint 1: Characterization
- [x] Added failing Product request/order/byte/live-detached characterization tests
- [x] Added failing missing manifest package/compiler/get-overlay contract tests
- [x] Captured expected red failures before implementation

### Implementation Mode — Checkpoint 2: Runtime Format and Loader
- [x] Added `@jtorm/ui-manifest-model@1.0.0` with no runtime imports
- [x] Added canonical order-preserving serialization and native byte-digest DI
- [x] Added bounded validation, policy-aware promise LRU, retry, and triple hash equality
- [x] Added root-local atomic prepare, supersession, conflict, and required/optional behavior
- [x] Covered exact runtime defaults, policy, prototype, falsy, mutation, race, and Unicode paths

### Implementation Mode — Checkpoint 3: Compiler and CLI
- [x] Added `@jtorm/ui-manifest-compiler@1.0.0` outside runtime `src/`
- [x] Added resolver/parser-owned graph traversal, source/mapper/config fingerprints, and dynamic policy
- [x] Added collaborator overlap lock and nested-finally restoration/unlock
- [x] Added runtime-format conformance before output and compiler-owned provenance versions
- [x] Added contained atomic no-replace output and deterministic CLI config-array processing
- [x] Covered all compiler defaults exactly/+1, repeated edges, cycles, order, paths, and writer races

### Implementation Mode — Checkpoint 4: Integration and Types
- [x] Added the optional lookup overlay to `@jtorm/get-method@1.1.0`
- [x] Added recursive JSON-safe manifest/config/context JSDoc types to `@jtorm/types@1.1.0`
- [x] Corrected nullable prepared promise and compiler-root default typing
- [x] Wired manifest DI/prepare into the production-bootstrap test mirror with singleton resets
- [x] Locked handler/request depth, 27-request static baseline, dynamic request, and output parity
- [x] Locked the deterministic 37-asset/ten-diagnostic Product bundle and 27-to-1 result

### Review Mode
- [x] Architecture review: ownership, data flow, lifecycle, failure, limits, and DI contract approved
- [x] Public package/API compatibility review: additive opt-in surface; release order documented
- [x] Refactor review: compiler split below 800 lines; value walker and writer remain cohesive helpers
- [x] Source-ratchet review: N/A, no analyzer/ratchet semantics changed
- [x] STRIDE/PASTA implementation review and red-team validation: no framework exploit confirmed;
  trusted build/release compromise remains the accepted residual
- [x] Cross-model adversarial prompts prepared; external reviewer execution was blocked by the
  environment's data-export authorization guard, so no result is claimed. The mandatory repository
  quality gate remains the clean current-head GitHub Codex review.

### Delivery Mode
- [x] Package/root READMEs and `AGENTS.md` document build, host, rollback, and locked ownership
- [x] Production-readiness review
- [x] Tech-debt ratchet and repository cleanup
- [x] Full `npm test` and `npm run typecheck`
- [x] Package dry runs and final diff/source guards
- [x] Final 100/100 implementation evaluation and `finish-task`
- [x] Mark architecture backlog implemented
- [ ] Conventional commit, push, ready PR into `dev`, green CI, and clean current-head Codex review
