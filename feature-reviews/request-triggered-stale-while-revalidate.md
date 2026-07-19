# Feature Development: Request-Triggered Stale-While-Revalidate

**Status:** DELIVERING
**Claimed:** 2026-07-18T23:40:00Z
**Agent:** Codex `/root`
**Current Mode:** Delivery

---

## Resumption Context

**Last Completed Mode:** Final local verification
**Current Mode:** Delivery
**Next Action:** Commit and push the valid SemVer review correction, resolve its thread, then obtain corrected-head green CI plus a clean Codex review.
**Files Created:**
- `feature-reviews/request-triggered-stale-while-revalidate.md`
- `feature-reviews/stride-request-triggered-stale-while-revalidate.md`
- `feature-reviews/request-triggered-stale-while-revalidate-eval.md`
- `feature-reviews/request-triggered-stale-while-revalidate-security-review.md`
- `feature-reviews/request-triggered-stale-while-revalidate-differential-review.md`
- `feature-reviews/request-triggered-stale-while-revalidate-adversarial-review.md`

**Files Modified:** Central promise-cache policy, four acquisition owners, harness, package/root/architecture documentation, package metadata, policy ratchets, and deterministic model/pipeline/tooling tests
**Tests Written:** Central state/race/configuration coverage; data/HTML/TSS/manifest owner coverage; manifest guard transition races; scoped/unscoped pipeline and downstream-fragment boundary proofs
**Issues Found and Fixed in Design:** Ten independent design-review findings were incorporated. The authorized skeptic/architect/minimalist round then accepted six bounded remediations: zero-window fallback for invalid configuration, transition deduplication, two regression witnesses, policy/observability clarification, and private phase/token clarity. The post-remediation cold reread found and closed one guarded hard-state policy re-read that could otherwise bypass `hit()` under a side-effecting TTL getter. PR #65's initial current-head Codex review found one valid P2: the additive public cache API and consumer fields require coordinated minor, not patch, releases. Exact package assertions failed red before all five packages and four direct dependency floors moved to `1.1.0`.
**Design Decisions Made:**
- Four opt-in staleWindow fields default to zero; one central absolute-age state machine owns acquisition SWR.
- Manifest reuse adds same-continuation URL authorization, exact captured-key validation, and one-shot current-generation classification.
- Public Map/promise identities, strict hard boundaries, generation-safe publication, and rendered-fragment SWR exclusion remain fixed.
- Missing/invalid staleWindow disables stale service without discarding ordinary TTL freshness; every finite nonnegative window is admitted through subtraction-based boundaries.
- Acquisition purge controls future participation only; downstream root/UI/persistence invalidation and detached loader work are explicit host-owned operational boundaries.

**Verification:** Post-remediation focused cache/consumer gates pass 90/90; the SemVer correction witnesses pass 7/7; exact `npm test` passes 759/759. Typecheck, syntax, five exact `1.1.0` three-file package dry-runs, zero-vulnerability audits, fresh 83-rule Semgrep, source/policy guards, staged tech-debt ratchet, and diff checks pass.
---

## Progress Log

### Research Mode
- [x] Read required architecture history and current owners
- [x] Map cache flows, public fields, callers, and tests
- [x] Record research summary without proposing changes

### Plan Mode
- [x] Entered plan mode
- [x] Wrote feature specification
- [x] Self-reviewed specification

### Plan Quality Gate
- [x] Scope classified
- [x] Relevant personas consulted
- [x] All 10 dimensions pass at plan level
- [x] STRIDE pre-analysis complete
- [x] Plan refined with review feedback
- [x] Specification approved by the handoff contract

### Design Mode
- [x] Loaded required personas
- [x] Completed independent code-explorer review
- [x] Completed independent code-architect review
- [x] Validated design against red flags

### Implement Mode
- [x] Checkpoint 1: Tests/scaffold
- [x] Checkpoint 2: Core logic
- [x] Checkpoint 3: Edge cases
- [x] Checkpoint 4: Integration

### Test Mode
- [x] Red tests written and observed failing
- [x] Focused tests passing
- [x] Full suite and typecheck passing

### Review Mode
- [x] Required review skills completed — authorized opposite-model adversarial review passed; accepted findings remediated
- [x] Security/privacy/infrastructure reviews completed
- [x] 100/100 code quality
- [x] Local verification loop passed
- [x] All requested local validations passing on the final candidate

### Documentation Mode
- [x] Package and root documentation updated
- [x] Architecture backlog split and SWR row completed
- [x] Package metadata/versioning updated
- [x] Delivery records updated with the authorized review and remediation retained

### Delivery Mode
- [x] Ready PR #65 opened into `dev`
- [x] Initial head `5d79d5f6ac05ab35780cb17115fe1d2cbb62299c` CI green
- [x] Initial current-head Codex finding triaged and corrected red-first
- [ ] CI green on corrected head
- [ ] Codex review clean on corrected head
- [ ] Zero unresolved review threads

## Research Summary

- **Modules involved:** `@jtorm/promise-cache-model`; the data, HTML, TSS, and UI-manifest acquisition owners; request/render-context policy owners; `get-method`; the pipeline host/reset harness. `ui-cache-model` and its plugin/persistence wire are regression-only because rendered fragments are outside SWR scope.
- **Existing data flow:** each acquisition owner derives an explicit scoped key through `requestModel.cacheKey()` and delegates its unchanged loader/parser to `promiseCacheModel.get()`. The manifest owner additionally supplies a guarded-hit callback that re-runs `url()`/`allow()` before reuse, then validates acquisition text, digest, schema, and bounds on cold work. Prepared manifest indexes remain root-local above the shared pack cache.
- **Existing cache representation:** each participating acquisition cache exports a live `Map<key, Promise>` plus `max` and `ttl`. Promise-cache metadata is weakly keyed by the current Map and records exact promise/key/token generations, pending state, successful settlement time, and optional scope. Owner-wide clock observations are weakly keyed by owner.
- **Existing TTL behavior:** pending work deduplicates without clock access; successful settlement starts an absolute non-sliding TTL; fresh hits update LRU recency; `age >= ttl` removes the entry before guarded-hit policy and synchronously starts/returns one cold replacement; `ttl = 0` is pending-only; `Infinity` is non-expiring; invalid TTL or regressing clock state fails fresh.
- **Existing invalidation/replacement behavior:** exact/full purge, LRU eviction, rejection, cache-Map replacement, reset, and insertion tokens detach old participation and prevent late settlement from deleting or replacing a newer generation. Public cached promise/value identities remain unchanged.
- **Existing isolation behavior:** missing, malformed, cyclic, inherited, delimiter-bearing, or otherwise unscoped authority yields `undefined` before delegation. The bypass calls only `load()` and performs no Map, metadata, recency, eviction, clock, guard, or deduplication work. Explicit tenant, origin, and base identities remain distinct.
- **Rendered-fragment boundary:** UI fragments use a nested HTML store, parallel LRU order, handler/event render leases, successful-publication timestamps, versioned persistence, and a separate absolute clock. Their background rendering would cross lifecycle/publication/save boundaries; current persisted wire v1, `settledAt`, plugin timing, and save adapter are unchanged regression surfaces.
- **Host/reset pattern:** the harness injects one promise-cache singleton into all five current cache consumers, replaces acquisition Maps for cold renders, calls `reset()` for discarded owners, preserves metadata only for explicit warm reuse, and resets TTL to `300000`. It exposes deterministic clock/TTL options for pipeline tests.
- **Package constraints:** runtime source is dependency-free CommonJS with DI only. Current acquisition consumers depend on promise-cache `^1.0.2`; UI-cache alone requires `^1.0.3` for persisted-age restoration. Policy-ownership tests ratchet exact package versions, dependency floors, and delegation locations.
- **Historical constraints:** PR #59 established fail-closed scoped participation; PR #61 established current absolute TTL/purge and generation rules; PR #63 paired persisted fragment bytes with original `settledAt`. Architecture weakness #12 is closed. SWR and HTTP validators are still one combined P4 backlog row, but are explicitly independent work.
- **Test baseline:** 214/214 focused promise-cache, acquisition-owner, request/context, manifest, UI persistence regression, discriminator, wiring, ownership, and pipeline tests pass on untouched `dev` at `9ee8cc8`.
- **Open questions:** none observed in the current system. Public naming, exact SWR state transitions, privacy/operability contract, SemVer, and test plan belong to Plan Mode.
## Feature Specification

