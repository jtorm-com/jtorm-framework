# jTorm TSS Model

Get TSS templates from the model with setting a cache ability.

## Install
```js
npm install @jtorm/tss-model
```


## How To

get: url

## Caching

Parsed results are cached (as the in-flight promise) keyed by URL. The cache is a
bounded LRU — at most `max` entries are kept (default `512`, injectable), the
least-recently-used evicted beyond that. A rejected fetch is not cached. An array
of URLs is fetched per-part (each part cached individually) and concatenated.

Inject `requestModel`, `tssParser`, and `promiseCacheModel`. The shared policy owner operates on
this model's live exported `c` and `max` fields; array sequencing and parsing remain model-owned.
