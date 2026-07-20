# STRIDE and PASTA Threat Model: Request-Triggered Rendered-Fragment SWR

**Status:** MERGED — PR #74; HIGH/BLOCKER CONTROLS VERIFIED, HOST RESIDUALS DOCUMENTED
**Date:** 2026-07-19
**Scope:** opt-in request-triggered stale-while-revalidate for persisted/process-local rendered UI fragments
**Specification:** `feature-reviews/rendered-fragment-swr-implementation.md`
**Base:** `origin/dev` at `8b821b2cdefc5c124c753fc79c9493ca6f340aa7`

This model preceded runtime work and drove the red-first controls. Its prospective analysis is
preserved below; the final implementation verification addendum supersedes the earlier
documentation-only/blocking disposition. Framework-owned replay remains rejected. The shipped
boundary is the candidate described here: host-owned isolated lifecycle/session authority plus
cache-owned exact-generation publication.

## Enforcer Triage

**Decision:** `PASTA_REQUIRED`

**Flow:** a stale authorized fragment lookup returns retained HTML while a separate session renders, validates, publishes, and optionally persists a replacement.

**Reason:** the preferred alternative crosses multiple boundaries (request authority -> shared cache -> host session -> arbitrary method/plugin effects -> cache publication -> external save adapter) and may carry confidential tenant/user HTML. The business impact ranges from duplicate mutations and cross-tenant disclosure to persistent resurrection of revoked content. STRIDE per component is necessary but insufficient for chained lifecycle/generation failures.

**In scope:** current fragment lookup/render/publish/save/reload contracts, a naive framework-owned replay, the proposed host session boundary, exact-generation coordination, and downstream retention implications.

**Out of scope:** acquisition SWR, HTTP validators, new endpoints, cryptography, databases, queues, framework timers/jobs, and any concrete platform host implementation.

## Stage 1 — Business Objectives and Assets

### Security objectives

1. Never execute arbitrary lifecycle effects solely for cache maintenance without explicit host authorization.
2. Never serve or publish HTML outside the exact currently authorized tenant/origin/base/language/component/variant scope.
3. Never serve retained HTML at or beyond its strict hard deadline.
4. Never let detached, failed, purged, evicted, reset, reloaded, or superseded work resurrect a generation.
5. Preserve exact HTML/true publication-time pairing across memory and persistence.
6. Keep default/disabled behavior exactly unchanged and expose no hidden background-work guarantee.

### Asset inventory

| Asset | Classification | Business/security value | Required integrity/confidentiality |
|---|---|---|---|
| Rendered fragment HTML | Public through Restricted, host-dependent | May contain tenant/user-specific derived data and directly determines visible output | Exact bytes must remain bound to current scope and original publication time |
| Request discriminator | Confidential security context | Separates tenant, origin, and effective base cache participation | Must be current, own-property-derived, fail-closed, and never treated as transferable authority |
| Language/cid/variant coordinates | Internal | Select exact fragment identity | Must not collide, drift, or be swapped across a lease |
| Process freshness stamp | Internal ephemeral | Enforces strict non-sliding TTL/window under one process clock | Must never be serialized or restored under a different clock identity |
| Unix `settledAt` | Internal integrity-critical | Carries restart-stable original publication age | Must pair with exact bytes and never be synthesized from init/hit/start/save |
| Cache/order/settlement generation | Internal integrity-critical | Prevents old work overwriting newer state | Must be checked atomically at publication |
| Lifecycle callbacks and effects | Restricted capability | May mutate host state, call transports, collect analytics, or affect root/plugin state | Must run only in a host-authorized session and preserve complete lifecycle semantics |
| Foreground view/DOM/context | Confidential/integrity-critical | Represents the active request and root-local state | Background work must not retain or mutate it |
| Wire-v1 envelope | Confidential, host-dependent | Durable exact HTML/timestamp snapshot | Whole-envelope validation and adapter isolation required |
| Persistence-dirty revision | Internal integrity-critical | Records unsaved live publication | Must advance atomically with publication and clear only after matching save success |

### Threat actors

