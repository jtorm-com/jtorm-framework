# Feature Spec: Shared-cache TTL and purge APIs

**Date:** 2026-07-18
**Author:** Codex `/root`
**Status:** COMPLETE
**Feature-dev Status:** COMPLETE
**Claimed:** 2026-07-18T13:08:10Z
**Current Mode:** Complete — PR #61 merged into `dev` as `1e7f166`

## Problem Statement

jTorm hosts that reuse explicitly scoped data, HTML, TSS, manifest-pack, and rendered-fragment caches currently retain successful values until LRU eviction or process restart. A source or administrative policy change can therefore remain invisible indefinitely on a warm, low-churn key, and an operator has no supported way to invalidate one scoped entry or a whole participating cache. This task gives hosts a finite retention bound and explicit, isolation-safe invalidation while preserving warm-path identities, request policy, rendered output, and persisted fragment compatibility.

## Scope

### In Scope

- A shared absolute-TTL/clock/metadata policy in `@jtorm/promise-cache-model`.
- Finite `300000` ms defaults, independently host-configurable on the data, HTML, TSS, manifest-pack, and rendered-fragment cache singletons.
- Lazy expiration for the four promise caches and the rendered-fragment cache.
- Exact and full public purge facades with deterministic deletion counts.
- Bounded rendered-fragment single-flight refresh so concurrent stale/miss callers share one successful render result.
- Failure-atomic UI staging/finalization using additive event lifecycle cleanup while preserving existing before/after event ordering and after-view save timing.
- Weak/bounded timestamp and in-flight metadata, host DI, singleton resets, package metadata/versioning, tests, READMEs, host migration guidance, architecture/evaluation/security records, and backlog closure.
- Documentation that a valid scoped UI context plus the existing `uiCacheScoped === true` persistence attestation is required to purge and save external fragment state.

### Out of Scope (Non-Goals)

- Persisted timestamps or absolute age across process restarts; that remains a persistence-schema redesign follow-up.
- Stale-while-revalidate, stale fallback, refresh-ahead, background timers, periodic sweeps, async cleanup jobs, or background eviction.
- HTTP cache headers, ETag/Last-Modified revalidation, conditional requests, or transport changes.
- Persistent-cache format changes, new stores, migration tooling, or compatibility shims.
- Parser, sanitizer, URL/SSRF, timeout, handler traversal/control-flow, or manifest schema changes beyond the bounded iteration-finalization seam required for cache failure atomicity.
- Changes to the manifest render-root-local prepared promise/index or its supersession rules.
- Unrelated cache cleanup, metrics infrastructure, UI design, database/schema work, or third-party runtime dependencies.

## Requirements

### Functional Requirements

1. Every participating singleton exposes `ttl` with a default of `300000` milliseconds; hosts may set each independently before use.
2. TTL is absolute. A successful hit may update LRU recency but never the successful-settlement timestamp.
3. A finite entry is fresh only while `age < ttl`; at `age >= ttl` it is removed before hit guards or recency mutation and the caller takes the normal cold path.
4. Promise-cache TTL begins only after successful settlement. An unsettled promise deduplicates regardless of elapsed wall time.
5. `ttl === 0` permits pending deduplication but prevents reuse after settlement. Explicit `Infinity` is the documented non-expiring host opt-out/rollback setting.
6. Invalid, negative, throwing, non-numeric, non-finite (except `Infinity`), or regressing clock state fails closed to a fresh load. Cache-policy failure must not turn an otherwise successful load/render into an application error.
7. `@jtorm/promise-cache-model` exposes an overridable `clock()` seam with a safe `Date.now()` default and owns timestamp creation, freshness decisions, owner-wide regression detection, forgetting, and reset. The high-water mark is per participating owner and per clock-function identity, so a regression first observed on any key fails fresh while an explicitly replaced clock seam starts a new epoch.
8. Promise-cache `c` maps continue to store the exact original promises. Manifest packs continue through the unchanged request URL policy, timeout, acquisition classification, digest, and validation path after expiration or purge.
9. UI `cache` remains `{language:{cid:{scopedVariant:fragmentString}}}` and `order` values remain `{l,id,c}`. No timestamp is persisted or wrapped around a fragment.
10. A valid attested persisted fragment batch loaded by `init()` starts a new in-process TTL from one injected clock reading shared by that batch. `Infinity` needs no reading; invalid clock/TTL state quarantines the batch from reuse without throwing.
11. Ordinary four-argument `uiCacheModel.get(v, language, cid, variant)` remains a lookup and never creates a render lease. The UI plugin opts in with the handler-wrapper's ephemeral fifth-argument iteration token: the first missing/stale caller owns a bounded in-flight lease and independent-root followers await its render-result promise. Publication is staged at the existing `afterIteration` position; the event owner collects at most one deferred commit and runs it only after every after-iteration handler and every completion hook succeeds. Failure aborts the lease and publishes nothing.
12. Purging pending work only detaches it from cache participation. It neither aborts nor changes the promise already returned to callers; later settlement may complete those callers but cannot reinsert itself or delete/overwrite a newer entry.
13. UI expiration/purge removes matching nested cache data, LRU order, and timestamp state as one operation, marks the valid root dirty only when persisted live state changed, and persists only through the existing `save(v)` path.
14. Unscoped/malformed/cyclic contexts remain true bypasses/no-ops: no cache read/write, purge mutation, timestamp access, in-flight registration, LRU change, or clock invocation.
15. Full purge is possible only through a named `purgeAll` method. Passing `undefined` or an unscoped discriminator to an exact purge never means full purge.
16. Different explicit tenant/origin/base discriminators retain independent cache identities for TTL and exact purge.

