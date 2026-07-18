# @jtorm/promise-cache-model

Dependency-injected owner for bounded promise-cache mechanics and process-local absolute
expiration. The caller retains its public `c: Map`, `max`, `ttl`, key, loader, parser, and policy
surfaces. Participating jTorm caches default `ttl` to `300000` milliseconds.

```js
consumer.promiseCacheModel = promiseCacheModel;
return promiseCacheModel.get(consumer, key, {
  load: () => request(),
  hit: async () => recheckPolicy() // optional
});
```

The owner deduplicates in-flight work, bumps hit recency, removes only the rejecting insertion's
map/key/token identity, evicts least-recently-used entries, and retains the newest entry when
`max <= 0`. Successful settlement starts the absolute TTL; hits never slide it. Pending work
deduplicates without a clock read. At `age >= ttl`, the entry is removed before recency or an
optional guarded-hit callback and the ordinary cold loader runs.

`ttl = 0` retains pending deduplication but never reuses a settled result. `ttl = Infinity` is the
documented non-expiring rollback setting and does not read the clock on hits or settlement.
Invalid/negative TTL, invalid/throwing/regressing clock state, and missing timestamp participation
fail fresh without turning cache unavailability into a load error. Hosts may replace the
dependency-injected `clock()` function for deterministic or platform-specific time. A clock
function replacement starts a new epoch; regressions within an epoch fail closed across all keys
owned by that cache. With the default wall clock, a backward system-time correction therefore
causes ordinary cold work until time reaches the prior owner high-water mark. Hosts that need to
avoid that availability window may inject a monotonic millisecond clock; replacing the clock
function deliberately starts a cold policy epoch. This fail-fresh behavior never extends retention.

The public cache still contains the original promises. Timestamp records live in a `WeakMap`
keyed by the current cache Map and are bounded by its exact keys, so replacing a host Map is not
retained. Runtime source has no imports.

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

Purging pending work detaches only cache participation; it does not abort or change the returned
promise. Late fulfillment/rejection cannot reinsert or delete a newer insertion. Preserve policy
metadata when intentionally preserving `c` across warm renders; call `reset()` only for a cold
Map replacement.
