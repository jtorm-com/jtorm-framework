# jTorm Cache Plugin

## Install
```js
npm install @jtorm/ui-cache-plugin
```

Inject a fully wired `@jtorm/ui-cache-model`; that model now requires the shared promise-cache,
request-policy, and render-context owners. Unscoped iteration reads miss and writes are ignored.
The plugin preserves event weights/order, `cid`/`cs`, `v.r`, locale, and the after-view save phase.
It now requires `@jtorm/event-model@^1.0.2` plus `@jtorm/handler-wrapper@^1.0.7`: the wrapper's
ephemeral token lets a miss deduplicate, stage at `afterIteration`, commit only at
`completeIteration`, and detach at `abortIteration`. The completion hook returns one deferred
commit, so a later completion-hook failure still publishes nothing. Nullish language retains the
existing persisted `null` coordinate; explicit language is copied through the detached wrapper.
`afterView` starts the model save without awaiting it, preserving the published render timing.
The model itself awaits the adapter and retains dirty retry state on failure; administrative callers
that require completion/error visibility call and await `uiCacheModel.save(scopedView)` directly.
Persisted reload is quarantined until the host has cleared the old store and
sets an own `uiCacheScoped = true` field on the model's save adapter; inherited attestation is
ignored. See the model README for the migration contract.
