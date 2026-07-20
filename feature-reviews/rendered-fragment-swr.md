# Feature Development: Request-Triggered Rendered-Fragment Stale-While-Revalidate

**Status:** COMPLETE — HISTORICAL FEASIBILITY STOP (SUPERSEDED)
**Claimed:** 2026-07-19T15:38:32Z
**Agent:** Codex `/root`
**Current Mode:** Complete

---

> This is the preserved first-pass stop record. The separately gated host-capability follow-up
> resolved Section 20, implemented the preferred boundary red-first, and supersedes all
> time-scoped statements below that no runtime feature exists. See
> `rendered-fragment-swr-implementation.md` for the shipped contract and verification ledger.

## Resumption Context

**Last Completed Mode:** Review and verification
**Current Mode:** Complete
**Next Action:** None in this historical record; continue from the implementation follow-up.
**Files Created:**
- `feature-reviews/rendered-fragment-swr.md` - Feature-dev checkpoint and resumption record.
- `feature-reviews/stride-rendered-fragment-swr.md` - Pre-code STRIDE/PASTA deep dive.
- `feature-reviews/rendered-fragment-swr-evaluation.md` - Independent feasibility and architecture evaluation.
- `feature-reviews/rendered-fragment-swr-security-review.md` - Security/privacy/infrastructure disposition.

**Files Modified:** None outside the four review records.
**Tests Written:** None; the mandatory feasibility circuit breaker stopped before behavioral test or runtime work.
**Blocking Findings (implementation rejected):**
- The detached iteration document is isolated, but registered method data/validate/handle callbacks and before/after/completion plugin hooks have no purity, idempotence, foreground/background, or side-effect-suppression contract. A framework-owned replay would execute arbitrary observable lifecycle code again.
- A stale UI-cache hit assigns `v.r`, so the normal wrapper skips handler traversal; a refresh needs a new exact opaque execution capability, not a suppressed hook or a second foreground pass.
- The current blocking lease can overwrite a newer public `put()` because completion does not bind the retained pair/generation; two independent reviews and a root-agent reproduction confirmed it.
- Internal `publish()` rolls back cache metadata but root persistence-dirty `touch()` happens afterward; public `put()` cannot satisfy combined publication/dirty atomicity.
- Wire v1 carries exact bytes and original `settledAt` for age, but no attempted-generation marker; process-local reload semantics versus durable one-attempt identity remains an explicit prerequisite.

**Design Decisions Made:** Framework-owned replay is rejected. Both mandatory independent agents approved the stop. The only credible future boundary is a host-owned isolated session/lifecycle authority plus cache-owned exact-generation and combined cache/dirty publication; it remains blocked on eight executable decisions.

**Context for Next Session:**
The feature branch `feat/rendered-fragment-swr` is isolated at `/tmp/jtorm-rendered-fragment-swr` from `origin/dev` commit `8b821b2cdefc5c124c753fc79c9493ca6f340aa7`; the dirty main checkout remains untouched. Do not implement from this record alone. Start any follow-up by supplying the missing host capability and resolving Section 20, then repeat plan/threat/red-first gates.

---

## Research Summary

- **Modules involved:** `@jtorm/ui-cache-model` owns scoped nested HTML, LRU order, exact byte/`settledAt` pairs, render leases, purge, persistence validation/snapshots, and dirty state. `@jtorm/promise-cache-model` owns process clock identity, finite/zero/Infinity TTL, non-sliding freshness, opaque restore stamps, and acquisition-only SWR. `@jtorm/ui-cache-plugin`, `@jtorm/handler-wrapper`, and `@jtorm/event-model` jointly own lookup, detached iteration rendering, stage, deferred completion, abort, and after-view save. `@jtorm/request-model` plus `@jtorm/render-context-model` own exact tenant/origin/base admission. `@jtorm/handler` and injected methods/plugins own the observable render lifecycle.
- **Existing fragment flow:** before-iteration calls five-argument `uiCacheModel.get()`. A fresh authenticated hit returns exact stored HTML. A miss/stale-hard lookup removes the entire old byte/order/process/absolute pair, optionally creates one exact render lease, then the wrapper renders a detached document through the full method/event lifecycle. After-iteration stages `v.h.body()`; completion publishes only after every completion hook succeeds; abort rejects followers. Independent roots block on the leader lease, while same-root reentry bypasses it.
- **Existing persistence flow:** internal publication synchronously installs and rolls back bytes, order, process freshness, absolute `settledAt`, recency metadata, and exact pairing; current callers then dirty the root through a separate `touch()`. `save()` builds one frozen wire-v1 snapshot and awaits one adapter call; the plugin starts it at after-view without awaiting. Reload validates the complete envelope, re-evaluates original age under current TTL, and atomically swaps only still-fresh entries.
- **Existing authorization/isolation:** every lookup and completion derives the current discriminator. Unscoped/malformed/cyclic/inherited authority bypasses shared state. Tenant, origin, effective base, language, component id, and variant are embedded in exact identities. Purge, eviction, cache/order replacement, and init generation changes detach old leases; a direct newer `put()` does not detach an older blocking lease, which is why that lease cannot be reused for SWR.
- **Existing public shapes:** live fragment cache remains `{language:{cid:{scopedVariant:html}}}`; order values remain `{l,id,c}`; wire v1 records remain `{language,cid,variant,html,settledAt}`. No fragment stale-window or validator field exists. Handler effects remain `{children,repeat,data}`; iteration tokens are opaque and ephemeral.
- **Existing acquisition boundary:** data/HTML/TSS/manifest SWR and validators live in promise-backed acquisition generations. Their records, refresh promises, and validators never enter UI-cache persistence. Acquisition purge does not revoke prepared roots or rendered/persisted fragments.
- **Lifecycle observability:** the detached DOM prevents direct foreground-document mutation during an ordinary iteration, but the same injected method registry and plugin buckets execute arbitrary callbacks. The contracts permit network requests, singleton mutation, host instrumentation, or other effects; no generic callback declares itself replay-safe.
- **Test baseline and characterization:** focused tests pin strict TTL boundaries, non-sliding hits, render-lease deduplication, all completion/abort paths, exact/full purge, replacement/eviction/init races, immutable saves, restart age, scope isolation, acquisition-SWR exclusion, and downstream fragment independence. No current test or API supplies a safe generic background-render session.
- **Constraints discovered:** default and disabled behavior must remain lifecycle-compatible; default fragment stale window is zero; no timers/jobs/retries/validator changes/acquisition changes/runtime imports; wire and public identities stay fixed unless a justified release boundary says otherwise; stale service must never outlive the original hard deadline; authorization must be re-run for every lookup and refresh.
- **Open questions:** Can a generic framework-created background render avoid replaying arbitrary method/plugin/event effects? Can a host-provided isolated render-session seam authorize and execute refresh while the cache owner limits itself to exact-generation deduplication and atomic publication? Does that seam need a future additive package API rather than implementation in this feature?

