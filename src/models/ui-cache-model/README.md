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

The exported live `cache` stays `{language:{cid:{scopeNulVariant:html}}}`, but the save-adapter wire
is a public, incompatible version-1 envelope in `@jtorm/ui-cache-model@2`:

```json
{
  "version": 1,
  "fragments": [{
    "language": "en",
    "cid": "card",
    "variant": "https://tenant.example\u0000default",
    "html": "<article>cached</article>",
    "settledAt": 1000
  }]
}
```

Records are least-recently-used to most-recently-used. Each record pairs exact bytes and identity
with the Unix-epoch millisecond when that fragment was successfully published. Direct
`set()`/`put()` publish at live insertion; plugin renders publish in the deferred completion hook
after every handler/event succeeds. Render start, staging, save, reload, and hits do not change
`settledAt`, so hits remain non-sliding. The adapter receives one disconnected, recursively frozen
payload in one `set()` call. Mutation during an async save cannot mix old timestamps with new
bytes; same-root mutation or rejection keeps dirty retry state. Concurrent adapter calls retain
their existing immediate timing. Cross-call ordering, cancellation, and external atomic durability
remain adapter responsibilities.

Inject one restart-stable absolute clock before `init()` or rendering:

```js
uiCacheModel.persistenceClock = () => Date.now(); // nonnegative safe-integer Unix ms
```

All processes sharing a store must use the same epoch and a clock that does not regress across
restarts. A process-monotonic clock whose epoch resets at boot is invalid here. Clock-function
identity is never serialized. The model rejects future persisted timestamps and regression among
observations in one live generation. A restart regression that remains after every retained
timestamp cannot be detected without another persisted high-water, so correct age also depends on
the documented host clock. Invalid, throwing, unsafe, non-finite, fractional, negative, future, or
detectably regressing readings fail cold.

`init()` requires `saveModel.uiCacheScoped === true` as an own data property and independently
requires an own recognized `version`. Inherited/accessor-supplied attestation or version never
authorizes `get()`. The complete bounded envelope is descriptor-validated and staged before one
live-state swap. Unknown/unversioned, accessor-bearing, cyclic, prototype-polluted, duplicate,
mixed-validity, malformed, oversized, or adapter-failed input leaves an empty clean cache. Raw,
leading-NUL, multi-NUL, and NUL-bearing language/cid coordinates are invalid. Initialization may
be O(n) for `n <= max`; normal hits remain O(1). There are no timers, refresh jobs, or retained
render-context records.

The current TTL applies to original age after restart. Finite entries load only when
`now - settledAt < ttl` and receive only that remaining lifetime from the injected
promise-cache-model; `ttl = 0` retains none and `ttl = Infinity` is explicitly non-expiring.
Changing TTL between save and restart evaluates the original timestamp under the new policy.
Infinity keeps the timestamp on the wire so a later restart under finite policy can enforce age.
Process-local clock identity and freshness representation remain promise-cache-model-owned.

### Migration, deployment, privacy, and rollback

Every 1.x/unversioned store lacks trustworthy settlement time, including a scoped-only attested
store. Never assign upgrade or reload time. The default migration is a cold clear or a new store
namespace. A host may externally construct exact wire v1 only when it has trustworthy original
successful-publication timestamps; the framework does not infer or migrate them.

Deployment order is: quiesce/disable old writers (or isolate a new namespace), cold-clear or
externally migrate, deploy promise-cache `1.0.3+`, UI-cache `2.x`, plugin `1.0.3+`, and clock/reset
DI together, configure the own adapter attestation, finish `init()` before creating render roots,
then enable traffic/writes. Never share one namespace between old and new readers. Pre-init render
roots are not reusable after initialization.

For rollback, first disable persistence, then clear wire v1 or restore a snapshot compatible with
the older reader, and only then pin/start that reader. Older versions are not assumed to understand
or safely reject this envelope. `ttl = Infinity` is an expiry-policy rollback inside 2.x, not a
wire-format rollback.

`settledAt` is persisted activity metadata. Give it the same tenant access control, encryption,
retention, purge/erasure, replica, and backup handling as its fragment. The runtime does not log or
use it for analytics. Stale-while-revalidate and HTTP validator (`ETag`/`Last-Modified`) integration
remain separate follow-ups.

`save()` writes newly scoped dirty state through any configured adapter; it awaits the adapter and
clears only an unchanged dirty revision, so a concurrent mutation or rejected save remains
retryable. The UI plugin starts this save at the existing non-awaited after-view point; operators
persisting an explicit purge call and await `save(scopedView)` themselves. `uiCacheScoped` controls
reload only. The model never clears external storage itself.

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

Expiry, eviction, exact purge, full purge, and failed/late lifecycle publication remove live bytes
and matching settlement metadata together. A later successful save omits both. The adapter remains
responsible for applying that payload atomically to external storage.