### Metadata

- **Status:** DELIVERING; implementation and local gates complete
- **Feature owner and implementer:** Codex /root
- **Decision authority:** the explicit continuation handoff; it pre-authorizes autonomous progress after a complete, self-reviewed specification
- **Base:** dev at 9ee8cc850224041498282a893eca7451dde8364b
- **Branch/worktree:** feat/request-triggered-swr in /tmp/jtorm-request-triggered-swr
- **Threat model:** feature-reviews/stride-request-triggered-stale-while-revalidate.md
- **Scope tags:** SECURITY, INFRA
- **Deep-dive applicability:** personal or tenant-sensitive acquisition data and downstream rendered derivatives are explicitly in scope, so SECURITY classification, full STRIDE, an attack tree, and privacy review are mandatory. Re-evaluation after independent architecture review confirms that the feature-dev PASTA trigger is still not met because this adds neither payments nor a new trust boundary.

### 1. Problem and Desired Outcome

The current shared acquisition caches make every first caller at age equal to TTL wait for replacement acquisition. That protects freshness but creates avoidable latency and correlated stalls when a still-usable process-local value could serve the request while one bounded refresh runs.

The business goal is lower request latency and lower duplicate acquisition load during ordinary cache turnover. The host/user goal is explicit control over whether slightly stale acquisition data may be served. These goals conflict when content sensitivity or freshness is more important than latency; the resolution is an opt-in, per-cache stale window whose default is zero.

The underlying need is not a generic background-work system. It is a narrow, access-triggered state transition for already-safe promise-backed acquisition caches, preserving every existing scope, validation, URL-policy, identity, and invalidation boundary.
### 1A. Functional Requirements

1. A host can independently set staleWindow on data, HTML, TSS, and manifest-pack acquisition owners.
2. With the default zero, every existing expire-then-wait result and promise identity remains unchanged.
3. A finite positive window permits old successful acquisition data only during the strict stale interval.
4. The first eligible access starts one unchanged refresh; other stale callers share the old generation and never duplicate it.
5. Hard-bound callers never receive old data and share current replacement work.
6. Only successful refresh fulfillment can publish and start a new absolute timestamp.
7. Failure never slides age, installs backoff, leaks an unhandled rejection, or blocks a later access-triggered retry.
8. Every invalidator prevents late refresh resurrection.
9. Unscoped/malformed calls remain pure direct-load bypasses.
10. Manifest URL policy and the captured request cache key are revalidated after every awaited hit guard and before stale service, refresh, or reuse; all replacement validation remains unchanged.
11. LRU/max/public Map/singleton/value contracts remain unchanged and bounded.
12. Rendered-fragment SWR and the persisted wire remain excluded and regression-pinned, while downstream derivatives of stale acquisitions remain explicitly modeled.
13. Execution remains access-triggered and dependency-free with no durability claim.
14. HTTP validators remain a separate open P4 follow-up.
15. Acquisition hard deadlines and purges govern future participation in the acquisition cache only; sensitive rollback coordinates root disposal and rendered-fragment invalidation separately.

Accessibility is N/A because no rendered UI or interaction changes.


### 2. Scope and Priority

#### In scope

- Add one central SWR state machine to @jtorm/promise-cache-model.
- Add the public field **staleWindow**, in milliseconds, to the data, HTML, TSS, and UI-manifest pack cache owners.
- Default every participating owner to staleWindow = 0.
- Preserve and extend the existing private weak metadata so one refresh may be coordinated per exact cache/key/generation.
- Wire deterministic host reset/test controls for only those four acquisition owners.
- Add unit, owner, manifest-policy, isolation, wiring, pipeline, and rendered-fragment regression tests.
- Update package/root documentation, the locked architecture contract, the P4 backlog, threat/security records, and delivery ledger.
- Apply minor SemVer bumps to the five changed published runtime packages because they add backward-compatible public functionality; coordinate direct dependency floors.

#### Out of scope / no-gos

- Rendered UI fragment SWR, render leases, event/handler background execution, UI cache persistence, settledAt, save adapters, migration, or rollback wire changes.
- ETag, Last-Modified, If-None-Match, If-Modified-Since, HTTP cache-header interpretation, conditional requests, validators, or 304 behavior.
- Timers, sweeps, cron, queues, workers, Durable Objects, service workers, new explicit per-render cache state, generic scheduler/retry/telemetry/cache frameworks, or new persistence behavior.
- URL-policy changes, new outbound requests, request identity changes, SSRF-policy changes, parser changes, manifest digest/schema/bounds changes, handler traversal, bindings, UI resolution/compilation, or published value-shape changes.
- New endpoints, routes, databases, schemas, auth, payments, queues, mobile code, AI/LLM behavior, or frontend UI.

#### Four-dimension prioritization

| Dimension | Decision |
|---|---|
| Business importance | High: removes turnover latency and duplicate pressure without changing default behavior. |
| User importance | High for latency-sensitive hosts; opt-in prevents freshness/privacy policy from being imposed on other hosts. |
| Technical feasibility | High: the existing central promise-cache metadata and generation tokens already own TTL, purge, and settlement. |
| Resource feasibility | Medium-high: concurrency and policy edge cases are extensive, but the runtime change is bounded to one owner plus four fields. |

