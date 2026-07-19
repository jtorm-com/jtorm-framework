# jTorm HTML Model

Get HTML templates from the model with setting a cache ability.

## Install
```js
npm install @jtorm/html-model
```


## How To

get: url

## Caching

Scoped results are cached as the in-flight promise using `requestModel.cacheKey()`. The cache is a
bounded LRU — at most `max` entries are kept (default `512`, injectable), the
least-recently-used evicted beyond that. A rejected fetch is not cached. Successful results have
an absolute `ttl` of `300000` ms by default; set this model's `ttl` independently. `0` reuses only
pending work and `Infinity` restores non-expiring reuse.

`staleWindow` defaults to `0`. A finite positive value makes the first scoped request at the TTL
boundary return the prior successful HTML promise immediately while starting one best-effort
refresh; concurrent stale callers share that generation and one refresh. Success publishes only
after fulfillment with a new absolute timestamp. Failure keeps the original hard deadline, and at
`age >= ttl + staleWindow` callers join any running refresh or await one cold replacement.

Choose the window for this template's sensitivity and revocation needs. Use finite transport
lifetime and source/concurrency controls because detached work is not cancelled and serverless
execution may freeze after returning stale. `staleWindow = 0` is the kill switch. Acquisition
purge affects only future model participation and cannot revoke already returned templates,
prepared roots, rendered fragments, or persisted fragment bytes. HTTP validators and
rendered-fragment SWR are separate policies.

Cache admission remains the request-model key derived at call start. As before, a cache hit does
not rerun URL or authorization policy; hosts tightening that policy must purge affected keys.
Loader/transport instrumentation sees refresh as an ordinary acquisition and receives no
background-refresh marker from this API.

When `cacheKey()` is missing or returns `undefined`, `null`, or `''`, the HTML request runs through
the normal uncached path. It does not read, populate, deduplicate through, evict from, or alter
recency in the shared map. Custom request models must return an explicit non-empty scoped key to
enable sharing; there is no URL/String fallback.

Inject `requestModel` and `promiseCacheModel`. The shared policy owner operates on this model's
live exported `c` and `max` fields; replacing either host reset surface takes immediate effect.
It also owns clock/expiration metadata, so hosts preserving `c` must preserve that policy state.

`purge(url, context)` removes exactly the request-model scoped key and returns `0` or `1`.
`purgeAll()` explicitly clears this model and returns its prior entry count. An unscoped or
malformed exact purge returns `0`; `undefined` never means full purge.