| Actor | Capability | Motivation / failure mode |
|---|---|---|
| Malicious tenant or authenticated caller | Can trigger lookups at chosen times and mutate its own request context within allowed application flows | Cross-scope disclosure, stale retention, resource pressure |
| Compromised session | Holds formerly valid authority and can repeatedly request exact components | Extend visibility after downstream revocation |
| Buggy or malicious host extension | Can register methods/plugins with arbitrary callbacks and mutate injected/singleton state | Duplicate effects, covert data flow, lifecycle bypass |
| Misconfigured host operator | Can set TTL/window, clocks, adapters, and host refresh collaborator incorrectly | Indefinite retention, frozen work, missing save, false durability claims |
| Persistence adapter/operator | Controls external save ordering/failure but not cache authority | Rollback/reordering, stale durable snapshot, error suppression |
| Concurrent ordinary request | No malicious intent; races purge, newer publish, init, or background completion | Accidental resurrection or overwrite |

Risk appetite is zero for cross-scope disclosure, unauthorized lifecycle effects, hard-bound stale service, timestamp fabrication, and generation resurrection. A future host may explicitly accept bounded same-scope stale retention and best-effort post-response completion; no such acceptance is made here.

## Stage 2 — Application Decomposition and Trust Boundaries

### Current foreground flow

```text
[Request/root context]
        |
        | B1: own current discriminator
        v
[ui-cache-plugin.beforeIteration] -> [ui-cache-model.get]
        | fresh HTML                  | hard miss creates exact blocking render lease
        v                             v
[handler-wrapper]
  before iteration -> detached DOM -> handler.dispatch methods -> after iteration
  -> stage HTML -> all completion hooks -> cache commit
        |
        | after view
        v
[ui-cache-model.save] -- B4 --> [arbitrary persistence adapter]
```

### Rejected naive background flow

```text
[stale lookup] -> return old HTML
       |
       +--> framework calls the same handler-wrapper with current/shared view
                 |
                 +--> arbitrary methods/plugins/effects execute again
                 +--> parent/root/singleton state may mutate
                 +--> old blocking lease may overwrite newer publication
```

### Preferred future flow

```text
[Request/root context]
        |
        | B1: current lookup authorization
        v
[UI cache exact retained generation] -- stale HTML --> [Foreground caller]
        |
        | frozen metadata-free one-attempt capability (no authority or coordinates)
        | B2
        v
[Stable DI host + UI cache]
  host authorize(view, coordinates) -> opaque authority
  cache requires current(view, authority, coordinates) === true
  cache synchronously invokes render(view, capability, coordinates, authority)
  host snapshots canonical inputs and creates a separate root/session
  host mints session(view, capability, authority, coordinates)
  cache requires owns(view, session, capability, authority, coordinates) === true
  cache activates the exact capability/root once
        |
        | B3: arbitrary registered lifecycle callbacks
        v
[Full isolated handler/event/plugin lifecycle, including normal UI-cache hooks]
        |
        | private {capability, session, isolated root, authority, exact generation}
        | B4: completion authorization + exact generation
        v
[UI cache combined cache/metadata + root dirty/revision transaction]
        |
        | immutable wire-v1 snapshot
        | B5
        v
[External persistence adapter]
```

The collaborator identity is stable DI configured before `init()`. The cache capability is exactly
`Object.freeze({})` with zero own keys; coordinates, authority, session, scoped key, and generation

### Trust boundaries

| Boundary | Crossing | Existing control | Gap or required control |
|---|---|---|---|
| B1 | Request/context -> shared cache | Fail-closed `cacheContext()` and current discriminator on lookup/completion | Must also run for refresh session creation and every hard join; captured key is not authority |
| B2 | Cache lease -> host background capability | No current boundary/capability | Explicit injected collaborator, opaque exact lease/execution capability, synchronous snapshot, host-owned authority epoch, no retained/mutated foreground `v` |
| B3 | Host session -> arbitrary methods/plugins/events | Full foreground lifecycle exists; an ordinary stale UI-cache hit would set `v.r` and suppress traversal | Host must authorize replay effects and isolate session/root/singletons; the exact capability changes only cache classification while every normal hook still runs |
| B4 | Host result -> cache | Current scope recheck and internal cache-metadata rollback are reusable, but root `touch()` occurs afterward | Retained-generation token, current host epoch attestation, newer-publication guard, and one combined cache/dirty rollback transaction |
| B5 | Live cache -> external save adapter | Frozen v1 snapshot, revision guard, exact pair validation | Host must observe/await background-session save when required; external ordering/durability stays adapter-owned |

