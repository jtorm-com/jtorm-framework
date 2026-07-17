# jTorm Cache Plugin

## Install
```js
npm install @jtorm/ui-cache-plugin
```

Inject a fully wired `@jtorm/ui-cache-model`; that model now requires the shared request-policy
owner as well as the render-context owner. Unscoped iteration reads miss and writes are ignored.
The plugin's event order, `cid`/`cs` handling, `v.r` behavior, and non-awaited after-view save
timing are unchanged. Persisted reload is quarantined until the host has cleared the old store and
sets an own `uiCacheScoped = true` field on the model's save adapter; inherited attestation is
ignored. See the model README for the migration contract.