### TTL State Contract

| State | Required behavior |
|-------|-------------------|
| Pending promise/render | Reuse the same in-flight result; do not read the clock or expire it |
| Settled, `ttl === Infinity` | Reuse without a clock read; host opt-out from expiration |
| Settled, `ttl === 0` | Remove cache participation before any sequential reuse |
| Settled, finite `ttl`, `age < ttl` | Return exact cached promise/AST/manifest/fragment identity/value; then update recency |
| Settled, finite `ttl`, `age >= ttl` | Remove value/recency/timestamp first, then cold-load/render |
| Invalid/throwing TTL or clock | Remove cache participation and cold-load/render without throwing for the cache failure |
| Clock lower than settlement or last observed time | Treat stale and cold-load/render; never extend retention |
| Cold load/parse/validation/render/event rejection | Remove only the matching insertion/lease/timestamp state; a newer identity survives |
| Fresh manifest hit-guard rejection | Reject that call while retaining the valid cached pack and its original timestamp |

### Non-Functional Requirements

- **Performance:** scoped warm get/hit is O(1), performs at most one clock read, and does bounded metadata work. Pending and `Infinity` hits require no clock. Scalar exact purge is O(1); TSS array purge is O(number of supplied URLs), and only explicit full purge scans the cache. Finite TTL deliberately adds normal cold acquisition/render work after expiry.
- **Resource bounds:** timestamp metadata is a `WeakMap` keyed by the current cache/LRU `Map`, whose value is bounded by that map's exact keys and insertion identities. Promise records are per `(cache Map, key, insertion token)`, so one promise reused for multiple keys remains safe. UI in-flight tables are weakly associated with the current `order` identity, capped consistently with `max`, and detached rather than aborted on capacity eviction. Neither metadata nor late callbacks retain a replaced host map.
- **Security/privacy:** existing discriminator and request policy remain the authority. Exact invalidation never crosses a scoped key. No source URL, tenant, content, or fragment is copied into timestamp metadata beyond the already-bounded exact cache key/record. Hosts must authorize any externally exposed administrative purge call.
- **Compatibility:** all published singleton/export names and public cached value shapes remain. Pre-expiry bytes, identities, ordering, parser/binding behavior, event order, root/parent/locale context, URL policy, and timeout behavior remain unchanged.
- **Accessibility/UI:** N/A; no visible interface or interaction is introduced.

## Public API Contract

All counts are synchronous non-negative integers. A count represents cache participation removed for unique exact keys: `0` if absent/bypassed, `1` for an exact live or pending entry, and the number of unique participating entries for `purgeAll`. Repeated keys in a TSS URL array are counted once because subsequent removal observes absence.

```js
// Shared policy owner; key === undefined is always an exact no-op.
promiseCacheModel.purge(owner, key) -> number
promiseCacheModel.purgeAll(owner) -> number
promiseCacheModel.reset(owner) -> undefined

// URL/context facades. tssModel also accepts the same scalar-or-array URL form as get().
dataModel.purge(url, context) -> number
dataModel.purgeAll() -> number
htmlModel.purge(url, context) -> number
htmlModel.purgeAll() -> number
tssModel.purge(urlOrUrls, context) -> number
tssModel.purgeAll() -> number

// Descriptor identity is exactly the existing {url, hash}; an existing mode field is accepted
// but does not change the pack key. Malformed descriptors/contexts are exact no-ops.
uiManifestModel.purge(descriptor, context) -> number
uiManifestModel.purgeAll() -> number

// v must resolve to a valid explicit scoped render context. variant is transformed by the
// unchanged scope(v, variant) discriminator logic.
uiCacheModel.purge(v, language, cid, variant) -> number
uiCacheModel.purgeAll(v) -> number
```

`uiCacheModel.purgeAll(v)` is an explicit global rendered-fragment purge, not a tenant-only wildcard. It requires a valid explicit scope solely to establish an authorized/dirty render root and returns `0` without mutation otherwise. `uiCacheModel.save(v)` remains the only persistence facade. The supported operator sequence is:

```js
await uiCacheModel.init();       // loads only saveModel.uiCacheScoped === true state
const n = uiCacheModel.purgeAll(scopedRootView);
await uiCacheModel.save(scopedRootView);
```