### Data classification by segment

| Segment | Data | Classification transition |
|---|---|---|
| B1 | context/discriminator plus public coordinates | Confidential authority context remains inside trusted host/cache process |
| B2 | opaque lease plus minimal render coordinates | No raw scoped key, DOM, or serialized authority crosses to generic cache clients |
| B3 | host snapshot/model/template and callback capabilities | Potentially Restricted; confined to isolated authorized session |
| B4 | validated HTML plus isolated current view | Potentially Restricted; admitted only to exact scoped generation |
| B5 | wire-v1 HTML and original Unix timestamp | Same sensitivity as HTML; adapter must provide host-selected protection and isolation |

## Stage 3 — STRIDE Threat Analysis

| Category | Threat scenario | Affected boundary/element | Current/proposed control | Status |
|---|---|---|---|---|
| Spoofing | A captured tenant/origin/base key is replayed as if it authorizes a later refresh | B1/B2/B4 | Re-derive discriminator at lookup, isolated session, hard join, and completion; opaque lease is never authority | **Gap in current API; mandatory future control** |
| Spoofing | Host returns a view from a different session/scope with HTML for the captured lease | B4 | Cache re-runs `scope()`, requires exact full identity, and synchronously asks the host owner to attest its opaque root/lifecycle epoch immediately before publication | **Mandatory future control** |
| Tampering | Old refresh publishes after `put()`/newer generation and overwrites new bytes | Cache/B4 | Exact cache/order/store/HTML/pair/lifecycle/token comparison; newer publication wins | **Reproduced if current blocking lease is naively reused** |
| Tampering | Host supplies its own timestamp or pairs new bytes with old `settledAt` | B4/B5 | Cache alone samples both clocks on successful publication; whole frozen v1 pair | **Controlled by design** |
| Tampering | Cache bytes publish but root persistence-dirty revision fails or remains unchanged | B4/B5 | One cache-owned transaction captures and rolls back cache metadata plus exact root dirty state; public `put()` is insufficient | **Gap in current API; mandatory future control** |
| Tampering | Persistence adapter reorders snapshots | B5 | Immutable call payload and revision-aware dirty clearing; external final ordering explicitly adapter-owned | **Residual host/adapter risk** |
| Repudiation | Background effects or save failures occur with no caller awaiting them | B2/B3/B5 | Same-turn promise observer; host-owned attempt/outcome record; background session awaits save when durability matters | **Gap in current API; mandatory future control** |
| Repudiation | Framework claims refresh/durability happened although serverless execution froze | B2/B5 | No durability claim; best-effort documentation; host deployment capability/metrics own truth | **Residual operational risk** |
| Information Disclosure | Stale HTML is served after scope drift | B1/B4 | Current authorization on every lookup and join; exact identity; fail closed | **Controlled only if future seam implements both checks** |
| Information Disclosure | Downstream permission changes are not reflected until hard deadline | Cache | Default zero, explicit bounded retention acceptance, domain-specific purge/root/persistence invalidation | **Known residual risk; no generic mitigation exists** |
| Information Disclosure | Reload invents a recent timestamp and extends sensitive content | B5/init | Original v1 `settledAt`, current policy, strict hard drop, no synthetic time | **Existing control; future restore must preserve it** |
| Denial of Service | Repeated stale requests launch many renders/effects | B2/B3 | One attempt per exact retained live generation, bounded metadata, no retry/timer/job | **Mandatory future control** |
| Denial of Service | Process restarts repeatedly recreate attempt eligibility for the same wire-v1 bytes | init/B2 | Explicitly accept one attempt per loaded process generation, or persist authenticated attempt identity in a separately reviewed wire | **Unresolved product/security prerequisite** |
| Denial of Service | Host background session hangs or outlives serverless request | B2/B3 | Host timeout/cancellation/concurrency/lifetime contract; zero-window fallback | **Residual host risk; framework cannot solve portably** |
| Denial of Service | Hard callers serialize behind a failed/hung refresh indefinitely | B2/B4 | Host bounds work; hard never receives stale; failure settles joiners and later hard request uses ordinary contract | **Mandatory future control** |
| Elevation of Privilege | Cache creates a privileged render context not authorized by the request/host | B2/B3 | Cache never creates sessions or invokes handlers; host creates least-authority isolated session | **Primary reason framework-owned replay is rejected** |
| Elevation of Privilege | A plugin suppresses validation/effect hooks in background mode to publish bytes | B3 | No generic background suppression mode; full authorized lifecycle required | **Rejected design** |

