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
an ephemeral handler-wrapper token to deduplicate independent-root cold renders, stage bytes at
the existing after-iteration slot, and publish only after every existing after-iteration handler
succeeds. The event owner defers that publication until every completion hook succeeds too. Leases
are bound to both exported `cache` and `order` identities; replacing either detaches late work.
A configured-base call without a concrete render root bypasses its own same-key lease instead of
waiting on an identity it cannot distinguish. Four-argument direct `get()` remains a lookup and
never starts a render lease.

### Optional rendered-fragment stale revalidation

Rendered stale service is disabled by default. Opt in with a finite positive window and the exact
same stable host object on the model and plugin before cache initialization:

```js
uiCacheModel.staleWindow = 15000;
uiCacheModel.refreshModel = refreshHost;
uiCachePlugin.refreshModel = refreshHost;
await uiCacheModel.init();
```

The collaborator is a host lifecycle/session authority, not a loader:

- `authorize(view, coordinates)` returns a stable opaque object for the current authority epoch;
  hard-join authorization requires that exact object identity.
- `current(view, authority, coordinates)` returns literal `true` only while this caller, epoch,
  scope, and component remain authorized.
- `render(view, capability, coordinates, authority)` synchronously snapshots canonical inputs,
  starts one isolated-root render, and returns a native Promise observed in that same turn.
- `session(isolatedView, capability, authority, coordinates)` mints an opaque attestation for that
  exact root; `owns(...)` returns literal `true` only for that root/session/capability/epoch tuple.

All five methods must remain on the configured object. Rotate the authority object on logout,
revocation, root teardown, or host/plugin replacement. The frozen capability has zero own keys;
coordinates are frozen separately, and cache-private scope/generation data never crosses the seam.

For finite TTL, classification is strict and non-sliding: fresh when `age < ttl`, stale only when
`age >= ttl && age - ttl < staleWindow`, and hard otherwise. The first authorized stale caller
receives the exact retained HTML and may reserve one attempt for that exact process generation;
concurrent stale callers receive the same bytes without waiting or starting more work. A start
throw, non-native Promise, rejection, or lifecycle failure consumes that generation's attempt and
does not move bytes, timestamp, recency, or dirty state. A temporary fresh reclassification keeps
that consumed-attempt marker, so restoring the same insertion to stale cannot repeat lifecycle
work. There is no stale-if-error extension.

At hard expiry no caller receives stale HTML. An authorized independent root joins the private
running refresh promise when `authorize()` returns the same epoch object; the isolated refresh root
bypasses its own work to avoid recursion. If no valid running refresh exists, the ordinary blocking
cold-render lease applies.
After settlement, every hard follower re-derives scope and authority and restarts ordinary cache
classification; purge, full purge, supersession, identity replacement, and re-init therefore win
before bytes are consumed. A revoked caller or uninitialized replacement host receives no bytes.

The host calls `activate(isolatedView, capability, session)` before running the normal before-view,
handler/iteration/plugin, completion, and after-view lifecycle. Before the target's first
iteration binds, any language/component/variant mismatch or missing, malformed, cyclic, changed,
or unauthorized scope fails loud before handler effects. After the exact target binds,
different-coordinate nested components retain ordinary lookup behavior. The deferred completion hook
publishes only after the existing iteration and completion hooks succeed. New HTML, settlement
time, process stamp, LRU position, and the isolated root's dirty revision form one synchronous
rollback transaction. The later refresh after-view path awaits `save()` and then closes the root.
Adapter failure or a later after-view failure rejects the host lifecycle but does not undo an
already successful live publication. If an earlier after-view hook aborts before the cache save
hook, the observed host rejection still closes the completed execution; its dirty state remains
retryable and no save is claimed. External ordering and atomic durability remain host-owned.

Exact/full purge, eviction, re-init, cache/order replacement, promise-record reset, newer
publication, scope drift, session failure, host replacement, or authority rotation detaches late
publication. Restored wire-v1 stale entries become new process-local generations and load only
when the same valid host remains configured through `init()`; attempt state is never persisted.