Reference class: PR #61 shared-cache TTL/purge and PR #63 persisted-fragment age. This feature is medium-sized relative to those cache-policy changes; the hard part is race verification, not file count. No external-team dependency or fixed delivery date exists. The critical path is specification/threat model → red tests → central state machine → owner/pipeline integration → review/docs/package delivery.

### 3. Public Configuration and Compatibility

The exact public field is **staleWindow**.

- Unit: milliseconds, matching ttl.
- Participating owners: data-model, html-model, tss-model, and ui-manifest-model only.
- Default: 0.
- Valid enabled value: a finite number greater than or equal to zero.
- Compatibility default: an absent or undefined staleWindow is interpreted as 0 by the central model so existing third-party promise-cache owners retain expire-then-wait behavior.
- Explicit null, strings, booleans, NaN, negative values, and Infinity are invalid.
- A throwing/inaccessible getter is invalid.
- Every finite nonnegative staleWindow is admitted; strict subtraction-based predicates never evaluate ttl + staleWindow and therefore do not need a pair-overflow rejection.
- ttl = Infinity ignores staleWindow and never reads it; this preserves the existing explicit non-expiring behavior.
- ttl = 0 retains pending work only and never timestamps or retains a settled value, regardless of staleWindow.
- Invalid or inaccessible staleWindow is interpreted as zero: ordinary TTL freshness remains available, no stale phase is entered, and the post-TTL request performs or joins current replacement work without surfacing configuration access as a framework exception.
- No existing method, singleton, Map, promise/value shape, or method signature is removed or renamed.

The field is read at access time. Runtime increases or decreases to ttl or staleWindow apply to the original successful-settlement timestamp; they never create or slide a timestamp.

### 4. Exact State Machine

For an exact scoped key with public cached promise p and private settled record r:

| State | Predicate | Caller result | Refresh action | Recency |
|---|---|---|---|---|
| Bypass | scoped key is undefined or cache access fails | exact x.load() result | none in shared state | unchanged |
| Cold pending | r.pending is true | exact public p | deduplicated; no second load | existing successful-hit behavior |
| Infinite fresh | ttl is Infinity | exact public p, after existing hit guard | none | touched as today |
| Finite fresh | policy valid and 0 <= age < ttl | exact public p, after existing hit guard | none | touched as today |
| Stale eligible | policy valid, staleWindow > 0, and 0 <= age - ttl < staleWindow | old p/value after required hit guard | start one refresh or reuse its ownership | touched after guard success |
| Hard stale | policy invalid, age invalid/regressing, staleWindow = 0 at age >= ttl, or age - ttl >= staleWindow | never old p | join exact pending refresh if one exists; otherwise detach old and start cold replacement | old generation not touched |
| Settled uncacheable | ttl = 0, invalid TTL/clock settlement policy, or generation detached | returned work may settle for existing callers but is not retained | none | absent |

Boundary rules are strict:

- age < ttl is fresh.
- age = ttl is stale only when staleWindow > 0.
- age - ttl < staleWindow is stale.
- age - ttl = staleWindow is hard stale.
- No ttl + staleWindow arithmetic is used.
- now < settledAt, a different clock identity, a non-finite/negative clock value, or an owner-wide clock regression invalidates the old generation for service.
- Pending cold work remains deduplicated without reading ttl, staleWindow, or the clock, matching current behavior.

Age is absolute and non-sliding. Fresh hits, stale hits, guard execution, refresh start, refresh failure, save time elsewhere, and LRU touch never change r.at.

### 5. Guarded Manifest Timing

The existing x.hit callback remains the cache-hit URL-policy seam for manifest packs. The manifest owner additionally supplies a private x.check(q) collaborator that re-derives its scoped cache key after the awaited guard.

- Every guarded pending, fresh, stale, or hard-reuse caller must successfully await x.hit before consuming shared work.
- In the same continuation after x.hit succeeds, the central model immediately calls x.check(q). The manifest implementation re-runs s.cacheKey(d, c) and requires exact equality with the key captured before get(); absence, mismatch, or derivation failure throws an acquisition-marked error before stale service, refresh, hard-bound join, or public-generation replacement.
- No await or task boundary occurs between the successful key check and the one-shot current-state classification or any resulting x.load() start. Ordinary tenant, origin, per-context base, or singleton-base mutation during the guard therefore cannot publish work acquired under a new scope into the captured key.
- Pending/fresh guarded hits retain their existing pre-guard successful-hit LRU touch for default compatibility. Stale/hard paths do not touch before authorization; if the exact pre-touched generation remains current after the guard, classification does not touch it twice.
- Guard or key-check rejection returns that rejection, does not serve stale and does not start/join a refresh or create refresh metadata; a pending/fresh hit may retain only its existing pre-guard recency touch.
- An initial hard classification without refresh ownership is a miss: it detaches that exact generation and starts the guarded consumer's normal validated loader without a second policy classification that could turn it into unguarded reuse.
- Because a guard can await, the central model resolves the current o.c and performs exactly one current-key classification after authorization. It does not recursively await another hit guard.

| State observed after guard and exact key check | Required transition |
|---|---|
| Original generation remains pending, infinite, or finite fresh | Reuse the original public promise and apply the existing successful-hit recency rule |
| Original generation remains stale eligible | Touch it, start or observe its one refresh, and return the original stale generation |
| Original generation is hard with a refresh still owned | Never return old; the guarded wrapper adopts the exact underlying refresh work/value |
| Original generation is hard without refresh ownership | Detach only that exact generation and start the unchanged cold acquisition |
| Its exact refresh was published while the guard awaited | Classify and reuse the published promise/record; never start a duplicate load |
| A different recognized generation is current | Classify that generation once under the completed authorization; never remove it merely because identity changed |
| An untracked newer public promise is current | Preserve it unchanged and return a direct uncached x.load() result; do not infer age or ownership |
| Current Map/key is detached or absent | Never return the detached original; start one normal cold insertion in the current Map |
| The observed refresh rejected while the guard awaited | Classify the still-current original without refresh ownership; retry once if still stale eligible, otherwise follow its hard transition |

- A stale recency touch occurs only for the generation actually served after guard/check success.
- A hard-boundary caller that joins an already-authorized manifest refresh still runs its own hit guard and exact key check before reusing that process-local work.
- A guard rejection by one caller does not cancel a refresh already authorized and started by another caller; it only prevents the rejecting caller from consuming cache state.
- Root-local prepared indexes, required/optional lookup policy, and root supersession remain above and unchanged by the shared pack acquisition state.

### 6. Refresh Ownership and Atomic Publication

Refresh metadata extends the exact existing private record and remains reachable only through the WeakMap keyed by the current public cache Map. Conceptually, one settled record may hold one refresh descriptor containing the exact refresh promise and an opaque generation token.

