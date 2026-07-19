# jTorm TSS Model

Get TSS templates from the model with setting a cache ability.

## Install
```js
npm install @jtorm/tss-model
```


## How To

get: url

## Caching

Scoped parsed results are cached as the in-flight promise using `requestModel.cacheKey()`. The cache is a
bounded LRU — at most `max` entries are kept (default `512`, injectable), the
least-recently-used evicted beyond that. A rejected fetch is not cached. An array
of URLs is fetched per-part (each part cached individually) and concatenated. Successful parsed
results have an absolute `ttl` of `300000` ms by default; set this model's `ttl` independently.
`0` reuses only pending work and `Infinity` restores non-expiring reuse.

`staleWindow` defaults to `0`. A finite positive value makes the first scoped request at the TTL
boundary return the prior successful parsed-part promise immediately while starting one
best-effort fetch/parse refresh; concurrent stale callers share that generation and one refresh.
Success publishes only after fulfillment with a new absolute timestamp. Failure keeps the original
hard deadline, and at `age >= ttl + staleWindow` callers join any running refresh or await one
cold replacement. Array parts retain their independent keys, windows, and sequential result order.

Choose the window for transformation sensitivity and revocation needs. Use finite transport
lifetime and source/concurrency controls because detached work is not cancelled and serverless
execution may freeze after returning stale. `staleWindow = 0` is the kill switch. Acquisition
purge affects only future model participation and cannot revoke parsed trees or rendered/persisted
fragments already derived from them. HTTP validators and rendered-fragment SWR remain separate.

Cache admission remains the request-model key derived at call start. As before, a cache hit does
not rerun URL or authorization policy; hosts tightening that policy must purge affected keys.
Loader/transport instrumentation sees refresh as an ordinary acquisition and receives no
background-refresh marker from this API.

When `cacheKey()` is missing or returns `undefined`, `null`, or `''`, each TSS part is fetched and
parsed through the normal uncached path without touching the shared map. Array parts remain
sequential and ordered. Custom request models must return an explicit non-empty scoped key to
enable sharing; there is no URL/String fallback.

Inject `requestModel`, `tssParser`, and `promiseCacheModel`. The shared policy owner operates on
this model's live exported `c` and `max` fields; array sequencing and parsing remain model-owned.

`purge(urlOrUrls, context)` derives the same per-part scoped keys, removes each unique key once,
and returns the number removed. Repeated/nested array entries are deterministic and cyclic arrays
terminate. `purgeAll()` explicitly clears the complete TSS cache. Unscoped exact purge is `0` and
never broadens into a full purge.
