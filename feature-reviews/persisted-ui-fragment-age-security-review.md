# Persisted UI Fragment Age — Pre-Implementation Security Review

**Date:** 2026-07-18  
**Status:** Pre-code approved  
**Scope:** Versioned persisted rendered-fragment age only  
**Primary specification:** `feature-reviews/persisted-ui-fragment-age.md`

## Gate Decision

Implementation may begin only after the specification's independent explorer/architect review confirms the controls below. The persistence boundary is treated as untrusted even though the host supplies the adapter. Invalid provenance, version, structure, identity, timestamp, clock, or resource bounds must produce an empty clean live cache and ordinary cold rendering. No High or Medium threat is deferred.

## Security Objective

Preserve a fragment's original successful settlement age across restarts without allowing legacy data, prototype inheritance, corrupt persistence, clock manipulation, or asynchronous mutation to grant shared-cache authority, extend retention, cross a discriminator boundary, or publish mismatched content and timestamps.

## Data Flow Diagram

```text
explicit scoped request/root
  -> request-model discriminator + render-context cache root
  -> UI-cache exact scoped identity
  -> render lease and handler/event lifecycle
  -> successful complete/direct publication
  -> [live cache/order + paired absolute settlement metadata]
  -> immutable deterministic wire-v1 envelope
  -> [TRUST BOUNDARY: injected saveModel / external store / backups]
  -> adapter get on a later process
  -> own attestation + own version + complete bounded descriptor validation
  -> restart-stable absolute-clock and current-TTL evaluation
  -> temporary cache/order/process/absolute metadata candidate
  -> atomic live-state swap
  -> exact scoped warm hit or ordinary cold render

Failure paths:
  unscoped/malformed root -> no shared-state/adapter/clock access
  abort/handler/event failure/purge/replacement -> no late publication
  corrupt/unavailable store -> empty clean live state -> cold render
  save rejection/mutation -> dirty remains -> retry through normal host lifecycle
```

## Assets and Sensitivity

| Asset | Sensitivity | Required property |
|---|---|---|
| Rendered fragment HTML | Potentially confidential/tenant-scoped | Exact discriminator isolation; bytes paired with their timestamp |
| Scoped identity (`language`, `cid`, variant) | Internal/tenant routing metadata | Collision-free exact preservation; no unscoped participation |
| `settledAt` | Persisted activity metadata | Same access/retention/erasure boundary as fragment; no analytics reuse |
| LRU order | Internal availability/performance state | Deterministic and bounded; corrupt order cannot authenticate bytes |
| Dirty/revision state | Internal durability/retry state | Mutation/rejection cannot clear retry intent |
| Absolute clock contract | Trusted host policy input | Unix-ms, safe, nondecreasing, restart-stable; no fallback |
| Cold-render availability | Availability asset | Persistence corruption fails cold, not closed over rendering |

## Trust Boundaries and Actors

1. **Request/render boundary:** callers can influence view/context/identity but cannot participate without the existing explicit request discriminator.
2. **Host DI boundary:** the host supplies request/render/promise models, persistence clock, and save adapter. A false own attestation or intentionally false clock is a host compromise; the framework still rejects inherited/accessor/malformed values.
3. **Persistence boundary:** returned data may be stale, truncated, mixed, oversized, accessor-bearing, cyclic, prototype-polluted, unknown-version, or attacker-modified.
4. **Deployment boundary:** older/newer readers may coexist unless the host quiesces writers or isolates store namespaces.

Threat actors:

- a cross-tenant or unscoped caller attempting a warm-cache hit;
- a compromised or buggy persistence adapter/store;
- prototype pollution or hostile accessor state inside a host process;
- an operator performing an unsafe migration, rolling deployment, or rollback;
- a clock source that is misconfigured, reset at boot, regresses, or returns invalid values.

## STRIDE Analysis

### Spoofing

| Threat | Scenario | Severity | Control | Verification |
|---|---|---:|---|---|
| S1 inherited provenance | Prototype supplies `uiCacheScoped = true`; init treats legacy bytes as scoped | High | Require own data descriptor exactly `true`; never evaluate accessor | Inherited/accessor attestation tests; adapter get count remains zero |
| S2 inherited/unknown version | Prototype or accessor supplies recognized version | High | Exact own data-property envelope version and exact key set | Unknown/inherited/accessor version tests |
| S3 scope impersonation | Missing/malformed tenant/origin/base identity reads persisted same cid/variant | High | Existing request-model discriminator and strict render cache root before any shared state | Unscoped and tenant/origin/base isolation model + pipeline tests |

### Tampering