All six STRIDE categories are applicable and explicitly covered. Authentication credentials, crypto, headers, SQL, queues, mobile, and AI controls are N/A because no such surface is introduced.

## Stage 4 — Vulnerabilities and Weakness Chains

| ID | CWE | Weakness | Enables | Disposition |
|---|---|---|---|---|
| RF-SWR-V1 | CWE-841 | No public workflow contract authorizes arbitrary lifecycle replay for cache maintenance | Duplicate effects, incomplete lifecycle if hooks are suppressed | **Blocking; do not implement framework replay** |
| RF-SWR-V2 | CWE-362 | Detached DOM still shares parent context links and injected singleton/callback state | Foreground/root mutation and nondeterministic races | **Blocking; host isolation required** |
| RF-SWR-V3 | CWE-362 | Current blocking render lease is not bound to the retained settlement it would replace | Old work overwrites a newer publication | **Reproduced; new exact-generation transaction required** |
| RF-SWR-V4 | CWE-390 | Current plugin starts save without returning its promise; a post-response refresh has no automatic observed save phase | Unhandled adapter rejection or false durability claim in a naive background path | **Host session must own/observe save** |
| RF-SWR-V5 | CWE-613 | Shared cache has no generic downstream authorization-revocation feed | Same-scope stale content remains visible within opted-in window | **Residual policy risk; explicit acceptance/purge required** |
| RF-SWR-V6 | CWE-367 | Authorization or policy may change between stale admission and refresh completion | Cross-scope publication or service | **Triple current recheck and token equality required** |
| RF-SWR-V7 | CWE-400 | A generic refresh can retain arbitrary model/context/callback resources after response | Resource exhaustion or frozen incomplete work | **Host bounds/cancellation required** |
| RF-SWR-V8 | CWE-362 | Current `publish()` completes before root `touch()` and cannot roll back both as one unit | Live bytes without matching persistence-dirty revision | **Blocking; new combined transaction required** |
| RF-SWR-V9 | CWE-400 | Wire v1 has no attempted-refresh marker | Restart churn can repeat work/effects for the same durable bytes | **Process-local semantics or new wire must be chosen explicitly** |

### Chain analysis

- **V1 + V2:** a valid stale lookup launches a full replay whose detached DOM looks safe, while a lifecycle callback mutates root/singleton/external state. DOM isolation masks the observable duplicate effect.
- **V3 + V6:** an authorized old refresh races a purge/new publication or scope change and installs obsolete/cross-context bytes unless generation and authority are both checked at completion.
- **V4 + V5:** a refresh publishes live sensitive HTML, its background save fails invisibly, and operators incorrectly assume durable purge/retention matches memory.
- **V5 + timestamp tampering:** a synthetic reload/save timestamp converts a bounded retention choice into indefinite disclosure; existing v1 age rules prevent this and must not change.
- **V8 + adapter failure:** new live bytes become externally visible without dirty state, then the adapter is never retried and durable state silently remains old.
- **V1 + V9:** restart churn can repeatedly authorize lifecycle work for the same stale durable bytes unless loaded-generation semantics and host effect acceptance are explicit.

## Stage 5 — Attack Trees

### Attack Tree A: Cause an unauthorized duplicate lifecycle effect

**Preconditions:** a positive stale window, a retained stale fragment, and at least one method/plugin/event callback with an observable effect.

```text
[Duplicate or unauthorized effect] (OR)
├── Framework-owned full replay (AND)
│   ├── Trigger exact stale lookup
│   ├── Cache/wrapper starts background lifecycle
│   ├── Registered data/validate/handle or plugin hook runs again
│   └── Callback mutates root/singleton/external state
├── False detached-isolation assumption (AND)
│   ├── Background DOM is detached
│   ├── Context retains parent link or singleton registry
│   └── Built-in layer/host callback appends or writes shared state
└── Suppressed lifecycle workaround (AND)
    ├── Background flag skips effectful hook
    ├── Hook was also required for transformation/validation/completion
    └── Cache publishes semantically incomplete HTML
```