The persistence adapter must continue to attest `uiCacheScoped === true`; otherwise `init()` quarantines external data as today. Exact operator invalidation uses `purge(scopedRootView, language, cid, variant)` followed by `save(scopedRootView)` when `n > 0`.

`uiManifestModel.purge()` validates one plain `{url, hash, mode?}` object without invoking the array-only `descriptors()` preparation parser. `url` and the `sha256-…` hash are required; an optional mode must retain its existing `required|optional` value but is not part of the pack key. The facade catches key/context-policy errors and returns `0`.

## Compatibility and Failure Atomicity

- `get` signatures and returned data do not change. The UI model's `get()` remains `Promise<string|null>`.
- Promise participation is represented by a unique insertion token in metadata weakly keyed by the current `c` Map and then by exact key. Success records settlement time only if the current map/key still contains both that token and promise. Settlement callbacks resolve `owner.c` at callback time and do not close over its Map, so purge, same-promise reinsertion, and map replacement are identity-safe.
- A stale entry is deleted before a manifest `hit` guard, so a stale pack cannot bypass reacquisition checks.
- Pending and fresh manifest hits still run the existing guard. A guard rejection rejects only that call and retains the valid pack/timestamp; a purged or cold-rejected insertion uses token comparison before cleanup and cannot delete a newer entry.
- UI live deletion obtains a valid root dirty-state handle before mutation. Cache/order/timestamp removal then occurs synchronously with no `await` gap.
- Handler-wrapper creates one opaque ephemeral iteration token, passes it as an extra ignored-by-existing-handlers argument through existing before/after dispatch, and catches the whole before -> render -> after span. Event-model adds `complete(v, 'iteration', token)` and `abort(v, 'iteration', token, error)` methods that walk the already-registered `after.iteration` bucket and invoke optional `completeIteration`/`abortIteration` hooks; it does not add or reshape exported event buckets. Complete accepts at most one returned commit closure and invokes it only after every completion hook succeeds. Abort attempts every cleanup hook, suppresses cleanup errors, and the wrapper rethrows the original error.
- UI refresh stores its opaque lease on that iteration token, stages bytes at its unchanged UI plugin `afterIteration` slot, and identity-checks the lease during complete/abort. An old purged render therefore cannot stage, commit, or abort a newer lease. A nested same-root/same-key lookup bypasses the pending lease instead of awaiting itself, preventing the layer plugin's existing before-UI after-iteration recursion from deadlocking; it receives no lease and cannot publish over the outer leader. Independent render roots still deduplicate normally.
- A detached UI lease resolves/rejects its already-returned follower promise on eventual render success/failure but skips cache insertion and dirty mutation.
- UI flight tables are weakly keyed by the current `order` Map. Replacing `cache`/`order` cannot join obsolete work; a max-evicted lease is detached, eventual completion still settles existing followers, and no late result publishes.
- `save(v)` captures the root-local dirty revision, awaits a promise-returning adapter, and clears dirty state only if the revision is unchanged. A write/purge during the await, synchronous throw, or asynchronous rejection retains dirty retry state. The UI plugin invokes `save(v)` at the same after-view phase without returning or awaiting it, preserving the published fire-and-forget event timing; an explicit administrative purge caller may and should await `save(v)` to observe persistence completion or retry failure.
- A live UI entry with missing/mismatched `order` or timestamp metadata (including a directly host-seeded nested value) fails fresh and is removed; fresh hits reuse the same `{l,id,c}` order record while changing only Map recency. `null` plus a configured request base remains a valid scoped call under the unchanged discriminator.
- Manifest TTL/purge applies only to the cross-render `c` pack. A render root whose `manifest.promise/index` is already prepared continues using that root-local state; a new/subsequent root reacquires through the shared-pack path.
- No stale fallback is permitted after acquisition, parsing, validation, render, event, clock, or save failure.

## Affected Components

| Component | Change | Risk |
|-----------|--------|------|
| `src/models/promise-cache-model` | Central clock/TTL/weak metadata, exact/full purge, reset | High |
| `src/models/data-model` | `ttl`, purge facades, docs/version | Medium |
| `src/models/html-model` | `ttl`, purge facades, docs/version | Medium |
| `src/models/tss-model` | `ttl`, scalar/array purge facades, docs/version | Medium |
| `src/models/ui-manifest-model` | pack TTL/purge only; prepared root state unchanged | High |
| `src/models/ui-cache-model` | fragment TTL, weak timestamps, bounded leases, purge/persist semantics | High |
| `src/plugins/ui-cache-plugin` | stage/deferred-complete/abort integration; compatible fire-and-forget save timing | High |
| `src/models/event-model` | additive iteration complete/abort dispatch only | Medium |
| `src/handlers/handler-wrapper` | invoke complete/abort around existing iteration lifecycle | High |
| `test/helpers/engine.js` and host-wiring tests | inject owner, reset metadata/leases/clock/TTLs | Medium |
| Focused model/method/pipeline/source tests | deterministic red-first coverage | High |
| Package READMEs/root README/review records/backlog/ledger | contract, migration, rollback, closure evidence | Low |