| Threat | Scenario | Severity | Control | Verification |
|---|---|---:|---|---|
| T1 pair substitution | Adapter combines one fragment's HTML with another timestamp | High | One structural record; exact identity uniqueness; whole-envelope validation | Mixed/duplicate/timestamp-pair tests |
| T2 valid-prefix publication | First record is valid and second malformed, leaving partial live state | High | Validate/stage complete bounded envelope, then one atomic swap | Mixed-validity, cyclic, accessor, prototype tests assert empty cache/order/metadata/dirty |
| T3 async save race | Adapter observes newer live bytes after receiving older timestamps | High | Disconnected recursively frozen snapshot built synchronously before one `set()` | Deferred adapter mutation test and exact captured payload |
| T4 host replacement | Host replaces cache bytes/order while old timestamp record remains | High | Metadata binds order-record object, cache-store identity, and exact HTML; every O(1) hit validates the pair before freshness and save revalidates it | Cache/order/settlement replacement and stale-byte pairing tests |
| T5 purge/late completion resurrection | Purged pending leader completes and republishes old bytes/time | High | Existing lease identity plus paired cleanup; completion checks current flight/store | Pending purge, late completion, full purge tests |
| T6 delayed init overwrite | Async adapter get completes after newer live state/pending purge/replacement and swaps stale candidate over it | High | Capture a module-local lifecycle revision (never a key/discriminator/sentinel); valid lease/publication/purge, identity replacement, or newer init invalidates it | Deferred-get lease/purge/publication/replacement/new-init tests |
| T7 magic coordinate pollution | Valid `__proto__`/`constructor` coordinate traverses or mutates nested prototypes | High | Own data-descriptor reads and `defineProperty` writes preserve exact strings without inherited lookup | Magic-key round-trip and prototype-no-mutation tests |

### Repudiation

| Threat | Scenario | Severity | Control | Verification |
|---|---|---:|---|---|
| R1 invented migration age | Host/runtime assigns migration or reload time and claims freshness | Medium | Legacy quarantine; external migration only with trustworthy original settlement; exact golden | Legacy attested fixture remains cold and unmodified |
| R2 save/hit changes history | Delayed save or repeated hit rewrites activity time | Medium | Timestamp only successful publication; snapshot uses stored time; hits only reorder | Save-delay/non-sliding tests inspect golden payload |

The framework intentionally adds no audit/logging subsystem. The public timestamp and deterministic payload make host storage operations inspectable, while host adapter audit remains outside this dependency-free runtime.

### Information Disclosure

| Threat | Scenario | Severity | Control | Verification |
|---|---|---:|---|---|
| I1 cross-scope HTML reuse | Same language/cid/variant in two explicit tenants/origins/bases collides | High | Persist exact already-scoped variant including discriminator; no context serialization/reconstruction | Sequential/concurrent isolation and pipeline tests |
| I2 activity-time leakage | Settlement timestamps are copied/logged/retained beyond fragments | Medium | One paired field only; no logging/analytics/parallel store; same purge/retention/erasure boundary | Wire golden, purge/save tests, privacy docs/review |
| I3 corrupt-store reflection | Adapter data/error is exposed to render output | Medium | Invalid persistence only causes a miss; no adapter payload/error is rendered | Failed-load and malformed-envelope pipeline/model tests |

### Denial of Service

| Threat | Scenario | Severity | Control | Verification |
|---|---|---:|---|---|
| D1 oversized envelope | Store returns millions of fragments and blocks init/memory | High | Read array length descriptor first; reject above effective `max`; retain at most max records | Oversized test proves no per-entry accessor evaluation and empty state |
| D2 cyclic/accessor payload | Recursive traversal or getter side effect hangs/mutates state | Medium | Nonrecursive exact descriptor inspection; no getter evaluation | Cyclic/accessor tests with side-effect counters |
| D3 clock failure | Throwing/regressing clock crashes render/init | Medium | Safe read, fail fresh, no fallback/timer/retry | Invalid/throw/regression tests |
| D4 persistence outage | Rejected get/set prevents ordinary rendering | Medium | Init catches get failure and stays cold; absent adapter preserves no-throw/no-op dirty cleanup; configured save rejection retains retry state | Failed-load, absent/rejected-save, pipeline cold-render tests |

### Elevation of Privilege

| Threat | Scenario | Severity | Control | Verification |
|---|---|---:|---|---|
| E1 legacy format gains cache authority | Own scoped attestation alone reloads an unversioned nested store | High | Recognized version is independently mandatory; no runtime migration | Legacy migration fixture quarantined |
| E2 unsafe rolling downgrade | 1.x reader interprets wire v1 as nested fragment cache | High | Major SemVer; quiesce/isolate/clear deployment; disable/clear/restore before rollback | Package ranges, migration/rollback fixtures/docs/source ratchet |
| E3 future time extends retention | Timestamp beyond now makes content appear fresh indefinitely | High | Any future record invalidates whole envelope; live observed regression fails publication | Future/boundary/backward-clock tests |
| E4 scope invalidated after stage | Render loses/changes discriminator before completion but publishes under the earlier tenant prefix | High | `complete()` re-derives current scope and compares it with the staged scoped variant before clock/state/put; abort cleanup remains scope-independent | Stage-then-mutate/remove-discriminator completion and abort tests |