**Adversary:** ordinary caller, buggy extension, or malicious tenant able to trigger timing; Low-to-Medium capability.

**Impact:** integrity violation, duplicate external request/analytics/business mutation, corrupted root state, or invalid visible HTML. No generic bound exists because callbacks are arbitrary.

### Attack Tree B: Publish or expose the wrong generation/scope

**Preconditions:** concurrent refresh plus invalidation/newer publication/scope drift.

```text
[Wrong fragment becomes visible] (OR)
├── Resurrection after newer publication (AND)
│   ├── Reserve old lease
│   ├── Publish NEWER exact entry
│   ├── Complete old lease without retained-pair token check
│   └── OLD overwrites NEWER
├── Cross-scope completion (AND)
│   ├── Capture old discriminator at stale admission
│   ├── Host/session authority changes while rendering
│   ├── Completion trusts captured key
│   └── HTML publishes under old or new identity incorrectly
└── Detached invalidator race (AND)
    ├── Purge/evict/reset/init/replace current generation
    ├── Old refresh settles
    └── Missing lifecycle/store/token check recreates entry
```

**Adversary:** concurrent request, malicious tenant manipulating allowed context transitions, or operator action; Medium capability.

**Impact:** cross-tenant information disclosure, revoked-content resurrection, or integrity loss.

### Attack Tree C: Extend stale visibility or exhaust refresh capacity

**Preconditions:** positive window or misconfigured host background execution.

```text
[Retention or availability exceeds policy] (OR)
├── Timestamp sliding (AND)
│   ├── Stale hit/start/failure/save/reload occurs
│   ├── Implementation assigns that time as settledAt
│   └── Original hard deadline moves forward
├── Refresh storm (AND)
│   ├── Many stale requests
│   ├── Failure clears ownership without attempted marker
│   └── Each request starts another effectful render
├── Frozen background work (AND)
│   ├── Host returns stale response
│   ├── Runtime suspends or work hangs
│   └── Context/resources remain retained or hard callers block
└── Downstream revocation gap (AND)
    ├── Permission/source data changes
    ├── No domain purge reaches fragment/persistence
    └── Current requester remains lookup-authorized until hard deadline
```

**Adversary:** compromised session, traffic spike, or misconfigured host; Low-to-Medium capability.

**Impact:** bounded or indefinite confidential-data retention, request exhaustion, or duplicate effect load.

## Stage 6 — Risk Analysis

| Attack path | Likelihood | Impact | Risk | Justification |
|---|---|---|---|---|
| A1 full lifecycle replay duplicates effects | High | High | **High** | Any published host extension may be effectful; no special exploit or uncommon race is required. |
| A2 suppression yields invalid HTML | High if chosen | High | **High** | Full lifecycle is explicitly required and hooks can transform/validate/commit output. |
| B1 old lease overwrites newer publication | High under naive lease reuse | High | **High** | Independently reproduced with public `put()` and current lease completion. |
| B2 scope drift publishes wrong HTML | Medium | Critical | **Critical** | Requires an async drift/race, but cross-tenant disclosure has zero risk tolerance. |
| B3 post-purge/reset/init resurrection | Medium | High | **High** | Many invalidators exist; missing one exact generation check is sufficient. |
| C1 timestamp sliding | Medium under naive restore/save | High | **High** | Easy implementation mistake; persisted sensitive content can outlive policy indefinitely. |
| C2 repeated failed refresh storm | Medium | High | **High** | Request-triggered traffic can multiply arbitrary lifecycle work unless one-attempt state persists for the live generation. |
| C3 frozen/hung host work | High in some serverless hosts | Medium | **High** | Post-response lifetime is platform-specific and no current host seam defines it. |
| C4 downstream revocation gap | Medium | High | **High** | Current cache scope proves caller context, not freshness of all data embedded in HTML. |
| C5 restart recreates attempt eligibility | Medium, host-dependent | High | **High** | Wire v1 preserves age but cannot prove that the same bytes already consumed their attempt. |

Risk scores reflect the proposed/naive feature paths. The current default blocking fragment cache does not introduce a background replay path, so this documentation change adds no production exposure.

