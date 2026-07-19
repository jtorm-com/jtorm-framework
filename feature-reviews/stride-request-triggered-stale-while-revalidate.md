# STRIDE Threat Model: Request-Triggered Stale-While-Revalidate

**Status:** PRE-CODE REVIEWED AND APPROVED
**Date:** 2026-07-18
**Feature specification:** feature-reviews/request-triggered-stale-while-revalidate.md
**Scope tags:** SECURITY, INFRA
**Implementation base:** dev at 9ee8cc850224041498282a893eca7451dde8364b
**Owner:** @jtorm/promise-cache-model with opt-in data/HTML/TSS/UI-manifest acquisition owners

## 1. Scope and Security Objective

This change lets an explicitly scoped process-local acquisition cache return an already successful value between its finite TTL and a configured hard stale deadline while one request-triggered refresh runs.

Security objectives:

1. Never let stale service weaken request scope, tenant/origin/base isolation, manifest URL policy, or the captured manifest cache-key epoch.
2. Never publish an invalid, failed, detached, or wrong-generation refresh.
3. Never serve the old value through the acquisition cache at or beyond its configured hard boundary.
4. Keep acquisition participation opt-in, metadata-bounded, process-local, and purgeable while explicitly modeling already-returned and downstream-derived retention.
5. Keep owned refresh work to one concurrent promise per exact retained generation and document that detached loader work requires host lifetime/concurrency controls.
6. Preserve existing request, digest, schema, parser, rendered-fragment, and persistence owners while coordinating sensitive rollback across their independent lifecycles.

Out of scope: rendered-fragment SWR or changes to persisted UI-cache wire/timestamps/save behavior, HTTP validators, timers/schedulers/queues/workers, new endpoints, auth, payments, databases, and new external integrations.

## 2. System Decomposition and Data Flow

### Data-flow diagram

Host/request context
  |
  | explicit tenant + origin + base authority
  v
@jtorm/request-model cacheKey()
  |                         malformed/unscoped
  | exact scoped key        +----------------------> unchanged direct x.load() bypass
  v
Acquisition owner public Map<key, Promise>
  |
  | delegates cache policy
  v
@jtorm/promise-cache-model private weak record
  |
  +-- finite fresh -------------------------------> existing promise/value
  |
  +-- stale eligible -- required x.hit guard ----> old promise/value
  |                         |
  |                         +----------------------> one unchanged x.load() refresh
  |                                                    |
  |                                                    v
  |                                          request/parse or manifest
  |                                          URL/digest/schema/bounds
  |                                                    |
  |                                           exact generation checks
  |                                                    v
  |                                          atomic replacement + new
  |                                          successful-settlement time
  |
  +-- hard stale -------------------------------> exact pending refresh or
                                                   one unchanged cold load

Acquisition result
  |
  +-- manifest pack ----------------------------> root-local prepared index
  |
  v
normal render/handler lifecycle
  |
  v
@jtorm/ui-cache-model independent HTML + settledAt
  |
  +-- optional unchanged save adapter ----------> persisted wire v1 envelope

Root-local prepared indexes, rendered fragments, and persistence remain outside shared refresh ownership, but they can consume or derive from a stale acquisition result. Their independent lifetimes are part of the security data flow even though no UI-cache policy or wire changes.

### Trust boundaries

No new trust boundary is introduced.

- Boundary A: host/request authority to request-model scope derivation. Existing and unchanged.
- Boundary B: process to outbound acquisition transport. Existing request-model URL/SSRF policy and injected transport remain unchanged.
- Boundary C: acquired manifest bytes to trusted pack. Existing URL guard, native digest, JSON/schema, and bounds checks remain unchanged.
- Boundary D: shared process-local pack to root-local prepared index. Existing root supersession and required/optional policy remain unchanged.
- Boundary E: rendered fragment publication and optional persistence. Existing UI cache, settledAt, save adapter, and wire v1 remain unchanged; stale acquisition content may be transformed into derived HTML that crosses this existing boundary.

Async/error paths included: guarded hit rejection, tenant/origin/context-base/singleton-base mutation during the guard, every post-guard generation transition, synchronous loader throw, asynchronous refresh rejection, hard-bound refresh joining, purge/eviction/reset/map replacement/new insertion during refresh, detached outstanding work, invalid/throwing config, invalid/regressing clock, downstream derivation, and serverless execution freeze.

## 3. Asset Inventory