---

## Progress Log

### Research Mode
- [x] Read `AGENTS.md` and `continue.md`
- [x] Created isolated worktree from current `origin/dev`
- [x] Claimed feature
- [x] Mapped relevant source and tests
- [x] Mapped canonical architecture records

### Plan Mode
- [x] Saved pre-plan checkpoint
- [x] Wrote feature specification
- [x] Completed feasibility decision

### Plan Quality Gate
- [x] Scope classified
- [x] Relevant agent personas consulted
- [x] All 10 dimensions pass at plan level
- [x] STRIDE pre-analysis complete
- [x] Plan refined with review feedback

### Design Mode
- [x] Loaded required design agent personas
- [x] Spawned code explorer
- [x] Spawned code architect
- [x] Created threat model
- [x] Validated against red flags

### Implement Mode
- [x] N/A — feasibility circuit breaker activated before scaffold/runtime edits

### Test Mode
- [x] N/A — no failing behavior test written for deliberately unshipped functionality
- [x] N/A — focused behavior implementation suite not applicable
- [x] Full test suite passing: 912/912
- [x] Typecheck passing

### Review Mode
- [x] Required scoped reviews pass for the stop decision
- [x] STRIDE controls implemented or blocker documented
- [x] 100/100 plan/evaluation quality
- [x] Verification loop passed

### Documentation and Delivery Mode
- [x] Specification, threat model, evaluation, and security review complete
- [x] N/A — canonical backlog is not marked complete for an unimplemented feature
- [x] N/A — no package/release candidate, dry-run, audit, or Semgrep delta
- [x] N/A — no commit or PR after the failed feasibility gate
- [x] N/A — no current-head CI/Codex delivery claim


## Feature Specification

### Metadata and Decision State

- **Specification status:** FEASIBILITY GATE FAILED — documentation complete, runtime implementation prohibited by this review.
- **Decision authority:** the explicit continuation handoff authorizes evaluation and requires a stop if generic background rendering cannot avoid duplicated observable lifecycle effects.
- **Base:** `origin/dev` at `8b821b2cdefc5c124c753fc79c9493ca6f340aa7`.
- **Branch/worktree:** `feat/rendered-fragment-swr` in `/tmp/jtorm-rendered-fragment-swr`; the dirty main checkout is untouched.
- **Scope tags:** `SECURITY`, `INFRA`.
- **Threat model:** `feature-reviews/stride-rendered-fragment-swr.md`.
- **Deep-dive trigger:** PASTA is required because the only credible future design introduces a host/cache trust boundary that may carry tenant-sensitive rendered HTML.
- **Implementation state:** no runtime, test, package, dependency, wire, or public API change is authorized by this specification.

### 1. Problem and Desired Outcome

A host may want an already-authorized rendered UI fragment to return immediately during a short interval after its normal TTL while one request triggers replacement work. The user benefit would be lower turnover latency; the host benefit would be fewer simultaneous fragment renders. Those benefits are valid only if the replacement is produced by the same complete, validated lifecycle without replaying externally observable effects merely for cache maintenance.

Rendered fragments are not acquisition values. They are derived by arbitrary dependency-injected method callbacks and plugin hooks, after which the UI cache pairs exact HTML with process freshness, a restart-stable Unix publication timestamp, LRU state, and persistence-dirty state. The underlying need is therefore not another TTL phase alone. It is a safe, explicitly authorized way to create a second render session whose side effects, scope, completion, publication, and persistence semantics are all owned by the correct layer.

The requested outcome is satisfied in this change by deciding that feasibility honestly. A runtime implementation is successful only if safety is demonstrable; when it is not, the required deliverable is the reviewed specification, threat model, concrete blocker, and preferred host-injected seam.

#### 1A. Functional Requirements

1. Missing, absent, invalid, or zero fragment `staleWindow` must preserve existing byte results, promise/value identities, misses, lifecycle order, and save behavior. Zero is the default.
2. Prospective phase boundaries are strict and non-sliding: fresh when `age < ttl`; stale only when `staleWindow > 0` and `ttl <= age` and `age - ttl < staleWindow`; hard at equality or beyond the stale boundary.
3. A stale hit may return only the exact retained HTML paired with its original `settledAt`; lookup, LRU touch, refresh start, failure, reload, and save never change that pair.
4. Every lookup, refresh admission, and completion must derive current tenant/origin/base authority and require the exact language/component/variant identity. Scope drift never shares stale bytes or work.
5. One exact retained generation may own at most one background refresh attempt. Concurrent stale callers return the old bytes immediately and never wait behind it.
6. Replacement HTML may publish only after the host has completed and authorized the full existing handler, method data/validation/handle, iteration, event, and plugin lifecycle.
7. Framework code must neither replay arbitrary externally observable effects without host authorization nor suppress lifecycle work that may be required to produce valid HTML.
8. Refresh failure leaves the old pair unchanged only until its original hard boundary, is observed internally, and does not schedule or trigger another background attempt for that retained generation.
9. At and beyond the hard boundary, old HTML is never served. Callers join current authorized replacement work when one exists or follow the ordinary blocking render contract.
10. Successful publication atomically replaces HTML, process timestamp, Unix `settledAt`, recency metadata, exact pairing, and persistence-dirty revision, or changes none of them.
11. Persistence reload evaluates original age under the current TTL/window policy. No init/reload/hit/start/save time is substituted for publication time.
12. Purge, full purge, hard expiry, eviction, reset, cache/order/store replacement, root/lifecycle replacement, init races, scope drift, newer publication, and rejected adapters detach older work and prevent resurrection.
13. Positive retention truthfully extends how long an already-authorized fragment may remain visible. It provides no generic downstream revocation guarantee.
14. Runtime source remains dependency-free CommonJS with DI, singleton reset discipline, existing exports/public store shapes, and separate process/Unix clocks.
15. No timer, polling, automatic retry, durable job, validator, acquisition-cache change, stale-if-error policy, runtime import, or persistence-wire change is permitted.

Accessibility, database, routes, network API, frontend interaction, payments, mobile, AI, and schema requirements are N/A because this is a cache/lifecycle feasibility decision and documentation-only result.

### 2. Scope, Priority, and Circuit Breaker

#### In scope

- Map the exact fragment lookup, render lease, lifecycle, publication, timestamp, save, reload, scope, purge, and race owners.
- Specify disabled/fresh/stale/hard semantics and the full requested race/failure matrix.
- Determine whether current framework contracts can safely perform generic background rendering.
- Determine wire-v1 sufficiency and the publication-versus-external-durability boundary.
- Threat-model both the rejected framework-owned replay and the preferred host-injected session seam.
- Define concrete preconditions and an additive API shape for a separately approved follow-up.
- Independently review the feasibility conclusion and retain evidence in `feature-reviews/`.