## Dependencies and Package SemVer

- Completion dependency: PR #60 is merged into `dev` at `2b1105b0796784852dc92217fa647ed433f99ffb`.
- Runtime dependency direction remains DI-only; no `require()` is added under `src/**/src`.
- Planned patch versions, only if their runtime source changes:

| Package | Planned version | Coordinated minimum |
|---------|-----------------|---------------------|
| `@jtorm/promise-cache-model` | `1.0.2` | none |
| `@jtorm/data-model` | `1.0.7` | promise cache `^1.0.2` |
| `@jtorm/html-model` | `1.0.7` | promise cache `^1.0.2` |
| `@jtorm/tss-model` | `1.0.8` | promise cache `^1.0.2` |
| `@jtorm/ui-manifest-model` | `1.0.3` | promise cache `^1.0.2` |
| `@jtorm/ui-cache-model` | `1.0.7` | add promise cache `^1.0.2`; retain compatible request/render-context minima |
| `@jtorm/ui-cache-plugin` | `1.0.2` | UI cache model `^1.0.7`, event model `^1.0.2`, handler wrapper `^1.0.7` because token finalization is required |
| `@jtorm/event-model` | `1.0.2` | none |
| `@jtorm/handler-wrapper` | `1.0.7` | event model `^1.0.2` |

No other dependency range changes. Pure documentation/test-only changes do not trigger package bumps.

## Host Migration and Rollback

- Existing hosts receive finite five-minute retention after upgrading and must inject the same `promiseCacheModel` into data/HTML/TSS/manifest/UI cache owners.
- A host may set, for example, `dataModel.ttl = 60000` and `uiCacheModel.ttl = 900000`; configuration is independent per cache.
- A host needing old non-expiring behavior sets each participating singleton's `ttl = Infinity`. This is the immediate configuration-only rollback/opt-out.
- Hosts that discard/replace singleton cache maps during tests or reconfiguration call `promiseCacheModel.reset(model)` for a cold policy epoch. Hosts that deliberately preserve shared maps across warm renders must preserve their timestamp/high-water metadata too; the test engine's `reuseSharedCaches` path does not reset those owners or UI leases. Both initial and reset DI wiring inject the same promise policy owner into UI cache.
- Hosts persisting fragments do not migrate schema. Attested restored strings receive a fresh process-local TTL at `init()` time.
- Absolute age across restarts is intentionally not claimed. A future versioned persistence schema may add it without changing this task's runtime cache contract.

## Test Strategy (Red First)

1. Add deterministic fake-clock promise-owner tests proving the current indefinite-hit defect, exact boundary, non-sliding hits, pending behavior, `0`/`Infinity`, invalid/throwing/owner-wide regressing time, same-promise multi-key/reinsertion safety, identity-safe rejection, eviction metadata cleanup, purge counts, and replaced-map/reset safety.
2. Add data/HTML/TSS model tests proving changed sources stay old before expiry, refresh at the boundary, concurrent post-expiry callers share the new promise/AST, exact/full purge, array sequencing/counts, scope isolation, and malformed/unscoped no-ops.
3. Add manifest tests proving fresh hits run the guard, stale entries skip the guard and reacquire through URL/timeout/digest/schema/acquisition classification, root-local prepare/index remains untouched, and failures leave no replacement timestamp.
4. Add UI model/plugin/wrapper tests for exact bytes, exact-boundary refresh, four-argument miss behavior, one independent-root in-flight render result, same-root reentrant bypass, opaque-token staging/commit/abort, old-token/new-lease races, handler/event/clock/save failure atomicity, live/pending purge, dirty isolation, revision-safe async save retry, one-read batch init TTL, map replacement, missing order metadata, LRU/order/timestamp atomicity, and attested persisted shape.
5. Add discriminator/isolation tests proving unscoped/malformed/cyclic contexts never call the clock or mutate live/metadata state and exact purge never becomes global.
6. Add a pipeline test using an explicitly scoped warm host: identical pre-expiry output, changed fetched and rendered output at `age === ttl`, and immediate changed output after exact purge.
7. Re-run focused request/data/HTML/TSS/promise/manifest/UI-cache/discriminator/isolation/get/UI/pipeline suites, then the exact full commands and release gates required by `AGENTS.md` and the task.

## Security Assessment

### Threat Model Link

[`feature-reviews/stride-shared-cache-ttl-purge.md`](stride-shared-cache-ttl-purge.md) will be completed and approved before implementation.

### Trust Boundaries and Assets