| Asset | Classification | Security property |
|---|---|---|
| Data acquisition value | Confidential when tenant/user data is present | Exact scope, strict acquisition deadline, future-participation purge |
| HTML acquisition value | Internal/confidential depending on host | Exact scope, no cross-origin/base reuse |
| TSS acquisition value | Internal | Exact scope, validated unchanged parse path |
| Manifest pack | Public/internal trusted static configuration | URL policy, integrity digest, schema/bounds, root isolation |
| Composite cache key | Confidential metadata | Cannot alias tenant/origin/base identities and is re-derived after awaited manifest guards |
| Public cached Promise | Internal process state | Identity compatibility, exact-generation ownership |
| Private TTL/refresh record | Internal security state | Non-persistent, weak Map ownership, O(max), generation-safe |
| Settlement timestamp | Internal policy state | Absolute, non-sliding, valid clock identity |
| Root index/rendered fragment/persisted envelope | Potentially confidential derivative | Independent lifecycle; unchanged UI wire; coordinated disposal/purge/persistence clearing for sensitive rollback |

No secret, credential, authorization token, payment data, database row, or audit record is newly created or transformed.

## 4. Threat Actors

- Malicious tenant/user able to influence request context or acquisition URL inputs, seeking cross-scope stale data.
- Remote source or compromised manifest host returning malformed/changed bytes.
- Misconfigured or buggy host setting unsafe TTL/window/clock values.
- High-rate client attempting refresh amplification or cache churn.
- Concurrent in-process caller triggering purge, eviction, reset, or replacement races.
- Serverless platform freezing execution after response; not malicious, but an availability adversary.
- Insider/operator selecting an overly long stale window for sensitive content.

## 5. STRIDE Analysis

### S — Spoofing

**S1: Attacker forges or omits tenant/origin/base authority to consume another scope's stale value.**
Status: CONTROL PRESENT.
Controls: unchanged request-model fail-closed composite cacheKey; undefined key bypass before Map/policy/metadata/clock; distinct explicit key components; no fallback to an unscoped/shared key; manifest guarded reuse re-derives the exact captured key after authorization and before state use.
Verification: shared-cache discriminator/isolation tests, unscoped stale/refresh pipeline tests, and deferred-guard tenant/origin/base mutation tests.

**S2: Caller presents a stale manifest URL that is no longer allowed.**
Status: CONTROL PRESENT.
Controls: existing x.hit URL-policy guard runs before every stale service/refresh and before hard-bound reuse; the same continuation performs an exact key check and one-shot current-generation classification with no intervening await. An initial hard/no-refresh classification commits to the unchanged validated cold loader and cannot be reclassified into unguarded reuse.
Verification: manifest URL rejection, captured-key mismatch, hard-bound crossing, side-effecting TTL re-read, and full post-guard transition-table tests.

No new identity/authentication mechanism exists; authentication checklist controls are N/A.

### T — Tampering

**T1: Invalid refresh bytes replace a previously valid generation.**
Status: CONTROL PRESENT.
Controls: data/HTML/TSS use unchanged request/parse paths; manifests use unchanged request, digest, JSON/schema, size/count/depth bounds, and required/optional paths; only fulfilled validated loader promise can publish.
Verification: manifest validation/digest/bounds rejection tests and unchanged acquisition-owner tests.

**T2: Late refresh completion overwrites a newer/purged/evicted/reset generation.**
Status: CONTROL PRESENT.
Controls: current owner Map resolution plus exact key, old public promise, record, refresh promise, and opaque token comparison; purge/eviction/reset/map replacement/new insertion detach metadata; post-guard classification adopts exact published/current work without removing newer state merely because identity changed; completion may resolve followers but cannot republish.
Verification: one test per invalidator and late success/failure plus every deferred-guard generation transition.

**T3: Mutable tenant/origin/base context changes while manifest URL authorization awaits, causing a refresh acquired under new scope to publish under the old key.**
Status: CONTROL PRESENT.
Controls: manifest supplies a synchronous post-guard key check that re-runs s.cacheKey(d, c) and requires exact equality with captured q; central classification and any loader start follow in that continuation without another await; mismatch is acquisition failure with no stale service, refresh/join, or public-generation replacement. Existing pending/fresh pre-guard recency remains compatible.
Verification: deferred stale/hard guard tests mutate tenant, origin, per-context base, and singleton base and assert no old-key service, refresh, join, recency, or publication; pending/fresh may retain only its existing pre-guard touch.