- The public Map continues to contain the stale promise p while stale may be served.
- Starting refresh calls the unchanged x.load() exactly once and records its exact promise privately.
- Sequential and concurrent stale callers return the same stale generation; they do not replace the public Map with the refresh while stale service is allowed.
- Synchronous loader throws and asynchronous refresh rejections are handled equivalently: clear only exact refresh ownership, internally observe the failure, keep the original timestamp unchanged, and allow a later eligible access to retry.
- No timer, backoff, hidden loop, or synthetic timestamp follows failure.
- At or after the hard boundary, an unguarded caller returns the exact in-flight refresh promise instead of the old p and instead of starting duplicate work. A guarded caller returns its authorization wrapper, which adopts that exact underlying refresh work/value but cannot be promise-identical to it.
- On refresh fulfillment, publication first verifies the current owner Map, exact key, old public promise, old record, refresh promise, and refresh token are still identical.
- Successful publication samples the current TTL clock only after fulfillment. It atomically replaces public c[key] with the exact refresh promise, installs a settled record timestamped at that successful completion, and preserves the key's current deterministic LRU position.
- staleWindow validity governs only stale service, not whether an otherwise valid successful acquisition can receive or retain its TTL timestamp. A subsequently invalid staleWindow behaves as zero while the original TTL remains fresh.
- If current TTL/clock cannot produce a valid settlement timestamp, fulfillment remains visible to existing refresh followers but neither old nor replacement is retained.
- Refresh rejection is given an attached rejection handler immediately so a stale-returning request cannot cause an unhandled-rejection process event.

### 7. Invalidation, Bounds, and Failure Atomicity

All ownership checks resolve o.c at completion time and compare exact identities; completion callbacks do not retain an obsolete host Map as an authority.

- Exact purge removes the public old generation and its refresh descriptor from future acquisition-cache participation.
- purgeAll clears the public acquisition Map and its weak metadata.
- LRU eviction forgets the exact record and refresh descriptor before deleting the key.
- Cache-Map replacement plus reset detaches old metadata and owner clock observations.
- A newer/manual insertion at the same key fails exact public-promise and record-token checks.
- Detachment does not cancel or abort already-started loader work; existing followers may still observe its outcome.
- Late refresh success may still resolve promises already returned to hard-boundary followers, but cannot reinsert, delete, timestamp, or replace current cache state after any detachment.
- Acquisition invalidation cannot revoke a value already returned to a render, a root-local prepared manifest index, or derived HTML already published into the separate UI cache/persistence owner.
- Refresh failure clears only its matching descriptor and cannot clear a newer refresh.
- A successful refresh replaces one existing key, so it does not increase Map size. Cold insertion continues to enforce max with the existing deterministic oldest-key loop.
- Private refresh metadata is at most one descriptor per retained cache record, therefore O(max) and weakly released with the Map.
- Outstanding detached loader promises are not bounded by max: repeated purge/eviction/map replacement can leave more in-flight work until each loader settles. The cache stores no explicit render context, but an unchanged loader promise may retain its captured request/render inputs.
- Fresh/stale classification, Map lookup, and refresh ownership remain O(1). There is no scan or scheduled work.
- A stale hit updates LRU recency because it is a successful cache service; this matches existing hit semantics. Refresh start/failure/publication does not add an independent recency touch.

### 8. Isolation and Unchanged Acquisition Paths

An undefined scoped key remains a strict bypass before any shared-state read.

- Bypass invokes only x.load().
- It does not read o.c, ttl, staleWindow, max, metadata, hit guard, or clock.
- It does not start/join refresh, update recency, evict, deduplicate, purge, or mutate shared state.
- Malformed, inherited, cyclic, delimiter-bearing, missing, and otherwise untrusted scope remains rejected by the unchanged request-model/cacheKey path.
- Explicit tenant, origin, and base components remain distinct parts of the composite identity.
- Data, HTML, and TSS refresh call their unchanged request and parse loaders.
- Manifest refresh calls the unchanged request, text acquisition, digest, schema, pack-bound, required/optional, and supersession paths.
- No request URL, SSRF, response, parser, compiled UI, or published value shape changes.

### 9. Rendered-Fragment Exclusion

@jtorm/ui-cache-model is not a get() SWR participant and gains no staleWindow field.

Its nested live HTML cache, order Map, handler/event leases, persisted wire version 1, exact byte/settledAt pairing, migration boundary, plugin timing, save-adapter envelope, restore rules, and rollback behavior remain byte-for-byte/behaviorally unchanged. Tests will pin these surfaces. Background fragment rendering remains a separate future design because it crosses lifecycle and persistence ownership.

A normal render may nevertheless consume stale data, HTML, TSS, or a manifest-derived root index and publish derived HTML into the existing UI cache with that fragment's own successful-publication settledAt. If persistence is enabled, the unchanged save path may persist that derived HTML. This is a downstream consequence of serving stale acquisition data, not UI-cache SWR or a wire change.

Therefore the acquisition hard boundary limits only future acquisition-cache service. It does not shorten the independent UI TTL, revoke an already prepared root/index, or retroactively remove returned/derived values.

### 10. Non-Functional and Operational Requirements

#### Privacy and confidentiality

Enabling staleWindow increases how long acquired bytes may be served from a process-local cache beyond ttl. Data responses can contain tenant-sensitive or personal data; HTML/TSS may also encode tenant-specific presentation. Therefore:

- staleWindow remains zero by default and is an explicit host policy per acquisition owner.
- Existing tenant/origin/base discrimination is mandatory and unchanged.
- Hosts choose windows according to data sensitivity and revocation freshness; a low-latency preference cannot silently override a confidentiality or deletion requirement.
- Exact/full acquisition purge is immediate only for future use through that acquisition cache. It cannot revoke values already returned, root-local indexes, rendered fragments, or persisted fragment envelopes.
- A normal render can copy or transform stale acquisition content into derived HTML whose independent UI-cache age begins at successful fragment publication and may outlive the acquisition hard deadline.
- A sensitive rollback must set staleWindow to zero, purge affected acquisition keys, dispose/recreate affected render roots or prepared manifest indexes, purge affected UI fragments through the existing UI-cache API, and clear/save the external persistence envelope according to the host's existing adapter lifecycle.
- Private refresh metadata and acquisition promises remain process-local and are not serialized or logged by this feature; derived fragment persistence remains the existing separate owner and wire.
- Manifest packs are expected trusted static assets, but still retain URL-policy, digest, schema, and bounds checks.

Residual privacy risk: an authorized process can serve a previously authorized value during the configured window after its source changes, and an ordinary render can derive a fragment with a later independent retention deadline. This explicit tradeoff is accepted only by the host setting a positive window and coordinating downstream invalidation. Re-evaluate the threat model before enabling it for authentication/authorization data, secrets, regulated-data-specific caches, or any new trust boundary.

#### Availability and latency