- Boundaries: untrusted/malformed render context -> request discriminator; host/admin purge caller -> public cache facade; cache miss -> existing outbound request policy; rendered fragment -> attested persistence adapter.
- Assets: tenant/origin/base isolation, validated fetched content/manifests, rendered bytes, availability/cold-load budget, LRU bounds, and dirty/persistence integrity.

### Initial STRIDE Analysis

| Category | Threat | Planned control/test |
|----------|--------|----------------------|
| Spoofing | A malformed/inherited context claims another scope | Existing own-property discriminator remains the only key source; malformed/cyclic exact purge is `0`; cross-scope tests |
| Tampering | Exact purge becomes an accidental wildcard; late work overwrites a newer entry | Named `purgeAll`; undefined exact no-op; promise/lease identity checks; late-settlement tests |
| Repudiation | Framework cannot identify who invoked an administrative purge | Framework returns deterministic counts; host must authorize/log exposed operations; no new network endpoint is added |
| Information Disclosure | Cross-tenant hit/expiry/purge reveals or mutates another key | Exact composite identities unchanged; weak metadata keyed by cache identity; isolation and unscoped-clock tests |
| Denial of Service | Tiny/invalid TTL or full purge causes repeated cold fetch/render | Host-controlled finite default, explicit `Infinity` rollback, existing LRU/URL/timeout limits, bounded leases; full purge explicitly O(n) |
| Elevation of Privilege | Public purge is exposed to an untrusted caller as administration | No endpoint/authorization surface in framework; migration docs require host-side authorization; exact purge cannot broaden scope |

Threat-model deep dive applicability: **not triggered**. The change adds no payment, credential, PII, network, or new trust boundary; a complete STRIDE delta plus an administrative-purge attack tree is sufficient. Re-evaluate if a host exposes purge over a network API.

## Risk Assessment

| Risk | Likelihood | Impact | Owner | Mitigation/contingency |
|------|------------|--------|-------|------------------------|
| Timestamp metadata drifts from visible cache state | Medium | High | implementation | map/key/insertion-token metadata; one central forget/reset path; eviction/purge/rejection/map-replacement tests |
| UI follower hangs or partial bytes publish on event failure | Medium | High | implementation | bounded lease plus stage/complete/abort lifecycle; failure-injection tests |
| Expiration bypasses manifest URL/digest validation | Low | High | implementation | freshness before hit guard; cold path unchanged; classification/validation tests |
| Exact purge crosses discriminator scope | Low | High | security review | derive unchanged exact key; unscoped no-op; tenant/origin/base isolation tests |
| Clock regression extends retention | Medium | Medium | policy owner | owner-wide high-water per clock identity; regression is stale across keys; fake-clock test |
| Five-minute expiry increases upstream work | High | Medium | host/operator | document cold-work tradeoff and per-cache tuning; `Infinity` rollback |
| New UI lifecycle seam changes plugin ordering | Low | High | architecture review | do not alter before/after arrays/weights; finalizer runs only after existing after chain; characterization tests |
| Persisted fragments appear five minutes old after restart | High | Low | follow-up backlog | explicitly document new process-local TTL; retain persistence-schema work separately |

## Trade-offs Considered

| Decision | Alternatives considered | Why this one |
|----------|-------------------------|--------------|
| Keep TTL policy in promise-cache owner | Duplicate TTL code in five caches; new package | Existing policy owner already controls promise/LRU identity; additive weak-value methods also serve UI through DI without imports |
| Weak map/key/token timestamps | Promise-only identities; wrap promises/ASTs/fragments; persisted timestamps; owner-held strong map | Handles same-promise reuse, preserves exact public values, cannot retain replaced maps, and stays bounded by current cache identities |
| Lazy access expiry | timers, sweeps, cron/background eviction | Meets bounded scope, avoids retained timer jobs, and keeps normal operations O(1) |
| Absolute settlement time | sliding TTL; request-start time | Satisfies non-sliding freshness and never expires pending work |
| Explicit `purge`/`purgeAll` names | `purge(undefined)` wildcard; pattern/prefix purge | Prevents accidental global invalidation and keeps exact work O(1) |
| UI stage/finalize lease | allow duplicate renders; publish at weight 0; move UI plugin weight | Required for one fresh in-flight render and failure atomicity while preserving configured event order |
| No persisted timestamp | silently extend persistence schema | Avoids incompatible external stores; cross-restart absolute age remains honest follow-up work |
| Fail fresh on clock/config faults | throw; retain old entry; stale fallback | Cache availability cannot become correctness failure or extend sensitive retention |

## Blast Radius

