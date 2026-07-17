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
least-recently-used evicted beyond that. A rejected fetch is not cached.

When `cacheKey()` is missing or returns `undefined`, `null`, or `''`, the HTML request runs through
the normal uncached path. It does not read, populate, deduplicate through, evict from, or alter
recency in the shared map. Custom request models must return an explicit non-empty scoped key to
enable sharing; there is no URL/String fallback.

Inject `requestModel` and `promiseCacheModel`. The shared policy owner operates on this model's
live exported `c` and `max` fields; replacing either host reset surface takes immediate effect.