## Attack Trees

### Goal A: serve a fragment beyond the configured absolute TTL

```text
OR
├─ Freshen on reload
│  AND legacy/unversioned store accepted
│      reload/init time substituted
├─ Alter original time
│  OR future timestamp accepted
│     save time used
│     cache hit slides timestamp
│     adapter pairs newer time with old bytes
└─ Defeat current TTL
   OR serialized old TTL overrides new policy
      Infinity drops original timestamp
      process clock identity is treated as restart-portable
```

Controls block every leaf: mandatory version/quarantine, publication-only absolute time, future/regression rejection, pair-bound frozen payload, current-policy evaluation, preserved timestamp under Infinity, and in-memory-only process identity.

### Goal B: consume another scope's persisted fragment

```text
AND
├─ Gain persistence authority
│  OR inherited/accessor attestation
│     inherited/accessor/unknown version
│     unsafe older reader
├─ Collapse identity
│  OR missing discriminator accepted
│     malformed NUL coordinates accepted
│     timestamp metadata authenticates replaced content
└─ Reach warm-hit path before validation/purge
```

Controls are the existing fail-closed discriminator, own descriptor gates, exact scoped coordinate grammar, whole-envelope validation, bound pair metadata, and isolated deployment/rollback.

## PASTA Seven Stages

1. **Business objectives:** enforce tenant isolation and the operator-configured maximum fragment age across restarts while preserving cold-render availability.
2. **Technical scope:** `ui-cache-model` publication/live/persistence path, plugin completion/save timing, host DI/reset, and direct package consumer compatibility.
3. **Decomposition:** the DFD above covers successful, failure, purge, save-race, and deployment paths.
4. **Threat analysis:** STRIDE tables identify provenance, structure, pairing, time, privacy, resource, and downgrade threats.
5. **Vulnerability analysis:** current init substitutes reload time; old wire has no age; current save passes a live mutable body; JS inheritance/accessors can counterfeit fields; older readers know only a nested object.
6. **Attack enumeration:** attack trees cover retention extension and cross-scope consumption, including chained adapter/prototype/deployment cases.
7. **Risk/countermeasures:** all High/Medium framework-addressable controls are required below; residual host trust is documented and constrained operationally.

## Mandatory Control-to-Test Map

| Control | Required tests |
|---|---|
| PM-owned local restoration | focused `restore(owner, age, sampledTime)` tests for strict boundary, zero/Infinity, invalid age/sample, one-sample determinism, and opaque record freshness |
| Own attestation and version | inherited/accessor/prototype/unknown/unversioned fixtures; zero adapter/clock/state effects |
| Whole-envelope atomic validation | malformed/cyclic/accessor/prototype/oversized/mixed/duplicate/failed-get cases all empty and clean |
| Publication-only absolute time | direct set, compatible low-level put, plugin complete, save delay, hit, handler/event failure, abort |
| Current-TTL original-age restore | just-before/exact/after boundary; shorter/longer/zero/Infinity; process restart pipeline |
| Clock integrity | invalid/missing/negative/fractional/nonfinite/unsafe/future and live regression |
| Pair-bound metadata | O(1) hit validation; host byte/order/cache/settlement replacement; LRU expiry/eviction; exact/full purge; late completion |
| Immutable one-call save | frozen exact golden, bounded authenticated-order traversal, concurrent internally consistent snapshots, async mutation, configured-adapter rejection, absent-adapter cleanup, revision retry |
| Own nested data properties | null/primitive canonicalization and exact `__proto__`/`constructor`/`prototype` identities without prototype mutation |
| Scope isolation | tenant/origin/base sequential/concurrent and unscoped same-identity pipeline |
| Deployment/rollback safety | legacy/v1 fixtures, package major/range assertions, README/source guards |

## Failure Atomicity Invariants

1. `init()` resets to a new empty clean generation before adapter access and publishes a candidate only after every record, timestamp, current-policy decision, process stamp, and absolute pair is valid; it samples opaque process time before the later single absolute batch time so sampling delay cannot extend life.
2. Candidate promise-cache metadata is cleared if staging fails; discarded candidate cache/order/weak records are unreachable.
3. UI-cache never reads or constructs promise-cache timestamp fields; it passes one opaque current sample and each validated age through the PM-owned restoration seam.
4. Content never enters a saved envelope without the exact settlement record bound to its current order/cache/content identity.
5. Timestamp metadata never enters a saved envelope without matching content.
6. Purge, expiry, eviction, replacement, and reset remove both metadata owners before a future save can authenticate the key.
7. The save payload is recursively frozen and disconnected before the sole adapter call; with an adapter, root dirty state clears only after successful unchanged-revision completion. The absent-adapter path retains its existing unchanged-revision no-op cleanup.
8. Persistence high-water is committed only with an accepted init candidate (valid all-stale batches included) or a complete live publication pair; malformed/future/discarded work leaves no high-water on the new generation.

