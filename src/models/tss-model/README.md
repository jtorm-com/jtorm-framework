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
