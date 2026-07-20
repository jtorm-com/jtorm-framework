# jTorm Cache Plugin

## Install
```js
npm install @jtorm/ui-cache-plugin
```

Inject a fully wired `@jtorm/ui-cache-model`; that model requires the shared promise-cache,
request-policy, and render-context owners. Unscoped iteration reads miss and writes are ignored.
The plugin preserves event weights/order, `cid`/`cs`, `v.r`, locale, and the after-view save phase.
It requires `@jtorm/event-model@^1.0.2` plus `@jtorm/handler-wrapper@^1.0.7`: the wrapper's
ephemeral token lets a cold miss deduplicate, stage at `afterIteration`, commit only at
`completeIteration`, and detach at `abortIteration`. The completion hook returns one deferred
commit, so a later completion-hook failure still publishes nothing. Nullish language retains the
existing persisted `null` coordinate; explicit language is copied through the detached wrapper.

Rendered-fragment stale revalidation is optional. Configure the exact same stable host object on
both collaborators before `uiCacheModel.init()`:

```js
uiCacheModel.refreshModel = refreshHost;
uiCachePlugin.refreshModel = refreshHost;
```

With that identity match, `beforeIteration` calls the model's classified `lookup()`, assigns exact
retained stale HTML to `v.r`, and synchronously asks the model to start any returned zero-key
capability. Concurrent stale callers do not start more work. When the host is missing, malformed,
or not the same object, the plugin calls the exact existing `get()` path; positive model policy alone
cannot start background work or serve rendered stale HTML.

The host owns `authorize/current/render/session/owns`, creates and activates one isolated root, and
runs the unchanged before-view, handler/iteration/plugin, completion, and after-view lifecycle.
Before the target iteration binds, coordinate drift or missing/malformed scope rejects the
isolated execution before handler effects; later unrelated nested components remain ordinary.
The normal completion hook publishes only after prior lifecycle work succeeds. Ordinary after-view
starts `save()` without awaiting it, preserving published timing. An isolated refresh after-view
instead awaits `save()` and closes the execution in `finally`, so the host lifecycle Promise sees
adapter failure; that later failure does not roll back an already successful live publication.
If an earlier after-view hook aborts after publication but before this hook, the host Promise's
rejection closes the completed execution through the model; dirty state remains retryable and the
plugin does not claim that `save()` ran.

Persisted reload remains quarantined until the host clears or validly migrates the old store and
sets own data property `uiCacheScoped === true` on the model's save adapter. Plugin `1.1.0+`
requires UI-cache model `2.1.0+` and promise-cache `1.3.0+` in the coordinated host graph. See the
model README for host signatures, strict boundaries, clocks, invalidation, migration, privacy,
observability, deployment, and rollback.
