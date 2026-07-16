# jTorm HTML Model

Get HTML templates from the model with setting a cache ability.

## Install
```js
npm install @jtorm/html-model
```


## How To

get: url

## Caching

Results are cached (as the in-flight promise) keyed by URL. The cache is a
bounded LRU — at most `max` entries are kept (default `512`, injectable), the
least-recently-used evicted beyond that. A rejected fetch is not cached.

Inject `requestModel` and `promiseCacheModel`. The shared policy owner operates on this model's
live exported `c` and `max` fields; replacing either host reset surface takes immediate effect.