#### Out of scope / no-gos

- Runtime implementation, tests for behavior that is intentionally not shipped, package version changes, dependency-floor changes, package documentation claiming availability, backlog completion, commits, pushes, or a PR.
- Acquisition-cache SWR, acquisition refresh transactions, validators, conditional requests, response headers, or HTTP 304 behavior.
- Changes to handler traversal, method effects, event ordering, plugin behavior, view/context cloning, UI compilation/resolution, persistence adapters, or wire version 1.
- Timers, polling, sweeps, retries, queues, Workers, Durable Objects, service workers, new jobs, cancellation frameworks, telemetry frameworks, or runtime imports.
- A framework assertion that arbitrary callbacks are pure, idempotent, replay-safe, or revocation-aware when their public contracts do not say so.

#### Four-dimension priority

| Dimension | Decision |
|---|---|
| Business importance | Medium-high: turnover latency can matter, but correctness and externally visible effects outrank the optimization. |
| User importance | Conditional: immediate stale HTML helps latency-sensitive hosts but can prolong sensitive content visibility. |
| Technical feasibility | Low inside current contracts; generation-safe cache mechanics exist, but safe lifecycle replay does not. |
| Resource feasibility | High for the evaluation; unknown for implementation until a host supplies an isolated session/lifecycle-authorization capability. |

Reference classes are the acquisition SWR work and persisted-fragment-age work. Both show that clock/generation policy can be implemented centrally, but neither crossed arbitrary render lifecycle callbacks. The fixed appetite for this task is the feasibility gate. Its circuit breaker is explicit: when generic replay cannot be proven safe, stop before red tests or runtime changes.

### 3. Feasibility Decision

**Verdict: STOP. Generic framework-owned rendered-fragment SWR is not demonstrably safe under the current public contracts.**

The blocker is lifecycle authority, not TTL arithmetic:

| Evidence | Current guarantee | Why it blocks generic background replay |
|---|---|---|
| `handler-wrapper.js:50-98` | An ordinary iteration creates a detached DOM, retains a parent context link, runs before/after iteration hooks, recursively handles methods, and completes plugins. | Detachment protects the foreground DOM tree only. It does not isolate the parent context, injected singletons, transports, host state, or callback effects. |
| `handler.js:85-109` | Every registered verb may run arbitrary `data`, `validate`, `handle`, before-method, and after-method callbacks. | No callback contract declares purity, idempotence, cache-maintenance safety, or a background mode. The framework cannot know whether replay sends a request, writes state, increments a counter, or records an event. |
| `event-model.js:61-82` | Every registered plugin hook is awaited, and completion hooks may participate in the single deferred commit. | Skipping hooks can change or invalidate HTML; replaying them can repeat observable effects. Either generic choice violates a locked requirement. |
| `ui-cache-plugin.js:25-47` | The plugin owns lookup, stage, deferred complete/abort, and starts save at after-view. | It has no injected host session creator, no refresh authorization callback, and no safe snapshot of render inputs. |
| `ui-cache-model.js:469-555` | The cache owns exact blocking render leases and same-root reentry behavior, but does not render. | Moving rendering into the cache would cross DI ownership and still would not authorize arbitrary lifecycle effects. |
| `ui-cache-model.js:619-649` | Staged bytes publish only through completion after later hooks succeed and current scope/store still match. | This is reusable publication machinery, but a background producer with equivalent lifecycle authority does not exist. |
| `ui-cache-model.js:755-769` | Live publication and dirty state precede a separate arbitrary save-adapter call. | Internal publication can be atomic; external durability cannot be made one transaction without changing the adapter contract. |

A concrete witness requires no exotic attacker: inject a valid method whose `handle()` increments an external counter or a valid plugin whose `afterIteration()` sends host instrumentation. The initial foreground render legitimately executes it once. A stale cache lookup that silently invokes `handlerWrapper.handle()` executes it again for cache maintenance. The detached document remains untouched, yet the externally observable effect is duplicated. Conversely, suppressing that callback may omit required data, validation, transformations, or completion and produce bytes that were not created by the existing lifecycle.

#### Rejected implementation options

| Option | Decision | Reason |
|---|---|---|
| Call `handlerWrapper.handle()` in the background with the current view | Reject | Replays arbitrary method/plugin/event effects, retains parent context, and may race foreground singleton state. |
| Deep-clone `v` and render a detached document | Reject | `v` is not the complete effect boundary; injected registries, transports, globals, closures, and plugin state remain shared and cannot be generically cloned. |
| Suppress before/after/completion hooks during refresh | Reject | Violates the full-lifecycle requirement and can publish invalid or semantically different HTML. |
| Mark refresh mode on `v.c` and ask extensions to cooperate | Reject | Changes a public lifecycle contract, defaults existing extensions into unsafe behavior, and cannot prove old extensions comply. |
| Put rendering inside `ui-cache-model` or `ui-cache-plugin` | Reject | Crosses current ownership, expands DI surface substantially, and leaves lifecycle authorization unsolved. |
| Reuse acquisition-cache SWR | Reject | Acquisition loaders return promise-backed source values; rendered fragments are downstream lifecycle results with separate leases, clocks, timestamps, persistence, and revocation. |
| Host-injected isolated render session | Preferred follow-up | The host can know its callbacks, construct an isolated session, authorize replay-safe effects, and give the cache only validated bytes plus current authority. This capability is absent today. |

No runtime test can turn the missing public contract into a guarantee. A fixture proving one pure method/plugin combination works would not prove all published extension points are safe. Implementing anyway would violate the handoff's mandatory stop condition.

### 4. Prospective State Machine — Conditional on a Future Host Seam

This section defines the required behavior for a separately approved implementation. It is not a description of shipped behavior.

| State | Exact predicate | Caller result | Background action |
|---|---|---|---|
| Unscoped/bypass | Current discriminator or exact parts fail | Existing ordinary uncached path; never shared stale | None |
| Disabled | Window absent, inaccessible, invalid, zero, or host refresh seam absent | Existing byte/lifecycle behavior exactly | None |
| Pending ordinary render | Exact current blocking lease exists | Existing same-root bypass / independent-root follower behavior | None added |
| Infinite fresh | `ttl === Infinity` and exact pair/current process clock are valid | Exact retained HTML | None; window is not consulted |
| Finite fresh | `0 <= age < ttl` | Exact retained HTML; successful-hit LRU touch only | None |
| Stale eligible | `staleWindow > 0`, `age >= ttl`, and `age - ttl < staleWindow` | Exact retained HTML immediately; original pair unchanged | First caller receives one opaque refresh lease; later callers receive no lease and never wait |
| Stale after failed attempt | Same stale predicate and exact generation already attempted | Exact retained HTML immediately | None; no background retry for that generation |
| Hard with active refresh | `age - ttl >= staleWindow` and exact refresh is active | Never old HTML; authorized callers join the refresh result | Existing attempt continues; no second render |
| Hard without active refresh | Hard predicate, invalid/regressing/different clock, or detached metadata | Existing ordinary blocking render contract | No background path |
| TTL zero | `ttl === 0` | Pending work may deduplicate; settled fragments are not retained | None |

