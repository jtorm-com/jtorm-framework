# jTorm UI Cache Model

## Install
```js
npm install @jtorm/ui-cache-model
```

Inject `renderContextModel` and the same `requestModel` used by data/HTML/TSS and manifests before
rendering:

```js
uiCacheModel.renderContextModel = renderContextModel;
uiCacheModel.requestModel = requestModel;
```

The exported fragment cache/order remain shared and host-resettable; only the dirty flag is
namespaced to each bounded render root. The default cache context uses the render owner’s strict
own-link resolver while its ordinary render resolver remains unchanged. Fragment scope preserves
first-match precedence: root tenant, request tenant, request origin, then request-namespace
effective base or the host's configured base.
Root-only origin/raw-base fields are not promoted into UI scope; when they would diverge from the
fetch identity, fragment caching bypasses. A deliberate request `option()` override that returns a
distinct effective base remains supported. Without a valid non-empty
primitive discriminator, `get()` misses and `set()`/`save()` are no-ops with no cache, recency,
dirty, or persistence effect. A non-empty configured request base explicitly opts a single-tenant
host into sharing.

Persisted variants are still stored as `{language:{cid:{scopeNulVariant:html}}}`. Old unscoped
variants can contain NUL and are byte-identical to new scoped keys, so syntax cannot prove their
provenance. On upgrade, `init()` therefore quarantines all persisted input by default and does not
even call `saveModel.get()`. Clear or replace the entire old fragment store, then set an own
`saveModel.uiCacheScoped = true` before `init()` to attest that the adapter now contains scoped-only
data. An inherited/prototype-polluted signal is ignored.
The nested saved shape is unchanged. Raw, leading-NUL, multi-NUL, and NUL-bearing language/cid
coordinates remain rejected after opt-in; a NUL-bearing render variant bypasses caching.

`save()` still writes newly scoped dirty state through any configured adapter; `uiCacheScoped`
only controls reload. The model never clears external storage itself. Operators must not enable the
signal before full cleanup, because old and new key bytes cannot be distinguished selectively.

Rollback must pin request, promise-cache, fetch/manifest, and UI-cache consumers together. Before
running an older UI-cache version, stop unscoped/multi-tenant traffic or restore a known
scoped-only snapshot: older code can serve ambiguous entries again. Do not manufacture raw
fallback variants for this release.
