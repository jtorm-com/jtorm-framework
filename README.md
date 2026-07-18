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

Hosts compose three stateless policy models before rendering:

- `@jtorm/render-context-model` owns bounded, cycle-safe render-root traversal, strict own-link
  cache-root resolution, and namespaced root state. Normal render traversal remains compatible.
- `@jtorm/promise-cache-model` owns in-flight promise dedupe, rejection cleanup, and
  bounded LRU mechanics while each fetch model retains its own cache, key, and loader.
- `@jtorm/asset-plugin-model` owns the shared CSS/JS collection, URL-policy, DOM insertion,
  dedupe, and cleanup lifecycle while both plugins retain their public facades.

Runtime packages still import nothing; hosts inject these owners into request, manifest,
layer, UI-cache, data/HTML/TSS, and CSS/JS collaborators. Publish render-context and
promise-cache first, then request-model, then asset-plugin-model, then the remaining consumer
release set. Rollback requires pinning the prior consumer versions together and restoring the
previous host DI graph.

Shared data, HTML, TSS, manifest-pack, and rendered-fragment caches participate only when the
request owner derives a valid explicit tenant/origin/base discriminator. Missing or malformed
scope continues through normal uncached rendering without retained state. A single-tenant host
can opt in by configuring a non-empty request base. Inject that same request model into UI-cache.
After upgrade, UI-cache quarantines persisted fragments until the host clears the old store and
sets an own `uiCacheScoped = true` field on its save adapter; inherited attestation is ignored,
and old unscoped and new scoped bytes cannot be
distinguished selectively. Perform that cleanup before enabling reload or any coordinated
rollback. TTL and explicit purge remain a separate architecture follow-up.

## Credits
The idea is heavily inspired from [Transphporm](https://github.com/Level-2/Transphporm), all credits go to them in finding a different way to handle template rendering.

[Rinnert Deelstra](https://gitlab.com/rdeelstra) from [Webmakkers](www.webmakkers.com) initially built it, and hopefully in the near future others will join to discover its potential together.