The framework retains no foreground view and starts no timer, retry loop, worker, or durable job.
The host owns platform lifetime extension, cancellation, concurrency limits, and outcome telemetry.
Serverless runtimes may freeze best-effort work after the stale response. Keep `staleWindow = 0`
for authorization state, secrets, payments, regulated/erasure-sensitive HTML, or any flow where
refresh completion must precede response.
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
be O(n) for `n <= max`; normal hits remain O(1). Refresh publication snapshots at most `max`
order/pair records so it can roll every cache-owned representation back together, making that
completion O(max). The framework starts no timer, scheduler, worker, retry loop, or durable job;
active refresh coordination is bounded by `max`, and no foreground view is retained.

Adapter `get()` may return the envelope directly or a native Promise from any JavaScript realm.
The model adopts the Promise by its native brand rather than `instanceof`, so a cross-realm result
works while an arbitrary thenable or malformed envelope `then` accessor is not evaluated. Rejected
Promises and unsupported thenables fail cold like other adapter failures.

The current TTL applies to original age after restart. Finite entries always load when
`now - settledAt < ttl`. With a finite positive `staleWindow`, a valid stable refresh host may also
admit an entry when `age >= ttl && age - ttl < staleWindow`; that entry becomes a new process-local
generation with one available attempt. Entries at the strict hard boundary are omitted. `ttl = 0`
retains none and `ttl = Infinity` is explicitly non-expiring. Changing TTL/window between save and
restart evaluates the original timestamp under the new policy. Infinity keeps the timestamp on the
wire so a later restart under finite policy can enforce age. Process-local clock identity,
generation, attempt state, and freshness representation remain promise-cache-model/UI-cache-owned
and are never serialized.

### Migration, deployment, privacy, and rollback

Every 1.x/unversioned store lacks trustworthy settlement time, including a scoped-only attested
store. Never assign upgrade or reload time. The default migration is a cold clear or a new store
namespace. A host may externally construct exact wire v1 only when it has trustworthy original
successful-publication timestamps; the framework does not infer or migrate them.

Deployment order is: quiesce/disable old writers (or isolate a new namespace), cold-clear or
externally migrate, deploy promise-cache `1.3.0+`, UI-cache `2.1.0+`, plugin `1.1.0+`, and clock/reset
DI together. Configure the own adapter attestation and, when opting into rendered stale service,
the same stable refresh host on model and plugin. Finish `init()` before creating render roots, then
enable traffic/writes. Never share one namespace between old and new readers. Pre-init render roots
are not reusable after initialization, and changing the host after init makes stale service fail
closed until the cache is reinitialized with the intended host.

The runtime stale-service kill switch is `staleWindow = 0`; rotate/invalidate the host authority,
dispose active roots, and purge/save affected fragments when revocation matters. For package
rollback, first disable persistence, then clear wire v1 or restore a snapshot compatible with the
older reader, and only then pin/start the coordinated older packages and DI graph. Older versions
are not assumed to understand or safely reject this envelope. `ttl = Infinity` is an expiry-policy
rollback inside 2.x, not a wire-format rollback, and it must not be used to retain sensitive stale
HTML. Restoring stale service later requires the normal stable-host-before-`init()` sequence.

`settledAt` is persisted activity metadata. Give it the same tenant access control, encryption,
retention, purge/erasure, replica, and backup handling as its fragment. The runtime does not log or
use it for analytics. A positive rendered `staleWindow` deliberately retains and may serve the
same exact HTML after ordinary TTL expiry, so choose the window against the fragment's revocation
and erasure requirements; keep it zero for sensitive or identity-dependent content unless a domain
threat review accepts that bounded retention. The framework emits no refresh logs because HTML,
authority, session, scope, and capability data may be confidential. Host telemetry should record
bounded outcome/duration categories without raw HTML, authority/session objects, capabilities, or
tenant identifiers. HTTP validators (`ETag`/`Last-Modified`) remain acquisition-only and never enter
the rendered cache or wire.

`save()` writes newly scoped dirty state through any configured adapter; it awaits the adapter and
clears only an unchanged dirty revision, so a concurrent mutation or rejected save remains
retryable. For ordinary views, the UI plugin starts this save at the existing non-awaited
after-view point and preserves published timing. For an isolated refresh root, after-view returns
and awaits `save()`, then closes the execution in `finally`, so the host's lifecycle Promise can
observe adapter rejection. Live publication has already succeeded at completion and is not rolled
back by that later failure; dirty state remains retryable. Operators persisting an explicit purge
still call and await `save(scopedView)` themselves. `uiCacheScoped` controls reload only. The model
never clears external storage itself, and the adapter remains responsible for ordering concurrent
calls and making each payload durable atomically.

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
