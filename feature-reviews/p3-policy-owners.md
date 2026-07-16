# Feature Development: P3 Explicit Policy Owners

**Status:** COMPLETED
**Claimed:** 2026-07-16T10:21:34Z
**Agent:** Codex (GPT-5)
**Current Mode:** Complete — Merged as PR #51
**Source:** `feature-reviews/framework-architecture-review-2026-07-14.md` — P3

---

## Resumption Context

**Last Completed Mode:** Delivery (PR #51 merged into `dev`)
**Current Mode:** Complete
**Next Action:** None; PR #51 merged with green CI and clean current-head Codex review.
**Files Created:**
- Three new policy-owner packages, direct owner tests, AST ownership ratchet/helper, this feature
  record, completion evaluation, and differential security report.

**Files Modified:** Nine consumer packages and their docs/versions, the local host/reset graph,
focused model/plugin/pipeline tests, root/backlog docs, and the review outcome ledger.
**Tests Written:** Structural ownership/bypass ratchets; render-context and promise-cache owner contracts; finite request-cycle sentinel; in-flight cache, TSS sequencing, CSS/JS dedupe, document identity, failure-cleanup characterizations, and complete host-reset wiring.
**Issues Found and fixed:** The selected parent/cache/asset duplication; incomplete reset of newly wired asset collaborators; a local-helper bypass in the first AST ratchet; and an impossible first draft of the package release order.
**Design Decisions Made:** The shared promise-cache owner will absorb the UI-manifest pack cache's generic Map/LRU/identity-safe rejection machinery. UI-manifest retains guarded-hit acquisition wrapping, descriptor/hash validation, prepare generations, supersession, and atomic index installation. The maintainer selected three stateless injected policy-owner packages behind compatibility facades; consumer-owned caches, context namespaces, singleton fallbacks, and mutable reset surfaces remain in their published packages.

**Approved Design Sections:**
- Architecture and ownership: three new 1.0.0 packages (`render-context-model`, `promise-cache-model`, `asset-plugin-model`), existing packages as compatibility facades, parent depth bound 128, no `@jtorm/types` change.

**Workflow Override:** On 2026-07-16 the maintainer explicitly directed implementation immediately after the spec self-review, with no separate implementation-plan document or second spec-review approval. This overrides the cached Superpowers `writing-plans` and user-review handoff gates for this task; the comprehensive spec remains the pre-code contract.

**Context for Next Session:**
PR #51 merged head `cbe470a` into `dev` as `ee548c9` after green CI and clean current-head Codex review. The selected P3 DRY-debt slice and all delivery gates are complete; the remaining architecture backlog contains the independent parser and error-handler P3 items.

---

## Progress Log

### Research Mode
- [x] Read `AGENTS.md` and `continue.md`
- [x] Verified clean baseline at `1b28afb`
- [x] Loaded the required planning workflows
- [x] Mapped relevant packages, public surfaces, host DI, and tests
- [x] Recorded research summary

### Plan Mode
- [x] Explored design alternatives
- [x] Wrote feature specification

### Plan Quality Gate
- [x] Scope classified
- [x] Relevant review lenses applied
- [x] All 10 dimensions pass at plan level
- [x] STRIDE pre-analysis complete
- [x] Spec refined and approved

### Design Mode
- [x] Architecture constraints recorded
- [x] Threat and failure model recorded
- [x] Design validated against project red flags

### Implement Mode
- [x] Checkpoint 1: structural/source-ownership red test
- [x] Checkpoint 2: behavioral characterization and policy owners
- [x] Checkpoint 3: edge cases and bypass ratchets
- [x] Checkpoint 4: host DI and package integration

### Test Mode
- [x] Focused tests passing
- [x] Typecheck passing
- [x] Full suite passing
- [x] Publication dry-runs passing

### Red/Green Evidence

- **2026-07-16 structural red:** `node --test test/policy-ownership.test.js` failed 0/2 against untouched runtime source. The failure reported all three owner files missing, all ten required consumer delegations missing, and every duplicated context/cache/asset implementation still present. This is the intended ownership regression and occurred before any runtime source edit.
- **2026-07-16 characterization green:** 47/47 focused data/HTML/TSS/CSS/JS tests passed against untouched runtime source, including newly added in-flight dedupe, source-order sequencing, CSS dedupe, return-identity, and failure-cleanup locks.
- **2026-07-16 behavioral red:** the new render-context and promise-cache contract files failed because their owner modules did not exist, while the request cyclic-context sentinel terminated safely at its one-second parent deadline with `ETIMEDOUT`. The remaining 12 request tests passed. No runtime source had been edited.
- **2026-07-16 reset-review red/green:** the new complete-asset-graph reset test failed 6/7 because `cssMethod` remained poisoned; restoring method/plugin/request/resolver collaborators made it pass 7/7.
- **2026-07-16 ratchet-review red/green:** a local helper containing consumer cache/rejection code escaped the first method-scoped AST pass, failing 3/4; whole-file primitive inspection now catches relocation and passes 4/4 after a no-edit reread.
- **2026-07-16 final green:** architecture-focused flows pass 90/90, exact `npm test` passes 540/540, typecheck passes, Semgrep reports zero findings, and all twelve package dry-runs pass.
- **2026-07-16 first PR head:** CI passed and Codex reported no major issue on implementation commit `3183a49` with no review threads.
- **2026-07-16 current PR head:** CI passed and Codex reported no major issue on final head `cbe470a`; the maintainer merged PR #51 into `dev` as `ee548c9`.

### Review Mode
- [x] Required scoped reviews pass
- [x] 100/100 code quality
- [x] Fresh verification loop passes

### Documentation Mode
- [x] Package/root documentation updated
- [x] Architecture review and backlog updated
- [x] Completion evaluation and review ledger updated

## Research Summary

- **Modules involved:** root resolution appears in `@jtorm/request-model`, `@jtorm/ui-manifest-model`, `@jtorm/layer-model`, `@jtorm/ui-cache-model`, `@jtorm/css-plugin`, and `@jtorm/js-plugin`. Context-backed state appears in layer, UI-cache, CSS, and JS. Promise-LRU code appears in data, HTML, TSS, and—in a guarded-hit variant—the UI-manifest pack loader. Asset collection/insertion appears in the CSS/JS methods and plugins. The full-pipeline harness is the repository's local host-DI source of truth.
- **Context flow:** `view-model.create()` accepts a context object by reference. Detached fragments created by handler-wrapper and `each(e:)` set `c.p` to the parent context, while the handler restores `v.c`, `v.c.s`, and `v.c.a` lexically in `finally`. Layer/UI-cache/CSS/JS walk `v.c.p` to a root; request-model accepts either a view-like wrapper or context and returns the root `request` namespace when present; UI-manifest accepts a context directly.
- **Malformed/cyclic behavior:** UI-manifest uses a `Set` and returns `null` on a parent cycle, causing `prepare()` to reject `Manifest context invalid`; its test already uses a 2-second child-process sentinel. The other five walks are unbounded and do not detect a cycle. Non-object/missing contexts currently produce `null`; state consumers then fall back to their published singleton.
- **Context state semantics:** layer creates root-local copies seeded from exported singleton `event`/`layers`, including `cid`, `currentCid`, and a render-local dirty bit. UI-cache keeps exported cache/order stores global but puts only `updated` on the root. CSS/JS put `{cache, collection}` on their respective root namespaces. Child contexts receive an alias to the root namespace. Separate roots remain isolated; detached children share their root.
- **Fetch-cache semantics:** data and HTML differ only by `.json()` versus `.text()`. TSS adds sequential per-part array loading and text-to-parser transformation. All use the exported `c: Map`, exported `max`, public `key()`, in-flight promise storage, hit recency, identity-safe rejection eviction, and the same degenerate-maximum rule that retains the newest entry. Request-model owns URL normalization/policy and cache identity. UI-manifest repeats the same Map/LRU/rejection core around hash-bound pack loading, but rechecks URL policy on hits and keeps prepare generations/index installation separate.
- **Asset lifecycle semantics:** CSS/JS methods queue full parsed descriptors into per-render state. Plugins retain exported singleton `cache`/`collection`, adopt legacy singleton queues into root state, expand aliases through the resolver, derive a document base only when request base is absent, normalize and await the request allow policy before DOM writes, insert into `head`, dedupe by the original href/src, clear state in `finally`, and return the same document wrapper. CSS additionally owns link attributes, custom/default `rel`, and media-print defer restoration; JS owns script attributes and src.
- **Published compatibility surface:** existing `context`, `state`, `adopt`, `process`, and `afterView` methods are observable and must remain on CSS/JS. The analogous public methods/fields on request, manifest, layer, UI-cache, data, HTML, and TSS remain mutable singleton/reset seams. New collaboration must therefore be injected behind forwarding facades, not replace exported stores or methods.
- **Existing behavior locks:** focused model coverage exercises isolation, dirty state, persisted cache shape, URL identity/policy, LRU, retries, AST identity, manifest cycles, guarded hits, and prepare races. Plugin coverage exercises attributes, alias expansion, fail-closed pre-write checks, isolation, and legacy adoption. Pipeline coverage exercises detached child sharing, layer/event ordering, manifest integration, host wiring, and source purity.
- **Baseline verification:** 74/74 focused model tests, 22/22 focused plugin/method tests, and 22/22 focused pipeline/source tests pass on untouched runtime source at `1b28afb`.
- **Package/publication boundary:** every directory under `src/**` is independently published. Any new owner is a 1.0.0 pure-JS CommonJS singleton with no runtime imports. Every source-touched existing package needs a patch release, metadata-only dependency wiring, host injection, a dry-run, and singleton reset coverage.
- **Documentation shape:** the repository has no `docs/` feature tree. Canonical surfaces are `AGENTS.md`, root/package READMEs, the selected architecture review/backlog, this feature record, a completion evaluation, and `.claude-tasks/agent-outcomes.jsonl`.
- **Constraints discovered:** preserve lexical scope, root isolation/child sharing, singleton fallback, legacy queue adoption, dirty-state timing, request policy, manifest prepare/supersession, all cache identities and ordering, DOM/event behavior, all exports/packages, zero runtime imports, pure JS/JSDoc, and terse singleton style. Parser, sanitizer, tenant fail-closed/TTL redesign, effects, and error-handler work remain out of scope.
- **Open questions:** None. The maintainer confirmed that the manifest pack cache's generic promise-LRU mechanics join the shared owner while guarded-hit acquisition wrapping and prepare generation/index ownership remain in `ui-manifest-model`.

## Feature Spec

# Feature Spec: Explicit Shared Policy Owners

**Date:** 2026-07-16
**Author:** Codex (GPT-5)
**Status:** Approved for implementation

### Problem Statement

A jTorm maintainer changing render isolation, fetch-cache safety, or CSS/JS URL handling must currently edit the same policy in as many as six independently published packages. Those copies have already drifted: UI-manifest detects cyclic parent contexts while five sibling walks can hang a render worker, and every cache or asset-policy correction requires shotgun edits. The observable cost is avoidable denial-of-service exposure, a larger runtime, and compatibility/security fixes that can silently land in one path but not its twins.

### Scope

#### In Scope

- Add three small, independently published, injected runtime policy owners for render-context/state resolution, promise-cache/LRU behavior, and CSS/JS asset-plugin lifecycle.
- Keep all existing packages as public compatibility facades with their current exports, methods, mutable singleton fields, host reset surfaces, and `this`-based override behavior.
- Make every render-parent walk cycle-safe and bounded to 128 parent edges by default while retaining each consumer's existing invalid-context response.
- Move the common promise-Map lifecycle from data, HTML, TSS, and UI-manifest pack loading into one owner while retaining caller-owned caches, keys, loaders, parsers, hit guards, and manifest preparation.
- Move shared CSS/JS collection adoption, URL derivation and policy enforcement, DOM insertion lifecycle, dedupe, and cleanup into one owner while preserving declarative element differences.
- Add structural ownership/bypass ratchets, finite cycle sentinels, behavior characterizations, host wiring, package metadata/versioning, documentation, review evidence, and publication dry-runs.

#### Out of Scope (Non-Goals)

- TSS parser replacement, parser arithmetic, grammar, or selector behavior.
- Error-handler/debug-output changes or sanitizer `clean()` consolidation.
- Tenant fail-closed redesign, cache TTL/purge semantics, persistent-cache redesign, or new URL/SSRF policy semantics.
- Returned-effect/P2 lifecycle changes, UI resolution/compiler changes, or manifest graph discovery changes.
- Deleting/deprecating packages, exports, methods, singleton fields, or compatibility surfaces.
- Handwritten TypeScript/declarations, a broad utility package, runtime imports, or third-party runtime dependencies.

### Requirements

#### Functional Requirements

1. `@jtorm/render-context-model` is the sole implementation of root-parent traversal and generic namespaced root-state attachment.
2. Root lookup accepts either a view-like object whose `.c` is an object or a context directly, returns the terminal object for a valid chain, and returns `null` for missing/non-object, cyclic, or over-limit chains.
3. The default parent-edge maximum is exported/injectable as `max: 128`; a root with no parent remains valid even when a host configures a degenerate maximum.
4. State resolution initializes a root namespace once, aliases it onto a child context, leaves lexical `s`/`a`/`b`/`locale` fields untouched, and returns the calling singleton when no valid context exists.
5. Layer state retains singleton seeding/copying, child sharing, `cid` stack behavior, dirty semantics, persistence timing, and post-save cleanup. UI-cache retains shared exported cache/order stores and render-local dirty state.
6. Request `context()` retains final `request`-namespace extraction and singleton option defaults. UI-manifest `root()`, `prepare()`, supersession, and lookup responses retain their current behavior.
7. `@jtorm/promise-cache-model` is the sole implementation of promise hit recency, in-flight storage/dedupe, identity-safe rejection eviction, bounded LRU eviction, and the newest-entry-preserving degenerate maximum.
8. The promise owner always operates on the caller's current exported `c` Map and `max`; replacing either field through a host reset takes immediate effect.
9. Consumer public `key()`/`cacheKey()` methods continue to determine integer and same-content array URL identities. Data loads JSON; HTML loads text; TSS sequentially resolves arrays in source order, awaits text before parsing, and returns the same parsed AST identity on hits.
10. UI-manifest uses the common promise lifecycle for hash-bound pack acquisition but retains acquisition-error tagging, guarded-hit checks, descriptor/hash/schema limits, prepare generations, supersession, and atomic index installation.
11. `@jtorm/asset-plugin-model` is the sole implementation of CSS/JS root state, singleton-queue adoption, sequential processing, UI alias expansion, document-base fallback, request URL normalization/allow checks, head insertion, original-key dedupe, and `finally` cleanup.
12. Asset URL policy is awaited before any DOM creation/append. A blocked URL or insertion failure rejects the current operation and still clears the adopted render collection/cache in `afterView()`.
13. CSS retains every declared truthy attribute except control/url fields, default/custom `rel`, and media-print defer with data-only media restoration. JS retains every declared truthy attribute except `src` and dedupes by original `src`.
14. CSS/JS methods continue queuing the full resolved descriptor; CSS/JS plugins retain `cache`, `collection`, `event`, `context`, `state`, `adopt`, `process`, and `afterView`, and `afterView` returns the same document wrapper.
15. Existing request, manifest, layer, UI-cache, data, HTML, TSS, CSS, and JS singleton fields remain observable and mutable; injected/custom method overrides still flow through the compatibility methods used today.
16. Host wiring injects all three owners before rendering. Missing owner wiring fails loudly; no runtime package imports another package.
17. Source ratchets reject duplicate parent walks, promise-LRU/rejection algorithms, CSS/JS URL/DOM lifecycle implementations, missing owner delegation, dependency-minimum drift, and runtime-import/pure-JS violations.
18. Every cyclic-context regression runs in a child process with a finite deadline and can never hang the Node test runner.

#### Non-Functional Requirements

- **Performance:** valid root lookup is O(depth), bounded to 128 and at most 128 `Set` entries; cache hit/miss remains average O(1); TSS and asset sequencing remains unchanged; no new network, parser, or DOM work occurs.
- **Security:** cyclic parent chains cannot exhaust a worker; caches remain bounded and policy-keyed; manifest cache hits remain explicitly guarded; data-bound CSS/JS URLs still pass the injected allow policy before DOM writes; no new sink or trust boundary is introduced.
- **Compatibility:** existing public package/module names, exports, fields, methods, argument/return behavior, singleton fallback, legacy adoption, error text, and event ordering remain. New required DI is documented and versioned as one coordinated release set.
- **Maintainability:** each new owner has one cohesive policy family, no owner stores consumer data, and consumers contain only domain-specific behavior plus forwarding facades.
- **Type safety:** canonical `ViewContext` and view/effect contracts do not change, so `@jtorm/types` remains untouched. New source is strict pure JavaScript with JSDoc only where it improves an exported contract.
- **Accessibility:** N/A; rendered semantics, focus, interaction, and user-visible UI do not change.

### Architecture and API Contract

There is no HTTP/API endpoint change. Three injected CommonJS singletons are added:

```js
// @jtorm/render-context-model
jTormRenderContextModel.max = 128;
jTormRenderContextModel.context(viewOrContext); // root object or null
jTormRenderContextModel.state(owner, view, descriptor); // root namespace or owner fallback

// descriptor: { n: 'layer'|'uiCache'|..., f?: 'freshState' }
// `f` names an owner factory; without one a fresh plain object is created.

// @jtorm/promise-cache-model
jTormPromiseCacheModel.get(owner, key, {load, hit}); // Promise/value promise
// owner.c and owner.max remain the live cache/reset surfaces; hit is optional.

// @jtorm/asset-plugin-model
jTormAssetPluginModel.context(plugin, view, profile);
jTormAssetPluginModel.state(plugin, view, profile);
jTormAssetPluginModel.adopt(plugin, view, profile);
jTormAssetPluginModel.url(plugin, view, rawUrl);
jTormAssetPluginModel.element(plugin, view, {asset, resolvedUrl, profile});
jTormAssetPluginModel.process(plugin, view, {asset, profile});
jTormAssetPluginModel.afterView(plugin, view, profile);
```

`render-context-model.state()` deliberately resolves through `owner.context(view)`, so a published consumer's custom `context` override remains effective. It uses `descriptor.n` as the namespace and calls `owner[descriptor.f]()` when a domain-specific fresh state is required. Layer and UI-cache own those factories; asset-plugin-model initializes its own `{cache, collection}` shape after generic namespace creation.

The asset owner consumes one small package-private frozen profile constant in each plugin; it is not added to the published singleton surface:

| Plugin | Namespace/key/tag | Attribute exclusions | Variant behavior |
|---|---|---|---|
| CSS | `css` / `href` / `link` | `defer`, `href` | default/custom `rel`; optional media-print defer |
| JS | `js` / `src` / `script` | `src` | script attributes and `src` |

All compatibility methods call the injected owner with `this` and the private profile; the policy owner therefore reads each plugin's existing `requestModel`, `uiResolverModel`, and method `params` fields rather than centralizing or replacing those host surfaces.

### Data and Failure Flows

#### Render context/state

```text
consumer compatibility context(value)
  -> render-context-model unwraps view.c when object
  -> walk parent objects with Set + edge counter
       valid terminal root -----------------------> return root
       missing / cycle / >128 --------------------> return null

consumer state(view)
  -> render-context-model.state(consumer, view, descriptor)
       no root -----------------------------------> return published singleton
       root namespace absent ---------------------> create once via factory/plain object
       child context -----------------------------> alias child[namespace] to root state
       return root state
```

The owner never reads or writes lexical scope fields. UI-manifest continues converting a `null` root into `Manifest context invalid` for `prepare`; its lookup still behaves as an unprepared miss. Request-model still selects `root.request` when present. State users retain singleton fallback by contract.

#### Promise cache

```text
consumer computes public key
  -> promise-cache-model reads current owner.c
       hit: delete+set to bump recency
            -> optional onHit (manifest URL guard)
            -> return cached promise/value
       miss: call domain loader once
            -> attach identity-checked rejection eviction
            -> insert promise before any await (concurrent dedupe)
            -> evict oldest entries while size > owner.max,
               never evict the just-added key
            -> return promise
```

Data/HTML/TSS retain request-model cache identities and miss-path policy checks. UI-manifest supplies its existing guarded-hit wrapper, so a cached pack is never returned before the current context's allow policy succeeds. Manifest acquisition errors remain tagged in UI-manifest, outside the generic owner.

#### CSS/JS lifecycle

```text
method.handle(view) -> plugin.state(view).collection.push(resolved descriptor)
event after.view -> plugin.afterView(view) -> asset owner
  -> adopt legacy singleton queue into root state and reset singleton queue
  -> for each descriptor, sequentially:
       dedupe original href/src
       resolver.parseUrl
       preserve request base or derive guarded document base
       requestModel.url -> await requestModel.allow
       blocked -----------------------------------> reject before DOM write
       allowed -> create configured link/script -> append to head -> mark dedupe
  -> finally replace state.cache and state.collection with fresh empty values
  -> return view.h
```

The owner continues calling the plugin's published `process()` from `afterView()`, preserving custom process overrides. Likewise, generic state resolution goes through the plugin's published `context()`.

### Affected Components

| Component | Change Type | Risk |
|---|---|---|
| `src/models/render-context-model` | New 1.0.0 bounded root/state owner | High |
| `src/models/promise-cache-model` | New 1.0.0 promise-LRU owner | High |
| `src/models/asset-plugin-model` | New 1.0.0 CSS/JS lifecycle owner | High |
| `src/models/request-model`, `layer-model`, `ui-cache-model`, `ui-manifest-model` | Compatibility delegation and injected owner metadata | High |
| `src/models/data-model`, `html-model`, `tss-model` | Cache delegation with domain loaders retained | High |
| `src/plugins/css-plugin`, `js-plugin` | Private profile + compatibility forwarding facades | High |
| `test/helpers/engine.js`, pipeline wiring | Inject owners and reset shared mutable configuration | High |
| focused model/plugin/pipeline/source tests | Red ratchet, characterization, cycles, boundaries, wiring | High |
| `AGENTS.md`, root/package READMEs, architecture review, evaluation/ledger | Ownership and release contract | Low |

### Package Release Set

| Package | Planned version | Direct coordinated minima |
|---|---:|---|
| `@jtorm/render-context-model` | 1.0.0 | none |
| `@jtorm/promise-cache-model` | 1.0.0 | none |
| `@jtorm/request-model` | 1.1.4 | render-context 1.0.0 |
| `@jtorm/asset-plugin-model` | 1.0.0 | render-context 1.0.0; request 1.1.4; UI resolver 1.0.0 |
| `@jtorm/ui-manifest-model` | 1.0.1 | render-context 1.0.0; promise-cache 1.0.0; request 1.1.4 |
| `@jtorm/layer-model` | 1.0.2 | render-context 1.0.0 |
| `@jtorm/ui-cache-model` | 1.0.5 | render-context 1.0.0 |
| `@jtorm/data-model` | 1.0.5 | promise-cache 1.0.0; request 1.1.4 |
| `@jtorm/html-model` | 1.0.5 | promise-cache 1.0.0; request 1.1.4 |
| `@jtorm/tss-model` | 1.0.5 | promise-cache 1.0.0; request 1.1.4; existing TSS parser |
| `@jtorm/css-plugin` | 1.0.5 | asset-plugin 1.0.0; request 1.1.4; existing method/resolver |
| `@jtorm/js-plugin` | 1.0.5 | asset-plugin 1.0.0; request 1.1.4; existing method/resolver |

Only the twelve packages listed above are released: three new owners and nine directly modified consumers. CSS/JS methods, get-method, layer method/plugin, UI-cache plugin, and manifest tooling retain compatible public calls and existing caret ranges, so their manifests are not touched. Every listed package receives its stated version and dry-run; no unrelated dependency graph is rewritten.

### Dependencies

- Existing native `Map`, `Set`, `URL`, Promises, DOM adapter, request model, resolver, and host DI only.
- No external runtime dependency, database, API endpoint, worker, queue, schema, build step, or generated source.
- Publish render-context and promise-cache first, request-model second, asset-plugin-model third, and the remaining consumer patches last; host wiring updates atomically with the consumer set.
- Critical path: structural red ratchet -> behavioral/cycle evidence -> foundational owners -> request facade -> asset owner -> remaining facades/host DI -> versions/docs -> verification/reviews -> PR/current-head review.

### Security Assessment and Threat Model

#### Scope and Trust Boundaries

```text
host-trusted TSS + render context + injected collaborators
        |                       |
        | context/state         | URL/cache policy configuration
        v                       v
render-context owner      request-model / resolver
        |                       |
        v                       v
root-local state      data-bound asset URL --[untrusted-data boundary]-->
        |                       |
        |                       v
promise-cache owner       asset-plugin owner
        |                       |
        v                       | await allow before write
caller-owned caches             v
                          document <head>

UI-manifest prepare/index remains a separate root-local atomic owner.
No new network path or authorization boundary is introduced.
```

Assets are render-worker availability, root/tenant output isolation, cached artifact confidentiality/integrity, URL-policy enforcement, DOM integrity, manifest atomicity, and compatibility of published host controls. Actors are untrusted model data that can reach CSS/JS URLs, a buggy/custom host collaborator, and malformed host-created context graphs. Render contexts and TSS code remain host-trusted.

#### STRIDE

- **Spoofing:** No identity/authentication primitive changes. A custom injected owner could impersonate policy behavior only with existing host code-execution authority. Mitigation: explicit host wiring assertions and source/dependency ratchets. Residual risk: trusted host DI can replace any singleton today and remains trusted.
- **Tampering:** A refactor could bypass request URL policy, alter cache keys, mutate lexical fields, or install a stale manifest index. Mitigation: compatibility facades, allow-before-DOM ordering, caller-owned public keys, manifest-local generation identity, behavior tests, and direct-bypass source guards.
- **Repudiation:** No durable audit boundary exists or is added. Existing event ordering and thrown errors remain; the task does not add user actions or security audit events. N/A with no changed accountability claim.
- **Information Disclosure:** Cross-root state/cache reuse could expose one render's assets/fragments/pack to another. Mitigation: root namespacing, child-to-root aliasing, request policy keys, guarded manifest hits, separate exported model caches, interleaving tests, and no new global registry.
- **Denial of Service:** Cyclic/unbounded parents can currently hang; duplicate caches can drift to unbounded behavior. Mitigation: bounded/cycle-safe root lookup, finite child-process regression, bounded promise LRU including degenerate maxima, sequential existing TSS/assets, and cleanup on rejection.
- **Elevation of Privilege:** A data-bound JS/CSS URL could gain script/style execution if policy checks are skipped. Mitigation: resolver expansion followed by request normalization and awaited allow check before element creation/append, fail-closed errors, DOM-unchanged tests, and source ratchets forbidding plugin-local bypasses.

#### Attack Trees

```text
Compromise render isolation or availability
  OR-- hang worker with parent graph
  |     OR-- self cycle              -> bounded owner + deadline test
  |     OR-- multi-node cycle        -> bounded owner + deadline test
  |     OR-- excessive acyclic depth -> max 128 + boundary tests
  OR-- cross-render state disclosure
  |     OR-- child gets singleton instead of root namespace -> sharing tests
  |     OR-- one root sees another root's queue/layers       -> interleaving tests
  |     OR-- stale rejection deletes newer cache promise    -> identity test
  OR-- inject blocked external asset
        AND-- data controls href/src
        AND-- lifecycle bypasses request allow -> impossible by owner choke point + source guard
```

This is not a new high-value payment, identity, PII, or trust-boundary flow, so full PASTA is N/A. The relevant attack chains are covered by the DFD, all six STRIDE categories, attack trees, concrete controls, and linked tests. Existing host URL-policy/SSRF depth and tenant fail-closed behavior are unchanged residuals explicitly outside this task.

#### Control-to-Test Linkage

| Threat/control | Verification |
|---|---|
| Parent cycle/depth DoS | child-process timeout sentinel; exact-max/max+1 tests; all consumer facade wiring |
| Root isolation/child sharing | render-context unit tests; layer/UI-cache/plugin interleaving and detached pipeline tests |
| Promise race/leak/LRU | owner unit tests plus data/HTML/TSS/manifest behavior and retry/race tests |
| URL-policy bypass/EoP | CSS/JS blocked-expanded/document-base tests; no DOM write; ownership source ratchet |
| Cleanup/availability | CSS/JS `afterView` success/failure cleanup and returned-document tests |
| Manifest stale install | existing concurrent prepare/supersession/guarded-hit suites after cache delegation |

Residual risk is accepted for this library scope: a host with code-execution authority can inject a malicious policy owner, and a host that intentionally configures a very small context maximum can force singleton fallback/manifest rejection. Both are explicit host-controlled configuration, not untrusted input. Re-evaluate if context parents become remotely supplied, URL policy ownership changes, or a stateful central registry is introduced.

### Risk Assessment

| Risk | Likelihood | Impact | Owner | Mitigation |
|---|---|---|---|---|
| Compatibility facade changes an override/reset behavior | Medium | High | Implementer | Public-surface characterization, caller-owned fields, `this` forwarding, source/API ratchet |
| Context owner aliases or falls back incorrectly | Medium | High | Implementer | root/child/separate-root/malformed/cycle/max tests plus detached pipeline |
| Generic cache changes hit order, retry, or promise identity | Medium | High | Implementer | direct owner tests and all four consumer suites; manifest hit hook remains local |
| CSS/JS descriptor loses one variant attribute/lifecycle rule | Medium | High | Implementer | side-by-side plugin tests for every attribute, rel/defer, dedupe, ordering, cleanup |
| Owner DI/version set is partially deployed | Medium | High | Maintainer/host | dependency minima, wiring tests, package READMEs, release DAG, atomic host update |
| Source ratchet over-matches comments or misses syntax variants | Medium | Medium | Implementer | positive/negative scanner fixtures and behavior tests; ratchet targets ownership signatures |
| Default depth rejects legitimate extreme nesting | Low | Medium | Maintainer/host | injectable documented max, exact boundary test, no effect on ordinary depth 0-2 flows |
| Existing URL/tenant policy limitations mistaken for this refactor | Low | High | Reviewer | explicit scope, policy-preservation tests, no semantic expansion, residual-risk note |

### Trade-offs Considered

| Decision | Alternatives considered | Why this one |
|---|---|---|
| Three stateless policy owners | One miscellaneous runtime-policy package; stateful configured registries | Cohesive SRP/DIP boundaries without hidden state or a utility grab bag |
| Existing packages as facades | Delete/move public methods and fields; compatibility shim imports | Preserves published Hyrum-law surfaces and zero runtime imports |
| Caller-owned cache/state | Central owner registry; owner-specific cache instances | Host resets, independent caches, root namespaces, and singleton fallback remain observable |
| Include UI-manifest generic LRU | Consolidate only data/HTML/TSS; move all manifest preparation | Leaves one algorithm implementation while retaining manifest's cohesive atomic policy |
| Set + default max 128 | Unbounded walk; Set-only cycles; Floyd cycle detection | Clear O(depth) behavior, deterministic acyclic bound, and simple reviewable implementation |
| Package-private declarative CSS/JS profile | Duplicate per-plugin lifecycle; exported config; plugin callback hooks for every step | Shared lifecycle stays centralized, genuine element differences remain explicit data, and no new plugin field becomes public surface |
| Required host DI with coordinated patches | Runtime `require()`; fallback duplicate implementation | Obeys locked DI/import rules and avoids a second hidden policy implementation |

### Blast Radius

| Dimension | Answer |
|---|---|
| Direct dependencies | Native JS/DOM, request model, resolver, existing context shape, package metadata, host DI |
| Direct dependents | Every request/data/HTML/TSS/manifest lookup; layer/UI-cache render state; CSS/JS methods/plugins; local host harness |
| Cascade on outage | Missing/miswired owner can fail affected renders; wiring tests and coordinated package release prevent partial rollout |
| Cascade on slow | Context resolution is capped; cache remains O(1); asset/TSS sequencing unchanged; no new I/O |
| Cascade on bad data | Malformed context becomes existing fallback/invalid response; rejected cache loader evicts only itself; blocked asset fails before DOM |
| Compromised-session impact | N/A: no session/auth surface; cross-root cached/render state remains isolated by existing request/root identities |
| Fault isolation boundary | Current render/promise/plugin lifecycle; `finally` clears asset state, lexical handler `finally` remains untouched, manifest generations reject stale work |

### Rollback Plan

| Item | Answer |
|---|---|
| Code rollback | Before publication, revert the feature commit/PR. No migration/generated runtime source exists. |
| Schema rollback | N/A; no database/schema. |
| Data rollback | N/A; no durable data format changes. Existing cache/state shapes remain identical. |
| Auto-rollback trigger | Any focused/full/type/source/package/CI failure or valid current-head Codex finding blocks merge/publication; repository has no automatic deployment. |
| Manual rollback runbook | Hosts pin the prior consumer package set and prior bootstrap; after npm publication, ship correcting patches rather than deleting packages/exports. |
| Last rollback drill | Dry-run every release package and run prior behavior goldens; first release of these owners, so immutable-version pinning is the consumer rollback. |

### Test Strategy and Red/Green Evidence Contract

1. Add `test/policy-ownership.test.js` first. It must fail against untouched source because owner packages/delegations do not exist and duplicates remain. Record the exact command/output before any runtime edit.
2. Before moving logic, add/strengthen behavior characterizations for root/child/fallback state, in-flight dedupe, LRU/rejection races, TSS sequential arrays/parser timing/identity, CSS/JS dedupe/returns/failure cleanup, and existing manifest guarded hits/supersession.
3. Add cyclic-parent tests only through `spawnSync(process.execPath, ..., {timeout: 2000})`; verify old consumers time out/fail and the owner/facades terminate after implementation.
4. Implement the minimum three owners and compatibility delegation; run new owner, consumer, plugin, and pipeline suites green before metadata/docs.
5. Extend source ratchets with positive/negative fixtures and run runtime-import/pure-JS guards.
6. Run focused suites, `npm run typecheck`, exact `npm test`, package dry-runs, source/JSON checks, `git diff --check`, and fresh review loops.

Tests use Node's built-in `node:test`, deterministic injected collaborators, no network, no timing race without an explicit deferred promise, and singleton resets in every test that mutates shared fields.

### Success Criteria

- [x] Structural ownership regression is observed red first and green only after one owner per family exists.
- [x] Finite cycle regression is observed red against an old unbounded consumer and green without any runner hang.
- [x] No consumer source contains a parent walk, generic promise-LRU/rejection implementation, or duplicated CSS/JS URL/DOM lifecycle.
- [x] Every existing package/export/field/method/reset surface remains and all owner collaborations are host-injected with zero runtime `require()`.
- [x] Focused request/layer/UI-cache/data/HTML/TSS/manifest/CSS/JS/layer/pipeline/wiring tests pass with all required edge cases.
- [x] Typecheck and exact full suite pass; package dry-runs pass for every new/touched release package; pure-JS/runtime-import/source guards and `git diff --check` pass.
- [x] Architecture, refactor, source-ratchet, security, tech-debt, differential, privacy, and production-readiness reviews have no unresolved finding; all ten quality dimensions score 10/10 and a fresh verification pass confirms them.
- [x] Root/package/project docs, selected architecture backlog, completion evaluation, review ledger, release versions/minima, and rollback evidence are current.
- [x] Conventional commits were pushed; ready PR #51 targeted `dev`; CI and current-head Codex review were clean; the maintainer subsequently merged it.

### Approval

- [x] Requirements clear — explicitly selected and constrained in `continue.md`
- [x] Scope agreed — maintainer selected the three-owner approach and manifest-cache inclusion
- [x] Risks acceptable — maintainer directed implementation after spec self-review

**Approved by:** Maintainer
**Date:** 2026-07-16

## Spec Self-Review

The full specification was re-read after drafting rather than extended from memory.

- **Placeholder scan:** PASS. No `TBD`, `TODO`, `FIXME`, hand-wave, deferred implementation, or unnamed error/test step remains.
- **Internal consistency:** PASS. All three APIs keep consumer state external; UI-manifest alone owns acquisition/generation/index policy; plugin profiles are package-private; release versions/minima match the affected package list.
- **Scope check:** PASS. The three policy families are one coordinated refactor because root state is consumed by asset lifecycle and manifest, while parser, sanitizer, tenant/TTL, effect, and debug work remain explicit no-gos.
- **Ambiguity check:** PASS. Parent limits, malformed responses, cache hit/miss ordering, manifest hit hooks, CSS/JS variant data, package set, test order, rollback, and delivery gates all have one stated behavior.
- **Skeptic lens:** PASS. Structural ratchets prove duplication is removed rather than hidden; behavior tests prove facades preserve results; package-private profiles avoid adding an accidental plugin API.
- **Architect lens:** PASS. Three cohesive deep modules replace Shotgun Surgery without a God utility, stateful registry, service locator, runtime import, or moved domain ownership.
- **Minimalist lens:** PASS. Every new package corresponds to a named repeated policy family required by the task; no fourth helper, shared type change, compatibility shim, or speculative feature is introduced.

## Agent Design Constraints

### Architect

- Applied project `AGENTS.md` over the persona's unrelated Bun/Elysia/DB defaults.
- Required: one cohesive owner per family, dependency inversion through host DI, caller-owned observable state, minimal new public surface, and explicit alternatives.
- Avoided: Big Ball of Mud, God Object, Service Locator, Tight Coupling, Shotgun Surgery, runtime imports, and exported profile/config detail.

### Backend Architect

- Required: reason about async gaps, shared singleton races, identity-safe cleanup, deterministic bounds, failure propagation, and atomic manifest installation.
- N/A: SQL, transactions, queues, routes, and database scaling; this repository is a dependency-free rendering library.

### Code Review Enforcer

- Required: pure JS/CommonJS, strict singleton reset discipline, no duplicate policy body, no suppression/placeholder, functions split below complexity thresholds, and source guards that distinguish facades from bypasses.
- Compatibility pass-through methods are retained only because they are locked published Hyrum-law surfaces; the new owner modules remain the deep implementations.

### Planner

- Required: measurable acceptance criteria, explicit no-gos, concrete package/file blast radius, dependency/release order, risk owners, rollback, and red-first independently verifiable stages.
- Estimation/time-box items are N/A: the maintainer fixed scope and completion gates but supplied no delivery deadline or appetite.

### Security Architect and Threat Modeling Enforcer

- Required: threat model before runtime edits, DFD/trust boundary, all six STRIDE categories, attack trees, concrete test-linked controls, residual-risk statement, no URL-policy regression, and bounded resource behavior.
- Full PASTA is N/A because no payment, identity, PII, endpoint, external integration, or new trust boundary is introduced.

### TDD Guide

- Applied Node `node:test` and the exact npm commands from `AGENTS.md`, not the persona's Bun/TypeScript examples.
- Required: structural red first, finite cycle red, behavior characterization before movement, minimal green implementation, real state assertions, deterministic injected collaborators, and no masked/flaky retries.

## Checklist Disposition

Every item in the loaded persona checklists was classified; homogeneous N/A families are grouped here with their scope evidence.

| Checklist(s) | Plan-level disposition |
|---|---|
| `engineering/domain-architecture` | PASS for SRP/DIP, deep owners, minimal public surface, <=3-parameter structured operations, and locked DI; N/A for routes/domain/DB/schema/env/AI items |
| `engineering/complexity-maintainability` | PASS: owner methods are split by root/state, cache lifecycle, URL, element, process, and cleanup; files remain <800 lines, functions target <50, nesting <=4, no suppression; UI CSS rules N/A |
| `engineering/dod-self-review`, `dod-no-placeholders` | PASS at spec gate; repeated after implementation with source/test/package evidence |
| `engineering/type-safety`, `dod-types-first` | PASS for strict JS/JSDoc and no escape hatch; TypeScript/type-placement items N/A because the canonical contract is unchanged and handwritten TS is forbidden |
| `engineering/error-taxonomy`, `dod-error-handling` | PASS for promise propagation, identity cleanup, `finally`, deadline failure, and unchanged messages; HTTP/DomainError/i18n items N/A for this framework package |
| `engineering/dod-tests-written`, `testing/dod-tdd-discipline`, `testing/test-suite-quality` | PASS: structural and cycle RED precede runtime edits; public behavior, boundaries, concurrency, max edges, errors, integration, source ownership, and full-suite gates are explicit |
| `engineering/runtime-safety` | PASS for bounded parent graphs/caches, serialized asset/TSS order, no shared accumulator across awaits, and identity-safe rejection; time/money/Unicode items N/A |
| `engineering/code-quality-review` | PASS for no third-party dependency, no new raw sink, private profiles, named max, why-comments, DRY ownership, and human verification; project-specific TS/DB utilities N/A |
| `project-management/planning-rigor` | PASS for need/scope/acceptance/dependencies/critical path/risk/owners/testing/DoD; estimates, meetings, and deadline circuit-breaker N/A for maintainer-scoped repository work |
| `security/injection` | PASS: no SQL/shell/eval/path work; data-bound asset URLs keep resolver + final request allow before the existing DOM sink; parser/sanitizer policy unchanged |
| `security/secrets-handling`, `authentication`, `authorization`, `zero-trust-architecture`, `crypto` | N/A item-by-item: no secret, identity, permission, token, crypto, protected-resource, session, or network-trust change |
| `security/ssrf-and-external-requests` | PASS for preserving final resolved-target policy and adding no server fetch; DNS/redirect/egress semantics belong to the unchanged host request transport and are outside this behavior-preserving refactor |
| `security/security-headers` | N/A: no HTTP header/CORS/cookie change; CSS's constant defer handler is preserved with no data interpolation and no CSP policy expansion |
| `security/rate-limiting-and-abuse` | PASS for applicable cycle/depth/cache bounds; endpoint/user quotas and 429 behavior N/A |
| `security/api-asset-management`, `audit-trail-integrity` | N/A: no API host/version/endpoint, user action, durable audit, or logging change |
| `security/dependency-security` | PASS: zero third-party runtime dependencies; new packages are first-party workspace packages with license, source, versions, dry-runs, and release DAG |
| `security/mobile-app-security`, `queue-message-security`, `ai-llm-security`, `security-anomaly-detection`, `supabase-row-level-security`, `secrets-rotation` | N/A item-by-item: no mobile client, queue, AI, monitoring, database/RLS, or secret lifecycle surface |
| `security/threat-modeling` | PASS: pre-code DFD, assets/actors, six-category STRIDE, attack trees, controls, test links, residual-risk acceptance, and re-evaluation triggers; PASTA N/A with justification |

## Plan Quality Gate

**Scope tags:** SECURITY (URL-policy integrity and render/cache DoS/isolation); no DB, FRONTEND, ROUTING, INFRA, or PAYMENTS tag.

**Gate status:** PASSED

**Review lenses applied:** architect, backend-architect, code-review-enforcer, planner, security-architect, threat-modeling-enforcer, TDD guide, skeptic, architect, minimalist.

**Issues found and fixed before code:** 5 — included manifest's generic LRU; made plugin profiles package-private; converted multi-parameter owner operations to structured objects; fixed the release set to exactly twelve packages; added full STRIDE/attack-tree/control linkage.

**STRIDE status:** Complete (6/6 categories). Threat-model deep dive skipped because no high-value flow or new trust boundary exists.

| Dimension | Score |
|-----------|-------|
| Architecture | 10/10 |
| Consistency | 10/10 |
| Type Safety | 10/10 |
| Validation | 10/10 |
| Error Handling | 10/10 |
| Security/Privacy | 10/10 |
| Performance | 10/10 |
| Maintainability | 10/10 |
| Testability | 10/10 |
| Readability | 10/10 |
| **Total** | **100/100** |
