# @jtorm/promise-cache-model

Dependency-injected owner for bounded promise-cache mechanics. The caller retains its public
`c: Map`, `max`, key, loader, parser, and policy surfaces.

```js
consumer.promiseCacheModel = promiseCacheModel;
return promiseCacheModel.get(consumer, key, {
  load: () => request(),
  hit: async () => recheckPolicy() // optional
});
```

The owner deduplicates in-flight work, bumps hit recency, removes only the rejecting promise's
own cache identity, evicts least-recently-used entries, and retains the newest entry when
`max <= 0`. Runtime source has no imports or stored consumer data.

An `undefined` key is the fail-closed bypass: `load()` runs normally, but the owner does not read,
insert, deduplicate, evict, or alter recency in `c`. Other key identities, including `null`, remain
generic API-compatible cache keys; request/cache consumers normalize their unscoped result to
`undefined` before delegation.
