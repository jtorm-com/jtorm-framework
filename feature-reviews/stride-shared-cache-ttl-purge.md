# STRIDE: Shared-cache TTL and purge APIs

**Date:** 2026-07-18
**Status:** Approved
**Design spec:** [`shared-cache-ttl-purge.md`](shared-cache-ttl-purge.md)
**Scope:** Process-local shared data, HTML, TSS, manifest-pack, and rendered-fragment retention/invalidation.

## Enforcer Triage

**Decision:** `STRIDE_SUFFICIENT`

This change modifies cache retention and adds host-callable administrative facades, but adds no network endpoint, external integration, payment/auth/ticketing/PII flow, or new trust-boundary crossing. Existing outbound requests continue through the unchanged request-model policy/timeout seam. A complete STRIDE delta and attack tree cover the relevant failure chains. If a host later exposes purge through an API, that host endpoint requires a new authorization/audit/rate-limit threat model.

## Data-flow Diagram

```text
Untrusted/malformed render value or context
                 |
                 v
      render-context-model (bounded root walk)
                 |
                 v
         request-model discriminator
         [TRUST BOUNDARY: only explicit scope enters shared cache]
                 |
        +--------+---------+
        |                  |
        v                  v
 exact cache key      unscoped bypass
        |                  |
        v                  +--> normal acquisition/render only
 shared process cache
 (value + weak-map/key/token timestamp + bounded in-flight state)
        |
        +-- fresh --> exact promise/AST/pack/fragment; LRU bump
        |
        +-- stale/purged/miss --> existing request/parser/digest/render pipeline
                                      |
                                      v
                              staged successful value
                                      |
                    all after-iteration events and completion hooks succeed
                                      |
                                      v
                         commit cache + dirty root state
                                      |
                                      v
                     attested saveModel (`uiCacheScoped === true`)

Host/operator purge caller
         |
         | [TRUST BOUNDARY: framework assumes host authorizes admin call]
         v
 exact purge(key) or explicit purgeAll()
         |
         v
 detach cache participation; never abort underlying work
```

The manifest render-root-local prepared promise/index is outside the shared-pack TTL/purge state and is not reachable from the new facades.

## Assets and Sensitivity

| Asset | Classification | Security property |
|-------|----------------|-------------------|
| Explicit tenant/origin/base discriminator | Confidential policy metadata | Integrity/isolation |
| Fetched data/HTML/TSS | Application-dependent, possibly confidential | Isolation/freshness/integrity |
| Validated manifest pack | Internal trusted execution input | Digest/schema integrity/freshness |
| Rendered fragment bytes | Application-dependent, possibly confidential | Isolation/freshness/output integrity |
| LRU/timestamp/in-flight metadata | Internal | Bounded availability and consistency |
| Persisted scoped fragment store | Application-dependent | Attestation/isolation/integrity |
| Upstream request budget | Internal operational resource | Availability/cost bound |

No new data category is collected. Timestamps are process-local numeric metadata in weak cache-map tables, keyed by already-live exact keys plus unique insertion identities, and are not persisted, logged, or returned.

## Threat Actors

- An untrusted caller able to influence URLs, render contexts, language/cid/variant, or cyclic/prototype-shaped objects.
- A compromised tenant/session attempting to collide with or invalidate another explicit scope.
- A misconfigured or malicious host integration that exposes administrative purge without authorization.
- A failing/compromised upstream returning changed, malformed, oversized, or digest-invalid content.
- A concurrency race: stale leader, follower, purge, replacement, rejection, or save failure interleaving.
- An operator using `ttl = 0`, invalid time, or full purge and unintentionally creating excess cold work.

## STRIDE-per-element Analysis

### Spoofing

| Threat | Status/control | Verification |
|--------|----------------|--------------|
| Inherited/prototype context property impersonates an explicit tenant/origin/base | Controlled by unchanged own-property discriminator and bounded render-context walk | Existing discriminator tests plus exact-purge malformed/prototype/cycle tests |
| Variant containing the NUL separator collides with another UI identity | Rejected by existing `part()`/`scope()` logic before cache/metadata access | UI exact-purge/get tests |
| Descriptor mode changes pack identity unexpectedly | Pack identity remains exactly URL policy key + hash; mode is not part of shared pack key | Manifest purge/key identity test |

Residual risk: a host that intentionally supplies the same explicit discriminator to different tenants has already collapsed their trust boundary. TTL/purge does not attempt to repair host identity policy.

### Tampering