- Eligible requests receive settled stale acquisition data without awaiting the refresh.
- Exactly one acquisition runs per stale generation at a time.
- At the hard boundary, old data is unavailable and callers wait on the current refresh or one cold replacement.
- A failed refresh does not poison the old value before its existing hard deadline.
- After refresh failure, the next eligible access may retry immediately. This deliberately has no framework backoff; rapid repeated failures can increase source load, so positive windows rely on existing request/transport capacity controls.
- staleWindow = 0 is the runtime kill switch and compatibility rollback. ttl = 0 is pending-only; ttl = Infinity remains non-expiring.

#### Refresh-error observability

The promise-cache model owns correctness and unhandled-rejection prevention, not telemetry. Refresh uses the unchanged loader/request path, so transport attempts, request metrics, and source errors remain observable at the existing injected transport/loader seam. The cache attaches an internal rejection observer because the stale-serving caller does not await the refresh.

No new logging callback, metric schema, retry signal, or monitoring dependency is added. A host that requires direct refresh-failure metrics must instrument its existing transport/loader seam before enabling a positive window. The documented limitation is that the stale-serving call itself reports success and does not surface the background rejection to that caller.

#### Serverless execution

Refresh is request-triggered and best-effort. Some hosts freeze or terminate execution after returning a response. jTorm does not call a platform-specific waitUntil, queue API, or durable scheduler and does not guarantee that a refresh completes, survives process shutdown, or becomes visible to another process. If execution freezes, the current process may keep the stale generation until its hard boundary and a later access/instance may retry. Documentation must not imply durability, delivery, or cross-process coherence.

#### Resource and performance bounds

- Time: O(1) Map/metadata work per access; one optional loader call on stale transition.
- Space: public cache and its private metadata remain O(max), with at most one refresh descriptor per retained record.
- Outstanding work: max does not bound detached loader promises or the request/render inputs they may retain until settlement.
- Network/cost: no scheduled calls; at most one concurrent refresh per exact retained generation, but repeated generation churn can leave multiple detached acquisitions in flight.
- Host precondition: where slow or hung acquisitions matter, a host must configure finite transport lifetime and source/concurrency controls before enabling a positive window; request-model's unchanged default timeout of zero is not a cancellation guarantee.
- CPU: policy/identity checks are constant; a stable-generation guarded stale path uses at most two clock reads, while a changed generation is reclassified once.
- Bundle/dependencies: zero runtime dependency/import additions and no new build system.
- Public public-cache shape: unchanged Map<key, Promise>.

### 11. Affected Components and Ownership

| Component | Planned change | Explicitly unchanged |
|---|---|---|
| src/models/promise-cache-model | Central finite-window policy, phase classification, one-refresh coordination, guarded check/current-state transition, exact publication/invalidation | Export singleton, CommonJS/DI, Map shape, cold pending semantics, restore/fresh UI-cache helpers |
| src/models/data-model | Add staleWindow = 0 field and package/readme metadata | cacheKey, request loader, parse/result shape |
| src/models/html-model | Add staleWindow = 0 field and package/readme metadata | cacheKey, request loader, HTML result |
| src/models/tss-model | Add staleWindow = 0 field and package/readme metadata | cacheKey, request loader, parser path/AST |
| src/models/ui-manifest-model | Add staleWindow = 0 and private post-guard x.check(q) exact-key validation | Request-key derivation, URL guard, request/digest/schema/bounds, root-local index, required/optional behavior |
| tooling/ui-manifest-compiler | Regression test only | Embedded runtime manifest version remains 1.0.0 and deterministic content-addressed output remains byte-stable |
| test/helpers/engine.js | Reset the four stale windows; optional deterministic test configuration | UI-cache persistence/config and production host contract |
| policy/source guards | Ratchet policy owner, versions, and dependency floors | Dependency-free src and ownership boundaries |
| UI cache/plugin tests | Regression assertions only | Runtime package and persisted wire |
| root/AGENTS/backlog/records | Document opt-in policy, exclusions, caveats, completion | Architecture weakness #12 remains closed; HTTP validators remain open |

No database, route, schema, frontend, mobile, queue, payment, AI, authentication, authorization, or new external-service component is affected.

### 12. Dependencies and SemVer

No third-party dependency is added or updated. The existing lockfile remains the only dependency inventory, and dependency audit/Semgrep gates still run.

Planned minor releases:

| Package | From | To | Reason |
|---|---:|---:|---|
| @jtorm/promise-cache-model | 1.0.3 | 1.1.0 | New opt-in central behavior and public helper surface |
| @jtorm/data-model | 1.0.7 | 1.1.0 | New public staleWindow field and dependency floor |
| @jtorm/html-model | 1.0.7 | 1.1.0 | New public staleWindow field and dependency floor |
| @jtorm/tss-model | 1.0.8 | 1.1.0 | New public staleWindow field and dependency floor |
| @jtorm/ui-manifest-model | 1.0.3 | 1.1.0 | New public staleWindow field and dependency floor |

The four acquisition consumers will require @jtorm/promise-cache-model ^1.1.0. @jtorm/ui-cache-model remains 2.0.0 and retains its existing promise-cache range because its runtime behavior is untouched and it does not call get().

The @jtorm/ui-manifest-model package version changes only in package.json. Its exported runtime wire/compiler version remains exactly 1.0.0; the build-only compiler continues to embed that unchanged value, and compiler determinism/output regression tests are release gates.

Publication/deployment order is promise-cache 1.1.0 first, then the four 1.1.0 consumer packages, then host configuration. Rollback starts with staleWindow = 0 and acquisition purge; sensitive content also requires the documented root/UI/persistence invalidation before consumer packages roll back ahead of the central package. A positive window is never required for compatibility.
Dependency map:

- [x] Depends on merged discriminator, TTL/purge, and persisted-age contracts from PRs #59, #61, and #63.
- [x] Depends on the existing request-model scope/URL-policy and injected acquisition loaders.
- [x] No third-party/external delivery dependency.
- [x] Does not block or implement HTTP validators; that remains the next independent P4 item.
- [x] Consumer publication follows central package publication.

### 12A. API Contract

No network endpoint, request/response schema, status code, header, event, or persistence wire changes.

| Surface | Contract |
|---|---|
| Four acquisition singleton objects | Add mutable numeric staleWindow, default 0 milliseconds |
| promiseCacheModel.get(o, q, x) | Signature unchanged; default/missing window preserves existing behavior |
| Optional guarded x.check(q) collaborator | Runs only after successful x.hit and immediately before one-shot current-state use; absent remains compatible |
| Public acquisition cache | Remains exact Map<key, Promise> |
| Purge/reset methods | Signatures/return values unchanged; now also detach private refresh ownership |
| Successful values | Exact existing data/HTML/TSS/manifest value shapes and identities |
| UI cache | No field, method, wire, or behavior change |

### 12B. Trade-offs Considered