| Dimension | Answer |
|-----------|--------|
| Direct dependencies | request/render-context policy, promise cache owner, UI event/handler lifecycle, optional fragment persistence adapter, existing outbound transport/parser/digest |
| Direct dependents | get/UI pipelines, DI hosts, data/HTML/TSS consumers, manifest preparation, UI-cache plugin, package consumers calling cache fields/methods |
| Cascade on outage | Invalid clock/TTL disables settled reuse and increases cold work; request/render errors remain visible with no stale fallback |
| Cascade on slow | Expired calls wait on one normal fresh acquisition/render per scoped key; followers deduplicate; no background backlog |
| Cascade on bad data | Existing parse/digest/schema/handler failures reject and leave no partial fresh replacement; stale entry is not served |
| Shared-flight failure radius | Same-key followers intentionally share the leader's success or failure until that lease settles; the next caller retries normally after rejection |
| Compromised-session impact | No new session authority; an improperly exposed full purge can evict all live fragments and force bounded cold work but cannot read content |
| Fault isolation boundary | Exact composite cache key, promise/render lease identity, existing request timeout/policy, root-local dirty state, and process-local singleton |

## Rollback Plan

| Item | Answer |
|------|--------|
| Code rollback | Revert the package patch releases/PR; no stored schema or generated artifact requires reversal |
| Schema rollback | N/A; no database or persisted fragment schema change |
| Data rollback | No source data changes. Cache purges/expiry are intentionally irreversible evictions and repopulate through normal cold paths |
| Auto-rollback trigger | Existing CI/test gate blocks delivery; no deployment system is changed. Hosts may immediately set every `ttl = Infinity` if cold-load/error rate is unacceptable |
| Manual rollback runbook | Package READMEs/root host-migration section: set `Infinity`, or redeploy previous package versions; preserve `uiCacheScoped` store |
| Last rollback drill | Configuration rollback is covered by deterministic `Infinity` tests in this change; repository has no deployment drill surface |

## Implementation Plan and Critical Path

1. **Red defect proof:** promise policy -> data/HTML/TSS -> manifest -> UI unit/lifecycle -> scoped pipeline. No runtime implementation begins until the focused tests demonstrably fail for missing TTL/purge.
2. **Central policy:** implement clock/TTL weak map/key/token metadata, owner-wide regression tracking, promise settlement/rejection/LRU cleanup, purge/reset. This is the critical dependency for every other cache.
3. **Promise-cache facades:** integrate data/HTML/TSS/manifest without changing cold paths; make their focused tests green.
4. **UI cache:** inject the policy owner; implement timestamps, weakly map-associated bounded leases, exact/full purge, and revision-safe persistence dirty/retry behavior.
5. **Lifecycle integration:** add ephemeral wrapper token plus completion/abort dispatch over existing event buckets and plugin staging while retaining existing arrays/weights; make UI lifecycle/pipeline tests green.
6. **Host/package/docs:** update DI/resets, dependency minima, patch versions, READMEs, migration/rollback, feature evaluation/security/backlog/ledger.
7. **Review/verification/delivery:** requested skills/gates, full validation, commit/push/ready PR, CI and current-head Codex loop.

Reference class: PR #58 policy-owner extraction plus PR #59 discriminator hardening. Relative size: **XL**, driven by five cache integrations, concurrency/failure testing, package releases, and review/PR gates rather than algorithmic complexity. The highest unknown—the UI single-flight failure lifecycle—is solved in the specification before implementation. No date estimate is asserted.

## Success Criteria and Definition of Done

- [x] All red-first defect tests fail against the pre-change runtime and pass after implementation.
- [x] Every participating cache defaults to `300000`, honors exact-boundary absolute expiry, `0`, `Infinity`, invalid/regressing time, and per-cache configuration.
- [x] Pre-expiry identities/bytes and pending/concurrent deduplication are unchanged.
- [x] Exact/full purge counts are deterministic, isolation-safe, pending-safe, and never infer full purge from undefined.
- [x] UI live/persisted shape, event ordering, context/locale/cid semantics, dirty/save/retry behavior, and attestation remain compatible.
- [x] Scoped pipeline output is byte-identical before expiry, fresh at the exact boundary, and fresh immediately after explicit purge.
- [x] Persistent absolute age is not claimed; separate schema follow-up remains recorded.
- [x] Required README/migration/evaluation/security/ledger/backlog documentation is complete.
- [x] Focused suites, exact `npm test`, typecheck, package dry-runs, source guards, Semgrep, syntax, JSONL, dependency audits, and `git diff --check` pass.
- [x] All requested pre-delivery review gates and the fresh feature-dev verification score 10/10 in all ten dimensions.
- [x] PR #61 targeted `dev`; final head CI was green and current-head Codex review was clean with zero unresolved threads before maintainer merge as `1e7f166`.

## Open Questions

None. The user fixed the product contract, default, persistence boundary, and rollback semantics; the specification resolves the remaining implementation choices without expanding scope.

## Implementation Quality Gate

**Gate status:** PASSED. Remote CI/current-head review completed cleanly before maintainer merge.

