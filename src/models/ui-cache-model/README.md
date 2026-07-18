# jTorm UI Cache Model

## Install
```js
npm install @jtorm/ui-cache-model
```

Inject `renderContextModel`, the same `requestModel` used by data/HTML/TSS and manifests, and the
shared promise-cache policy owner before rendering:

```js
uiCacheModel.renderContextModel = renderContextModel;
uiCacheModel.requestModel = requestModel;
uiCacheModel.promiseCacheModel = promiseCacheModel;
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

Successful fragments have an absolute process-local `ttl` of `300000` ms by default. Set
`uiCacheModel.ttl` independently; `0` shares an in-flight render but retains no settled fragment,
and `Infinity` restores non-expiring behavior. Fresh hits retain the exact fragment bytes and
`{l,id,c}` order record while updating LRU recency without extending expiration. The plugin uses
an ephemeral handler-wrapper token to deduplicate independent-root stale renders, stage bytes at
the existing after-iteration slot, and publish only after every existing after-iteration handler
succeeds. The event owner defers that publication until every completion hook succeeds too. Leases
are bound to both exported `cache` and `order` identities; replacing either detaches late work.
A configured-base call without a concrete render root bypasses its own same-key lease instead of
waiting on an identity it cannot distinguish. Four-argument direct `get()` remains a lookup and
never starts a render lease.

Persisted variants are still stored as `{language:{cid:{scopeNulVariant:html}}}`. Old unscoped
variants can contain NUL and are byte-identical to new scoped keys, so syntax cannot prove their
provenance. On upgrade, `init()` therefore quarantines all persisted input by default and does not
even call `saveModel.get()`. Clear or replace the entire old fragment store, then set an own
`saveModel.uiCacheScoped = true` before `init()` to attest that the adapter now contains scoped-only
data. An inherited/prototype-polluted signal is ignored.
The nested saved shape is unchanged and contains no timestamp. Each valid attested batch loaded by
`init()` begins a new in-process TTL from one clock reading. Absolute age across process restarts
requires the separately scoped versioned persistence-schema follow-up. Raw, leading-NUL,
multi-NUL, and NUL-bearing language/cid
coordinates remain rejected after opt-in; a NUL-bearing render variant bypasses caching.

`save()` still writes newly scoped dirty state through any configured adapter; it awaits the
adapter and clears only an unchanged dirty revision, so a concurrent mutation or rejected save
remains retryable. The UI plugin starts this save at the existing non-awaited after-view point;
operators persisting an explicit purge call and await `save(scopedView)` themselves. `uiCacheScoped`
only controls reload. The model never clears external storage itself. Operators must not enable the
signal before full cleanup, because old and new key bytes cannot be distinguished selectively.

Administrative invalidation is explicit and returns deterministic unique-key counts:

```js
uiCacheModel.purge(scopedView, language, cid, variant); // exact live/pending key: 0 or 1
uiCacheModel.purgeAll(scopedView);                      // explicit global fragment purge
```

An exact unscoped/malformed call is always `0`, never a wildcard. `purgeAll()` is global but still
requires a valid scoped context to obtain the correct dirty root. Live deletion removes nested
cache bytes, order, and timestamp together; pending deletion only detaches participation and does
not abort already returned work. To invalidate both live and external state, use an authorized
scoped context and the existing persistence path:

```js
await uiCacheModel.init(); // adapter must own uiCacheScoped === true
const removed = uiCacheModel.purgeAll(scopedRootView);
if (removed) await uiCacheModel.save(scopedRootView);
```

Hosts exposing these methods remotely must add their own authorization, audit, and rate limiting.

Rollback must pin request, promise-cache, fetch/manifest, and UI-cache consumers together. Before
running an older UI-cache version, stop unscoped/multi-tenant traffic or restore a known
scoped-only snapshot: older code can serve ambiguous entries again. Do not manufacture raw
fallback variants for this release. Setting all participating cache TTLs to `Infinity` is the
configuration-only retention rollback; pin coordinated package versions to remove the new
purge/lifecycle surfaces.