## Stage 7 — Countermeasures and Verification

| Risk | Countermeasure | Concrete implementation boundary | Verification | Priority | Residual risk |
|---|---|---|---|---|---|
| A1/A2 | Reject framework-owned replay/suppression | Cache never invokes handler/event/plugin; host explicitly authorizes a full isolated lifecycle | Effectful custom method/plugin plus built-in layer witness; assert only authorized session effects occur | Blocker | Host may authorize a genuinely repeatable effect incorrectly |
| B1/B3 | Exact retained-generation transaction | Lease binds cache/order/store/pair/html/settledAt/token plus a host-owned current root/lifecycle epoch; every invalidator detaches it | Red-first newer `put`, purge, eviction, reset, replacement, init, epoch, and late-settlement tests | Blocker | Detached host work may still consume resources until host cancels/settles |
| B2 | Current authority at all consumption points | Lookup, hard join, host session, and completion re-derive exact discriminator | Tenant/origin/base/language/cid/variant drift tests before and during async work | Blocker | Generic downstream revocation remains outside discriminator |
| C1 | Immutable original age | Cache alone samples publication clocks; wire v1 persists original Unix time; subtraction boundaries | Fresh/stale/hard restart and non-sliding hit/start/fail/save tests | Blocker | Host clock quality remains a deployment precondition |
| C2/C5 | One attempt per generation | Active/attempted marker retained until live-generation invalidation/hard removal; define restore as a new loaded generation or version the wire for durable attempt identity | Concurrent/sequential/restart failure tests; exact count under the accepted policy | High | Ordinary hard request may still fail; process-local choice permits a new attempt per restart |
| C3 | Host-owned lifetime bounds | Explicit isolated-session timeout/cancellation/concurrency and truthful best-effort contract | Host integration tests for cancellation/rejection and platform lifecycle | High | Serverless freeze can prevent best-effort completion |
| C4 | Explicit retention/revocation policy | Default zero; positive window acceptance; domain-coordinated root/UI/persistence purge | Revocation runbook and integration-specific purge tests | High | Bounded already-authorized visibility remains by design |
| B5 save failures | Separate internal publication from durability | New combined transaction rolls back both cache metadata and root dirty state; immutable adapter call; host observes/awaits save | Injected publish/touch failure plus adapter rejection/overlap tests | Blocker | Adapter final ordering/durability remains external |

Every future High/Blocker control maps to the conditional test matrix in `rendered-fragment-swr.md` Section 18. No control is implemented in this documentation-only result; therefore implementation remains blocked rather than shipping an untested mitigation.

## Red-Team Validation

### Path A1 — Lifecycle replay side effect

**PASTA risk:** High
**Verdict:** Exploitable in the rejected framework-owned design
**Confidence:** High

- **Source:** authorized stale fragment lookup.
- **Sink:** arbitrary registered `r.data`, `r.validate`, `r.handle`, before/after method, before/after/complete iteration callback.
- **Sanitizers/guards:** detached DOM only; it does not constrain callback effects.
- **Witness:** a legitimate plugin increments an injected counter or issues a host request in `afterIteration`; initial render increments once, background replay increments again. A built-in witness exists because `layer-method` calls `layerModel.set(v)`, which appends root-local registrations and marks state dirty.
- **Recommendation:** no framework replay; require explicit host lifecycle authorization and isolation.

### Path B1 — Old lease overwrites newer publication

**PASTA risk:** High
**Verdict:** Exploitable if current blocking lease is reused
**Confidence:** High

- **Source:** an old exact render lease.
- **Sink:** `uiCacheModel.complete()` -> `put()` -> internal publication.
- **Guard gap:** flight/store/scope remain current, but completion does not require that the retained order/pair generation is still the base it intends to replace.
- **Witness:** `acquire(old) -> put("NEWER") -> stage/complete(old) -> get() returns "OLD"`.
- **Recommendation:** distinct retained-generation lease/token; newer-publication test before implementation.

### Path B2 — Cross-scope completion

**PASTA risk:** Critical
**Verdict:** Inconclusive for the preferred design because the host seam does not exist; blocked, not reported as a current exploit
**Confidence:** Medium