**T4: Invalid-window handling, arithmetic overflow, clock manipulation, or policy mutation extends stale age.**
Status: CONTROL PRESENT.
Controls: every admitted window is finite and nonnegative; missing/invalid/throwing windows behave as zero without discarding TTL freshness; subtraction-based strict boundaries avoid addition overflow; absolute successful-settlement timestamp; clock identity/nondecreasing checks; no timestamp on start/hit/failure.
Verification: invalid/throwing/maximum-finite windows, future/regressing clock, publication-time clock failure, runtime shorter/longer policy, and no-sliding tests.

### R — Repudiation

**R1: Refresh failure is invisible because the stale-serving request succeeds.**
Status: RESIDUAL RISK DOCUMENTED.
Controls: unchanged loader/request transport remains the observability seam but receives no foreground/background marker; refresh rejection is always observed to prevent unhandled process events; package/root docs state that hosts needing refresh-failure metrics must instrument the existing transport before opt-in. No new mutation/security decision requires an audit trail.
Verification: consumer-free process rejection witness and documentation review.

**R2: Operator disputes which policy retained old data.**
Status: CONTROL PRESENT AT CONFIGURATION BOUNDARY.
Controls: one documented public field per owner, default zero, runtime value directly determines strict boundary, no hidden timer/backoff/persistence. Configuration management/audit is host-owned and outside this dependency-free library.
Verification: defaults/wiring/reset tests and package documentation.

No user-visible mutation or authorization decision is added, so WORM audit records are N/A.

### I — Information Disclosure

**I1: Sensitive data remains serviceable beyond the host's intended freshness period.**
Status: EXPLICIT OPT-IN RESIDUAL RISK.
Controls: default zero; finite configured window; strict acquisition hard boundary; no sliding; exact/full acquisition purge stops future cache participation; documentation requires sensitivity-based selection and downstream invalidation.
Verification: exact boundary, acquisition purge, no-sliding, reset, downstream-lifecycle regression, and docs checks.

**I2: Stale bytes cross tenant, origin, base, or process boundaries.**
Status: CONTROL PRESENT.
Controls: exact composite keys; post-guard key re-derivation; undefined/malformed bypass; weak metadata tied to current Map; no cross-process acquisition storage.
Verification: discriminator, async key-drift, unscoped pipeline, and process-local behavior tests.

**I3: A render transforms stale acquisition content into a fragment whose independent UI settledAt/persistence outlives the acquisition hard deadline.**
Status: EXPLICIT DOWNSTREAM RESIDUAL RISK.
Controls: UI cache receives no staleWindow/SWR policy or wire change; specification and docs state the independent lifetime; sensitive rollback coordinates acquisition purge, render-root disposal, UI purge, and persistence clear/save.
Verification: pipeline/downstream regression plus persisted wire/version/timestamps/save/plugin suites and rollback-documentation review.

**I4: Manifest stale service bypasses a tightened URL allow policy or changed scoped key.**
Status: CONTROL PRESENT.
Controls: x.hit guard then exact captured-key check before stale service/refresh/join; rejection does not consume cache state; one-shot current-generation transition table.
Verification: guarded URL rejection, tenant/origin/base drift, and deferred generation-transition tests.

### D — Denial of Service

**D1: Many stale callers start an acquisition storm.**
Status: CONTROL PRESENT.
Controls: one refresh descriptor per exact retained generation; sequential/concurrent callers share it; unguarded hard callers return the exact refresh while guarded callers adopt its outcome after authorization; no timer/loop/fan-out.
Verification: sequential and Promise.all concurrency load-count tests.

**D2: Failed refreshes retry too rapidly.**
Status: RESIDUAL RISK REQUIRED BY CONTRACT.
Controls: one concurrent refresh per retained generation; retry occurs only on a later eligible access after failure; no hidden retry loop/timer; existing transport/request capacity controls; default/kill-switch zero. A very fast failure can cause one attempt per sequential request while within the window.
Verification: failure retry and one-concurrent-refresh tests; operational documentation.

**D3: Retained cache metadata grows without bound.**
Status: CONTROL PRESENT.
Controls: existing max/LRU; at most one descriptor per retained record; WeakMap tied to cache Map; exact/full purge/reset; successful replacement does not add a key. This control claims only public/private cache-state bounds.
Verification: max/LRU/eviction/map-replacement tests.