| Threat | Status/control | Verification |
|--------|----------------|--------------|
| `purge(undefined)` accidentally clears everything | Exact purge returns `0`; only the named `purgeAll` path can clear all | Every facade tests undefined/unscoped exact calls |
| A late rejection/fulfillment deletes or publishes over a newer entry | Cache-map/key/insertion-token and opaque iteration-lease comparisons precede cleanup/commit | Pending-purge/same-promise/replacement/rejection race tests |
| UI publishes bytes before a later event fails | UI bytes stage at existing after-event position; commit only after the full after chain; abort rejects/detaches | Handler/event failure tests with follower |
| A later completion hook fails after the UI hook | Event owner defers the single returned commit closure until every completion hook succeeds | Multi-hook completion failure test |
| Timestamp wrapper changes public promise/AST/pack/fragment data | Timestamps are weak-map side metadata keyed by exact participation; cache values remain unchanged | Strict identity and shape assertions |
| Stale manifest bypasses current URL/digest/schema controls | Expiration runs before hit guard; stale path invokes unchanged acquisition/validation | Manifest acquisition-classification/digest/URL tests |

Residual risk: a fully trusted host can call `purgeAll` at any time. That is the explicit administrative contract, not an authorization bypass inside the framework.

### Repudiation

| Threat | Status/control | Verification |
|--------|----------------|--------------|
| Operator disputes whether an exact/full purge found state | Each call returns a deterministic deletion count | Repeat purge and isolation tests |
| Network caller invokes purge without attributable audit | No network endpoint is added. Host migration guidance requires authorization and audit when exposing administration | Documentation review; N/A runtime test |
| Cache expiry is confused with explicit purge | No audit subsystem is introduced; deterministic fake-clock tests distinguish the behaviors | Test names/count/clock assertions |

Residual risk accepted: the dependency-free framework does not own host audit logging. Exposing purge remotely without host audit remains a host defect and triggers a separate endpoint threat model.

### Information Disclosure

| Threat | Status/control | Verification |
|--------|----------------|--------------|
| Exact purge probes another tenant's entry existence | Key is derived only from the caller's explicit context; another discriminator maps to a different exact key | Tenant/origin/base isolation tests |
| Unscoped calls reveal shared-cache presence through clock/hit/purge side effects | Unscoped paths return before metadata/cache/clock access | Throwing/counting clock and frozen-cache tests |
| Timestamp state retains replaced host maps/content | Weak cache/LRU map keys; callbacks resolve current owner map and capture only token/key/promise; timestamps contain only time values | Replaced-map/reset characterization (no owner-held strong cache map) |
| Persisted schema exposes source/settlement time | No timestamp fields are persisted | Deep-equal persisted shape tests |

Residual risk: deterministic `0/1` counts reveal presence inside the valid scope to the authorized host caller. This is necessary administrative feedback and does not cross scope.

### Denial of Service

| Threat | Status/control | Verification |
|--------|----------------|--------------|
| `ttl = 0`, invalid clock, or short TTL causes repeated cold work | Host-controlled setting; safe default five minutes; `Infinity` rollback; existing request timeouts/limits; no background work | TTL mode tests and documented tradeoff |
| Concurrent stale callers fan out acquisition/render | Original promise dedupe and bounded UI in-flight lease | Concurrent exact-boundary tests with request/render counters |
| A failed leader amplifies one error to same-key followers | Followers deliberately share one lease result; rejection removes that lease and the next caller retries normally | Shared-follower failure/retry tests and operator guidance |
| Pending UI keys grow without LRU bound | In-flight participation is capped consistently with `max`; detached leaders finish for existing callers without insertion | Max/pending pressure tests |
| Full purge scans cache on ordinary get | Only explicit `purgeAll` is O(n); get/exact purge remain O(1) | Source review and operation-count characterization |
| Clock getter/function throws or regresses and crashes/extends render retention | Policy catches configuration/time failures and uses an owner-wide high-water per clock identity; source load/render errors still propagate normally | Throwing and cross-key regression tests |
| Background sweeps/timers retain process work | None are introduced; expiration is lazy | Source guard |

Residual risks accepted: finite TTL necessarily increases cold work at expiration, and a backward wall-clock correction creates an owner-wide cold-reuse window until the clock reaches its prior high-water mark or the host replaces the clock function. Hosts choose per-cache TTLs based on upstream capacity, may inject a monotonic clock, and can set `Infinity` during rollback. Same-key followers share one leader failure by design; this bounds duplicated work and clears for the next call.