| Decision | Alternatives considered | Why this one |
|---|---|---|
| Per-owner staleWindow | Global flag; per-call argument; hardcoded window | Matches existing ttl/max ownership, permits sensitivity-specific host policy, and leaves default dormant |
| Missing/undefined means zero | Treat absence as invalid | Preserves patch-level compatibility for published promise-cache consumers while all in-repo owners declare zero |
| One central state machine | Duplicate SWR in four owners | Keeps phase, clock, generation, failure, and purge policy in its existing owner |
| Keep stale p public until refresh success | Put refresh promise in public Map at start; wrap entries | Preserves Map shape and permits stale callers to keep exact old generation |
| Private exact refresh descriptor | Export refresh state/callback API | Maintains information hiding, O(max) bounds, and generation-safe publication |
| Access-triggered refresh | Timer, sweep, cron, queue, worker | Zero dependencies/state outside request access and no unbounded scheduled work |
| Timestamp at fulfillment | Timestamp at refresh start | Measures actual successful value age and prevents slow/failed refresh from shortening or extending incorrectly |
| Stale service touches LRU | Do not touch; refresh touches | A stale return is a successful cache hit; publication/failure should not independently bias eviction |
| Immediate request retry after failure | Timer/backoff/circuit breaker in cache | Required bounded contract; avoids a hidden retry framework and lets existing transport own availability controls |
| Guard/key check then one-shot current classification | Guard only; recursive re-entry | Async policy cannot authorize old-scope or detached data, and current/newer work is not accidentally removed |
| Exclude rendered fragments | Reuse acquisition SWR for UI cache | Fragment refresh crosses handler/event/publication/persistence owners and requires a separate design |
| Model downstream derivatives | Claim acquisition purge revokes all consumers | Truthfully separates future acquisition participation from root/UI/persistence invalidation without changing those owners |
| Defer HTTP validators | Combine conditional requests with SWR | Keeps acquisition age policy independent from wire validators and prevents a multi-owner scope expansion |

### 12C. Blast Radius

| Dimension | Answer |
|---|---|
| Direct dependencies | Existing request-model cacheKey/URL policy, four acquisition Maps/loaders, promise-cache clock/weak metadata, native manifest digest/validation |
| Direct dependents | Data/HTML/TSS consumers, get-method manifest lookup, root-local manifest preparation, render/UI-cache publication and optional persistence, host DI/reset harness, external hosts reading public cache fields |
| Cascade on outage | With positive window, eligible callers receive old data until hard boundary; then callers join/fail unchanged acquisition. With default zero, behavior is identical to today |
| Cascade on slow | One refresh per retained generation remains in flight; eligible stale callers do not queue behind it and hard callers share it, while churn may leave detached work until host-bounded transport settlement |
| Cascade on bad data | Data/HTML/TSS follow unchanged source/parser behavior; manifest replacement cannot publish before unchanged digest/schema/bounds checks; old acquisition service ends at its hard boundary but already-derived root indexes/fragments retain their independent lifecycle |
| Compromised-session impact | Cache grants no authority; an already authorized exact scope can read only its own prior acquisition through its configured window; malformed/unscoped authority bypasses shared state |
| Fault isolation boundary | Exact process-local Map/key/promise/record/refresh generation bounds acquisition ownership; purge/reset detach it, while returned values, root-local indexes, and UI fragments are explicitly separate downstream invalidation domains |

### 12D. Rollback Plan

| Item | Answer |
|---|---|
| Code rollback | First set all four staleWindow values to 0; purge affected acquisition keys; for sensitive content dispose affected roots, purge UI fragments, and clear/save external persistence; then roll consumer packages back before @jtorm/promise-cache-model |
| Schema rollback | N/A: no database/schema/migration |
| Data rollback | No new schema or wire exists, but ordinary renders may have persisted derived HTML through wire v1; sensitive rollback uses existing UI purge plus persistence clear/save and root disposal before package rollback |
| Auto-rollback trigger | N/A in the dependency-free framework: package deployment is dormant at default zero and no telemetry/config automation is added. Hosts own thresholds; any scope/hard-boundary violation requires zero plus coordinated acquisition/downstream invalidation |
| Manual rollback runbook | Root/package README sequence: set zero → acquisition purge → dispose/recreate affected roots → UI purge and persistence clear/save when sensitive → consumer rollback → central rollback |
| Last rollback drill | Automated zero-window, purge, reset, late-completion, and package-compatibility verification PASS on 2026-07-19; first host enablement must still reuse its normal deployment rollback drill |



### 13. Security Design and STRIDE Link

The authoritative pre-code threat model is feature-reviews/stride-request-triggered-stale-while-revalidate.md. It contains the DFD, asset classification, threat actors, all six STRIDE categories, attack tree, controls, test linkage, and residual-risk acceptance.

Material controls incorporated into this plan:

- Spoofing: no new identity source; only exact request-model scoped keys participate, and manifest guarded reuse re-derives the captured key immediately before current-state use.
- Tampering: manifest URL guard plus exact key check run before stale service/refresh; replacement still passes unchanged acquisition/digest/schema/bounds paths; exact generation tokens prevent late overwrite.
- Repudiation: no new user mutation or security decision; existing transport instrumentation remains the attempt record, and documentation explicitly states no new cache telemetry.
- Information disclosure: positive acquisition retention is opt-in and scope-isolated; derived rendered fragments may have an independent persisted lifetime, so sensitive rollback coordinates every downstream owner.
- Denial of service: metadata is max-bounded and one refresh is owned per retained generation, while detached work requires host transport lifetime/concurrency controls; checks remain O(1) with no timers/loops/backoff.
- Elevation of privilege: no authority is carried by a stale value; manifest guard is re-run per reuse, unscoped calls bypass, and no cross-key/process publication occurs.

Full PASTA/deep-dive applicability was re-evaluated after modeling personal data and downstream persistence. It remains N/A under the exact feature-dev trigger because there is no payment or new trust boundary; full STRIDE, the attack tree, and mandatory privacy review cover the existing-boundary retention change.

### 14. Risk Register