| Dimension | Score | Implementation evidence |
|-----------|-------|-------------------------|
| Architecture | 10/10 | One injected TTL/clock owner; manifest prepared-root state excluded; UI leases bind exact order/store identities; additive deferred lifecycle commit |
| Consistency | 10/10 | Existing singleton, Map/LRU, discriminator, event bucket, persistence, and facade patterns retained |
| Type Safety | 10/10 | Pure JavaScript/JSDoc; typecheck green; no declaration or public value-shape change |
| Validation | 10/10 | Exact keys/descriptors/context parts use existing policy owners; malformed/unscoped exact calls are no-ops |
| Error Handling | 10/10 | Token/lease/revision cleanup, stale-before-cold, original-error preservation, no stale fallback, retryable save failure |
| Security/Privacy | 10/10 | STRIDE and differential review green; exact scope isolation, no persisted/logged timestamp, explicit administrative trust boundary |
| Performance | 10/10 | O(1) normal operations, one warm clock read, bounded weak metadata/flights, explicit-only O(n) full purge |
| Maintainability | 10/10 | TTL logic centralized in the existing owner; policy ratchet green; no new package/import/duplicate implementation |
| Testability | 10/10 | Deterministic fake clock, red-first generation races, failure injection, isolation, and exact pipeline boundary proof |
| Readability | 10/10 | Locked signatures/state table/runbook and terse owner/facade implementation with package READMEs |
| **Total** | **100/100** | **No unresolved implementation or review finding** |

## Plan Quality Gate

**Scope tags:** SECURITY, CACHE/CONCURRENCY, PACKAGE/API. DB/ROUTING/FRONTEND/INFRA/PAYMENTS are N/A.
**Gate status:** PASSED
**Personas read:** architect, planner, backend-architect, elysia-expert (N/A), bun-expert (N/A), typescript-pro (JSDoc-only constraints), security-architect, threat-modeling-enforcer, platform-engineer (resource/rollback only), code-review-enforcer.
**Unavailable persona:** `agents/infrastructure/database-architect.md` is not installed; DB scope is N/A and no schema/query work exists.
**STRIDE status:** Approved; linked threat-model record incorporates adversarial design findings.

| Dimension | Score | Plan evidence |
|-----------|-------|---------------|
| Architecture | 10/10 | Existing promise policy owner, DI-only UI use, root-local manifest state excluded, opaque iteration token and additive lifecycle finalizer over unchanged buckets |
| Consistency | 10/10 | Existing singleton/Map/LRU/context/facade conventions retained; exact API signatures locked |
| Type Safety | 10/10 | Pure JS/JSDoc only; no handwritten TS/declarations or wrapped public values |
| Validation | 10/10 | Existing discriminator/descriptor/key paths retained; malformed exact calls fail closed |
| Error Handling | 10/10 | Map/key/insertion identity cleanup, old-token-safe stage/commit/abort, invalid-clock fresh path, revision-safe dirty retry specified |
| Security/Privacy | 10/10 | Six STRIDE categories, scoped exact identities, explicit full purge, host authorization boundary |
| Performance | 10/10 | O(1) warm/exact operations, one clock read, weak/bounded metadata, explicit O(n) full purge |
| Maintainability | 10/10 | Clock/expiration centralized; no new package or duplicated per-cache policy |
| Testability | 10/10 | Fake-clock red-first unit/lifecycle/pipeline/failure-injection plan with exact boundaries |
| Readability | 10/10 | Named public facades and state table; terse implementation constrained behind documented owner |
| **Total** | **100/100** | **Self-review and adversarial design review complete; all REWORK findings resolved in this contract** |

## Approval

- [x] Requirements clear
- [x] Scope agreed in the user's bounded task
- [x] Risks and rollback specified
- [x] Threat-model/design review complete
- [x] Specification approved for implementation

**Approved by:** Codex `/root` after code-explorer and code-architect adversarial review; user pre-authorized autonomous implementation once the specification passes.
**Date:** 2026-07-18

## Agent Design Constraints

### architect

- [x] Persona and named checklists read.
- Required: preserve project `AGENTS.md` DI/package/singleton boundaries; one deep shared policy owner; no runtime imports or public-value wrappers.
- Red flags excluded: tight coupling, shotgun duplicated TTL logic, magic unbounded state, pass-through compatibility shims.

### planner

- [x] Persona and named checklists read.
- Required: explicit bounded scope, critical-path ordering, measurable acceptance criteria, probability/impact/owner risks, rollback, and red-first slices.

### backend-architect

- [x] Persona and named checklists read.
- Required: reason about async shared-state races, identity-safe completion, failure atomicity, and bounded resource ownership. Database/queue criteria are N/A.

### elysia-expert / bun-expert

- [x] Personas and named checklists read.
- N/A: this repository uses Node's test runner for this task and adds no Elysia route, Bun API, SQL, package-manager behavior, or dependency.

### typescript-pro

- [x] Persona and named checklists read.
- Required adaptation: honor the project's stronger pure-JS/JSDoc rule and declaration-generation boundary; no `.ts`, handwritten `.d.ts`, `any` escape hatch, or type-surface churn.

### security-architect / threat-modeling-enforcer