Boundaries use subtraction, never `ttl + staleWindow`, so large finite values cannot overflow the comparison. A throwing getter, string, boolean, `NaN`, negative number, or `Infinity` window disables fragment SWR while preserving ordinary TTL freshness. Runtime TTL/window changes reclassify from the original successful publication; they never create a timestamp.

A positive window without the host seam fails closed to existing blocking behavior. Serving stale without starting an authorized refresh would be stale retention, not stale-while-revalidate.

### 5. Preferred Host-Injected Refresh Seam

The cache may own only exact-generation coordination and atomic publication. The host must own the render session and every decision about whether its lifecycle may execute for cache maintenance.

A concrete follow-up API should preserve `uiCacheModel.get()` and all current return shapes, adding an internal DI-facing seam with these conceptual contracts:

| Surface | Contract |
|---|---|
| `uiCacheModel.lookup(v, l, id, variant, iterationToken)` | Returns a frozen `{value, refresh}` result. `value` is the existing string/null/follower promise semantics. `refresh` is an opaque one-shot lease only for the first exact stale caller; no public scope key, view, DOM, or callback registry is exposed. |
| `uiCachePlugin.refreshModel` | Optional host-injected collaborator. Its absence disables fragment SWR even when a positive window is configured. It owns issuance, currentness checks, and invalidation of an opaque root/lifecycle authority epoch; the cache does not invent one from its global lifecycle counter. |
| Refresh-execution capability | Cache-issued, opaque, one-shot capability bound to the stale lease. The isolated session carries it only in root-local host state. The normal UI-cache `beforeIteration` hook still runs, but a valid capability makes cache lookup bind that iteration to the refresh transaction and return a render miss rather than the retained stale hit. It is not a generic hook-suppression flag. |
| `refreshModel.render(v, descriptor, execution)` | Called synchronously while the triggering request is current so the host can snapshot inputs and issue the authority epoch. It must not retain or mutate `v`; it returns a promise only after a separately created isolated render session has re-derived current authority and completed the full authorized lifecycle. |
| Refresh result | Frozen `{view, html, authority}` where `view` belongs to the isolated session, `html` is the exact validated fragment produced after lifecycle completion, and `authority` is the host-owned opaque epoch. No timestamp is host-supplied. |
| `uiCacheModel.completeRefresh(view, lease, html, authority)` | Invoked by the UI-cache plugin's ordinary deferred completion closure after every completion hook. It re-derives current scope, requires the host collaborator to synchronously attest that its epoch is still current, validates the exact-generation lease, samples both owning clocks, and atomically publishes or leaves all live/dirty state unchanged. |
| `uiCacheModel.abortRefresh(lease, error)` | Observes the rejection, marks that retained generation attempted, resolves/rejects hard followers under the documented contract, and never changes old bytes/timestamps. |

`descriptor` contains only the exact public render coordinates needed by the host (`language`, `cid`, `variant`) and an opaque lease. The host is trusted DI and must reconstruct all model/template/session inputs rather than receive a cache-owned serialized context. It must explicitly attest that the lifecycle is authorized for refresh; the framework must not infer this from callback presence.

The isolated session executes the normal UI-cache plugin as well as every other lifecycle participant. Its capability changes only the cache lookup classification for that exact refresh transaction; it does not skip a callback. Staging, abort, and the deferred completion commit therefore remain in their ordinary order, and the host promise resolves only after that sequence settles.

The host collaborator, not `ui-cache-model`, owns the authority epoch because only the host can identify replacement of a render root, callback registry, credentials, or lifecycle policy. The cache owns equality and publication: completion is one synchronous current-epoch attestation followed by exact lease checks and the cache transaction, with no intervening await.

The cache invokes no handler, wrapper, event, method, plugin, transport, DOM, or persistence adapter to create HTML. The plugin acts only as the adapter between the cache lease and the injected host capability. A future design review may choose different method names, but it must preserve these ownership and data-minimization properties; changing names does not relax the gate.

### 6. Refresh Ownership, Failure, and Hard Callers

- A refresh lease binds the exact current cache object, order Map, store identity, scoped key, retained HTML, process stamp, Unix `settledAt`, settlement record, cache generation, cache token, and host-owned root/lifecycle authority epoch.
- The host collaborator owns epoch issuance/currentness/invalidation; the cache owns opaque identity binding and requires a synchronous current-epoch attestation immediately before publication.
- Only one lease can be active or attempted for that retained live-process generation. A synchronous throw counts as its attempt. No timer, retry loop, or later stale-triggered second attempt is permitted.
- The returned background promise receives an observer in the same turn, so rejection is never unhandled even though stale callers do not await it.
- Refresh failure deletes only active ownership, leaves the old exact pair unchanged, and records the attempt until the old generation becomes hard or is invalidated.
- At the hard boundary, an existing active refresh is the only work that may be joined. Old HTML is not returned. With no active refresh, the old generation is detached and the ordinary wrapper/render lease decides leader, same-root reentry, follower, validation, and failure behavior.
- Hard followers may receive newly rendered HTML only after their own current lookup authorization and the isolated session's completion authorization both succeed. A scope mismatch rejects/detaches; it never falls back to old HTML.
- If authorized lifecycle output succeeds but internal cache publication fails atomically, the new HTML may be delivered uncached to already-authorized hard followers, matching the current ordinary follower principle that a valid render can succeed even when caching does not. No partial cache state or new timestamp remains.
- If a newer generation wins, the lease cannot publish over it. Existing lease followers may settle only with output already authorized for their exact request; later callers classify the newer generation.

### 7. Atomic Publication and Persistence Boundary

The current internal `publish()` helper is a useful but incomplete foundation: it writes the nested HTML, LRU record, process stamp, exact HTML/Unix timestamp pair, eviction effects, and persistence high-water with rollback on partial failure. It does **not** atomically include root persistence-dirty state; current callers invoke `touch()` only after `publish()` returns (`set()` at line 578 and `complete()` at line 643).

A future refresh completion therefore cannot reuse public `put()` unchanged. Its cache-owned transaction must prevalidate and capture both live cache metadata and the exact root dirty/revision state, publish and touch as one synchronous unit, and roll back both owners' mutations if either half fails. Successful completion exposes the new pair and dirty revision together; failed completion exposes neither.