**D4: Repeated purge/eviction/map churn detaches slow refreshes faster than they settle, retaining loader work or captured contexts beyond max.**
Status: HOST-CONTROLLED RESIDUAL RISK.
Controls: default window zero; detached work cannot publish; positive-window documentation requires finite transport lifetime and source/concurrency controls where hung work matters; no false cancellation/abort claim because request-model timeout remains zero by default.
Verification: repeated-detachment non-publication tests that settle every deferred, plus package/root operational documentation and production-readiness review.

**D5: Hard-bound callers duplicate pending work or hang on old data.**
Status: CONTROL PRESENT.
Controls: never return old at hard boundary; join exact pending refresh; if none, one normal cold insertion/deduplication; underlying transport timeout remains host/request-owned and unchanged.
Verification: hard-bound joining and refresh failure tests.

**D6: Serverless host stops background execution after returning stale.**
Status: ACCEPTED OPERATIONAL LIMITATION.
Controls: explicit best-effort documentation, no durability claim, later request may retry, zero window where completion is required. No portable scheduler is introduced.
Verification: documentation and architecture review; platform behavior is not falsely simulated as durable.

### E — Elevation of Privilege

**E1: Cached acquisition work is treated as authority and reused after authorization/policy changes.**
Status: CONTROL PRESENT.
Controls: cache values grant no authority; manifest URL policy and exact scoped key are re-derived in the same post-await continuation before cache reuse/load; no auth/session cache is added; unscoped calls bypass.
Verification: scope/guard/key-drift tests.

**E2: A detached refresh gains authority to mutate current cache state.**
Status: CONTROL PRESENT.
Controls: exact current-generation checks; private record cannot publish after purge/eviction/reset/replacement/new insertion; post-guard paths preserve untracked/newer work and never reuse detached old state; no exported refresh API.
Verification: generation-race and full deferred-guard transition-table tests.

No role, permission, token, admin function, or service credential changes; conventional authz controls are N/A.

## 6. Attack Tree

Goal: obtain, publish, or preserve an unauthorized/invalid stale acquisition or derivative

OR
  A. Cross a scope boundary
     OR
       A1. Cause request-model to produce a shared key for malformed/missing authority
       A2. Mutate tenant/origin/base while manifest authorization awaits
       A3. Consume or publish old-key state without rechecking captured q
     Blocked by fail-closed undefined bypass plus the same-continuation exact key check before state use/load.
  B. Bypass manifest policy/integrity
     OR
       B1. Serve stale before URL guard
       B2. Start/join refresh despite guard or key-check rejection
       B3. Publish bytes that fail digest/schema/bounds
       B4. Return detached old work or remove unrelated newer work after an async guard
     Blocked by pre-service guard/key check, one-shot transition table, and unchanged validated loader.
  C. Resurrect a detached generation
     AND
       C1. Start refresh
       C2. Purge/evict/reset/replace/insert newer state
       C3. Let late completion publish without exact checks
     Blocked by current Map plus exact promise/record/refresh-token comparison.
  D. Extend acquisition service beyond hard policy
     OR
       D1. Slide timestamp on hit/start/failure/save
       D2. Exploit addition overflow in a hard-bound calculation
       D3. Regress/future clock
     Blocked by settlement-only timestamps, subtraction comparison, invalid-window zero fallback, and clock checks.
  E. Exhaust source/process resources
     OR
       E1. Concurrent stale callers each refresh the same generation
       E2. Refresh metadata grows beyond max
       E3. Failure creates a hidden retry loop
       E4. Churn detaches slow work faster than settlement
     E1-E3 are blocked by one descriptor, max/WeakMap bounds, and access-only retry. E4 is an accepted host-controlled residual requiring default zero plus finite transport lifetime/concurrency controls before opt-in where hung work matters.
  F. Preserve a sensitive derivative beyond acquisition rollback
     AND
       F1. Render from an eligible stale acquisition
       F2. Publish/persist derived HTML with its own UI settledAt
       F3. Purge only the acquisition cache
     This is an explicit existing-boundary residual, controlled by coordinated root disposal, UI purge, and persistence clear/save for sensitive rollback.

Cross-component chains considered: mutable scope during an awaited guard plus old-key publication could disclose a wrong-scope pack; stale acquisition plus render publication plus acquisition-only purge could retain a sensitive derivative. Each fail-closed link or accepted residual has linked tests/documentation.

## 7. Risk Ranking and Residual Acceptance