Current `get()` and ordinary `complete()` re-run discriminator/scope, and focused tests pin tenant drift. A future async host boundary adds a new interval and must independently reauthorize. No witness can be run against an unimplemented seam; the absence of proof keeps the gate closed.

### Path C1 — Timestamp extension

**PASTA risk:** High
**Verdict:** Defended in current wire-v1 persistence; mandatory regression surface
**Confidence:** High

Exact HTML and original `settledAt` are paired, whole-envelope validation is required, and current reload drops stale records rather than inventing age. Wire v1 is sufficient for age classification but has no attempted-refresh marker; the future design must explicitly accept a new process-local generation per reload or separately version durable attempt identity.

### Path C3 — Frozen background work

**PASTA risk:** High
**Verdict:** Inconclusive and host-dependent
**Confidence:** Medium

There is no current background fragment work to exploit. A future host must supply platform-specific lifetime/cancellation semantics; the framework cannot claim portable completion.

Red-team testing was read-only/in-memory. No production/external action was performed.

## Residual Risk and Acceptance

### Current change

No runtime behavior changes, so no new operational residual risk is accepted. The unsafe design is rejected.

### Future positive-window enablement

The following risks require explicit host/maintainer acceptance before enablement:

- bounded same-scope visibility may outlive downstream permission/data revocation;
- the host, not the framework, is responsible for lifecycle replay authorization and isolated-session correctness;
- post-response completion may be best-effort in some deployments;
- persistence adapter ordering and durable atomicity remain outside the in-memory cache contract;
- wire-v1 process-local generation semantics permit one new refresh attempt after each restart while the same bytes remain stale;
- detached work can consume resources until host cancellation/settlement even after cache invalidation.

Re-evaluate this model whenever the host-session contract, callback registry, discriminator, wire, adapter protocol, invalidation domains, or deployment runtime changes.

## Threat-Model Checklist Disposition

- **Model before code:** PASS — this model and linked specification precede any runtime edit (OWASP Threat Modeling).
- **STRIDE delta:** PASS — all six categories cover the proposed new boundary and existing lifecycle/persistence elements (Microsoft STRIDE).
- **DFD/trust boundaries:** PASS — foreground, rejected, and preferred async/error/save paths are shown (OWASP Threat Modeling; NIST SP 800-154).
- **Assets/data sensitivity:** PASS — HTML, authority, clocks, lifecycle capabilities, and persistence are classified (NIST SP 800-154).
- **Actors:** PASS — tenant, compromised session, extension, operator, adapter, and concurrent request are modeled (PASTA Stage 1).
- **Attack trees:** PASS — three AND/OR trees cover effects, scope/generation, and retention/resources (PASTA Stage 5).
- **Full PASTA:** PASS — all seven stages are present because the proposed host seam is a new sensitive-data trust boundary (PASTA seven-stage process).
- **Cross-component chains:** PASS — lifecycle/context, generation/authority, save/revocation, and timestamp chains are explicit (PASTA Stages 3–5).
- **Concrete mitigations:** PASS for the design decision — unsafe paths are prohibited and every future control has an implementation boundary and verification criterion (OWASP Q3).
- **No TODO mitigation:** PASS — no feature ships; unresolved host prerequisites block implementation rather than being deferred in code (Threat Modeling Enforcer).
- **Residual acceptance:** PASS — none is implicitly accepted; future risks name the accepting host/maintainer authority (PASTA Stage 7).
- **Test linkage:** PASS for a pre-code stop — every prospective High/Blocker control maps to the conditional red-first matrix; no unimplemented control is claimed effective (Threat Modeling Enforcer).

## Deep-Dive Summary

| Metric | Count |
|---|---:|
| Attack trees | 3 |
| Principal paths validated | 5 |
| Exploitable in rejected/naive designs | 2 |
| Defended by current contracts | 1 |
| Inconclusive pending host seam | 2 |
| Countermeasure groups | 8 |
| Future test groups | 4 |

**Critical finding:** current public contracts cannot authorize or isolate arbitrary lifecycle replay; a naive reuse also lacks exact retained-generation protection. The immediate action is to stop implementation. The only acceptable follow-up starts with a real host-injected isolated render-session/lifecycle-authorization capability and a new cache-owned exact-generation transaction.

## Post-Implementation Verification Addendum