“Atomic publication” does not mean atomic external durability. The public adapter remains an arbitrary asynchronous `saveModel.set(envelope)` called after a frozen snapshot is formed. No dependency-free in-memory operation can transact atomically with that external store without a new adapter protocol. The safe and compatible contract is:

1. successful lifecycle plus current authority;
2. one internal all-or-nothing live publication with true publication clocks plus the exact root dirty/revision update;
3. dirty revision remains set only after that combined transaction succeeds;
4. a later/current after-view save passes one immutable wire-v1 envelope;
5. adapter success clears dirty only if the revision is unchanged;
6. adapter rejection leaves dirty state and the live publication intact for ordinary host-managed later saving, and its promise must be observed by the host session.

Rolling back a live publication because an asynchronous adapter later rejects would expose older bytes with a misleading lifecycle and would race concurrent readers. Inventing a save timestamp would break the persisted-age contract. Neither is allowed.

### 8. Persistence Wire and Restart Semantics

Wire version 1 is sufficient for durable age classification. Each record contains exact `language`, `cid`, scoped `variant`, `html`, and original Unix-ms `settledAt`; a stale window remains current host policy rather than record provenance.

Wire v1 is **not** sufficient to remember that refresh was already attempted. It has no generation identifier or attempted marker. If “one attempt for an exact retained generation” must survive process restart, an authenticated versioned field and incompatible wire/migration/deployment/rollback analysis would be required. No such change is authorized here.

The compatible alternative is to define each successfully restored entry as a new process-local loaded generation. That keeps attempt state private and bounded, but permits one new attempt after every restart while the original bytes remain stale. This review records that tradeoff as an unresolved product/security prerequisite rather than silently redefining “generation.”

The separate missing age capability is process-local restoration policy. `promiseCacheModel.restore()` currently rejects `age >= ttl`, so `ui-cache-model.init()` intentionally cold-drops every stale candidate. A future API may restore an opaque insertion record through the current hard boundary while leaving acquisition `get()`/SWR/validators unchanged. Required rules are:

- validate the whole v1 envelope before admitting any record;
- sample one current process clock and one nondecreasing Unix clock;
- compute `age = nowUnix - settledAt` with no synthetic timestamp;
- retain fresh records and, only when a positive window plus host seam are configured, stale records strictly before the hard boundary;
- cold-drop at/equal/beyond hard, on invalid policy, future timestamp, clock regression, malformed pair, or missing host seam;
- restore process-local insertion identity as `sampleProcess - age`; never serialize a process clock/context;
- preserve exact byte/timestamp pairing, LRU bounds, atomic candidate swap, init generation checks, and clean reloaded dirty state;
- `ttl = 0` restores none; `ttl = Infinity` restores valid records without reading a window.
- explicitly classify restoration as a new live generation, or use a separately reviewed wire version if attempt history must be durable.

No migration, compatibility reader, version bump, synthetic reload time, or parallel metadata is justified for age classification alone. Full wire-v1 sufficiency remains conditional on accepting process-local attempt identity.

### 9. Authorization, Retention, and Revocation

Every shared-state operation must derive the current root through `renderContextModel.cacheContext()` and the exact request discriminator. A refresh lease may contain an opaque captured identity for equality checks, but it is never authority. Admission and completion each independently require an own, current data-property authority chain and exact tenant, origin, effective base, language, component id, and variant.

A positive window is an explicit retention policy: HTML that was authorized and published at time `settledAt` can remain visible to a currently authorized lookup until, but never including, `ttl + staleWindow` age. This can be longer than an underlying user's permission or source data remains valid. The framework has no generic revocation feed from downstream data, identity providers, business state, prepared roots, or acquisition caches.

Hosts enabling the policy must therefore accept or supply domain-specific invalidation. Sensitive revocation continues to require coordinated disposal of prepared render roots, exact/full UI purge, persistence clear/save, and any source/acquisition invalidation. Fragment SWR must not claim that re-running lookup authorization detects all downstream data revocation.

### 10. Race and Invalidation Matrix

| Event | Required result in a future implementation |
|---|---|
| Exact purge | Remove old bytes/pair/recency and refresh ownership; late lifecycle completion may settle its original caller but cannot publish. |
| Full purge | Detach every lease for the current order/store generation; late work cannot recreate any entry. |
| TTL reaches hard while refresh runs | Stale callers stop receiving old bytes; hard callers independently reauthorize before joining current refresh. |
| LRU eviction | Remove the exact settlement and refresh descriptor; detached completion cannot affect the entry or evict a newer one. |
| Cache object replacement | Weak store identity mismatch detaches old work; no write into the replacement object. |
| Order Map replacement/reset | Weak generation metadata is unreachable/reset; old completion cannot stamp/pair against the new Map. |
| Root/lifecycle replacement | Host-owned opaque authority epoch fails currentness attestation and prevents publication even when strings and store identity appear equal. |
| Init starts or wins | Candidate/live cache-generation token decides atomically; pre-init refresh cannot populate the reloaded cache and delayed adapter data cannot replace new work. |
| Reloaded stale record | It is either explicitly a new process-local loaded generation with one new allowed attempt, or its durable attempted state comes from a separately reviewed wire; v1 cannot promise cross-restart one-attempt-ever. |
| Scope/discriminator drift | Refresh start or completion fails closed; no stale service, shared work, or publication under either identity. |
| Newer `put`/publication | Exact retained HTML/pair/token mismatch detaches the old refresh; the newer generation wins. |
| Adapter rejection | Live pair remains internally valid and dirty; the rejection is observed and no timestamp changes. |
| Overlapping immutable saves | Each adapter call keeps its exact frozen payload; dirty clears only when the corresponding revision is still current. |
| Refresh lifecycle rejection | Old pair remains unchanged through its original stale interval, one attempt is recorded, hard callers receive no old fallback, and no rejection is unhandled. |
| Internal publication failure | Roll back every partial cache mutation; authorized hard followers may receive uncached new HTML, but no pair/dirty/timestamp is installed. |
| Runtime TTL/window reduction | Reclassify from original `settledAt`; if newly hard, stop stale service immediately and detach/route through hard behavior. |

The existing blocking lease cannot simply become this transaction. An independent review reproduced `acquire(old) -> put(newer) -> stage/complete(old)`, after which the old lease overwrote the newer HTML. Current `complete()` verifies flight, store, stage, and scope but does not bind the lease to the exact retained settlement it is replacing. That behavior is not changed here; it is evidence that a future SWR lease needs a distinct exact-generation token and red-first newer-publication test.

### 11. Affected Components and Ownership

This evaluation changes only review documents. A future implementation, if separately authorized after a real host capability exists, would have this bounded surface:

| Component | Prospective responsibility | Explicitly unchanged |
|---|---|---|
| `src/models/ui-cache-model` | Window classification, opaque exact-generation leases, one-attempt dedupe, hard joining, combined cache/dirty transaction, stale-aware restore admission | Nested live cache shape, order value shape, public `get` compatibility, save adapter ownership; wire v1 only if process-local loaded-generation semantics are accepted |
| `src/plugins/ui-cache-plugin` | Adapt one cache-issued lease to an injected host refresh collaborator and attach rejection handling | Ordinary before/stage/complete/abort/after-view lifecycle when disabled |
| Host integration | Create/snapshot an isolated session, reauthorize lifecycle execution, bound its lifetime, return full-lifecycle HTML/current view | Cache policy, timestamp generation, publication, persistence envelope |
| `src/models/promise-cache-model` | Optional UI-only stale-aware opaque restore helper or compatible restore extension | Acquisition `get`, acquisition SWR, validators, public Map/promise identities |
| `test/helpers/engine.js` | Supply a deliberately safe fake host seam and reset all new singleton fields | Production host contract; no default background work |
| Focused model/plugin/handler/pipeline tests | Pin all requested boundaries, lifecycle witnesses, and races red-first | Existing acquisition/validator/wire tests remain regression-only |
| Package/root/architecture docs | Explain opt-in retention, host trust boundary, rollback, and release versions only after implementation | No availability claim in this documentation-only decision |

No runtime import is permitted between these packages. All collaborators remain host-injected.

### 12. Dependencies, Public API, and SemVer

#### Current evaluation result

No dependency or package metadata changes. Documentation-only review does not justify a package bump. No persistence migration/deployment order exists because no runtime is shipped.

#### Conditional future release

| Package | Minimum release type | Reason |
|---|---|---|
| `@jtorm/ui-cache-model` | Minor | Additive public configuration plus lease/settlement capability and stale-aware restore behavior. |
| `@jtorm/ui-cache-plugin` | Minor | Additive injected refresh collaborator and opt-in behavior. |
| `@jtorm/promise-cache-model` | Minor only if its public restore/helper surface changes | Additive restoration policy; acquisition behavior must remain byte/promise compatible. |
| Host package(s) supplying the session | Minor | New explicit lifecycle-authorization capability. |

Direct package dependency floors would move only when a consumer uses the new additive API. If cross-restart one-attempt identity is required, an incompatible envelope change requires a major `@jtorm/ui-cache-model` release plus migration/rollback/isolation plan; process-local loaded-generation semantics avoid that wire change but require explicit acceptance.

#### API contract disposition

- **Shipped network/API surface:** unchanged; no route, request, response, header, status, event, persistence wire, or HTML shape changes.
- **Shipped runtime singleton surface:** unchanged.
- **Preferred follow-up DI surface:** the concrete `lookup` / `refreshModel.render` / `completeRefresh` / `abortRefresh` contract in Section 5.
- **Compatibility:** `get()` and default plugin behavior remain the authoritative public path when the host seam is missing or the window is zero/invalid.

### 13. Trade-offs Considered

| Decision | Alternative | Why rejected/chosen |
|---|---|---|
| Stop before implementation | Implement TTL phases and assume callbacks are harmless | The unsafe assumption is directly contradicted by public arbitrary callbacks and a built-in root-state mutation witness. |
| Host owns isolated lifecycle | Framework owns replay | Only the host knows callback effects, request lifetime, session construction, and whether refresh execution is authorized. |
| Cache owns generation/publication | Host writes cache directly | Preserves exact tokens, two clocks, byte/timestamp pairing, LRU bounds, dirty revision, and invalidation races in one owner. |
| Require both positive window and host seam | Let a positive window serve stale without refresh | The latter is stale retention without revalidation and can silently hide a broken integration. |
| One attempt per retained generation | Request-triggered retries after failure | The handoff excludes retries; one attempt bounds effect duplication and load. Hard requests use the ordinary contract. |
| Preserve full lifecycle | Suppress effectful hooks | Valid bytes may depend on those hooks; suppression creates a second, weaker rendering contract. |
| Wire v1 unchanged | Persist a stale flag/window/refresh state | Those are current process/policy facts, not durable fragment provenance. |
| Internal publish before separate save | Try to transact live memory and arbitrary adapter durability | No such transaction exists in the public adapter; dirty revision is the compatible recovery boundary. |
| Additive token API in a follow-up | Overload current five-argument `get` with hidden callbacks | Explicit capability keeps ownership reviewable and avoids changing old call behavior accidentally. |

### 14. Blast Radius

| Dimension | Answer |
|---|---|
| Direct dependencies | Current request/render-context discriminator, UI cache stores/order/pairs/clocks, handler-wrapper/event/plugin lifecycle, and arbitrary host methods/plugins. No new dependency is added by this evaluation. |
| Direct dependents | Hosts rendering cached components, independent roots waiting on render leases, persistence adapters, and external consumers of published singleton/store shapes. |
| Cascade on outage | Current behavior is unchanged. In a future opt-in design, stale service ends strictly at hard; active hard callers join authorized refresh or ordinary render failure, never indefinite stale. |
| Cascade on slow | A future host session can outlive the stale response and retain host resources. One exact attempt bounds cache ownership, but the host must bound transport/session lifetime; the framework makes no durable completion claim. |
| Cascade on bad data | Host lifecycle validation must fail before publication. Existing old HTML remains only to its original hard boundary; at hard, no stale-if-error fallback exists. |
| Compromised-session impact | Current state is unchanged. Future positive retention can expose only an exact currently authorized scope, but may prolong already-published sensitive HTML and does not detect generic downstream revocation. |
| Fault-isolation boundary | Exact cache/order/store/settlement/lifecycle token for publication; host-owned isolated session for rendering; arbitrary external persistence adapter after internal dirty publication. |

### 15. Rollback Plan

| Item | Answer |
|---|---|
| Code rollback | N/A for this result: no runtime code changes. A future release must first set the window to zero/remove the host seam, then purge affected fragments before rolling plugin/model packages back in dependency order. |
| Schema rollback | N/A: no database, schema, or migration. |
| Data rollback | N/A now. Future sensitive rollback uses existing exact/full UI purge plus external persistence clear/save; no v1 migration is required. |
| Auto-rollback trigger | N/A in this dependency-free framework and documentation-only change. A future host must treat any scope leak, stale-at-hard result, duplicate unauthorized effect, resurrection, or unhandled rejection as an immediate zero-window kill-switch trigger. |
| Manual rollback runbook | Future sequence: disable window/refresh collaborator -> block new stale admission -> purge exact/all affected UI entries -> clear/save external persistence if sensitive -> dispose prepared roots as required -> roll host/plugin/model versions back. |
| Last rollback drill | Documentation-only N/A. A future implementation cannot claim readiness until deterministic tests execute every invalidator and the host drills its own isolated-session cancellation/disable path. |

Default zero is the primary rollback and safety control; it must not require a redeploy when hosts expose mutable DI configuration.

