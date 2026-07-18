# Persisted UI Fragment Age — Differential Security Review

**Date:** 2026-07-18
**Base:** `dev` at `3c614cd5cf65854d5e85922445a7fca1221db659`
**Branch:** `feat/persisted-ui-fragment-age`
**Scope:** Persisted rendered-fragment wire, absolute settlement age, and the promise-cache restoration seam
**Verdict:** PASS — no unresolved finding

## Review method

The working tree was reviewed line by line against the base, including uncommitted implementation,
tests, fixtures, package metadata, and documentation. History was traced through the fail-closed
discriminator change (`faa7a5e`), TTL/purge ownership (`e791896`), the promise-cache extraction,
rendered-fragment LRU/export compatibility, and event/handler-wrapper completion and abort work.
Every changed runtime entry point was followed through direct callers, host DI/reset, adapter
boundaries, package consumers, and failure cleanup.

The optional supplemental methodology files named by the installed differential-review skill were
not present in that skill directory. The required history, trust-boundary, attacker-path,
line-by-line, caller/callee, and removed-control analysis was performed directly.

## Changed security surface

| Surface | Change | Security property |
|---|---|---|
| `promiseCacheModel.restore()` | Restores an opaque local insertion record from trusted elapsed age | UI-cache cannot synthesize or serialize process-clock identity; current TTL policy remains centralized |
| `uiCacheModel.init()` | Accepts only exact wire v1 after own adapter attestation | Unknown/legacy/hostile stores fail cold before live publication |
| `uiCacheModel.persistenceClock` | Supplies restart-stable Unix epoch milliseconds | Original age survives restart; invalid/future/detectably regressing time fails fresh |
| Live settlement pairs | Bind exact order record, cache-store identity, HTML value, and timestamp | Orphan metadata cannot authenticate replacement bytes or identities |
| `uiCacheModel.save()` | Builds one recursively frozen, disconnected envelope | An async adapter never receives a body/timestamp pair that can mutate underneath it |
| Purge/expiry/eviction/reset | Removes both freshness owners with content | Late work and later saves cannot resurrect an orphan timestamp |
| Test engine persistence DI | Injects and resets adapter plus absolute clock | Pipeline restart tests cannot leak one test host's adapter into another render |
| Package contract | UI-cache `2.0.0`; coordinated promise/plugin patch releases | Direct consumers receive an explicit incompatible wire signal and compatible dependency floors |

No security check was removed. The own `uiCacheScoped === true` discriminator provenance gate,
request-model tenant/origin/base policy, root-local dirty state, write-once behavior, render leases,
completion/abort ordering, URL/SSRF policy, manifest validation, parser output, and handler traversal
remain in place.

## Data-flow trace

1. **Load:** host startup injects the models, restart-stable clock, and adapter; `init()` resets to an
   empty generation, verifies an own data-property attestation, calls `get()` once, validates the
   exact versioned envelope within `max`, samples process time before one absolute batch time,
   evaluates current TTL against each original `settledAt`, stages bytes/order/two metadata owners,
   and swaps the complete candidate only if its lifecycle generation is still current.
2. **Hit:** request-model derives the exact discriminator; UI-cache looks up content, order record,
   cache-store identity, settlement pair, and promise-cache freshness in O(1). A mismatch removes
   the unauthenticated content and both metadata owners. A valid hit moves LRU only and never moves
   either timestamp.
3. **Publish:** direct `set()` or plugin `complete()` revalidates scope, samples promise freshness,
   samples the absolute clock at successful synchronous publication, and exposes content only with
   its complete pair. Handler/event failure, abort, pending purge, invalid time, or a replaced
   generation publishes neither.
4. **Save:** a valid scoped dirty root triggers bounded authenticated-order traversal. The model
   builds and recursively freezes one version-consistent payload before one adapter `set()` call.
   Concurrent mutation changes the root revision and remains dirty; rejection propagates and leaves
   retry state.
5. **Delete:** expiry, eviction, exact/full purge, replacement, and reset remove content, order,
   process freshness, and settlement metadata together. A later successful save omits the pair.

## Concrete attacker and failure scenarios