The follow-up implemented the preferred boundary without reintroducing framework-owned replay.
The earlier prospective/blocking language remains useful attack analysis but is superseded by this
control disposition for the library implementation:

| Risk | Implemented evidence | Disposition |
|---|---|---|
| A1/A2 lifecycle replay/suppression | UI cache only issues a metadata-free capability; the injected host creates an isolated root and runs the unchanged wrapper/handler/plugin lifecycle. `ui-cache-swr-lifecycle.test.js` proves a real effectful failure aborts publication rather than suppressing a hook. | Controlled in library; host remains accountable for authorizing repeatable effects. |
| B1/B3 overwrite/resurrection | Refresh records bind cache/order/store/pair/HTML/process record/host/generation; purge, purge-all, eviction, identity replacement, promise reset, init, authority/session drift, and newer publication detach. The ordinary blocking lease now also requires `coldCurrent()` before publication. | Controlled; red-first race and invalidator matrix pass. |
| B2 cross-scope completion | Before the first target iteration binds, exact coordinates and current scope are mandatory; scope is re-derived during isolated lookup and completion, and `current()` / `owns()` must return literal `true` at start, activation, execution lookup, and publication. Hard joins require exact authority-object identity. | Controlled for declared scope/host epoch; downstream revocation remains residual. |
| C1 timestamp extension | Strict subtraction phases use the original process stamp and wire-v1 `settledAt`; start, hit, failure, save, and reload do not slide age. | Controlled; boundary/restart tests pass. |
| C2/C5 storms/restart identity | A retained process generation has one attempt, including failed starts; temporary fresh reclassification preserves its consumed marker; wire restore deliberately creates one new process-local generation and persists no attempt marker. | Controlled under the accepted process-local policy; one new attempt per restart remains explicit. |
| C3 frozen/hung work | The framework starts synchronously but owns no timer, retry, worker, cancellation, or durability mechanism. The host owns lifetime, timeout/cancellation, concurrency, and telemetry. | Library fails closed without a host; platform freeze/hang remains host residual. |
| C4 downstream revocation | Default `staleWindow` is zero; positive enablement is explicit and documented with authority rotation plus root/cache/persistence purge. | Bounded same-scope stale visibility is an opt-in host acceptance. |
| B5 publication/save failure | UI HTML/order/pair/process record/settlement/LRU and root dirty revision share one synchronous rollback transaction using an opaque one-shot promise-record checkpoint. Refresh after-view awaits save; adapter failure rejects the host lifecycle without falsely rolling back live publication, and an earlier after-view abort closes the completed execution while leaving dirty state retryable. | In-memory atomicity controlled; external ordering/durability remains adapter-owned. |

Verification is concentrated in `test/models/ui-cache-swr.test.js`,
`test/plugins/ui-cache-swr-lifecycle.test.js`, `test/models/promise-cache-ttl-purge.test.js`, and
the syntax-aware ownership ratchet in `test/policy-ownership.test.js`. Capabilities and rollback
tokens are frozen zero-key objects; private authority, session, scope, generation, and insertion
records are neither serialized nor logged.

### Accepted residuals for positive-window hosts

- A currently authorized caller may see exact retained same-scope HTML until the original hard
  boundary even if embedded downstream data changed; use zero plus coordinated invalidation where
  that is unacceptable.
- A restart may grant one attempt to a restored stale record because wire v1 intentionally carries
  age, not durable attempt identity.
- Detached work may consume resources until the host cancels or settles it, and serverless runtimes
  may freeze best-effort post-response work.
- Adapter ordering and durable atomicity remain outside the in-memory cache contract.
- The host can incorrectly authorize a lifecycle whose effects are not safe to repeat; the cache
  cannot infer business idempotence.

Cross-scope disclosure, stale service at/equal/beyond the hard boundary, synthetic timestamps,
generation resurrection, hook suppression, cache/dirty partial publication, implicit scheduling,
and permissive missing-host fallback remain unaccepted. Default/disabled behavior is the exact
blocking path. Any concrete positive-window host must document platform lifetime/concurrency,
privacy-safe attempt/save outcome telemetry, authority rotation, and revocation purge procedures.

**Final threat verdict:** APPROVE the additive library boundary with `staleWindow = 0` by default.
Positive enablement is conditional on the documented host responsibilities and residual acceptance.
