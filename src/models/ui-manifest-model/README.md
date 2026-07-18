# @jtorm/ui-manifest-model

Dependency-injected runtime owner for the `@jtorm/ui-manifest` wire format, canonical
serialization, native SHA-256 byte adapter, bounded pack-promise LRU, validation, and atomic
render-root index installation.

```js
const { jTormUiManifestModel: manifest } = require('@jtorm/ui-manifest-model');

manifest.requestModel = requestModel;
manifest.renderContextModel = renderContextModel;
manifest.promiseCacheModel = promiseCacheModel;
manifest.digest = async bytes => sha256Bytes(bytes);
await manifest.prepare([
  { url: '/ui/product.sha256.json', hash: 'sha256-…', mode: 'required' }
], renderContext);
```

Runtime source has no imports. Hosts inject `requestModel`, `renderContextModel`,
`promiseCacheModel`, and a
`digest(Uint8Array) -> Promise<Uint8Array>` function returning exactly 32 bytes.
Production hosts must set a non-zero request-model timeout (globally or on the render request
context), and an injected transport must honor its abort signal.

Prepare packs after creating the top-level view context and before events or handler traversal:

```js
const v = await viewModel.create(html, tss, data, createDocument);
await manifest.prepare(descriptors, v.c);
await eventModel.handle(v, 'before', 'view');
await handler.handle(null, null, null, 1, v);
```

The descriptor `hash` is trusted deployment metadata and must not be copied from the response.
The model validates received text, schema, structure, per-value hashes, and computed = declared =
expected SHA-256 before installing an index. Installation is atomic on the topmost render context.
Pack promises use the request model's policy-aware cache key and a bounded 32-entry LRU.
Successful cross-render packs have an absolute `ttl` of `300000` ms by default; hosts may set
`manifest.ttl` independently (`0` pending-only, `Infinity` non-expiring rollback). Expired packs
re-enter the unchanged request URL/allow, timeout, acquisition classification, digest, schema,
and value-validation path.
When that request key is unscoped, each render root reacquires and validates its pack without
touching the cross-render promise cache. Repeated `prepare()` calls on that same root still reuse
the root-local prepared promise/index; this bypass does not change atomic installation,
supersession, validation, digest, or acquisition classification.

`purge({url, hash, mode?}, context)` removes exactly one scoped cross-render pack and returns `0`
or `1`; malformed/unscoped input is a no-op. `mode`, when supplied, must still be `required` or
`optional` but does not change key identity. `purgeAll()` explicitly clears all shared packs and
returns the count. Neither API changes a render root's already prepared `manifest.promise/index`;
only a new/subsequent root reacquires.
Manifests are public static assets: they must never contain PII, credentials, secrets, or request-,
tenant-, model-, DOM-, or user-derived state. The trusted compiler/source-adapter boundary owns
that exclusion; the runtime validates structure and integrity, not data classification.
Serve the content-addressed file with Brotli or gzip and
`Cache-Control: public, max-age=31536000, immutable`; deploy a new filename/hash for every change.

`mode: 'optional'` falls back only when acquiring the pack fails. Received malformed, oversized,
stale, tampered, or conflicting content always fails loud. `mode: 'required'` additionally makes
declared namespaces strict: an absent owned asset fails instead of using the legacy model. Every
packed hit and required miss still awaits `requestModel.url()` and `requestModel.allow()`.

Inject the same model into `@jtorm/get-method`:

```js
getMethod.manifest = manifest;
```

Removing the `prepare()` call and the optional `getMethod.manifest` injection restores the legacy
waterfall without changing asset URLs. Publish `@jtorm/promise-cache-model@1.0.2` and
`@jtorm/request-model@1.1.5` before this package and the fetch/UI cache consumers.
