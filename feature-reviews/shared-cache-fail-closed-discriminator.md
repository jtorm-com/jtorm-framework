# Feature Development: Fail-Closed Shared Cache Discriminator

**Status:** IN_PROGRESS
**Claimed:** 2026-07-17T17:26:06Z
**Agent:** Codex `/root`
**Current Mode:** Review

---

## Resumption Context

**Last Completed Mode:** Implement
**Current Mode:** Review
**Next Action:** Obtain green CI and a clean Codex review on the final PR #59 head with zero unresolved threads; do not merge.
**Issues Found and fixed:** Shared fetch, manifest-pack, and rendered-fragment caches accepted keys with no explicit render discriminator. Adversarial red tests also exposed inherited render links, inherited request accessors, inherited effective bases, root-only fetch/UI scope divergence, and prototype-inherited persistence attestation; each now fails closed at its existing policy owner.
**Design Decisions Made:** An unscoped cache key is `undefined`; generic promise-cache bypasses it without touching its map; request-model owns discriminator validity and exact scoped key construction; render-context-model owns strict own-link cache root resolution without changing normal `context()`; UI cache consumes those owners and quarantines provenance-ambiguous persistence until explicit own post-cleanup attestation.

**Context for Next Session:**
PR #58 merged at `b96b850de9c9f953329b551ee78551dfb9f608a9`; local `dev` was fast-forwarded to `origin/dev`; work continues on `agent/fail-closed-shared-cache-discriminator`.

---

## Progress Log

### Research Mode
- [x] Confirmed completion PR #58 merged
- [x] Updated local `dev` from `origin/dev`
- [x] Branched from current `dev`
- [x] Mapped codebase and existing cache-policy behavior
- [x] Recorded research summary

### Plan Mode
- [x] Entered plan mode
- [x] Wrote feature specification
- [x] Specified compatibility, failure atomicity, privacy, performance, SemVer, migration, persisted-cache handling, and rollback

### Plan Quality Gate
- [x] Scope classified
- [x] Relevant personas consulted
- [x] All 10 dimensions pass at plan level
- [x] STRIDE pre-analysis complete
- [x] Threat-model applicability decided
- [x] Specification self-reviewed and approved

### Design Mode
- [x] Loaded required design personas
- [x] Completed code-explorer review
- [x] Completed code-architect review and clean convergence re-review
- [x] Created security record
- [x] Validated design against red flags

### Design Quality Gate
- [x] Architecture review: PASS
- [x] Consistency review: PASS
- [x] Type-safety review: PASS
- [x] Validation review: PASS
- [x] Error-handling review: PASS
- [x] Security/privacy review: PASS
- [x] Performance review: PASS
- [x] Maintainability review: PASS
- [x] Testability review: PASS
- [x] Readability review: PASS
- [x] Independent architect convergence: CLEAN

### Implement Mode
- [x] Checkpoint 1: red tests
- [x] Checkpoint 1b: source guards
- [x] Checkpoint 2: core fail-closed policy
- [x] Checkpoint 3: cache-consumer integration and edge cases
- [x] Checkpoint 4: host DI, metadata, migration docs, and backlog records

### Test Mode
- [x] Focused tests passing (221/221)
- [x] Exact `npm test` passing (633/633)
- [x] `npm run typecheck` passing
- [x] Package dry-runs passing (8/8; three files each)
- [x] Source guards, Semgrep, syntax, JSONL, audits, tech-debt, and diff checks passing

## Red-First Evidence

Before any runtime edit, the focused discriminator suite ran 77 tests with 57 passing and 20 failing. The failures directly reproduced the intended defect boundaries:

- unscoped `cacheKey()` returned a URL and resolved it eagerly; empty fields produced non-empty tagged policies;
- cyclic/malformed contexts regained a configured-base policy;
- `undefined` hit a seeded promise and shared one in-flight result;
- data, HTML, and TSS calls reused stale sequential results or altered seeded LRU state;
- manifest roots reused one pack promise, and validation/acquisition failure evicted seeded state;
- raw persisted fragments were served and retained; interleaved unscoped fragment calls observed each other;
- two same-identity unscoped get renders served `A` after the source changed to `B`;
- unscoped fragment, handler-failure, and event-failure pipelines retained rendered state.

The existing explicitly scoped warm pipeline proof remained green and made no second transport request. This establishes a compatibility control alongside the failing security witnesses.

Independent implementation review then supplied additional failing witnesses before their fixes:

- an inherited effective request base could collide with a configured-base key and bypass the unchanged URL/SSRF guard on a hit;
- prototype-inherited `v.c`/`p` links could select a shared tenant root, while a request-local repair violated the render-context policy-owner ratchet;
- prototype-inherited `saveModel.uiCacheScoped` could authorize legacy persisted content;
- UI root-only `origin`/`base` and a custom effective-base facade could diverge from fetch keys and collapse fragments under one configured base.

The converged fix puts strict own-link traversal in `render-context-model.cacheContext()`, delegates request/UI cache decisions to it, requires own migration attestation, treats a non-null inherited effective base as unscoped, preserves null/undefined configured fallback, makes a root-only fetch origin poison UI sharing, and allows a root raw base only when an explicit effective-base override supplies a distinct isolated scope.

### Review Mode
- [x] Named local review gates complete
- [x] 100/100 code quality
- [x] Local verification loop passed
- [ ] Current-head CI green
- [ ] Current-head Codex review clean with zero unresolved threads

### Documentation Mode
- [x] Package READMEs updated
- [x] Feature/evaluation/security records updated
- [x] Review ledger updated
- [x] Architecture backlog marks fail-open subproblem complete and TTL/purge next
- [x] Ready PR #59 opened into `dev`

---

# Feature Specification: Fail-Closed Shared Cache Discriminator

