# jTorm - Javascript Template ORM

## Goal
We believe a general data model like [Schema.org](https://schema.org/) benefits different areas in the development of web applications.

We also believe there should be some consensus about generally known UI components, accordions, modals, tabs, etc., how it should look and function.

That combined, in feeding a template engine a schema markup that knows how to parse it based on its contents and desired UI framework, is what jTorm ultimately is trying to achieve.
But also having the freedom to do something different.

## Inline JSON-LD

Hosts may opt into `@jtorm/json-ld-plugin` with an injected `@jtorm/json-ld-model` to publish the
root schema.org-typed view model as one inline `application/ld+json` block after rendering. The
plugin owns only `script[data-jtorm-json-ld]`, updates/removes stale owned blocks, and preserves
hand-authored JSON-LD plus the existing external `.jsonld` alternate link.

Plugin registration asserts that the root model is already a curated public presentation model.
Unknown `@` controls such as `@meta`, `@config`, and `@template` are filtered recursively, but every
ordinary key is published. Never pass raw API, session, or authentication records; keep
authentication material in headers and project only authorized public fields before rendering.
Use root `@meta.jsonLd: false` as a per-model kill switch.

Serialization accepts strict plain JSON data, fails loud on accessors/cycles/exotic values, applies
depth/value/1 MiB UTF-8 limits, and escapes HTML raw-text delimiters before DOM insertion. It uses
`textContent`, adds no executable script or CSP relaxation, and mutates neither the model nor
unmarked scripts. See the two package READMEs for exact DI wiring, limits, CSP behavior, and
rollback steps.

## UI closure manifests

Applications may precompile a trusted UI component closure with
`@jtorm/ui-manifest-compiler`, then prepare the content-addressed JSON through
`@jtorm/ui-manifest-model` before rendering. `@jtorm/get-method` uses the prepared root-local index
when injected and otherwise preserves the existing data/HTML/TSS waterfall.

The compiler follows the existing resolver and parsers, records dynamic model-bound edges instead
of executing them, and emits parsed model-free assets. Runtime loading is bounded, validates the
wire format and SHA-256 against a host-pinned expected hash, and continues to enforce the existing
request URL policy. See the package READMEs for the build and host wiring contracts.

## Method effects and dispatch

TSS methods return a partial effect with `children`, `repeat`, and `data`; they do not mutate a
view-side control object. The injected handler executes normal names, aliases, and synthesized
nodes through one `dispatch()` lifecycle: data preparation, validation, before-event, method,
after-event, then effect normalization. Missing effects never repeat, gate methods default to
`children: false`, and explicit repeats fail loud after 100 lifecycle executions. Only own boolean
control fields are accepted; malformed or inherited values fall back to those safe defaults.

Hosts that synthesize method nodes must inject and call `jTormHandler.dispatch(view,
preparedData)`. Method packages publish the canonical JSDoc contract through `@jtorm/types`; the
runtime remains pure CommonJS with dependency injection and no runtime imports.

## Shared runtime policy owners

Hosts compose three shared policy models before rendering:

- `@jtorm/render-context-model` owns bounded, cycle-safe render-root traversal, strict own-link
  cache-root resolution, and namespaced root state. Normal render traversal remains compatible.
- `@jtorm/promise-cache-model` owns in-flight promise dedupe, insertion-safe rejection cleanup,
  bounded LRU mechanics, overridable clock policy, absolute TTLs, request-triggered acquisition
  refresh, atomic acquisition-validator generation records, rendered-fragment phase classification,
  opaque insertion-record rollback checkpoints, and purge metadata. Each cache retains its public
  value store, key, loader/render path, and independently configurable `ttl` and, where supported,
  `staleWindow`; the promise-cache owner never runs a rendered lifecycle.
- `@jtorm/asset-plugin-model` owns the shared CSS/JS collection, URL-policy, DOM insertion,
  dedupe, and cleanup lifecycle while both plugins retain their public facades.

Runtime packages still import nothing; hosts inject these owners into request, manifest,
layer, UI-cache, data/HTML/TSS, and CSS/JS collaborators. UI-cache now receives the same
promise-cache owner as fetch/manifest models. Publish render-context and
promise-cache first, then request-model, then asset-plugin-model, then the remaining consumer
release set. Rollback requires pinning the prior consumer versions together and restoring the
previous host DI graph.

Shared data, HTML, TSS, manifest-pack, and rendered-fragment caches participate only when the
request owner derives a valid explicit tenant/origin/base discriminator. Missing or malformed
scope continues through normal uncached rendering without retained state. A single-tenant host
can opt in by configuring a non-empty request base. Inject that same request model into UI-cache.
UI-cache `2.x` persists a version-1 rendered-fragment envelope with each fragment's original
successful-publication Unix-ms timestamp. Reload requires both an own data-property
`uiCacheScoped === true` adapter attestation and the recognized own wire version; inherited or
unversioned data stays cold. Every 1.x store lacks trustworthy settlement age, so cold-clear it or
externally construct v1 only from trustworthy original timestamps before enabling reload.

The five shared caches default to a finite absolute TTL of `300000` ms. Pending work continues to
deduplicate, successful hits do not slide expiry, `0` disables settled reuse, and explicit
`Infinity` is the configuration-only rollback to former retention. Data/HTML/TSS expose exact
URL/context `purge()` plus `purgeAll()`; manifest exposes exact descriptor/context purge for its
cross-render pack cache; UI-cache exposes exact render/language/cid/variant purge and an explicit
global purge requiring a valid scoped dirty root. Exact unscoped calls are always no-ops and never
infer full purge from `undefined`.

The four promise-backed acquisition caches—data, HTML, TSS, and manifest packs—also expose
`staleWindow`, defaulting to `0`. A finite positive value serves the prior successful promise
during the strict interval `ttl <= age < ttl + staleWindow` and lets that request start one
best-effort refresh for the retained generation. Successful refresh publishes at fulfillment and
starts a new absolute TTL; failure keeps the old hard deadline and a later eligible request may
retry. At the hard boundary, callers join an already-running refresh or wait for one cold
replacement. There are no timers, refresh-ahead, or failure backoff on the acquisition path.

Missing, invalid, or inaccessible `staleWindow` behaves as `0`: ordinary TTL freshness remains
available, but stale service is disabled. Every finite nonnegative window is accepted; strict
boundaries use subtraction rather than adding `ttl + staleWindow`.

Data, HTML, and TSS retain their existing admission model: the request-scoped key is derived at
call start, and cache hits do not rerun URL or authorization policy. Hosts tightening that policy
must purge affected acquisition keys. Manifest packs instead re-run URL policy and the exact key
check on every shared reuse. Existing loader/transport instrumentation sees acquisition attempts
and failures but receives no signal that distinguishes a background refresh from foreground work.

Those same four acquisition owners expose `validators`, defaulting to `false`. Exact `true` uses
the injected request model's additive conditional facade when an explicit scoped key and compatible
promise-cache transaction are available. A cold/modified 200 follows the ordinary parser and, for
manifests, the complete integrity/schema/bounds path before one bounded ETag (preferred) or
Last-Modified value is paired with that exact successful generation. Missing or invalid metadata
does not reject valid bytes and never carries a predecessor validator onto replacement content.

At TTL expiry or during SWR, the request model re-runs URL policy and rederives the exact scoped key
from the resolved URL immediately before sending one condition. A 304 reads no body and may publish
a new TTL only by reusing the exact current authorized content+validator pair. Ordinary hits never
slide or send. Purge, reset, eviction, owner Map replacement, rejection, and newer work detach both
content reuse and metadata authority. Validators are process-local response metadata: they are not
logged, exported, persisted, copied into rendered fragments, or interpreted as dates/server cache
semantics. Disabled, unscoped, or older/incompatible collaborators use the exact legacy request and
zero-argument loader paths.

Choose a positive window per content sensitivity, never as an authorization substitute. Avoid it
for authentication/authorization state, secrets, payments, or regulated/erasure-sensitive content
without a new threat review. Configure finite transport lifetime and source/concurrency controls:
detached loader work is not aborted, request-model's default timeout `0` is not cancellation, and
serverless runtimes may freeze after a stale response. Acquisition purge affects only future
acquisition-cache participation; it cannot revoke already returned data, prepared manifest
indexes, rendered fragments, or persisted fragment envelopes.

The acquisition kill switches are `staleWindow = 0` and `validators = false`; rollback then purges
the affected acquisition cache. Publish/retain promise-cache and request-model `1.2.0+` before
data, HTML, TSS, and manifest-model `1.2.0+`.

Rendered fragments expose an independent `staleWindow`, also defaulting to `0`, but no validators.
A positive window serves no rendered stale HTML unless the exact same stable `refreshModel` is
injected into UI-cache model and plugin before `init()`. The host supplies
`authorize/current/render/session/owns`, snapshots canonical inputs synchronously, creates one
isolated root, and returns a native Promise for its complete normal lifecycle. Literal current and
ownership decisions, exact authority identity, and a host-minted root session gate the work.

At `ttl <= age` while `age - ttl < staleWindow`, the first authorized caller receives exact
retained HTML and may start one attempt for that process generation; concurrent stale callers do
not wait or duplicate it. A start throw, malformed Promise, rejection, or lifecycle failure never
slides age or changes bytes, timestamp, recency, or dirty state, and the same generation is not
retried. A temporary fresh reclassification preserves its consumed-attempt marker. At the hard boundary no stale HTML is returned: an authorized independent root joins the
private running Promise, the refresh root bypasses itself, and otherwise the ordinary blocking
render lease applies. After settlement, the hard caller rechecks current scope/authority and runs
ordinary classification again, so purge, supersession, identity replacement, and re-init win
before consumption.

The cache's frozen zero-key capability contains no coordinates or authority. Exact generation,
scope, host epoch, and root-session checks repeat at activation, execution lookup, and publication.
Before the target's first iteration binds, coordinate drift or missing/malformed scope fails loud
before handler effects; after that bind, unrelated nested components retain ordinary lookup.
Completion publishes HTML, settlement time, process stamp, LRU position, and isolated-root dirty
revision in one synchronous rollback transaction. The refresh after-view path then awaits the
adapter save; adapter or later hook failure is host-visible but does not undo already-published
live HTML. Host rejection also closes a completed execution when an earlier after-view hook
prevents the cache save; dirty state remains retryable and no save is claimed. Exact/full purge, eviction, init, identity replacement, newer publication, scope drift,
session failure, or authority rotation detaches late work.

Wire v1 and its original Unix-ms `settledAt` remain unchanged. A restored stale record is a new
process-local generation and is admitted only while the same valid host stays configured.
Deploy promise-cache `1.3.0+`, UI-cache `2.1.0+`, and UI plugin `1.1.0+` together, inject a
nondecreasing restart-stable Unix clock, and finish `init()` before render roots. No framework
timer, retry loop, worker, or durability mechanism is added; the host owns lifetime extension,
cancellation, concurrency, and privacy-safe outcome telemetry, and serverless work may be frozen.

For sensitive rollback, set both stale windows to `0`, disable validators, rotate host authority,
dispose prepared/refresh roots, purge the affected caches, and clear/save UI persistence before
pinning the coordinated prior packages and DI graph. Mixed readers never share a store; before
downgrade, disable persistence and clear v1 or restore a reader-compatible snapshot. See the
UI-cache model README for the full host, wire, clock, privacy, deployment, and rollback contract.

## Credits
The idea is heavily inspired from [Transphporm](https://github.com/Level-2/Transphporm), all credits go to them in finding a different way to handle template rendering.

[Rinnert Deelstra](https://gitlab.com/rdeelstra) from [Webmakkers](www.webmakkers.com) initially built it, and hopefully in the near future others will join to discover its potential together.