| Threat | Likelihood | Impact | Residual |
|---|---|---|---|
| Cross-scope stale disclosure | Low after controls | High | Accept only with discriminator tests green |
| Async manifest key/scope drift | Low after controls | High | Accept only with all tenant/origin/base mutation and post-guard transition tests green |
| Invalid/late refresh publication | Low after controls | High | Accept only with every generation-race test green |
| Deliberate acquisition retention of sensitive bytes | Medium when enabled | High | Accepted by the host choosing positive staleWindow; default zero |
| Downstream fragment outlives acquisition deadline/purge | Medium when enabled | High | Accepted existing-owner consequence only with coordinated rollback documentation |
| Detached slow work accumulates beyond max | Medium under churn | High | Host-controlled with finite transport lifetime/concurrency; max bounds metadata only |
| Refresh amplification after rapid failures | Medium | Medium | Accepted per-generation contract; existing transport controls and zero-window rollback |
| Serverless refresh non-completion | High in freezing hosts | Medium | Accepted documented limitation; no durability promise |
| Missing cache-specific refresh telemetry | Medium | Low/Medium | Accepted; instrument existing loader seam where required |

Acceptance authority: the continuation handoff mandates this opt-in acquisition tradeoff and autonomous completion. The framework accepts default-zero behavior, O(max) cache metadata, and the documented lack of cancellation/durability. Each host setting a positive staleWindow accepts content-specific acquisition retention, possible downstream-derived retention, and the need for transport and coordinated invalidation controls. There is no silent acceptance.

Re-evaluation triggers:

- A staleWindow/SWR policy is proposed for rendered/persisted fragments, or positive acquisition windows are proposed for auth/authz/session data, secrets, payments, or regulated/PII-specific caches.
- A new persistence, cross-process cache, queue, timer, waitUntil integration, or trust boundary.
- Changes to request-model identity/URL policy, manifest validation/digest/bounds, or public cache shape.
- Evidence of cross-scope reuse, downstream deletion/retention failure, detached-work amplification, refresh amplification incident, or serverless completion assumptions.
- Introduction of HTTP validators, which requires its own independent threat/design review.

## 8. Control-to-Test Linkage

Planned test locations may be consolidated to match repository density, but every control remains mandatory:

| Control | Planned proof |
|---|---|
| Strict fresh/stale/hard boundaries and overflow-free age | test/models/promise-cache-swr.test.js |
| One refresh, unguarded exact hard join, guarded adoption, failure observation/retry | promise-cache and manifest SWR tests |
| Purge/eviction/reset/map/new-generation safety and detached non-publication | test/models/promise-cache-swr.test.js |
| Default zero and unchanged loaders for data/HTML/TSS/manifest | shared-fetch/manifest SWR tests and harness reset assertions |
| Scope isolation and undefined bypass | shared-fetch and pipeline SWR tests |
| Manifest guard plus exact key recheck and every post-await transition; validation cannot publish | test/models/ui-manifest-swr.test.js |
| Scoped stale then changed-source replacement | test/pipeline/stale-while-revalidate.test.js |
| Stale-derived fragment has independent lifetime; acquisition purge alone does not revoke it | pipeline/downstream focused regression |
| UI persisted wire/timestamp/save/plugin unchanged | existing UI cache persistence/plugin suites plus focused regression |
| Source/dependency ownership and no HTTP-validator surface | test/policy-ownership.test.js and source guards |

All HIGH/MEDIUM controls must have an implemented test in the same change unless the control is documentation-only serverless behavior, which is verified by architecture/documentation review and by absence of scheduler/platform APIs.

## 9. PASTA Applicability

Full seven-stage PASTA applicability was re-evaluated after independent architecture review exposed personal-data derivatives and the existing UI persistence boundary. The feature-dev trigger remains false because this adds neither payments nor a new trust boundary or regulated-data-specific flow. Full STRIDE, privacy review, the expanded downstream DFD, attack tree, risk ranking, and control/test linkage are proportionate for a policy change within existing boundaries. Any trigger above invalidates this decision.

## 10. Approval Gate

- [x] Threat model exists before production-code change.
- [x] DFD includes trust, async, error, bypass, and downstream render/persistence paths.
- [x] Assets and actors are classified.
- [x] All six STRIDE categories have scenario/status/control/verification.
- [x] Attack tree includes chained paths.
- [x] Every material threat has a testable mitigation or explicit residual acceptance.
- [x] No mitigation is deferred as a TODO.
- [x] Re-evaluation triggers are explicit.
- [x] Post-implementation paths and final test names verified against the diff.

Pre-code approval: PASS. This document must be updated if implementation deviates from the specification.