### Elevation of Privilege

| Threat | Status/control | Verification |
|--------|----------------|--------------|
| Untrusted user invokes global administrative purge | Framework adds no route; host is required to guard any exposed call | Documentation/review; new host route would require separate tests |
| Exact invalidation broadens from malformed discriminator to global mutation | Invalid/unscoped exact key is `undefined` and exact owner purge is always `0` for it | Malformed/cyclic exact-purge tests |
| Cached manifest or fragment from one origin gains use in another | Exact composite discriminator identities remain unchanged; expiry/purge never re-key values | Cross-origin/base/tenant tests |

Residual risk: in-process code with direct singleton access already has framework-level authority to mutate exported caches. New named purge APIs make that operation safer and auditable by count but do not sandbox trusted host code.

## Administrative-purge Attack Tree

```text
Goal: affect cache state outside the caller's intended exact scope

OR
├── Turn exact purge into full purge
│   AND
│   ├── supply undefined/malformed/cyclic context
│   └── implementation interprets missing key as wildcard
│       -> blocked: exact owner purge(undefined) is defined as count 0
├── Collide with another tenant key
│   AND
│   ├── spoof inherited/ambiguous discriminator or NUL-separated variant
│   └── key builder accepts it
│       -> blocked: existing own-property policy + part/separator checks
├── Let old pending work repopulate after purge
│   AND
│   ├── purge detaches current participation
│   └── late settlement commits without identity/lease ownership
│       -> blocked: detached token / exact identity check
└── Invoke explicit purgeAll without administrative authority
    AND
    ├── host exposes method over a route/tool
    └── host omits authz/audit/rate limit
        -> outside framework; migration docs require a new endpoint threat model
```

## Control-to-test Matrix

| Risk | Control | Required same-change evidence |
|------|---------|-------------------------------|
| Cross-scope mutation/disclosure | unchanged discriminator + exact undefined no-op | discriminator/isolation/unit/pipeline tests |
| Late-work tampering | cache-map/key/insertion token plus opaque iteration lease and detach state | pending purge + same-promise/new-lease replacement race tests |
| Partial UI publication | staged bytes + complete/abort lifecycle | handler/event/clock failure tests |
| Resource exhaustion | default finite TTL, per-cache override, max-bound leases, no timers | TTL/max/concurrency/source-guard tests |
| Manifest integrity bypass | stale before guard and normal cold acquisition | URL/digest/schema/classification tests |
| Persisted privacy/schema change | no timestamps persisted; attestation unchanged | init/save deep-shape tests |
| Unsafe rollback | explicit `Infinity` behavior | fake-clock opt-out test + README |

## Residual-risk Acceptance

| Residual risk | Acceptance | Re-evaluation trigger |
|---------------|------------|-----------------------|
| Finite expiry increases normal upstream/render work | Accepted by the task owner; per-cache TTL and `Infinity` are host controls | sustained error/cost/latency regression in a host deployment |
| Backward wall-clock correction disables settled reuse until the prior high-water mark | Accepted fail-closed availability tradeoff; inject a monotonic clock for hosts that adjust wall time | repeated cold-load spikes correlated with clock correction |
| Same-key followers receive one leader failure | Accepted consequence of single-flight deduplication; failed lease is removed and next call retries | host requires independent retry/fallback semantics |
| A trusted in-process host can purge all cache state | Accepted as the explicit administrative API | purge exposed across a network or to plugins with lower trust |
| Persisted fragment age restarts at process initialization | Accepted only for this bounded task and documented as schema follow-up | persistence schema version work begins |
| Framework does not emit audit logs for purge | Accepted because no network/admin identity layer exists here | host adds remote administrative facade |

No HIGH or MEDIUM threat is left without an implementation control and linked test. No new secrets, PII, payment, authentication, database, queue, or external service are introduced.

## Approval

- [x] DFD and trust boundaries recorded before implementation
- [x] Assets and actors classified
- [x] All six STRIDE categories analyzed
- [x] Attack tree constructed
- [x] Controls mapped to tests
- [x] Residual risks and re-evaluation triggers recorded
- [x] Adversarial code-architect review complete

**Verdict:** Approved for implementation. Code-explorer/code-architect REWORK findings were incorporated: map/key/insertion tokens, owner-wide clock regression, opaque wrapper iteration tokens, opt-in UI leases, unchanged event buckets, reentrant bypass, map-associated flights, revision-safe saves, and current-root manifest exclusion.
