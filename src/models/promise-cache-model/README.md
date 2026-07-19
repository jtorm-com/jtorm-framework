# @jtorm/promise-cache-model

Dependency-injected owner for bounded promise-cache mechanics, process-local absolute
expiration, and opt-in request-triggered stale acquisition. The caller retains its public
`c: Map`, `max`, `ttl`, `staleWindow`, key, loader, parser, and policy surfaces. Participating
jTorm acquisition caches default `ttl` to `300000` milliseconds and `staleWindow` to `0`.

```js
consumer.promiseCacheModel = promiseCacheModel;
consumer.staleWindow = 15000; // finite opt-in; zero is the default/kill switch
return promiseCacheModel.get(consumer, key, {
  load: () => request(),
  hit: async () => recheckPolicy(), // optional authorization/URL-policy guard
  check: capturedKey => recheckExactKey(capturedKey) // optional post-await identity guard
});
```

Validator-aware acquisition is an additive loader transaction. It is enabled only by exact
`validators: true`; otherwise `load()` is called with zero arguments exactly as before:

```js
return promiseCacheModel.get(consumer, key, {
  validators: true,
  load: transaction => conditionalRequest(transaction.validator()).then(async result => {
    if (result.status === 304) return transaction.reuse(result.validator);
    const value = await validate(result.value);
    transaction.accept(result.validator);
    return value;
  })
});
```

`validator()` returns metadata only while the exact owner Map/key/content promise/record and
generation are current. `accept()` stages a modified response's validator; call it only after all
consumer parsing and validation succeeds. `reuse()` accepts a bodyless result only when its
validator exactly matches the current pair and returns the exact prior public promise. Successful
settlement or SWR publication stores content and staged metadata in one private generation record.
Missing staged metadata clears any predecessor instead of pairing it with new bytes.

The owner deduplicates in-flight work, bumps successful-hit recency, removes only the rejecting
insertion's map/key/token identity, evicts least-recently-used entries, and retains the newest entry
when `max <= 0`. Successful settlement starts the absolute TTL; hits never slide it. Pending work
deduplicates without reading TTL, stale-window, or clock policy.

For finite `ttl`, the strict phases use the original successful-settlement timestamp:

- `age < ttl`: return the exact public promise.
- `ttl <= age < ttl + staleWindow`: return that old promise immediately and let the first eligible
  request start one refresh for the retained generation. The public Map stays on the old promise.
- `age >= ttl + staleWindow`: join the exact refresh if one is still running; otherwise detach the
  old generation and start one ordinary cold replacement.

A successful refresh atomically publishes its exact promise at fulfillment and starts a new TTL
from that time. Refresh start, stale hits, and failures never slide the deadline. Async rejection
or a synchronous loader throw leaves the old generation and permits a later eligible request to
retry; there is no timer, hidden retry loop, or failure backoff. An unguarded hard caller receives
the exact refresh promise. An async guarded caller receives a wrapper that adopts the same outcome,
because JavaScript async functions cannot preserve promise identity.

Missing or explicitly `undefined` `staleWindow` means `0`. Every finite nonnegative value is
accepted. Invalid or throwing window access is interpreted as `0`, preserving ordinary TTL
freshness while disabling stale service; subtraction-based boundaries require no `ttl + window`
overflow check. Runtime TTL/window changes reclassify the original timestamp. `ttl = 0` retains
pending deduplication only and does not read the window. `ttl = Infinity` is non-expiring and reads
neither window nor clock.

Invalid/negative TTL, invalid/throwing/regressing clock state, a clock-function identity change,
and missing timestamp participation fail fresh without turning cache unavailability into a load
error. Hosts may replace the dependency-injected `clock()` function for deterministic or
platform-specific time. Regressions within an epoch fail closed across all keys owned by that
cache. With the default wall clock, a backward system-time correction therefore causes ordinary
cold work until time reaches the prior owner high-water mark. Hosts that need to avoid that
availability window may inject a monotonic millisecond clock. This fail-fresh behavior never
extends retention.

When `hit()` is present, pending/fresh compatibility retains its existing pre-guard recency touch;
stale service and refresh wait for authorization. After `hit()`, optional `check(capturedKey)`
must rederive any async-sensitive identity before one current-state classification. A rejected
guard starts no stale refresh. If the generation changed while awaiting the guard, the caller
adopts recognized current work, loads uncached beside an untracked newer value, or inserts one
current-map cold generation as appropriate.

Supplying `hit()` and `check()` is consumer-owned. The cache passes no foreground/background flag
to `load()`, so existing loader or transport instrumentation can observe an acquisition and its
failure but cannot attribute it specifically to background refresh.

The public cache still contains promises. Timestamp, refresh, scope, and insertion records live in
a `WeakMap` keyed by the current cache Map and are bounded by its exact keys; replacing a host Map
is not retained. Detached loader promises can outlive those records but cannot publish back into a
purged, evicted, reset, replaced, or newer generation. Runtime source has no imports.

For an expired record with paired validator metadata, guarded consumers run their existing
`hit()`/`check()` policy before any hard revalidation. A successful 304 publishes a new public
promise adopting the exact prior value and starts a new TTL at fulfillment. Ordinary cache hits,
request start, and failures do not slide age. Purge, purge-all, eviction, `reset()`, Map
replacement, manual supersession, rejection, and newer work detach both content-reuse and metadata
authority. Work detached before pending installation remains caller-only and cannot touch the
public Map, LRU, records, or later publication.

Persistence owners that already validated a trustworthy elapsed age may call
`restore(owner, age, sampledTime)`. It applies the owner's current finite/zero/Infinity policy and
returns an opaque process-local insertion record; callers pass that record back to `stamp()` and
must not inspect or synthesize its fields. This keeps strict `< ttl`, clock identity, regression,
and timestamp representation in this model while a separate persistence owner retains an absolute
timestamp. `restore()` performs no clock read and never serializes clock identity.

An `undefined` key is the fail-closed bypass: `load()` runs normally, but the owner does not read,
insert, deduplicate, evict, or alter recency in `c`. Other key identities, including `null`, remain
generic API-compatible cache keys; request/cache consumers normalize their unscoped result to
`undefined` before delegation.

Administrative invalidation is explicit:

```js
promiseCacheModel.purge(consumer, exactKey); // 0 or 1; undefined is always a no-op
promiseCacheModel.purgeAll(consumer);        // number of entries removed
promiseCacheModel.reset(consumer);           // cold metadata/clock epoch after discarding a Map
```

Purging pending or refresh work detaches only future cache participation; it does not abort or
change an already returned promise. Late fulfillment/rejection cannot reinsert or delete a newer
generation. Preserve policy metadata when intentionally preserving `c` across warm renders; call
`reset()` only for a cold Map replacement.

A positive window is a latency/availability tradeoff, not an authorization or revocation mechanism.
Choose it per data sensitivity; do not enable it for authentication/authorization state, secrets,
payments, or regulated/erasure-sensitive content without a new threat review. Configure finite
transport lifetime plus source/concurrency controls where hung work matters. Detached loaders are
not cancelled, the next eligible request may retry after a fast failure, and serverless runtimes
may freeze best-effort refresh after returning stale. Use `staleWindow = 0` when refresh completion
must precede the response.

Acquisition purge cannot revoke values already returned or independently retained downstream.
Sensitive rollback sets `staleWindow = 0` and each acquisition owner's `validators = false`,
purges the acquisition owner, disposes prepared roots, and separately purges/saves
rendered-fragment persistence. Validator metadata is process-local and is never exported,
persisted, or available to rendered-fragment caching; rendered-fragment SWR remains out of scope.