**Date:** 2026-07-17
**Author:** Codex `/root`
**Status:** Approved
**Base:** `dev` at `b96b850de9c9f953329b551ee78551dfb9f608a9` (merged PR #58)
**Scope Classification:** SECURITY

## Problem Statement

Weakness #12 combines two independent cache risks. This bounded change addresses only the fail-open tenant/request-scoping half: shared caches currently participate when a render supplies no explicit discriminator. In that state, data, HTML, TSS, manifest-pack, and rendered-fragment results can be read, deduplicated, retained, refreshed, persisted, or made more recent across otherwise unrelated renders. Empty request fields can also produce a truthy tagged policy and opt into caching accidentally.

The safe behavior is availability-preserving denial of shared-cache participation. A render without a valid explicit discriminator continues through the same request, parse, manifest, handler, and render path, but every cache operation is a real bypass with no shared retained state. It does not throw merely because caching is unavailable.

## Research Summary

- PR #58 is merged; local and remote `dev` both point to `b96b850de9c9f953329b551ee78551dfb9f608a9`.
- The untouched branch passes 176 focused request/render-context/promise-cache/data/HTML/TSS/manifest/UI-cache/get/UI/isolation/wiring tests.
- `request-model.policy()` currently composes request-context `tenant`, `origin`, and effective `base`; `cacheKey()` falls back to the resolved URL when that policy is empty.
- When `v.c.request` is an object, fetch policy intentionally uses that request object and does not also mix in root `v.c.tenant`. Without a request object, root fields remain the request context. This is existing compatibility behavior.
- `ui-cache-model.tenant()` intentionally uses first-match precedence: root `tenant`, request `tenant`, request `origin`, request `base`. Its current unscoped `scope()` falls back to the raw fragment variant.
- A non-empty configured `requestModel.base` participates in fetch policy today. An explicit non-null request `base` overrides it; therefore `base: ''` disables the configured base, while `base: null` falls back to it.
- Data, HTML, and TSS retain promises in singleton `Map`s. TSS arrays are fetched sequentially in array order. Manifest packs use another singleton promise `Map`; a separate prepared index/promise belongs to one render root. UI fragments use a persisted nested object plus a parallel `Map` for LRU order.
- The P3 policy-owner work deliberately left fail-closed discrimination and TTL/purge out of scope. It established request-model as request/cache-policy owner, render-context-model as bounded root owner, promise-cache-model as shared promise/LRU owner, and UI manifest as validation/guarded-hit owner.
- No runtime source imports are needed. Hosts already inject request/render/promise owners; UI cache needs the same request-model injection plus dependency metadata.
- Focused history confirms tagged policy order and inclusion of origin/base are isolation fixes and therefore exact scoped identities are compatibility constraints.

## Scope

### In Scope

- Shared data, HTML, TSS, manifest-pack, and rendered-fragment caches.
- A single explicit discriminator-validity policy in request-model, consumed by cache boundaries.
- True unscoped bypass for reads, writes, in-flight deduplication, guarded hits, refresh/recency, LRU eviction, dirty state, and persistence.
- Preservation of the manifest render-root-local prepared promise/index.
- UI-cache request-policy DI, package metadata, host wiring, reset discipline, and persisted raw-entry filtering.
- Red-first unit, isolation, failure-atomicity, and get/UI pipeline proofs.
- Patch SemVer, package READMEs, root migration documentation, feature/evaluation/security records, review ledger, and architecture backlog.

### Out of Scope

- TTL, clocks, purge APIs, stale-while-revalidate, or persistent-cache schema redesign. These remain the next independent weakness #12 follow-up.
- Parser behavior, handler traversal, wrapper projection, binding grammar/cache, sanitizer policy, URL/SSRF policy, timeouts, manifest validation/digest/classification, root supersession, or unrelated cache cleanup.
- New packages, runtime dependencies, TypeScript, handwritten declarations, compatibility shims, or host-specific telemetry.
- Automatically rewriting or deleting a host's external persistence store. Upgrade filtering and operator cleanup guidance are in scope; a new persistence migration protocol is not.

## Functional Requirements

1. An operation with no valid explicit discriminator must perform its ordinary uncached load/render and must not throw solely because caching is bypassed.
2. It must not read, populate, deduplicate through, refresh, persist, alter LRU recency in, or evict from a shared cache.
3. Absent, `null`, `undefined`, and empty-string discriminator candidates do not opt into caching. Empty candidates may fall through to a lower-precedence valid candidate where that owner uses precedence.
4. Non-empty primitive discriminator values supplied as own render/request fields retain their field-specific existing stringification and exact scoped key identities, except a value containing the NUL separator is invalid because it can collide with a composite key. Prototype-inherited candidates do not constitute explicit authorization. Objects, arrays, functions, and symbols are malformed discriminator values and make that cache decision unscoped rather than being serialized or stringified.
5. Omitted/null context may use a configured base. Any non-null context whose render root cannot be resolved by the bounded cache resolver through own view/parent links is malformed/cyclic and must not regain cache participation through configured defaults. Ordinary render-root resolution remains unchanged.
6. The published `policy()`, `cacheKey()`, `tenant()`, and `scope()` methods remain. `policy()` continues returning a string and returns `''` when unscoped. `cacheKey()` and UI `scope()` return `undefined` when unscoped.
7. All published singleton identities, cache fields, limits, reset surfaces, and other exports remain available.
8. Scoped sequential and concurrent operations retain promise identity/deduplication, parsed AST/binding identity, manifest pack identity, fragment output, persistence shape, and LRU behavior.
9. Separate explicit tenant/origin/base scopes remain isolated.
10. Existing persisted UI fragments are quarantined by default because a legacy raw NUL-bearing variant can be byte-identical to a new scoped variant. `init()` reloads only when the host adapter has an own `uiCacheScoped === true` attestation after a complete store clear/migration; inherited attestation is ignored and malformed keys are still rejected after opt-in.
11. A single-tenant host explicitly opts into shared caching by setting a non-empty configured request base or by supplying a valid discriminator on each render.
12. A raw NUL in any discriminator, resolved request URL, UI fragment variant, language, or cid makes that cache decision unscoped, preventing composite-key collisions before the normal uncached path runs.

## Discriminator and Key Contract

### Validity

`request-model` owns a small primitive normalizer used only for cache policy. It accepts string/number/boolean/bigint values and returns the existing `String(value)` identity; it rejects object, array, function, and symbol values. Any normalized string containing the NUL separator is malformed. Whitespace-only strings remain non-empty and compatible; validation does not trim or canonicalize host identities.

Field participation remains deliberately specific:

- tenant and origin retain current non-null primitive stringification, except `''` is now absent and NUL is invalid;
- fetch policy and configured base retain the current truthiness gate, so `0`, `false`, `NaN`, and `0n` do not participate while `1n` does;
- UI's explicit request base retains current non-null primitive selection, so `0`, `false`, `NaN`, and `0n` remain explicit UI scopes; `''` explicitly disables configured-base fallback but is itself unscoped;
- configured base used by UI follows the fetch/configured-base truthiness rule.

Any present malformed candidate that the active aggregate or first-match traversal reaches fails the cache decision closed. Fetch policy aggregates all active request candidates and therefore validates all of them. UI validates candidates in precedence order only until a valid winner: empty/null candidates fall through, a malformed reached candidate denies participation, and a valid higher-precedence winner preserves current first-match behavior without inspecting lower fields. Structural root-resolution failure always denies participation.

Cache-only context validity is explicit and does not change ordinary `context()`, URL, or timeout behavior. `render-context-model.cacheContext()` applies the existing bound while requiring an object-valued view `c` handoff and every traversed object-valued `p` link to be own; prototype-inherited links cannot select cache authority. Omitted/null input remains valid for configured-base opt-in. A resolved root must be a non-array object, and any present create-doc `c` marker on that root must be numeric/boolean. Non-array class/prototyped render roots remain supported, but only own discriminator candidates authorize sharing. An inherited `request` namespace fails the cache decision closed before it is read, so an accessor cannot manufacture fresh identities to evade ownership validation. A distinct effective object returned by the published request `context()` facade must be plain. When that facade selects a raw request member, that member must be own, plain, non-array, and distinct from the root; a custom facade may deliberately select a different plain effective object. Fetch policy continues to derive effective request fields and base through `context()` and `option()`. UI does not inspect a malformed lower-precedence request namespace after a valid own root-tenant winner.

### Fetch Policy Compatibility

`request-model.context(c)`, `option(c)`, and `url()/allow()/fetch()` behavior remain unchanged. Cache policy alone distinguishes invalid contexts, and cache identity continues to follow published `context()`/`option()` overrides so it cannot diverge from effective URL options.

| Context | Effective fetch policy | Cache behavior |
|---|---|---|
| no context, no configured base | `''` | bypass |
| root `tenant: 'a'`, no request object | `t:a` | scoped; exact current key |
| request `tenant: 'a'` | `t:a` | scoped; exact current key |
| request `origin: 'https://a'` | `o:https://a` | scoped; exact current key |
| request `base: '/a/'` | `b:/a/` | scoped; exact current key and URL resolution |
| request tenant + origin + base | `t:…\0o:…\0b:…` | same tag order and exact current identity |
| root tenant plus a request object | request fields only | same current request-context precedence |
| configured non-empty base, request base absent/null | `b:<configured>` | explicit single-tenant opt-in; exact current fetch key |
| configured base plus request `base: ''` | `''` unless another request discriminator is non-empty | explicit override disables configured-base caching; URL behavior unchanged |
| fetch/configured base `0`, `false`, `NaN`, or `0n` | no base tag | existing truthiness behavior; bypass unless tenant/origin scopes it |
| fetch/configured base `1n` | `b:1` | exact current primitive stringification |
| empty tenant/origin with another valid request field | only non-empty tags | scoped by remaining explicit field |
| only absent/null/empty fields | `''` | bypass |
| omitted/null context with configured non-empty base | `b:<configured>` | explicit host opt-in |
| non-null input whose root resolution returns null | `''` | bounded `p`-cycle/overflow/invalid-root bypass; configured base cannot revive it |
| malformed request namespace / invalid create-doc flag | `''` | cache-only structural bypass; ordinary request path remains unchanged |
| inherited request namespace, including a fresh-identity accessor | `''` | bypass before reading it; prototype state cannot authorize sharing |
| inherited tenant/origin | ignored | configured base may independently opt in when no effective inherited base changes request behavior |
| inherited request base `null`/`undefined` | configured fallback | normal `option()` also falls back; exact configured-base behavior |
| inherited request base non-null, including `''`, remains the effective `option()` value | `''` | it affects URL/allow behavior but is not explicit cache authority, so the whole decision bypasses |
| deliberate `option()` override replaces an inherited raw base | policy uses the replacement | the inherited value no longer affects request behavior; valid own authority and exact facade identity remain scoped |
| inherited object-valued view `c` or parent `p` link | `''` | strict bounded cache-root resolution bypasses; normal render `context()` remains unchanged |
| malformed or NUL-bearing reached discriminator | `''` | whole active cache decision bypasses |

For a scoped request, `cacheKey(url, c)` remains `policy + NUL + resolvedUrl`. For an unscoped request or a resolved URL containing raw NUL it returns `undefined`, never the URL alone. The uncached request path still applies unchanged URL resolution and allow/SSRF policy.

### UI Fragment Precedence Compatibility

`ui-cache-model.tenant(v)` remains the public compatibility facade. It first resolves the context through its existing overridable `context()` method; the default facade delegates to strict `renderContextModel.cacheContext()`. It then delegates the root to the injected request policy owner. Missing/malformed DI or a throwing policy helper returns `''` and therefore renders uncached rather than throwing merely because caching is unavailable. It evaluates candidates in this existing first-match order:

1. root `v.c.tenant`;
2. `v.c.request.tenant`;
3. `v.c.request.origin`;
4. effective request base from the published request-model `option()` facade: explicit non-null request base semantics, otherwise configured-base truthiness semantics.

Root-only `origin` and raw `base` are not UI discriminator candidates and remain outside this precedence. Because fetch compatibility still consumes those direct-context fields, a non-empty root-only origin makes UI sharing unscoped, and a root raw base does so when it is the effective `option()` result; this prevents two separately keyed fetches from collapsing into one configured-base fragment. A deliberate `option()` override may return a distinct effective base even without a request namespace and retains isolated UI scopes.

An empty/null candidate falls through. A reached malformed or NUL-bearing candidate fails closed. A valid candidate retains the exact existing `String(value)` prefix. Explicit request-base primitives retain the behavior specified above. `tenant()` returns `''` when unscoped; `scope(v, variant)` returns `tenant + NUL + variant` when scoped and NUL-free, otherwise `undefined`. NUL-bearing language/cid coordinates also bypass. The configured-base case intentionally extends the same explicit single-tenant opt-in to rendered fragments only when no incompatible root-only fetch field changes effective request identity.

## Architecture and Data Flow

```text
host render context/config
        |
        v
render-context-model strict cache root
        |
        v
request-model discriminator/policy owner
        |
        +--> cacheKey === undefined --> ordinary load/render --> caller result
        |                                  (no shared state touched)
        |
        +--> exact scoped key ----------> promise-cache Map/LRU
        |                                  data/html/tss/manifest pack
        |
        +--> UI first-match scope ------> UI fragment object + LRU + persistence

manifest render root --> prepared promise/index (root-local, preserved in both cases)
```

- Data/HTML/TSS and manifest derive keys only through an injected `requestModel.cacheKey`. Missing policy ownership or a returned `undefined`/`null`/`''` is an unscoped bypass; there is no URL/String fallback. Other explicitly returned custom key identities remain opaque and compatible.
- `promise-cache-model.get(owner, undefined, callbacks)` calls `load()` directly and returns its result without `Map.get`, `Map.set`, rejection eviction, hit callback, recency, or LRU work. Other key values, including `null`, keep generic compatibility.
- Manifest pack keys propagate `undefined` before JSON encoding. Scoped descriptors retain the exact JSON key `[requestCacheKey, hash]`. Root-local `prepare()` generation, supersession, atomic index install, and same-root deduplication do not change.
- UI `get`, `set`, and `save` decide scope before touching cache/order/render state/saveModel. Unscoped get returns `null`; set and save are no-ops.
- Published UI `put()` admits only NUL-free language/cid coordinates and a scoped variant with exactly one non-leading separator. Direct raw, leading-NUL, and multi-NUL keys cannot enter shared state.
- UI `init()` resets live state and reads persistence only when `uiCacheScoped` is an own adapter field exactly equal to `true`. This explicit host attestation follows a mandatory full store clear/migration; inherited/prototype-polluted authorization is ignored, and without an own attestation provenance-ambiguous persisted input is quarantined. Reload remains clean and does not call persistence.
- The test host injects request-model into UI-cache-model both at bootstrap and reset. Numeric legacy render flags are wrapped with the real JSDOM URL origin as an explicit request discriminator; an explicitly supplied context object is left untouched. A test-only `reuseSharedCaches` option preserves only the five in-scope stores between renders while reset still restores DI and all unrelated singleton state.

## Failure Atomicity

| Path | Unscoped invariant | Scoped compatibility |
|---|---|---|
| successful fetch/parse/render | result returned; no shared entry, order, dirty state, or persistence | current cached result/identity and write timing |
| transport rejection | rejection returned; no promise entry or eviction mutation | current rejection eviction |
| data/HTML/TSS parse rejection | rejection returned; no promise entry | current rejection eviction; TSS sequencing unchanged |
| manifest JSON/schema/digest/validation rejection | root prepare fails atomically; no pack-map entry; root failure cleanup unchanged | current classification, rejection eviction, and guarded hits |
| handler/event rejection | normal rejection; UI set/save remain no-ops and no fragment survives | current event ordering and fragment behavior |
| save failure | save adapter is not invoked and no state is created | current failure and dirty/save timing |
| concurrent operations | each unscoped caller owns its fresh load/promise | same scoped key still shares one in-flight promise/fragment |

No random/per-render keys, sentinels, serialized context objects, or unique throwaway keys are permitted because all would still insert unscoped state.

## Compatibility Boundaries

- Request URL resolution, URL allow/SSRF policy, timeout/AbortSignal behavior, fetch error messages, and transport seam are unchanged.
- Data/HTML/TSS return values, array order, parser output, cached AST identity, promise rejection eviction, and scoped Map LRU order/bounds are unchanged.
- Manifest descriptor/schema/canonicalization/digest/acquisition/optional-required behavior, guarded URL checks on hits, limits, root generation/supersession, and root-local indexes are unchanged.
- UI-cache plugin event weights/order, `cid`/`cs`, `v.r`, locale, parent/root context, overridable `context()` facade, write-once behavior, save timing, nested persisted shape, and scoped LRU are unchanged. Its default cache resolver now requires own context links while normal render-context resolution remains unchanged. Persisted reload now requires explicit own post-cleanup adapter attestation; these are intentional security hardenings.
- Direct callers may still call all published methods. Unscoped `cacheKey()`/`scope()` returning `undefined` is the intentional security bug fix.
- Hosts with custom request models retain caching only if their injected `cacheKey()` returns an explicit non-null, non-empty scoped key. A missing `cacheKey` or `undefined`/`null`/`''` result is not interpreted as permission to share; other custom key identities are preserved as opaque owner decisions.

## Persisted Cache Migration, Cleanup, and Rollback

### Upgrade

- Before upgrade, raw variants such as `default` were unscoped, but `cs` and old discriminator values could contain NUL. A legacy raw `tenant\0default` is byte-identical to a new tenant-scoped key, so selective syntax filtering cannot establish provenance.
- Upgraded `init()` does not call an ordinary save adapter's `get()` and starts with an empty live cache. Existing persisted entries therefore cannot be served after a no-action upgrade.
- Operators must clear/replace the entire fragment store, configure the new request-policy DI, and only then define an own `saveModel.uiCacheScoped = true` before `init()`. An inherited signal is ignored. The own signal is an explicit trust assertion, not automatic detection.
- After attestation, valid scoped entries retain the exact nested shape and LRU reconstruction. Raw, leading-NUL, multi-NUL, and NUL-bearing language/cid keys are ignored; render-time NUL variants bypass.
- `save()` continues writing newly scoped state through any adapter. `init()` never mutates the host store, and the runtime adds no persistence schema or metadata marker.

### Single-Tenant Opt-In

- Recommended host migration: inject request-model into UI-cache-model and set a stable non-empty `requestModel.base` that already represents the deployment base, or supply a stable non-empty tenant/origin/base per root render.
- Do not use a constant sentinel unrelated to a real host boundary. Multi-tenant hosts must supply the actual tenant/request discriminator.

### Rollback

- Code rollback is source-compatible, but an older UI cache can serve ambiguous persisted entries that remained in the external store.
- Before rolling back, clear the store or restore a known scoped-only snapshot. If cleanup cannot be guaranteed, disable the UI-cache plugin/store during rollback.
- Fetch/manifest in-memory caches disappear with process restart and need no data rollback. No schema or one-way data migration is introduced.

## Performance and Resource Contract

- The policy decision examines a fixed set of fields and the render-context owner has an existing hard bound of 128 parent links: O(1) with respect to cache size and input data.
- No new per-render state is retained. Strict root resolution uses only a bounded call-local cycle set, and unscoped UI operations return before `renderContextModel.state()`.
- Unscoped calls intentionally pay normal transport, parsing, manifest validation, and rendering costs on every call and may duplicate concurrent work. This is the security/availability tradeoff.
- Scoped calls retain current asymptotic O(1) Map/object lookup, bounded LRU behavior, concurrent deduplication, and warm-cache output/latency.
- No clocks, timers, cleanup scans during operations, context serialization, or additional retained maps are added.

## Package SemVer and Metadata

Only runtime packages whose source changes receive patch bumps:

| Package | From | To | Metadata action |
|---|---:|---:|---|
| `@jtorm/render-context-model` | 1.0.0 | 1.0.1 | add bounded own-link `cacheContext()` policy; normal `context()` unchanged |
| `@jtorm/request-model` | 1.1.4 | 1.1.5 | policy owner behavior |
| `@jtorm/promise-cache-model` | 1.0.0 | 1.0.1 | undefined-key bypass |
| `@jtorm/data-model` | 1.0.5 | 1.0.6 | require request 1.1.5 / promise cache 1.0.1 |
| `@jtorm/html-model` | 1.0.5 | 1.0.6 | same |
| `@jtorm/tss-model` | 1.0.6 | 1.0.7 | same; parser range unchanged |
| `@jtorm/ui-manifest-model` | 1.0.1 | 1.0.2 | require request 1.1.5 / promise cache 1.0.1 |
| `@jtorm/ui-cache-model` | 1.0.5 | 1.0.6 | add `@jtorm/request-model:^1.1.5`; require render-context `^1.0.1` |

`@jtorm/request-model` also raises its render-context minimum to `^1.0.1`. `@jtorm/ui-cache-plugin`, get/UI methods, types, and host-only test helpers do not receive runtime bumps because their published runtime source is unchanged. Other render-context consumers keep compatible `^1.0.0` ranges because they do not call the new strict cache resolver; ranges are not churned beyond packages that require the new contract. Publish render-context first, then request and promise-cache, then the data/HTML/TSS/manifest/UI-cache consumers.

## Affected Components

| Component | Change | Risk |
|---|---|---|
| render-context model | strict bounded own-link resolver for cache authority; normal resolver unchanged | High: provenance boundary |
| request model | discriminator validity; unscoped cache key | High: central privacy boundary |
| promise cache | true undefined-key bypass | High: all promise caches |
| data/HTML/TSS models | remove fail-open key fallback | Medium |
| UI manifest model | propagate bypass before JSON key | High: shared pack cache |
| UI cache model | injected policy, bypass, default persistence quarantine and attested reload | High: rendered content/persistence |
| test host DI/root | request injection, explicit default origin, optional cache reuse | Medium: proof harness only |
| package metadata/READMEs/root README | SemVer and migration | Medium |
| architecture/evaluation/security/ledger records | close bounded subproblem only | Low |

## Design Persona Disposition

| Persona | Disposition |
|---|---|
| Architect / backend architect | Applied: policy ownership, dependency direction, failure boundaries, compatibility, and blast radius |
| Planner | Applied: bounded scope, requirement traceability, risks, success criteria, and rollback |
| Security architect / threat-modeling enforcer | Applied: pre-code STRIDE/PASTA, fail-closed trust boundary, migration and residual risk |
| Code-review enforcer | Applied: concrete evidence, red-first proof, no silent compatibility assumptions |
| Elysia expert | N/A after mandatory consultation: this repository has no Elysia routes and AGENTS.md locks pure dependency-free CommonJS |
| Bun expert | N/A after mandatory consultation: tests/runtime use Node and no dependency or runtime migration is permitted |
| TypeScript pro | N/A for implementation language: AGENTS.md forbids TypeScript/handwritten declarations; existing JSDoc/typecheck remains a verification gate |
| Platform engineer | Applied only to bounded resource/rollback concerns; Cloudflare, database, email, SLO, and deployment-platform checks are N/A for this library diff |
| Database architect | `CHECKLIST NOT LOADED`: the feature-dev-referenced persona file is absent from the installed resource index; database/schema scope is independently N/A |

The project-specific AGENTS.md contract overrides generic Elysia/Bun/TypeScript defaults: pure JavaScript/CommonJS, Node's test runner, dependency-injected collaborators, no runtime imports, and patch bumps only for changed published packages.

## Independent Architecture Challenge

The first independent review blocked implementation. The specification was amended before any test/runtime edit:

| Finding | Resolution |
|---|---|
| NUL discriminator/URL collisions can merge distinct tagged keys | reject NUL-bearing discriminator values and resolved URLs; add adversarial collision tests |
| fetch base and UI explicit base treat falsy primitives differently today | lock field-specific `0`/`false`/`NaN`/`0n`/`1n` behavior instead of one generic rule |
| omitted context and invalid bounded root both looked like `null` | explicitly permit configured base only for omitted/null input; non-null unresolved root bypasses |
| UI first-match validation was ambiguous | validate reached candidates through the first valid winner; fetch aggregate validates every active field |
| missing UI request-policy DI could throw | missing/malformed owner is an uncached `tenant()==''` result; preserve `context()` facade delegation |
| public `put()` bypassed render policy | admit only exact one-separator scoped keys and reject NUL-bearing coordinates |
| old/new persisted bytes can be provenance-identical | quarantine all persisted input by default; require explicit adapter attestation only after full cleanup |
| published request facades could diverge from new cache identity | derive effective fields/base through `context()`/`option()` while validating the bounded render root |
| failure/interleaving proof was too abstract | require actual handler/event rejection, interleaved fragment operations, missing-owner proof, and leading-NUL migration proof |
| malformed request containers can inherit configured base | add cache-only structural validity for request namespace, self-cycle, create-doc flag, and resolved root |
| inherited object-valued `c`/`p` links can select cache authority | add strict bounded own-link resolution to render-context-model and delegate from request/UI; keep normal `context()` unchanged |
| inherited `request` accessor can return a fresh object per read and evade an identity-only guard | reject an inherited request namespace before evaluating it; lock zero accessor calls plus fetch/UI no-state regressions |
| request-local parent validation duplicated the P3 policy owner | keep the ownership ratchet red, remove the duplicate walk, patch-bump render-context, and raise only required consumer minima |
| inherited non-null base can alter URL/SSRF behavior while colliding with configured scope | bypass when it remains the effective option; preserve configured fallback for inherited null/undefined and deliberate distinct facade replacement |
| root-only origin/base fetch keys can collapse into one UI configured-base scope | retain UI precedence by bypassing incompatible raw root fields; preserve distinct custom effective-base overrides |
| inherited `uiCacheScoped` can authorize legacy persistence | require an own adapter attestation exactly equal to `true` |
| legacy focused tests depend on fallback keys | add explicit cacheKey owners to scoped compatibility stubs; reserve missing/empty keys for bypass tests |
| pipeline reset erases every shared store and URL never reaches context | add real-origin default context and a narrow five-store reuse seam while preserving all other resets |
| empty-map assertions do not prove no read/recency | seed maps/order, including an existing undefined key, and assert byte/order identity |
| TSS and plugin timing could be accidentally changed | lock serial arrays and non-awaited after-view save timing; test save failure directly |
| ownership/source ratchets need coordinated proof | extend existing exact delegation/version/DI guards and run source-ratchet convergence |

These are deliberate security compatibility exceptions only for ambiguous/colliding/malformed identities. Ordinary non-empty scoped key bytes remain unchanged.

## Dependencies

- Depends on merged P3 policy owners and completion PR #58.
- Blocks the independent TTL/purge follow-up only in backlog order, not technically.
- Adds no external service, runtime dependency, or package.

## Test-First Plan

### Red Proof

1. Request-policy tests lock all absent/null/empty/malformed/bounded-`p`-cycle cases, invalid or inherited request containers/create-doc flags, non-empty precedence, omitted-vs-invalid configured-base behavior, field-specific `0`/`false`/`NaN`/`0n`/`1n` compatibility, NUL collision rejection, resolved-URL NUL bypass, inherited-accessor non-evaluation, and exact ordinary scoped identities.
2. Promise-cache tests seed scoped and literal-`undefined` entries and prove an undefined bypass neither reads nor reorders/evicts/mutates them, does not run hit callbacks, and does not deduplicate; `null` and scoped keys retain generic compatibility.
3. Data/HTML/TSS tests prove sequential fresh sources and explicitly interleaved independent promises for unscoped calls; transport/parse failure leaves seeded maps byte/order-identical; scoped identity, LRU, isolation, and rejection eviction remain. TSS unscoped arrays remain strictly sequential and retain no scalar.
4. Manifest tests use separate roots to prove unscoped sequential/interleaved pack loads do not share the singleton pack map, validation/acquisition failures leave it empty, and same-root prepared-index behavior remains. Scoped guarded hits, identity, and isolation remain.
5. UI-cache tests seed existing scoped cache/order state and prove missing policy-owner DI is a non-throwing miss/no-op; unscoped read/set/save leave that state, dirty state, and persistence byte/order-identical; explicitly interleaved unscoped fragment operations cannot observe one another. Scoped write-once/LRU/save shape remain. Default `init()` never reads ambiguous persistence; an explicitly attested post-cleanup store reloads only exact scoped keys. Primitive/base precedence and discriminator/variant/language/cid NUL collisions are locked.
6. Pipeline tests perform two same-identity renders with retained shared maps: unscoped render B observes fresh fetched/rendered B content, and an actual handler/event rejection after the unscoped fragment path leaves no fragment state. Equivalent explicitly scoped warm renders are byte-for-byte identical and avoid new transport work.
7. Existing TypeScript-AST source guards lock policy ownership, DI metadata/minimum versions, no runtime `require()`, and singleton reset wiring. Executable model/pipeline tests—not token-presence regexes—prove bypass decision paths and absence of fallback/sentinel/serialization behavior.

Legacy focused tests that intentionally exercise scoped deduplication/LRU with custom request stubs must add an explicit `cacheKey()`; tests for unscoped behavior intentionally omit it or return `undefined`/`null`/`''`. The UI-cache plugin's existing non-awaited `afterView()` save timing is locked and remains out of scope; save-failure atomicity is tested directly at the model boundary.

### Verification Commands

- Focused request/render-context/promise-cache/data/HTML/TSS/manifest/UI-cache/get/UI/isolation/wiring tests.
- Exact `npm test`.
- Exact `npm run typecheck`.
- `npm pack --dry-run` in every changed runtime package.
- `node --check` for every changed JavaScript file.
- Existing source guards plus targeted `rg` guards.
- Semgrep security scan.
- JSONL parsing/validation of `.claude-tasks/agent-outcomes.jsonl`.
- `git diff --check` and clean current-head review inspection.

## Security and Privacy Assessment

### Assets and Actors

- Assets: tenant-scoped data/HTML, transformation source/ASTs, validated manifest packs/indexes, rendered fragments, locale/context-sensitive output, and cache persistence.
- Sensitivity: cache content is host-defined and may be confidential or restricted; discriminator values are internal identifiers used as isolation boundaries.
- Actors: a cross-tenant requester seeking another tenant's warm result, a host accidentally omitting context, malformed/cyclic context input, and an operator rolling back with legacy persisted entries.

### Trust Boundaries

- Host-supplied render/request context into framework policy.
- Framework load/render result into process-wide singleton caches.
- Rendered fragments into host-provided persistent storage.
- Runtime request model into host-provided transport; that existing URL/SSRF boundary is unchanged.

### STRIDE

| Category | Threat | Control and verification |
|---|---|---|
| Spoofing | malformed/object discriminator impersonates a stable scope | primitive-only validity; malformed fails closed; unit cases |
| Tampering | context mutation/cycle changes policy or stale persistence is injected | bounded root resolution; no serialization; default persistence quarantine; cyclic/init tests |
| Repudiation | no new audit trail identifies bypass | library adds no telemetry; deterministic return contract and tests make decision reproducible; host logging remains owner |
| Information Disclosure | unscoped/colliding render reads another result or in-flight promise | undefined-key true bypass; tagged exact scoped keys; sequential/concurrent/isolation/pipeline tests |
| Denial of Service | attacker omits scope to defeat warm caches | intentional bounded tradeoff: normal uncached work; host supplies discriminator/rate limits; no added loops/state |
| Elevation of Privilege | shared fragment/data crosses tenant boundary and confers another tenant's view | fail-closed all shared cache types; legacy raw entries not loaded; scoped isolation tests |

### Attack Trees

```text
OR: obtain another render's cached content
  - omit every discriminator AND old code uses URL/raw variant
      -> mitigated by undefined-key bypass
  - supply malformed/cyclic discriminator AND obtain fallback/configured scope
      -> mitigated by invalid-context fail-closed rule
  - collide two valid scopes
      -> mitigated by preserved tagged/NUL identities and isolation tests
  - seed provenance-ambiguous persisted UI entry
      -> mitigated by default quarantine and explicit post-cleanup attestation

OR: retain unscoped state
  - insert success/in-flight/rejected promise into Map
  - bump hit recency or evict a scoped entry
  - set rendered fragment or dirty state
  - invoke persistence after set/save failure
      -> all mitigated by boundary return before shared-state access
```

### PASTA Applicability and Seven Stages

The flow may carry tenant-confidential/PII content and changes an existing trust-boundary invariant, so a bounded PASTA pass is applicable even though no new endpoint or external integration is added.

1. Objective: prevent cross-render disclosure without turning missing cache context into a render outage.
2. Scope: host context, five shared cache classes, UI persistence, and existing request transport boundary.
3. Decomposition: the data-flow diagram above separates policy decision, shared state, uncached work, persistence, and root-local manifest state.
4. Threat analysis: malicious tenant, misconfiguration, malformed context, stale persistence, and rollback.
5. Vulnerability analysis: URL-only/raw keys, empty tagged fields, JSON-wrapped undefined manifest keys, UI dirty/persistence side effects, and fallback key builders.
6. Attack analysis: the two AND/OR trees above; highest impact is cross-tenant disclosure, highest availability cost is deliberate cold work.
7. Countermeasures: single owner, true bypass, persisted quarantine, exact scoped compatibility, red tests, migration and rollback gates.

Residual risk: a host can deliberately reuse the same non-empty discriminator for multiple tenants; the framework cannot infer tenant truth. This is documented as host policy ownership and accepted only with the migration instruction that multi-tenant hosts use the actual boundary. Re-evaluate if automatic tenant discovery or a new persistence schema is proposed.

### Privacy

- No new personal data is collected, logged, serialized, or retained.
- The change reduces retention and linkability for unscoped renders and prevents cross-context content reuse.
- Valid discriminator strings remain in existing in-memory/persisted keys; their shape and lifetime do not expand.
- TTL/purge retention remains an explicit unresolved follow-up, not implicitly accepted as solved.

## Security Checklist Applicability

| Checklist | Disposition |
|---|---|
| injection | PASS: no new interpreter/sink; objects are not serialized/stringified into keys |
| authorization | PASS: missing scope denies shared participation; tenant isolation tests map to OWASP A01/CWE-639 |
| zero-trust architecture | PASS for affected boundary: no implicit trust from process-local cache; explicit per-render scope required |
| SSRF/external requests | PASS regression gate: URL allow, resolution, timeout, guarded manifest hits unchanged |
| rate limiting/resource abuse | PASS with documented uncached-work tradeoff and existing fixed bounds |
| dependency security | PASS: zero new dependencies; lock/package dry-runs retained |
| threat modeling | PASS at plan level: pre-code DFD, assets, actors, STRIDE, attack trees, PASTA, mitigations/tests |
| secrets, authentication, crypto, headers, API inventory, audit integrity, mobile, queue, AI/LLM, anomaly detection, Supabase RLS, secrets rotation | N/A: no credential, protocol, endpoint, log, mobile, queue, AI, database, or secret lifecycle change |

## Review Gate Routing

| Gate | Applicability |
|---|---|
| `review-router` | required to confirm the final diff's minimal review set |
| `review-architecture` | required: central cache-policy ownership and five consumers |
| `differential-review` | required: security-focused diff and history/blame context |
| `review-refactor` | required: behavior preservation across owner/consumer restructuring and package bumps |
| `insecure-defaults` | required: the defect is a fail-open default |
| `safety-friction-audit` | required: safest path must be the no-configuration default |
| `review-privacy` | required: cached host content may be tenant-confidential/PII |
| `threat-model-deep-dive` | applicable: an existing cross-tenant privacy trust boundary changes; bounded STRIDE/PASTA evidence is required |
| `tech-debt-ratchet` | required: reject shims, skips, TODOs, duplicated policy, and dependency churn |
| `source-ratchet-review` | applicable: package-resolution/DI/source guards change |
| `production-readiness` | required: migration, rollback, capacity tradeoff, and persistence behavior |
| `semgrep` | required security/static-analysis verification |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| accidental bypass of valid scoped cache | Medium | High | exact-key compatibility tests across every cache; default test host uses explicit origin |
| unscoped key accidentally wrapped/inserted | Medium | High | undefined propagation tests and direct map/order assertions |
| legacy persisted fragment served | Medium | High | default quarantine plus attested-reload migration/rollback tests/docs |
| configured base semantics regress | Medium | High | explicit base absent/null/empty/local matrix |
| custom request model silently shares | Medium | High | missing cacheKey means bypass; README contract |
| unscoped workload increases resource use | High by design | Medium | intentional uncached path, no extra state, explicit host opt-in |
| malformed context throws rather than renders | Low | Medium | primitive validator and cyclic/malformed tests; request path unchanged |
| package graph resolves old owner behavior | Medium | High | coordinated minimum ranges and package-resolution source guard |

## Trade-offs Considered

| Decision | Alternatives | Why selected |
|---|---|---|
| `undefined` means no cache participation | random key; per-render object; sentinel string; unique key | only a non-key permits true bypass with no retained state |
| request model owns policy validity | checks copied into five consumers; UI-only owner | one O(1) boundary decision; preserves P3 ownership |
| promise cache enforces undefined bypass | each promise consumer branches | centralizes all promise-map side-effect avoidance and is testable generically |
| UI cache receives request model by DI | runtime `require`; duplicate discriminator code | respects dependency-free runtime and single policy owner |
| primitive-only explicit identities | stringify objects; serialize contexts | preserves ordinary compatibility while preventing unstable/cyclic/malleable scopes |
| quarantine persisted reload by default | syntax filter; automatic destructive rewrite; schema v2 | old/new bytes are ambiguous; explicit post-cleanup trust guarantees safe default without schema or destructive mutation |
| preserve root-local manifest prepared state | bypass all manifest state | root-local state cannot cross renders and is required for atomic prepare/supersession |
| derive explicit origin in pipeline harness defaults | leave all legacy pipeline tests unscoped; sentinel tenant | models a real host discriminator and preserves warm behavior without fake identities |

## Blast Radius

| Dimension | Answer |
|---|---|
| Direct dependencies | injected render-context/request/promise-cache models; native Map/object; host saveModel and transport |
| Direct dependents | data/HTML/TSS get paths, UI manifest prepare, UI-cache plugin, test host DI, external hosts using published packages |
| Cascade on outage | cache policy cannot outage rendering; missing/invalid policy degrades to normal uncached work |
| Cascade on slow | unscoped transport/parser/render costs recur; scoped paths retain current warm behavior |
| Cascade on bad data | parse/validation/handler errors stop at existing request/render boundary; no unscoped shared state propagates them |
| Compromised-session impact | cache layer exposes zero prior unscoped entries; a falsely reused valid host discriminator can expose that discriminator's shared entries |
| Fault isolation boundary | per-operation uncached promise; scoped rejection eviction; render-root manifest atomic install; host persistence adapter |

## Rollback Plan

| Item | Answer |
|---|---|
| Code rollback | package/source rollback is compatible after the persisted store is cleared or restored from a scoped-only snapshot |
| Schema rollback | no schema change |
| Data rollback | in-memory maps disappear on restart; external UI store requires full cleanup/scoped-only restoration before old code runs |
| Auto-rollback trigger | any canary observation of one cross-scope result, one unscoped shared-state mutation, or scoped output/key mismatch; host automation is deployment-specific |
| Manual rollback runbook | root/package README migration section added by this change: clear the fragment store or disable UI cache, then restore the prior package set |
| Last rollback drill | library-only change; verification tests exercise old persisted shape and rollback precondition in this PR |

## Quality Dimensions — Plan Gate

| Dimension | Score | Evidence |
|---|---:|---|
| Architecture | 10 | one policy owner, one generic promise bypass, DI-only UI integration |
| Consistency | 10 | preserves P3 owners, CommonJS singleton style, tagged keys, and manifest boundary |
| Type Safety | 10 | pure-JS primitive validation; no declaration/type surface change; malformed inputs specified |
| Validation | 10 | absent/null/empty/malformed/cyclic and configured-base matrix |
| Error Handling | 10 | uncached continuation plus cache-specific failure atomicity matrix |
| Security/Privacy | 10 | STRIDE, PASTA, attack trees, persistence migration, isolation proofs |
| Performance | 10 | O(1) bounded policy, no retained state, explicit cold-work tradeoff |
| Maintainability | 10 | no duplicated ad hoc checks/imports/new package; terse owner methods |
| Testability | 10 | red-first unit/concurrency/failure/pipeline/package/source-gate plan |
| Readability | 10 | explicit compatibility tables, flow, migration, rollback, and non-goals |
| **Total** | **100/100** | all plan dimensions pass |

## Specification Self-Review

| Check | Result |
|---|---|
| Requirement traceability | PASS: every maintainer requirement maps to a contract, test, migration, or explicit non-goal above |
| Security-default correctness | PASS: only a valid explicit discriminator enables shared state; omission/malformed input degrades to normal uncached work |
| Compatibility | PASS: non-empty scoped tag order, NUL key composition, UI precedence, output, persistence shape, and public methods are locked |
| Failure atomicity | PASS: success and all requested failure classes have no unscoped shared side effect |
| Ownership/layering | PASS: request-model decides; promise cache enforces; consumers propagate; UI receives DI; no runtime import |
| Scope control | PASS: TTL/purge and all listed unrelated redesigns remain separate |
| Migration/rollback | PASS: legacy fragments are quarantined after upgrade; full host cleanup, attested reload, single-tenant opt-in, and rollback hazard are explicit |
| Performance | PASS: fixed/bounded decision; zero retained state; deliberate cold-work cost; scoped warm behavior preserved |
| SemVer/package graph | PASS: patch-only runtime changes and coordinated minimums; no compatible-range churn elsewhere |
| Verification/delivery | PASS: red-first, full gates, ready PR to `dev`, current-head CI/review, and no merge are explicit |

No product-level question remains. The maintainer explicitly authorized autonomous continuation after specification self-review, so this plan gate is approved without another pause.

## Open Questions

None. The maintainer request resolves scope, behavior, migration, SemVer, review, delivery, and the decision to keep TTL/purge separate.

## Success Criteria

- [x] Sequential and interleaved unscoped calls always observe fresh work and leave every shared cache/order/dirty/persistence surface unchanged.
- [x] Transport, parse, manifest validation, handler/event, and save failures leave no partial unscoped state.
- [x] Scoped sequential/concurrent behavior retains exact keys, identity/dedupe, LRU, persistence shape, and output.
- [x] Tenant/origin/base scopes remain isolated and malformed/cyclic contexts terminate safely without cache participation.
- [x] Two same-identity unscoped pipeline renders cannot leak fetched or rendered content; scoped warm renders are byte-for-byte compatible.
- [x] Focused/full/typecheck/package/source/security/JSONL/diff gates pass.
- [x] Architecture backlog closes only the fail-open discriminator subproblem and names TTL/purge as next.
- [ ] Ready PR targets `dev`, CI is green, and current-head Codex review is clean with zero unresolved threads; PR remains unmerged.

## Approval

- [x] Requirements clear
- [x] Scope agreed in maintainer request
- [x] Risks and trade-offs explicitly bounded
- [x] Specification self-review complete
- [x] Approved for implementation

**Approved by:** Codex self-review under the maintainer's explicit autonomous-continuation instruction
**Date:** 2026-07-17