### 16. Security Design and Threat-Model Link

The authoritative pre-code model is `feature-reviews/stride-rendered-fragment-swr.md`. It contains the DFD, asset/actor inventory, all six STRIDE categories, the PASTA seven stages, attack trees, source-to-sink validation, risk scoring, countermeasures, test linkage, and residual-risk disposition.

Top controls fixed by this specification:

- **Spoofing:** current discriminator at lookup, host session creation, and cache completion; captured identity is never authority.
- **Tampering:** exact retained-generation lease plus atomic publication; current blocking lease is explicitly insufficient for newer-publication races.
- **Repudiation:** no false observability claim; hosts own lifecycle/refresh attempt records while cache failures remain explicitly observed.
- **Information disclosure:** default zero, exact scope, strict hard boundary, no synthetic timestamp, explicit retention/revocation caveat.
- **Denial of service:** one attempt per generation, no timer/retry/job, bounded metadata, host-owned time/resource limits.
- **Elevation of privilege:** no framework-created privileged background context; host creates a least-authority isolated session and cache independently rechecks scope.

Because no runtime ships, the high-risk residuals are rejected rather than implicitly accepted. A future host choosing a positive window must explicitly accept the bounded retention/revocation risk and prove its lifecycle authorization contract.

### 17. Risk Register

| ID | Risk | Probability | Impact | Owner | Mitigation / contingency |
|---|---|---|---|---|---|
| R1 | Framework replay duplicates a method/plugin/event effect | High | High | Framework architecture | Do not implement; require host-owned lifecycle authorization. |
| R2 | Detached refresh mutates parent/root/singleton state | Medium | High | Host session owner | Separate session/context/registries as appropriate; do not retain/mutate triggering `v`; adversarial side-effect tests. |
| R3 | Old refresh overwrites a newer fragment | High with naive lease reuse | High | UI-cache owner | New exact retained-generation token; newer-publication red test; never reuse current blocking lease unchanged. |
| R4 | Scope drift serves or publishes cross-tenant HTML | Medium | Critical | Host + UI-cache owners | Reauthorize at lookup/session/completion; exact tenant/origin/base/language/cid/variant equality; fail closed. |
| R5 | Failure or reload extends stale age | Medium | High | Clock/persistence owners | Preserve original `settledAt`; subtraction boundaries; no hit/start/save/init timestamps. |
| R6 | External adapter rejection is mistaken for rolled-back live state | Medium | Medium | Persistence adapter/host | Document internal publication versus durability; retain dirty; observe rejection; never claim atomic external save. |
| R7 | Serverless host freezes background work after returning stale | High in affected hosts | Medium | Host integration | Explicit best-effort/`waitUntil`-style host capability if available; zero window where completion is required; no framework durability claim. |
| R8 | Positive retention outlives downstream authorization/data revocation | Medium | High | Host policy owner | Default zero, bounded window, domain-specific purge/root/persistence coordination, explicit risk acceptance. |
| R9 | Hung or effectful host refresh consumes resources | Medium | High | Host session owner | Host cancellation/timeout/concurrency bounds; one cache attempt; no retry/timer. |
| R10 | Lifecycle suppression publishes semantically incomplete HTML | High if attempted | High | Framework architecture | Prohibit suppression; host must complete the full authorized lifecycle. |

Assumptions: the host is trusted DI; request discriminator and clocks preserve their locked contracts; a future host can actually create a separate session and knows the effects of its extension registry. Known unknowns are listed in Section 20 and are blockers to implementation, not silent deferrals.

### 18. Conditional Red-First Test Matrix

No test is written for unshipped behavior. If a real host seam is later proposed, implementation remains prohibited until the following tests are written first and the first stale-boundary assertion is observed red for the expected reason.

#### Default and boundaries

- Disabled/absent/invalid/throwing/zero window is byte-for-byte, promise/value, lifecycle-order, miss, lease, save, and wire compatible.
- Exact age immediately below TTL, equal TTL, immediately below hard, equal hard, and beyond hard.
- Non-sliding fresh/stale hits and original `settledAt` after lookup/start/failure/save/reload.
- TTL zero pending-only; TTL Infinity non-expiring; runtime shorter/longer policy from original publication.

#### Concurrency and lifecycle

- Immediate stale bytes plus exactly one opaque background lease; many concurrent stale callers never await it.
- One attempt ever for an exact retained live-process generation, including synchronous host throw and async rejection; separately pin the accepted restored-generation/durable-attempt policy.
- Hard callers reauthorize and join active refresh; without one they use ordinary blocking rendering and never old HTML.
- Full successful handler/method validation/iteration/event/plugin/completion order before publication.
- Effectful method and plugin witnesses prove no framework-owned replay and only explicitly authorized host-session execution.
- Detached host session cannot mutate the foreground DOM/view/context; built-in layer/root-state behavior is isolated or explicitly authorized and asserted.
- Render/validation/completion/abort failures, internal publication failure, adapter-save failure, and zero unhandled rejections.

#### Persistence and restart

- Wire v1 byte-for-byte unchanged.
- Restart while fresh, stale, equal hard, beyond hard, TTL zero, and TTL Infinity using original Unix age/current policy.
- Reload never assigns init/reload/hit/refresh-start/save time as `settledAt`.
- Reload either creates a documented new process-local generation and permits exactly one new attempt, or a separately versioned fixture carries durable attempt identity; never claim both v1 and cross-restart one-attempt-ever.
- Immutable overlapping saves, dirty revision after adapter rejection, and exact byte/timestamp snapshot pairing.

#### Authorization and races

- Tenant, origin, effective base, language, cid, and variant isolation at lookup/start/completion; malformed/cyclic/inherited authority bypasses shared state.
- Exact/full purge, hard expiry, LRU eviction, cache/order/store replacement, reset, root/lifecycle replacement, init, scope drift, and newer publication detach old refresh work.
- Required reproduction: acquire stale generation, publish a newer exact generation, complete the old refresh; newer bytes/timestamp/recency/dirty state remain untouched.
- Acquisition SWR, validators, manifest/data/HTML/TSS promise identities, UI public nested cache/order shapes, and wire fixtures remain unchanged.

Tests use injected deterministic process and Unix clocks, deferred promises, explicit lifecycle counters, and no wall clock/network/randomness/order dependence.

### 19. Success Criteria and Definition of Done

This evaluation is complete when:

- all relevant current owners, tests, and canonical records are mapped;
- the specification answers every locked decision from the handoff without `TBD`;
- a linked pre-code STRIDE/PASTA threat model covers both the rejected replay and preferred seam;
- independent code-explorer and code-architect reviews either overturn the stop with a proof or corroborate it with concrete evidence;
- every valid review finding is incorporated;
- the exact ten feature-dev dimensions score 10/10 for the documentation/decision deliverable;
- no runtime/package/wire/backlog completion claim is made after a failed feasibility gate;
- documentation syntax/reference and diff checks pass; and
- the final handoff names the blocker, safe alternative, verification evidence, and lack of PR/runtime changes.