## Privacy Review

- **Data added:** one Unix-ms activity timestamp for each persisted rendered fragment.
- **Purpose:** TTL enforcement only. It is not authentication, analytics, personalization, billing, or audit data.
- **Minimization:** no save/reload/hit timestamps, clock identity, render context, IP, user ID, or separate history is stored.
- **Isolation:** the timestamp is inseparable from the already scoped fragment record and follows the exact tenant/origin/base identity.
- **Retention/deletion:** live expiry/purge drops the timestamp with the fragment; the next successful save omits both. External backups/replicas are host-owned and must apply the same retention/erasure policy.
- **Access/logging:** adapter access controls and encryption-at-rest apply to the complete envelope. The runtime does not log timestamp values.
- **Rollback:** cold-clearing disposable fragment state is privacy-favorable and is the safe default.

## Resource Review

- Envelope record count is rejected above the current effective `max` before record traversal.
- The same effective limit (positive safe integer, otherwise one) bounds live LRU publication, flights, settlement metadata, init, and save; `NaN`/Infinity cannot disable eviction and zero retains the existing newest-one behavior.
- Parsing is nonrecursive and exact-field, so cycles cannot expand work.
- Live absolute metadata is one Map entry per ordered fragment under a WeakMap generation owner.
- Normal hit performs O(1) own nested lookup, order lookup, absolute-pair validation, process freshness check, and reorder; absolute metadata is read but never rewritten/slid.
- Init/save are O(n) and allocate O(n) for authenticated `n <= max`; save never enumerates untracked host cache keys. No background task, timeout, refresh, retry loop, or new dependency is introduced.
- Concurrent save invocations retain current immediate call timing and each receives a disconnected immutable snapshot. Cross-call ordering, cancellation, and atomic durability are adapter-owned; the framework adds no unbounded waiter queue, timer, or generic transaction layer.
- No per-render generation marker or retained root state is added. `init()` remains a startup boundary: hosts finish it before creating render roots and discard pre-init roots, consistent with the existing deployment lifecycle.

## Deployment and Rollback Security Gate

1. Stop/disable old writers or isolate a new store namespace.
2. Cold-clear legacy state unless a trusted external source can construct exact original settlement timestamps.
3. Deploy the 2.x reader, clock/reset DI, and direct plugin range together.
4. Only then set an own data-property attestation and enable init/writes.
5. For rollback, disable persistence, clear v1 or restore a reader-compatible snapshot, and only then start 1.x.

An older reader is not assumed to reject an unknown envelope. Mixed-version readers/writers sharing a namespace are an explicit High-risk deployment violation.

## Residual Risk and Acceptance

| Residual risk | Framework limit | Required host acceptance/control |
|---|---|---|
| Host lies with an own attestation | Runtime cannot prove external migration provenance | Treat attestation as privileged config; cold-clear by default |
| Host clock is consistently wrong or restart-regresses while remaining above every settlement | Runtime cannot independently obtain trusted time or detect that regression without forbidden non-settlement high-water metadata | Use synchronized nondecreasing Unix-ms clock; cold-clear/disable on clock incident |
| Adapter loses/tears storage after call | Runtime controls only payload construction and call count | Adapter supplies its own atomic durability or accepts cold-cache loss |
| Adapter commits concurrent `set()` calls out of invocation order or one call hangs | Framework intentionally guarantees each payload, not external cross-call transactions, and preserves current concurrent timing | Adapter serializes/CASes and bounds/cancels its own I/O; rendering remains fire-and-forget/cold-capable |
| Backups retain purged timestamps | Runtime cannot erase host backups | Apply fragment retention/erasure policy to replicas/backups |

These residual risks are accepted only under the documented host contract. Any detectable violation fails cold. Re-evaluate this threat model if a generic persistence layer, remote untrusted adapter protocol, stale fallback, background refresh, or HTTP validator support is later introduced.

## Pre-Code Verdict

The design is approved after independent explorer and architect review. Required implementation gates are: exact own provenance/version checks, bounded whole-envelope staging, restart-stable publication timestamp, current-policy age restore, pair-bound weak metadata, immutable save snapshots, complete cleanup, red-first adversarial coverage, major SemVer, and isolated migration/rollback. No stale-while-revalidate or HTTP validator behavior is included.