| ID | Risk | Probability | Impact | Owner | Mitigation / contingency |
|---|---|---|---|---|---|
| R1 | Old generation republishes after purge, eviction, reset, map replacement, or newer insertion | Medium | High | promise-cache owner | Exact Map/key/promise/record/refresh-token checks; late-completion tests for every invalidator |
| R2 | Manifest guard or captured scope is bypassed during an async phase/key change | Low | High | manifest + promise-cache owners | Guard, immediate exact cache-key re-derivation, one-shot current-generation table, mutation/race tests |
| R3 | Positive window plus derived fragment lifetime retains tenant-sensitive bytes longer than intended | Medium | High | host configuring cache | Default zero, exact scope, coordinated acquisition/root/UI/persistence rollback, privacy docs |
| R4 | Fast refresh failure causes request-triggered retry pressure | Medium | Medium | host transport owner | One concurrent refresh per retained generation, no hidden loop/timer, existing request caps/metrics, zero-window kill switch |
| R5 | Serverless host freezes refresh after returning stale | High in such hosts | Medium | host integration owner | Best-effort caveat, no durability claim, later request retries, choose zero window where completion is required |
| R6 | Runtime policy/clock mutation extends age accidentally | Medium | High | promise-cache owner | Invalid-window zero fallback, overflow-free subtraction, absolute timestamp, deterministic boundary/regression tests |
| R7 | Generic promise-cache consumer without the new field loses compatibility | Low | High | promise-cache owner | Missing/undefined means zero; minor SemVer; existing TTL suite unchanged |
| R8 | A fragment derived from stale acquisition content outlives the acquisition deadline | Medium | High | host + UI-cache owner | Explicit independent-lifecycle contract, existing UI purge/persistence controls, wire/timestamp/save/plugin regression tests |
| R9 | Background rejection becomes unhandled or deletes newer state | Medium | High | promise-cache owner | Immediate rejection observer and exact refresh-token cleanup tests |
| R10 | Stale LRU semantics become nondeterministic | Low | Medium | promise-cache owner | Touch only successful stale service, preserve Map order at publication, explicit eviction tests |
| R11 | Purge/churn detaches slow refreshes faster than they settle, retaining work/contexts beyond max | Medium | High | host transport owner | Default zero, finite transport lifetime/concurrency precondition, no durability/cancellation claim, detachment tests |

Assumptions: cache loaders continue to return promises; configured clocks remain nondecreasing; request-model scoping remains the authority; host positive windows are deliberate policy and use finite transport lifetime/concurrency controls where hung work matters. Known unknown: host-specific post-response execution lifetime cannot be solved portably in this bounded feature and is an explicit operational caveat rather than hidden framework behavior.

### 15. Implementation Plan and Checkpoints

1. **Threat/spec gate:** finalize this specification and the linked STRIDE record; obtain independent code-explorer and code-architect review; incorporate every valid finding.
2. **Checkpoint 1 — red tests/scaffold:** add focused promise-cache SWR behavior tests first and run the age-equals-TTL case to observe the current wait/new-promise failure for the right reason. Add owner/manifest/pipeline/UI regression test skeleton only as real failing assertions, never placeholders.
3. **Checkpoint 2 — central core:** implement finite stale-window policy, phase classification, unguarded stale service, one-refresh state, hard-bound joining, fulfillment publication, and rejection observation in promise-cache-model.
4. **Checkpoint 3 — edge safety:** implement guarded async URL/key revalidation and the one-shot transition table, invalid-window/clock handling, overflow-free boundaries, sync throw equivalence, purge/eviction/map/reset/newer-generation detachment, detached-work non-publication, and deterministic recency/max behavior.
5. **Checkpoint 4 — integration:** add staleWindow fields, host reset/test option, package dependency floors, owner/pipeline behavior, unchanged UI-cache wire proof, and explicit downstream-derived retention/rollback documentation.
6. **Verification:** run focused suites, exact npm test, typecheck, syntax/source guards, JSON/JSONL checks, package dry-runs, dependency audits, Semgrep, git diff --check, and the requested review-skill loop.
7. **Documentation/delivery:** update READMEs, root docs, AGENTS policy boundary, split P4 backlog, records and versions; open a ready PR into dev; wait for current-head green CI and clean Codex review with zero unresolved threads; do not merge.

Every checkpoint is independently verifiable and updates this state file. No implementation source is edited before the red test has been observed.

### 16. Red-First Test Matrix

#### Central promise-cache behavior

- At age exactly ttl with a positive window, prove pre-change code removes p/returns replacement; after change, the caller receives old p/value immediately and one refresh begins.
- Exact age boundaries: below ttl, equal ttl, one unit below hard, equal hard, and beyond hard.
- Many sequential stale calls and Promise.all concurrent stale calls share one old generation and one refresh.
- Refresh success publishes exact refresh promise/value and timestamps only at fulfillment.
- Refresh start, fresh/stale hits, unrelated save time, and refresh failure never slide old at.
- Hard-bound callers never receive old; unguarded callers join the exact pending refresh promise, while guarded callers adopt the exact underlying work/value through their authorization wrapper.
- A side-effecting TTL getter cannot turn an initial guarded hard miss into a second-classification cache reuse without `hit()`.
- Failure is internally observed; old remains eligible only to original hard boundary; next eligible access retries.
- Synchronous loader throw is equivalent to async rejection and does not escape a stale-serving call.
- staleWindow zero, absent/undefined default, invalid/throwing values as zero-window with TTL freshness preserved, and a maximum finite window.
- ttl zero, ttl Infinity, invalid ttl, throwing/non-function/non-finite/negative/future/regressing/different clocks.
- Runtime shorter/longer ttl and window reclassify from the original timestamp.
- Pending cold dedupe, fresh promise identity, public Map identity, max, and deterministic recency remain.
- purge, purgeAll, LRU eviction, map replacement, reset, newer insertion, same-promise reuse, and late completion cannot resurrect state.
- Repeated detachment may leave loader promises outstanding but never lets detached work count as current ownership or publication; tests settle every deferred to avoid suite leaks.

#### Acquisition-owner and isolation behavior

- Data, HTML, TSS, and manifest owners expose default zero, reset to zero in their helpers/harness, delegate their unchanged loaders, and use positive configured windows.
- Unscoped/malformed same-identity calls do not consume stale, join/start refresh, read clock/policy, touch metadata/recency, or affect the scoped cache.
- Explicit tenant, origin, and base scopes remain distinct.
- Manifest stale service and refresh require URL-policy success.
- Manifest guard rejection returns rejection, starts no refresh, and serves no stale.
- Deferred stale/hard guard mutation of tenant, origin, per-context base, or singleton base fails the exact captured-key check and performs no stale service, refresh, hard join, recency touch, or publication under the old key; pending/fresh keeps only its existing pre-guard touch.
- Async guard crossing the hard boundary returns/joins fresh work, not old.
- Deferred guard tests cover every transition-table row: stable pending/fresh/stale/hard, refresh publication, different recognized generation, untracked newer promise, purge/eviction/reset/map replacement absence, and refresh rejection; detached work is never returned or refreshed and newer work is never removed merely because identity changed.
- Manifest request/digest/schema/bounds failure never installs replacement; required/optional/root supersession remain unchanged.
- Manifest runtime version stays exactly 1.0.0 and compiler output remains deterministic despite the package minor release.

#### Pipeline and excluded UI regression

- A scoped acquisition consumer receives one old generation while request-triggered refresh sees changed source; a later root/request receives the replacement.
- An unscoped request with the same apparent identity neither consumes nor refreshes scoped state.
- UI rendered fragments gain no staleWindow field or SWR policy and retain their unchanged independent TTL/publication behavior.
- Pipeline/regression proof records that a normal render may derive/persist HTML from stale acquisition content with a later UI settledAt, and that acquisition purge alone does not revoke that downstream state.
- Persisted wire version 1, HTML/settledAt byte pairing, timestamps, save payload, reload, migration/rollback boundary, and plugin save timing remain unchanged.