- [x] Personas and named checklists read.
- Required: complete pre-code STRIDE/attack tree; preserve request/SSRF path; treat purge as host-authorized administration; map medium/high controls to tests.

### platform-engineer

- [x] Persona and named checklists read.
- Required adaptation: bounded memory/cold-work impact, no timers/background jobs, explicit `Infinity` rollback, no new infra/deploy/schema surface.

### database-architect

- [ ] Persona unavailable in the installed resource checkout.
- N/A: no database, SQL, schema, migration, persistence-format, or transaction change.

## Resumption Context

**Last Completed Mode:** Delivery
**Current Mode:** Complete
**Next Action:** Start the separate persisted-fragment schema follow-up for absolute age across restarts from current `dev`; stale-while-revalidate remains independent.
**Files Created:** `feature-reviews/shared-cache-ttl-purge.md`, `feature-reviews/stride-shared-cache-ttl-purge.md`
**Files Modified:** Central promise/data/HTML/TSS/manifest/UI/event/wrapper/plugin runtime owners, focused tests and host wiring, package metadata, READMEs, and review records listed in this spec.
**Tests Written:** Deterministic promise, data/HTML/TSS, manifest, UI fragment/lifecycle, discriminator, async-save, and scoped pipeline TTL/purge cases.
**Issues Found and fixed:** Pre-implementation focused run produced the expected 29 failures: missing TTL/purge/lifecycle APIs, indefinite settled reuse at the exact boundary, and partial scoped UI publication after an event failure. Adversarial review then produced eight additional focused red cases for deferred completion, language propagation, abort cleanup, null-root reentrancy, replaced stores, and published save timing; all now pass.
**Design Decisions Made:** Central weak cache-map/key/insertion-token metadata; owner-wide clock regression; exact purge signatures above; process-local batch persisted TTL; explicit global UI purge with scoped dirty root; opt-in bounded UI render leases; ephemeral wrapper token; additive finalization over unchanged event buckets; revision-safe save.

**Completion Context:**
PR #61 final head `f01d4dcb36662f5416f77e7a5196bff4eb5f3c5c` passed CI and a clean current-head Codex review with zero unresolved threads, then the maintainer merged it into `dev` as `1e7f1667cf333d9b6bc326fd21034c1486f68ac8` on 2026-07-18. Weakness #12 is closed in its two bounded halves; persisted absolute age across restarts remains explicitly separate schema work.

## Progress Log

### Research Mode

- [x] Read `AGENTS.md`.
- [x] Confirmed PR #60 merged and branched from current `dev`.
- [x] Read weakness #12, prioritized backlog, P3 policy-owner records, and fail-closed discriminator records.
- [x] Mapped cache owners, callers, DI, resets, package metadata, get/UI lifecycle, and focused tests.
- [x] Recorded untouched focused baseline: 244/244 passing.

### Plan Mode

- [x] Read and applied the feature specification template.
- [x] Wrote compatibility, TTL, purge, failure, security/privacy, performance, SemVer, migration, persistence, and rollback contracts.
- [x] Locked purge signatures and deterministic count semantics.
- [x] Completed initial ten-dimension 100/100 self-review.
- [x] Complete adversarial design/persona review and approve spec.

### Design Mode

- [x] Read required available personas and authoritative named checklists.
- [x] Spawn code-explorer and code-architect.
- [x] Complete linked threat model and validate against red flags.
- [x] Lock red-first file/checkpoint sequence after review findings.

### Implement Mode

- [x] Checkpoint 1: red-first unit and pipeline defect proof (29 expected failures captured before runtime edits).
- [x] Checkpoint 2: centralized promise-cache TTL/clock/purge policy.
- [x] Checkpoint 3: data/HTML/TSS/manifest integration and purge facades.
- [x] Checkpoint 4: UI fragment TTL/purge/single-flight integration and host DI.
- [x] Checkpoint 5: package metadata and resets.
- [x] Checkpoint 6: documentation/review records and backlog closure.

### Test Mode

- [x] Focused unit and pipeline tests passing.
- [x] Exact `npm test` (679/679) and `npm run typecheck` passing.
- [x] Package dry-runs, source guards, Semgrep, syntax, JSONL, audits, and `git diff --check` passing.

### Review Mode

- [x] Review-router selection and cross-model adversarial review complete.
- [x] Requested domain/security/privacy/source-ratchet/production reviews complete.
- [x] Staged tech-debt ratchet complete.
- [x] Feature-dev 100/100 implementation review and fresh verification loop complete.

### Documentation and Delivery

- [x] Package READMEs and host migration guidance updated.
- [x] Feature/evaluation/security records, review ledger, and architecture backlog updated.
- [x] Ready PR #61 opened into `dev` as a non-draft, mergeable change.
- [x] Green CI and clean current-head Codex review obtained with zero unresolved threads.
- [x] PR remained unmerged during agent delivery; the maintainer subsequently merged it as `1e7f166`.