The repository-wide release Definition of Done remains applicable to any future implementation: failing-test-first, exact `npm test`, typecheck, scoped reviews, package dry-runs/audits, documentation/version/backlog updates, ready PR into `dev`, current-head green CI, and current-head clean Codex review. Those delivery gates are N/A, not passed, for this specification-only stop.

### 20. Open Decisions Required Before Any Follow-up Implementation

These are explicit host-contract prerequisites, not questions this framework can safely answer by assumption:

1. Which host component creates a genuinely separate render session and synchronously snapshots the triggering inputs without retaining or mutating `v`?
2. Which exact methods/plugins/events are authorized to run for refresh, and what proof establishes their idempotence or intended repeat effects while still completing the existing lifecycle?
3. How does the host bind current request/discriminator authority to the isolated session and re-evaluate it at completion?
4. What host primitive guarantees or best-effort bounds post-response execution, cancellation, timeouts, and rejection observation in each deployment environment?
5. Which host/domain events require immediate exact/full UI and persisted-fragment invalidation because bounded stale visibility is unacceptable?
6. Does the host accept live-publication/external-save separation, or does it require a new versioned transactional adapter contract with corresponding major-release analysis?
7. What exact host-owned root/lifecycle authority epoch is issued, invalidated, and synchronously attested, and how does the normal UI-cache hook recognize only its opaque refresh-execution capability without suppressing lifecycle participants?
8. Is a restored wire-v1 record a new process-local generation allowed one new attempt, or must attempted state survive restart and therefore use a separately reviewed wire version?

Until a follow-up answers all eight with executable contracts and tests, the implementation gate remains closed.

### 21. Plan Quality Gate

**Scope tags:** `SECURITY`, `INFRA`

**Gate status:** PASS FOR STOP — implementation gate failed, all decision/review deliverables are complete, and runtime remains prohibited.

**SQL/DB review:** N/A; no query, command, schema, migration, or database.

**Frontend/route review:** N/A; no route, CSS, component interaction, service worker, or network API change.

**Threat-model deep dive:** REQUIRED and complete because the preferred alternative adds a host/cache trust boundary carrying potentially sensitive HTML.

**Reference-class estimate:** evaluation is medium-sized relative to persisted fragment age and acquisition SWR; implementation remains unestimated because its critical host capability does not exist. No deadline or external dependency is asserted.

**Critical path:** research -> specification -> STRIDE/PASTA -> independent explorer/architect reviews -> incorporate findings -> documentation verification -> stop report.

| Dimension | Score | Plan evidence |
|---|---:|---|
| Architecture | 10/10 | Rejects cross-owner rendering; host owns session/lifecycle, cache owns generation/publication, DI/no imports preserved. |
| Consistency | 10/10 | Keeps current singleton, nested cache/order/wire/get defaults and repository documentation conventions. |
| Type Safety | 10/10 | No code/types added; future opaque lease/frozen result shapes avoid loose state and hand-written TS. |
| Validation | 10/10 | Exact policy/config/clock/scope/lifecycle/generation validation and fail-closed states are specified. |
| Error Handling | 10/10 | Sync/async lifecycle, publish, adapter, hard-caller, and unhandled-rejection outcomes are explicit. |
| Security/Privacy | 10/10 | Default zero, triple current authority checks, strict hard boundary, revocation caveat, full threat-model trigger. |
| Performance | 10/10 | One attempt per accepted live generation, O(max) metadata, no timers/retries/jobs; restart choice and host bounds are explicit. |
| Maintainability | 10/10 | Minimal future seam, no duplicated state machine, age-compatible wire v1 plus its attempt-identity limit, and exact ownership documented. |
| Testability | 10/10 | Deterministic red-first matrix covers lifecycle witnesses, persistence, scope, and every invalidator. |
| Readability | 10/10 | Exact state table, API/ownership tables, race matrix, and explicit stop condition remove ambiguous control flow. |

### 22. Review Disposition and Checklist Mapping

| Review/persona group | Result |
|---|---|
| Mandatory code explorer | **APPROVE STOP** — traced lifecycle, effectful layer witness, stale-hit traversal skip, persistence phase, and exact generation race. |
| Mandatory code architect | **APPROVE STOP** — independently reproduced the race and required four corrections; all incorporated. |
| Architect, planner, backend architect, code-review enforcer | PASS for decision quality — ownership, blast radius, failures, API/SemVer, rollback, and circuit breaker are explicit. |
| Security architect, threat-modeling enforcer, PASTA analyst, red-team specialist, platform engineer | PASS for fail-closed decision — deep dive completed and every High/Critical prospective control remains a blocker. |
| TypeScript/JSDoc reviewer | PASS under repository rules — no code/type artifact added; future shapes are opaque/exact and source remains pure JS. |
| Bun/Elysia/database personas | N/A — no Bun runtime adoption, route/server hook, SQL, schema, migration, or database; project Node/CommonJS rules govern. |

| Checklist family | Disposition |
|---|---|
| Engineering: domain architecture, code quality, type safety, complexity/maintainability, error taxonomy, runtime safety | PASS for specification/stop; no code candidate exists to claim runtime completion. |
| Definition of Done: self-review, tests written, types first, no placeholders, error handling | PASS proportionately: no placeholders, full error matrix, no unshipped test/code; exact existing suite and typecheck pass. |
| Project planning rigor | PASS — scope, priority, circuit breaker, reference classes, blast radius, rollback, eight open prerequisites, and 10/10 dimensions recorded. |
| Security: authorization, zero trust, rate limiting/abuse, audit integrity, anomaly detection, threat modeling | BLOCKED prospectively/PASS for stop; required controls and host owners are mapped in the security review. |
| Security: authentication, behavioral auth, injection, secrets, crypto, SSRF, headers, API assets, dependency security, secret rotation | N/A except dependency PASS; no credential, sink, request, header, secret, crypto, route, dependency, or rotation change. |
| Security: mobile, queue/message, AI/LLM, Supabase RLS | N/A; no corresponding platform or data flow. |
| Infrastructure: ops readiness, observability, SLO/error budgets, cost/FinOps, deploy safety | N/A for documentation-only delivery; mandatory future host lifetime, metrics, cost, rollback, and mixed-version gates are explicit. |
| Infrastructure: DB migration, Postgres performance, email deliverability, Cloudflare limits | N/A; no database, email, Worker, queue, or cloud resource change. |

**Final scoped-review result:** no unresolved finding in the documentation decision. The four architect corrections are incorporated, the threat model accepts no feature risk, and the implementation gate remains closed rather than deferring a mitigation into code.