Tests use injected deterministic clocks/deferred promises and no wall clock, network, randomness, or order dependency. Assertions target public results/state and documented Map identity, not incidental helper call order.

### 17. Verification and Definition of Done

The feature is complete only when all of the following are true:

- The pre-code threat/spec/design gates pass and implementation matches them.
- The first SWR behavior was observed red before runtime implementation, then all focused tests pass.
- Exact npm test and npm run typecheck pass using the repository's documented commands.
- Every changed JavaScript file passes syntax checks; dependency-free/DI, require/import, package ownership, and no-handwritten-TS declaration guards pass.
- JSON and JSONL delivery records parse.
- Every changed published package passes npm pack --dry-run and contains no unintended artifact.
- Dependency audit and requested Semgrep analysis have no valid blocking finding.
- git diff --check is clean and the diff contains no placeholder, suppression, debug, secret, unrelated cleanup, or accidental generated file.
- review-router, review-architecture, differential-review, review-refactor, insecure-defaults, safety-friction-audit, review-privacy, review-infrastructure, threat-model applicability, tech-debt-ratchet, source-ratchet applicability, Semgrep, and production-readiness have zero unresolved valid findings.
- All exact ten feature-dev dimensions score 10/10 and a fresh verification review confirms 100/100.
- Package/root/architecture/backlog/threat/delivery documentation is current; only SWR is marked complete and HTTP validators remain open.
- A non-draft ready PR targets dev, current-head CI is green, current-head Codex review is clean, unresolved review threads are zero, and the PR remains unmerged.

### 18. Open Questions and Product Decisions

No product-level question remains.

Decisions fixed by this specification:

- Public name is staleWindow.
- Unit is milliseconds.
- Missing/undefined and other invalid/inaccessible values behave as zero-window while preserving ordinary TTL freshness.
- Stale successful service updates LRU recency after required guard success.
- Private pending refresh is not installed in the public Map until successful fulfillment.
- Unguarded hard callers join that exact private refresh; guarded callers join its exact underlying work/value through their required authorization wrapper.
- Refresh errors are observable through existing acquisition seams, not a new cache telemetry API.
- Serverless completion is best-effort.
- Rendered-fragment SWR and all HTTP validators are excluded; ordinary downstream derivatives remain explicitly modeled.

### 19. Plan Quality Gate

**Scope tags:** SECURITY, INFRA
**Gate status:** PASS; both independent Design Mode reviews complete and all ten findings incorporated
**SQL pre-review:** N/A; no database/query/schema change
**Frontend review:** N/A; no UI/CSS/PWA change
**Route/API security test:** N/A; no endpoint or route change
**Threat-model deep dive:** Re-evaluated after personal-data/downstream findings; N/A under the exact trigger because there is no payment or new trust boundary
**STRIDE status:** reviewed and complete in the linked pre-code model, 6/6 categories, async/downstream DFD, and attack tree
**Baseline evidence:** 214/214 focused tests pass on untouched base
**Independent review evidence:** code-explorer reported five findings and code-architect reported five; all were accepted, with promise identity and generation races independently corroborated

Personas read and applied:

- architect/planner/backend-architect: one deep DI policy owner, explicit dependency order, atomic generation/key checks, metadata versus outstanding-work bounds, downstream rollback, red-first verification.
- code-review-enforcer: exact existing naming/style, minimal public surface, no new imports/dependencies, no unrelated refactor, all race/error branches tested.
- Elysia expert: route/validator/macros are N/A because there are no routes and project AGENTS overrides its generic stack.
- Bun expert: no Bun-specific runtime/dependency adoption; retain Node built-in test runner and dependency-free runtime.
- TypeScript pro: hand-written TypeScript/declarations are forbidden here; public numeric policy is pure JS/JSDoc-compatible and existing typecheck scope stays unchanged.
- security-architect/threat-modeling-enforcer: full STRIDE, attack tree, async key drift, downstream personal-data derivatives, scope isolation, test-linked controls before code.
- platform-engineer: one owned refresh per retained generation, explicit detached-work limits, best-effort serverless caveat, no durable-work claim, zero-window kill switch, deployment/rollback order, existing-seam observability.
- tdd-guide: observable behavior first, deterministic deferred promises/clocks, RED → GREEN → refactor, no placeholders or internal mocks.
- database-architect: N/A and not installed; no database surface exists in scope.

Mandatory checklist disposition:

- Applicable and planned: domain architecture, complexity/maintainability, runtime async safety, code quality, type-safety adaptation for pure JS, error propagation, tests/TDD quality, injection/SSRF preservation, dependency security, secrets/no-sensitive logging, threat modeling, operations, observability limitation, deploy safety, Cloudflare/serverless limits, cost bounds, planning rigor.
- N/A with scope evidence: authentication, authorization, zero-trust control-plane design, cryptography, headers/CORS/cookies, API inventory, audit mutation trails, mobile, queue messaging, AI/LLM, RLS, secret rotation, DB migration/Postgres performance, email, and new service SLO resources. No corresponding surface changes.

| Dimension | Score | Plan evidence |
|---|---:|---|
| Architecture | 10/10 | One central DI owner; four opt-in consumers; UI/render/persistence boundary explicit |
| Consistency | 10/10 | Existing ttl/max/Map/singleton/purge conventions and terse CommonJS style preserved |
| Type Safety | 10/10 | Finite-number policy contract; no any/casts/hand-written TS; public shapes unchanged |
| Validation | 10/10 | Explicit config/clock/phase validation, overflow-free subtraction, and unchanged manifest/request validation |
| Error Handling | 10/10 | Sync/async failure equivalence, observed rejection, exact cleanup, hard-bound behavior |
| Security/Privacy | 10/10 | Full STRIDE, guard plus exact key epoch, default zero, downstream derivative lifecycle, coordinated purge/rollback |
| Performance | 10/10 | O(1), O(max) metadata, one owned refresh per retained generation, detached-work host controls, no scans/timers |
| Maintainability | 10/10 | One state machine, no duplicated owner logic/framework/dependency, explicit one-shot transition helpers |
| Testability | 10/10 | Red-first deterministic unit/owner/pipeline/regression matrix covers every contract |
| Readability | 10/10 | Documented phase codes/policy, boundary table, overflow-free predicates, minimal public field |
| **Total** | **100/100** | **Plan-level self-review passed** |

### 20. Specification Approval

The continuation handoff explicitly directs autonomous progress after the specification is complete and self-reviewed, pausing only for a genuine unresolved product choice. Section 18 records none. Both independent reviews are complete; all ten findings, including the two corroborated race/identity findings, are incorporated into this specification and linked threat model. The implementation contract is approved without an additional user pause.