| Scenario | Control and evidence |
|---|---|
| Prototype supplies store attestation or version | Own data descriptors are mandatory and accessors are not evaluated; focused tests prove zero load/clock effects |
| Legacy scoped-only store is assigned upgrade time | No runtime migration exists; exact wire version is mandatory; migration fixture proves quarantine |
| Valid prefix of a mixed envelope is retained | Complete validation precedes candidate publication; mixed-validity, duplicate, malformed, cyclic, polluted, accessor, and oversized tests stay empty and clean |
| Future timestamp creates negative age | Any future record rejects the whole envelope and rolls back the process-clock observation |
| Restart grants a fresh TTL | Original `settledAt` is converted to remaining process-local age; just-before/exact/after boundary and pipeline restart tests prove strict expiry |
| Cache hit or delayed save slides age | Save serializes the stored timestamp; hits touch only LRU; deterministic fake-clock tests prove no change |
| Host replaces bytes under old metadata | Pair binds exact order object, store identity, and HTML value; hit prunes and save refuses mismatches |
| Async save observes a half-updated object | Adapter receives a disconnected recursively frozen envelope; mutation/rejection tests preserve dirty retry state |
| Delayed init overwrites new work | A lifecycle revision plus cache/order identities rejects candidates after lease, publication, purge, replacement, or newer init |
| Unscoped same-identity caller consumes persisted tenant bytes | Existing request discriminator returns before shared read/write/clock/adapter state; model and pipeline tests cover tenant, origin, base, and unscoped cases |
| Older reader consumes wire v1 | Major SemVer and isolated deployment; rollback requires disable plus clear/compatible restore before starting 1.x |

## Findings found and fixed during review

1. **Adapter `get` accessor could throw before the availability boundary.** A red focused test showed
   a throwing getter escaping. Property resolution moved inside the guarded adapter call; load now
   stays cold and clean.
2. **Pipeline persistence adapter leaked between render invocations.** A red pipeline test showed an
   omitted adapter could retain the prior host double. Engine reset now restores `saveModel = null`.
3. **Rejected replacement publication could discard the previous promise-cache stamp.** A red test
   forced publication rejection. Replacement now retains the old stamp until the new complete pair
   succeeds, and the old fragment remains usable.
4. **Duplicate identities and mixed stale/fresh valid batches lacked direct witnesses.** Focused
   tests now prove whole-envelope duplicate quarantine and deterministic retention of only the
   still-fresh subset.
5. **Cross-realm native Promises failed the asynchronous adapter contract.** Current-head Codex
   review found the `instanceof Promise` check. A red `node:vm` test reproduced the cold miss; init
   now adopts native Promises by their intrinsic brand while proving a malformed envelope `then`
   accessor remains unread.

No High or Medium finding remains. The cross-model skeptic/architect/minimalist findings and
dispositions are recorded in the linked adversarial review.

## Eight-question security review

1. **Trust boundaries:** the external adapter/store and host clock are the changed boundaries;
   request scope remains the existing admission boundary.
2. **Input validation:** exact own descriptors, prototypes, array density/shape, record types,
   scoped identity grammar, duplicates, `max`, version, clock, and timestamps are validated before
   publication.
3. **Secrets/credentials:** none added, read, stored, or logged.
4. **Dependencies:** no runtime dependency, service, endpoint, database, queue, worker, or import was
   added.
5. **Sensitive data:** `settledAt` can be activity metadata when the fragment is user-specific; it
   shares the fragment's tenant access, encryption, retention, erasure, replica, and backup policy.
6. **Failure behavior:** load corruption/outage is cold and nonfatal; configured save failure remains
   dirty and is observable to direct callers that await `save()`.
7. **Logging/monitoring:** runtime logs no content or timestamps. Adapter metrics, durability,
   cancellation, ordering, and alarms remain host-owned.
8. **Blast radius/rollback:** only the rendered-fragment adapter namespace changes. Old/new readers
   must not share it; downgrade is unsafe until persistence is disabled and v1 is cleared or a
   compatible snapshot restored.

## Blast radius

| Dependency or consumer | Failure effect | Isolation/rollback |
|---|---|---|
| Promise-cache model | Missing restoration seam makes persisted load cold | Coordinated `^1.0.3` floor; ordinary cold rendering remains |
| Render-context/request models | Invalid scope prevents all shared state | Existing fail-closed behavior; no URL/pipeline change |
| Persistence clock | Invalid/regressing time disables publication/load | Fix clock or disable/clear persistence; no stale fallback |
| Adapter/store | Failed read is cold; failed write stays dirty | Adapter supplies atomic durability/order; fragment cache is disposable |
| UI-cache plugin | Keeps existing non-awaited after-view save timing | Direct hosts await model `save()` when durability/error visibility is required |
| Direct 1.x reader | May misinterpret v1 | Isolate namespace; disable, clear/restore, then downgrade |

There is no changed HTTP endpoint, request/response schema, SQL query, authentication decision,
payment path, AI/model integration, or external fetch sink. Request URL/SSRF and manifest controls
are therefore outside the diff and remain characterized by the full suite.

## Differential verdict

**PASS.** The changed persistence boundary is explicit, bounded, fail-cold on untrusted input,
scope-preserving, and failure-atomic at the framework/adapter call boundary. Focused 144/144, exact
repository 706/706, typecheck, three package dry-runs, syntax guards, and the refreshed 88-rule
Semgrep scan are green after the current-head review fix. Debt-ratchet, CI, and Codex reruns are
tracked in the completion evaluation.
